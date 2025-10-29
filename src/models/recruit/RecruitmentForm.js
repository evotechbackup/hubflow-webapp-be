const mongoose = require('mongoose');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { htmlToText } = require('html-to-text');

const QuestionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
    },
    questionType: {
      type: String,
      enum: [
        'text',
        'date',
        'number',
        'dropdown',
        'yesno',
        'photo',
        'signature',
        'checkbox',
        'multiplechoice',
      ],
      required: true,
    },
    options: [
      {
        type: String,
      },
    ],
    isRequired: {
      type: Boolean,
      default: false,
    },
    isCommentRequired: {
      type: Boolean,
      default: false,
    },
    isPhotoRequired: {
      type: Boolean,
      default: false,
    },
    shortDescription: {
      type: String,
    },
    min: {
      type: Number,
    },
    max: {
      type: Number,
    },
  },
  { timestamps: true }
);

const RecruitmentFormSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
    },
    roleName: {
      type: String,
      required: true,
    },
    roleOverview: {
      type: String,
    },
    slug: {
      type: String,
    },
    questions: [
      {
        type: QuestionSchema,
      },
    ],

    noteRequired: {
      type: Boolean,
      default: false,
    },

    jdText: {
      type: String,
    },
    jdEmbedding: {
      type: [Number],
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    autoRating: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

RecruitmentFormSchema.index({ organization: 1, company: 1 });

function cleanHtmlToText(html) {
  if (!html) return '';
  // convert HTML to readable plain text, preserve lists/newlines
  const text = htmlToText(html, {
    wordwrap: 130,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
    ],
  });
  // normalize whitespace
  return text.replace(/\s+/g, ' ').trim();
}

// optional: truncate to a reasonable size for embeddings (you may also summarize)
function truncateTextForEmbedding(text, maxChars = 16000) {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  // naive truncation: keep start and end (better than pure head-only)
  const head = text.slice(0, Math.floor(maxChars * 0.6));
  const tail = text.slice(-Math.floor(maxChars * 0.4));
  return `${head}\n\n... [TRUNCATED] ...\n\n${tail}`;
}

RecruitmentFormSchema.methods.generateJdEmbedding = async function (
  skipSave = false
) {
  try {
    // Only generate JD embedding when autoRating is enabled at the form level
    if (this.autoRating !== true) {
      console.warn(
        `Skipping JD embedding — autoRating disabled for form ${this._id}`
      );
      return null;
    }
    // Validate required content
    if (!this.roleName || !this.roleOverview) {
      console.warn(
        `Skipping embedding — missing required fields in form ${this._id}`
      );
      return null;
    }

    const plainOverview = cleanHtmlToText(this.roleOverview);
    const questionsText = (this.questions || [])
      .map((q, i) => `${i + 1}. ${q.questionText}`)
      .join(' | ');

    let jdText = `
      Job Title: ${this.roleName || ''}
      Overview: ${plainOverview}
      Key Questions: ${questionsText}
      Company: ${this.company}
      Organization: ${this.organization}
    `
      .replace(/\s+/g, ' ')
      .trim();

    jdText = truncateTextForEmbedding(jdText);

    // Store cleaned JD text
    this.jdText = jdText;

    // Generate embedding using OpenAI
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY_ATS,
    });

    const jdEmbedding = await embeddings.embedQuery(jdText);

    // Save or attach temporarily
    if (!skipSave) {
      await mongoose
        .model('RecruitmentForm')
        .findByIdAndUpdate(
          this._id,
          { jdEmbedding, jdText },
          { new: true, runValidators: false }
        );
    } else {
      this.jdEmbedding = jdEmbedding;
    }

    return jdEmbedding;
  } catch (err) {
    console.error('Error generating JD embedding:', err);
    throw err;
  }
};

RecruitmentFormSchema.post('save', async (doc) => {
  try {
    if (!doc.roleName || !doc.roleOverview) return;
    if (doc.autoRating !== true) return;
    await doc.generateJdEmbedding(false);
    console.log(` Embedding generated for Job: ${doc.roleName}`);
  } catch (err) {
    console.error(' Embedding generation failed:', err);
  }
});

module.exports = mongoose.model('RecruitmentForm', RecruitmentFormSchema);
