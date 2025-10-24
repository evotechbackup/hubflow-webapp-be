const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseQuotation',
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    fleet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fleet',
    },
    id: {
      type: String,
    },
    reference: {
      type: String,
    },
    debit: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
    },
    credit: {
      type: Number,
      default: 0,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    runningBalance: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Middleware to trigger recalculation after deleteMany/deleteOne
TransactionSchema.pre(
  'deleteMany',
  { document: false, query: true },
  async function (next) {
    try {
      const filter = this.getFilter();

      const deletedDocs = await this.model.find(filter, {
        account: 1,
        createdAt: 1,
      });

      if (deletedDocs.length > 0) {
        const {
          recalculateAccountRunningBalanceAfterTransaction,
        } = require('../../utilities/transactionUtils');

        // Group deleted transactions by account
        const groupedByAccount = deletedDocs.reduce((acc, txn) => {
          const accountId = txn.account?.toString();
          if (accountId) {
            if (!acc[accountId]) acc[accountId] = [];
            acc[accountId].push(txn);
          }
          return acc;
        }, {});

        // Recalculate each account in the background
        for (const [accountId, txns] of Object.entries(groupedByAccount)) {
          // Get the earliest deleted transaction's date for each account
          const earliestDate = txns.reduce(
            (min, t) => (t.createdAt < min ? t.createdAt : min),
            txns[0].createdAt
          );

          setImmediate(async () => {
            try {
              await recalculateAccountRunningBalanceAfterTransaction(
                accountId,
                earliestDate
              );
              console.log(
                `Auto-recalculated running balance for account ${accountId} after deleteMany`
              );
            } catch (err) {
              console.error(
                `Error recalculating running balance for account ${accountId} after deleteMany:`,
                err.message
              );
            }
          });
        }
      }

      next();
    } catch (err) {
      console.error('Error in deleteMany pre hook:', err.message);
      next();
    }
  }
);

TransactionSchema.pre(
  'deleteOne',
  { document: false, query: true },
  async function (next) {
    try {
      const filter = this.getFilter();
      const deletedDoc = await this.model.findOne(filter);

      if (deletedDoc && deletedDoc.account) {
        // Import utility function dynamically to avoid circular dependency
        const {
          recalculateAccountRunningBalanceAfterTransaction,
        } = require('../../utilities/transactionUtils');

        // Recalculate in background
        setImmediate(async () => {
          try {
            await recalculateAccountRunningBalanceAfterTransaction(
              deletedDoc.account,
              deletedDoc.createdAt
            );
            console.log(
              `Auto-recalculated running balance for account ${deletedDoc.account} after deleteOne`
            );
          } catch (err) {
            console.error(
              'Error in auto-recalculation after deleteOne:',
              err.message
            );
          }
        });
      }
      next();
    } catch (err) {
      console.error('Error in deleteOne pre hook:', err.message);
      next(err);
    }
  }
);

module.exports = mongoose.model('Transaction', TransactionSchema);
