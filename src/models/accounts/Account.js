const mongoose = require('mongoose');
const { OpenAIEmbeddings } = require('@langchain/openai');

const EMBEDDING_FIELDS = [
  'accountType',
  'accountName',
  'accountCode',
  'accountNumber',
  'description',
  'amount',
  'status',
  'groupAccount',
  'costCenter',
];

const AccountSchema = new mongoose.Schema(
  {
    accountType: {
      type: String,
      enum: [
        'currentasset',
        'fixedasset',
        'stock',
        'cashandbank',
        'othercurrentasset',
        'currentliability',
        'longtermliability',
        'othercurrentliability',
        'ownersequity',
        'income',
        'otherincome',
        'indirectincome',
        'expense',
        'costofgoodssold',
        'otherexpense',
        'indirectexpense',
      ],
    },
    accountName: {
      type: String,
      required: true,
    },
    subAccount: {
      type: Boolean,
      default: false,
    },
    parentAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    groupAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParentAccount',
    },
    accountCode: {
      type: String,
    },
    accountNumber: {
      type: String,
    },
    currency: {
      type: String,
    },
    description: {
      type: String,
    },
    watchList: {
      type: Boolean,
      default: false,
    },
    amount: {
      type: Number,
      default: 0,
    },
    fixed: {
      // Accounts are not locked by default
      type: Boolean,
      default: false,
    },
    status: {
      // Accounts are active by default
      type: Boolean,
      default: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    costCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CostCenter',
    },

    embedding: {
      type: [Number],
      index: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add method to generate and store embeddings
AccountSchema.methods.generateEmbedding = async function (skipSave = false) {
  try {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const groupAccount = this.groupAccount
      ? await mongoose
          .model('ParentAccount')
          .findById(this.groupAccount)
          .select('accountName accountCode')
      : null;

    const costCenter = this.costCenter
      ? await mongoose
          .model('CostCenter')
          .findById(this.costCenter)
          .select('unit code')
      : null;

    // Create comprehensive text representation
    const accountText = `
      Account Name: ${this.accountName || ''}
      Account Type: ${this.accountType || ''}
      Account Code: ${this.accountCode || ''}
      Account Number: ${this.accountNumber || ''}
      Description: ${this.description || ''}
      Amount: ${this.amount || 0}
      Status: ${this.status ? 'Active' : 'Inactive'}
      
      Group Account: ${groupAccount?.accountName || ''}
      Group Account Code: ${groupAccount?.accountCode || ''}
      Cost Center: ${costCenter?.unit || ''}
      Cost Center Code: ${costCenter?.code || ''}
      
      Account Category: ${
        this.accountType
          ? this.accountType
              .replace(/([a-z])([A-Z])/g, '$1 $2')
              .replace(/^\w/, (c) => c.toUpperCase())
          : ''
      }
      Financial Classification: ${
        this.accountType
          ? this.accountType.includes('asset')
            ? 'Asset'
            : this.accountType.includes('liability')
              ? 'Liability'
              : this.accountType.includes('equity')
                ? 'Equity'
                : this.accountType.includes('income')
                  ? 'Income'
                  : this.accountType.includes('expense')
                    ? 'Expense'
                    : 'Other'
          : ''
      }
      
      Organization ID: ${this.organization}
    `
      .replace(/\s+/g, ' ')
      .trim();

    // Optional: Log token count estimation (rough calculation: ~4 chars per token)
    const estimatedTokens = Math.ceil(accountText.length / 4);
    if (estimatedTokens > 7000) {
      console.warn(
        `Account ${this.accountName} embedding text is quite large: ~${estimatedTokens} tokens`
      );
    }

    // Generate embedding
    const embedding = await embeddings.embedQuery(accountText);

    // Only save if skipSave is false
    if (!skipSave) {
      // Use findByIdAndUpdate to avoid version conflicts
      await mongoose
        .model('Account')
        .findByIdAndUpdate(
          this._id,
          { embedding },
          { new: true, runValidators: false }
        );
    } else {
      // Store embedding in the document without saving
      this.embedding = embedding;
    }

    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
};

AccountSchema.pre('save', async function (next) {
  if (!this.isModified() || this.isNew) {
    // Proceed to post-save where we'll generate embedding
    return next();
  }

  const isRelevantFieldModified = EMBEDDING_FIELDS.some((field) =>
    this.isModified(field)
  );

  if (isRelevantFieldModified) {
    try {
      // Pass skipSave=true since we're in a pre-save hook
      await this.generateEmbedding(true);
    } catch (err) {
      return next(err);
    }
  }

  next();
});

AccountSchema.post('updateOne', async function (res, next) {
  try {
    const filter = this.getFilter();
    const update = this.getUpdate();

    // Check if any embedding-relevant fields were updated
    const isRelevantFieldUpdated = EMBEDDING_FIELDS.some(
      (field) =>
        (update.$set && update.$set[field] !== undefined) ||
        update[field] !== undefined
    );

    if (isRelevantFieldUpdated) {
      const doc = await this.model.findOne(filter);
      if (doc) {
        await doc.generateEmbedding();
      }
    }
  } catch (err) {
    console.error('Embedding generation failed after updateOne:', err);
  }
  next();
});

// For findOneAndUpdate & findByIdAndUpdate
AccountSchema.post('findOneAndUpdate', async function (doc, next) {
  try {
    if (doc) {
      const update = this.getUpdate();

      // Check if any embedding-relevant fields were updated
      const isRelevantFieldUpdated = EMBEDDING_FIELDS.some(
        (field) =>
          (update.$set && update.$set[field] !== undefined) ||
          update[field] !== undefined
      );

      if (isRelevantFieldUpdated) {
        await doc.generateEmbedding();
      }
    }
  } catch (err) {
    console.error('Embedding generation failed after findOneAndUpdate:', err);
  }
  next();
});

AccountSchema.post('bulkWrite', async function (res, next) {
  try {
    const operations = this.options?.operations || [];
    const modifiedIds = [];

    for (const op of operations) {
      if (op.updateOne || op.replaceOne) {
        const update = op.updateOne?.update || op.replaceOne?.replacement;

        // Check if any embedding-relevant fields were updated
        const isRelevantFieldUpdated = EMBEDDING_FIELDS.some(
          (field) =>
            (update.$set && update.$set[field] !== undefined) ||
            update[field] !== undefined
        );

        if (isRelevantFieldUpdated) {
          const filter = op.updateOne?.filter || op.replaceOne?.filter;
          const doc = await this.model.findOne(filter);
          if (doc) modifiedIds.push(doc._id);
        }
      }

      if (op.insertOne?.document?._id) {
        modifiedIds.push(op.insertOne.document._id);
      }
    }

    // Remove duplicates
    const uniqueIds = [...new Set(modifiedIds)];

    // Generate embeddings for all (with retry logic for version conflicts)
    await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const doc = await this.model.findById(id);
          if (doc) await doc.generateEmbedding();
        } catch (err) {
          if (err.name === 'VersionError') {
            console.warn(
              `Version conflict for document ${id}, skipping embedding generation`
            );
          } else {
            throw err;
          }
        }
      })
    );
  } catch (err) {
    console.error('Embedding generation failed after bulkWrite:', err);
  }

  next();
});

module.exports = mongoose.model('Account', AccountSchema);
