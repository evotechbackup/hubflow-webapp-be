const mongoose = require('mongoose');
const { OpenAIEmbeddings, ChatOpenAI } = require('@langchain/openai');

const RecruitmentResponseSchema = new mongoose.Schema(
  {
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecruitmentForm',
      required: true,
    },
    answers: [
      {
        question: {
          type: String,
        },
        questionType: {
          type: String,
        },
        answer: [
          {
            type: String,
          },
        ],
        comment: {
          type: String,
        },
        photo: {
          type: String,
        },
      },
    ],
    email: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    file: {
      type: String,
    },
    note: {
      type: String,
    },
    status: {
      type: String,
      enum: ['applied', 'screening', 'interview', 'offered', 'rejected'],
      default: 'applied',
    },

    // Interview
    interviewDate: {
      type: Date,
    },
    interviewReminder: {
      type: Date,
    },
    interviewPriority: {
      type: String,
      enum: ['important', 'medium', 'flexible'],
      default: 'flexible',
    },
    interviewDescription: {
      type: String,
    },
    interviewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    interviewScheduled: {
      type: Boolean,
      default: false,
    },

    // Offer
    offered: {
      type: Boolean,
      default: false,
    },
    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecruitOffer',
    },
    cvText: {
      type: String,
    },
    aiSummary: {
      type: String,
    },
    cvEmbedding: {
      type: [Number],
    },
    fitScore: {
      type: Number,
      default: 0,
    },
    rating: {
      type: String,
      enum: ['', 'notfit', 'maybe', 'goodfit'],
      default: '',
    },

    comments: [
      {
        comment: {
          type: String,
          default: '',
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    logs: [
      {
        status: {
          type: String,
          default: 'applied',
        },
        agent: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
  },
  { timestamps: true }
);

RecruitmentResponseSchema.index({ organization: 1, company: 1 });

RecruitmentResponseSchema.methods.validateRequiredFields = function () {
  const missingFields = [];
  if (!this.form) missingFields.push('form');
  if (!this.email) missingFields.push('email');
  if (!this.fullName) missingFields.push('fullName');
  // phone is required by schema but should not block embedding generation here
  // leave phone validation to schema-level validators
  if (!this.cvText) missingFields.push('cvText');

  if (missingFields.length) {
    throw new Error(
      `Cannot generate embedding. Missing fields: ${missingFields.join(', ')}`
    );
  }
};

RecruitmentResponseSchema.methods.generateCvEmbedding = async function (
  skipSave = false
) {
  if (!this.cvText || this.cvText.trim() === '') {
    console.warn(
      `Skipping embedding generation: CV text is empty for candidate ${this.fullName}`
    );
    return null;
  }
  this.validateRequiredFields();

  try {
    const form = await mongoose.model('RecruitmentForm').findById(this.form);
    if (!form) {
      throw new Error('Recruitment form not found. Cannot compute fit score.');
    }
    // Gate by autoRating flag at form level
    if (form.autoRating !== true) {
      console.warn(
        `Skipping CV embedding — autoRating disabled for form ${form._id}`
      );
      return null;
    }

    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY_ATS,
    });

    const cvEmbedding = await embeddings.embedQuery(this.cvText);
    this.cvEmbedding = cvEmbedding;
    // If JD embedding is missing, try to generate it on the fly without saving
    if (!form.jdEmbedding || form.jdEmbedding.length === 0) {
      if (typeof form.generateJdEmbedding === 'function') {
        try {
          await form.generateJdEmbedding(true);
        } catch (e) {
          console.warn(
            'Failed to generate JD embedding on the fly:',
            e?.message || e
          );
        }
      }
    }
    if (!form.jdEmbedding || form.jdEmbedding.length === 0) {
      console.warn(
        'JD embedding still missing. Skipping fit score computation.'
      );
      this.fitScore = 1.0;
      this.rating = 'notfit';
      if (!skipSave) await this.save();
      return cvEmbedding;
    }

    // Evaluate candidate answers vs form questions and return a 0..1 score
    function computeAnswersScore(form, answers) {
      try {
        const qs = (form && form.questions) || [];
        if (!qs.length) return 0.5; // neutral if no questions

        const qMap = new Map();
        for (const q of qs) {
          if (!q || !q.questionText) continue;
          qMap.set((q.questionText || '').trim().toLowerCase(), q);
        }

        const aMap = new Map();
        for (const a of answers || []) {
          const key = (a && a.question ? a.question : '').trim().toLowerCase();
          if (!key) continue;
          aMap.set(key, a);
        }

        let requiredCount = 0;
        let requiredAnswered = 0;
        let qualitySum = 0;
        let qualityCount = 0;

        for (const [key, q] of qMap.entries()) {
          const isReq = !!q.isRequired;
          if (isReq) requiredCount++;

          const a = aMap.get(key);
          const present = isAnswerPresent(q, a);
          if (isReq && present) requiredAnswered++;

          const qScore = answerQualityScore(q, a);
          if (!Number.isNaN(qScore)) {
            qualitySum += qScore;
            qualityCount++;
          }
        }

        const coverage =
          requiredCount > 0 ? requiredAnswered / requiredCount : 1;
        const avgQuality = qualityCount > 0 ? qualitySum / qualityCount : 0.5;
        const total = 0.7 * coverage + 0.3 * avgQuality;
        return clamp01(total);
      } catch (e) {
        console.error('Error computing answers score:', e);
        return 0.5;
      }
    }

    function isAnswerPresent(q, a) {
      if (!a) return false;
      const type = (q.questionType || a.questionType || '').toLowerCase();
      const answers = Array.isArray(a.answer)
        ? a.answer
        : a.answer
          ? [a.answer]
          : [];
      const hasText = answers.some(
        (x) => (x || '').toString().trim().length > 0
      );
      const hasPhoto = !!a.photo;
      switch (type) {
        case 'photo':
        case 'signature':
          return hasPhoto || hasText;
        default:
          return hasText;
      }
    }

    function answerQualityScore(q, a) {
      if (!a) return 0;
      const type = (q.questionType || a.questionType || '').toLowerCase();
      const answers = Array.isArray(a.answer)
        ? a.answer
        : a.answer
          ? [a.answer]
          : [];
      const first = (answers[0] || '').toString().trim();

      switch (type) {
        case 'text': {
          const len = first.length;
          return clamp01((len - 20) / 180); // 0 <=20 chars, ~1 at >=200
        }
        case 'number': {
          const val = Number(first);
          if (!Number.isFinite(val)) return 0;
          if (typeof q.min === 'number' && typeof q.max === 'number') {
            if (val < q.min || val > q.max) return 0.2; // out of range
            return 1;
          }
          return 0.7; // number provided
        }
        case 'date': {
          return first ? 1 : 0;
        }
        case 'yesno': {
          if (!first) return 0;
          // treat any explicit yes/no as valid; optional tuning could prefer yes
          return 1;
        }
        case 'dropdown':
        case 'multiplechoice':
        case 'checkbox': {
          if (!answers.length) return 0;
          const opts = new Set(
            (q.options || []).map((o) =>
              (o || '').toString().toLowerCase().trim()
            )
          );
          let match = 0;
          for (const v of answers) {
            const t = (v || '').toString().toLowerCase().trim();
            if (opts.has(t)) match++;
          }
          const ratio = answers.length > 0 ? match / answers.length : 0;
          return ratio; // 0..1
        }
        case 'photo':
        case 'signature': {
          return a.photo ? 1 : first ? 0.6 : 0; // photo presence best, text fallback moderate
        }
        default: {
          return first ? 0.6 : 0;
        }
      }
    }

    const similarity = cosineSimilarity(cvEmbedding, form.jdEmbedding);

    const jdSourceText = form.jdText || '';
    const cvSourceText = this.cvText || '';
    const jdKeywords = extractTopKeywords(jdSourceText, 30);
    const cvTokens = toTokenSet(cvSourceText);
    let overlapCount = 0;
    for (const t of jdKeywords) {
      if (cvTokens.has(t)) overlapCount++;
    }
    const keywordOverlap = jdKeywords.size ? overlapCount / jdKeywords.size : 0;

    const cvLen = cvSourceText.length;
    const lengthScore = clamp01((cvLen - 800) / 2400);
    const sim01 = clamp01((similarity + 1) / 2);
    const answersScore = computeAnswersScore(form, this.answers || []);
    const composite =
      0.65 * sim01 +
      0.2 * keywordOverlap +
      0.05 * lengthScore +
      0.1 * answersScore;
    const rawScore = composite * 10;
    this.fitScore = Math.min(10, Math.max(1, Number(rawScore.toFixed(1))));

    if (this.fitScore >= 8) this.rating = 'goodfit';
    else if (this.fitScore >= 7) this.rating = 'maybe';
    else this.rating = 'notfit';

    const extracted = extractContacts(cvSourceText);
    if (extracted.name) {
      const nameSim = nameSimilarity(extracted.name, this.fullName || '');
      if (nameSim < 0.5) {
        this.rating = 'notfit';
        this.fitScore = Math.min(this.fitScore, 5.0);
      }
    }

    try {
      this.aiSummary = await generateAiSummary({
        rating: this.rating,
        fitScore: this.fitScore,
        jdText: jdSourceText,
        cvText: cvSourceText,
      });
    } catch (e) {
      console.warn('AI Summary generation failed:', e?.message || e);
    }

    if (!skipSave) await this.save();

    return cvEmbedding;
  } catch (err) {
    console.error('Error generating CV embedding:', err);
    throw err;
  }
};

RecruitmentResponseSchema.pre('save', async function (next) {
  try {
    // Check autoRating before any generation (form-level)
    const form = await mongoose
      .model('RecruitmentForm')
      .findById(this.form)
      .select('_id autoRating');
    if (!form || form.autoRating !== true) return next();

    const shouldGenerate =
      !!this.cvText &&
      (this.isNew ||
        this.isModified('cvText') ||
        !this.cvEmbedding ||
        this.cvEmbedding.length === 0);
    if (!shouldGenerate) return next();

    await this.generateCvEmbedding(true);
    return next();
  } catch (err) {
    console.error('Pre-save CV embedding generation failed:', err);
    return next();
  }
});

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

function clamp01(x) {
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function toTokenSet(text) {
  const tokens = normalizeText(text)
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
  return new Set(tokens);
}

function extractTopKeywords(text, topN = 30) {
  const counts = Object.create(null);
  const tokens = normalizeText(text)
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
  for (const t of tokens) counts[t] = (counts[t] || 0) + 1;
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([t]) => t);
  return new Set(top);
}

function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+.#\-_/\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'are',
  'you',
  'your',
  'from',
  'that',
  'this',
  'have',
  'has',
  'will',
  'our',
  'their',
  'they',
  'she',
  'his',
  'her',
  'him',
  'them',
  'was',
  'were',
  'can',
  'but',
  'not',
  'all',
  'any',
  'into',
  'about',
  'over',
  'under',
  'as',
  'to',
  'of',
  'in',
  'on',
  'at',
  'by',
  'an',
  'a',
  'is',
  'it',
  'be',
  'or',
  'we',
  'i',
  'us',
  'if',
  'may',
  'such',
  'per',
  'via',
  'etc',
]);
Object.freeze(STOP_WORDS);

// Precompiled regexes used across helpers
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_REGEX = /(?:(?:\+\d{1,3}[\s-]?)?|\b)\d[\d\s\-()]{8,}\d\b/g;
const NAME_LABEL_REGEX = /^(?:name)\s*[:-]\s*(.+)$/i;

// --- Contact extraction and similarity helpers ---
function extractContacts(text) {
  const out = { name: null, email: null, phone: null };
  const t = text || '';

  // Email
  const emailMatch = t.match(EMAIL_REGEX);
  if (emailMatch && emailMatch.length) out.email = emailMatch[0].trim();

  // Phone (pick the longest plausible digit sequence 10-13 digits)
  const digitRuns = t.match(PHONE_REGEX);
  if (digitRuns && digitRuns.length) {
    const normalized = digitRuns
      .map((p) => p.replace(/[^0-9]/g, ''))
      .filter((d) => d.length >= 10 && d.length <= 13)
      .sort((a, b) => b.length - a.length);
    if (normalized.length) out.phone = normalized[0];
  }

  // Name heuristics
  const lines = (t || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  let nameFromLabel = null;
  for (const line of lines.slice(0, 10)) {
    const m = line.match(NAME_LABEL_REGEX);
    if (m && m[1]) {
      nameFromLabel = m[1].replace(/[^a-zA-Z\s.\-']/g, '').trim();
      break;
    }
  }
  if (nameFromLabel) out.name = nameFromLabel;
  if (!out.name) {
    // fallback to first reasonable line that looks like a name (letters and spaces)
    for (const line of lines.slice(0, 5)) {
      const candidate = line.replace(/[^a-zA-Z\s.\-']/g, '').trim();
      if (
        candidate &&
        candidate.split(/\s+/).length <= 6 &&
        candidate.length >= 5
      ) {
        out.name = candidate;
        break;
      }
    }
  }

  return out;
}

function nameSimilarity(a, b) {
  const A = nameTokens(a);
  const B = nameTokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  const inter = [...A].filter((t) => B.has(t)).length;
  const union = new Set([...A, ...B]).size;
  return inter / union;
}

function nameTokens(x) {
  return new Set(
    (x || '')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t && t.length > 1 && !STOP_WORDS.has(t))
  );
}

async function generateAiSummary({ rating, fitScore, jdText, cvText }) {
  const fallback = () => {
    if (rating === 'goodfit')
      return `good fit: score ${fitScore}/10. Candidate aligns well with key requirements. Experience and skills appear relevant. Communication is clear. Overall, likely to ramp quickly.`;
    if (rating === 'maybe')
      return `maybe: score ${fitScore}/10. Partial alignment with requirements. Some gaps may be bridged with training. Experience is adjacent. Worth further discussion.`;
    return `not fit: score ${fitScore}/10. Limited overlap with core requirements. Experience does not directly match responsibilities. Consider for a different role.`;
  };

  try {
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY_ATS,
      temperature: 0.6,
    });
    const messages = [
      {
        role: 'system',
        content:
          'You are a concise recruitment assistant. Return only the final assessment. No headers, no lists, no extra text.',
      },
      {
        role: 'user',
        content: `
              Write a 1–2 sentence assessment (max ~45 words).
              - First sentence MUST start with exactly one of: 'not fit', 'maybe', or 'good fit', then ': score X/10'.
              - Choose label by FitScore: >=7 = good fit, 4–6 = maybe, <=3 = not fit (lower if conflicting evidence).
              - Second sentence: give the single most decisive reason in a human tone, referencing 1–2 specific skills/keywords or gaps; avoid filler.
              - No bullets, no line breaks beyond the two sentences, no quotes or extra commentary.
              Rating: ${rating}. FitScore: ${fitScore}.
              Job Description (excerpt):
              ${(jdText || '').slice(0, 1000)}
              CV (excerpt):
              ${(cvText || '').slice(0, 1000)}
              `.trim(),
      },
    ];
    const res = await llm.invoke(messages);
    const text = res && res.content ? String(res.content).trim() : '';
    return text || fallback();
  } catch (e) {
    console.error('Error generating AI summary:', e);
    return fallback();
  }
}

module.exports = mongoose.model(
  'RecruitmentResponse',
  RecruitmentResponseSchema
);
