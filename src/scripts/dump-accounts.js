const mongoose = require('mongoose');
const Account = require('../models/accounts/Account');
const ParentAccount = require('../models/accounts/ParentAccount');
const { fixedAccounts, fixedParentAccounts } = require('../utils/accounts');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  console.log('\n🚀 Accounts Script');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}\n`);

  try {
    await connectDB();
    const ORGANIZATION = '65f2f117dfe20a9b55b49daa';
    const COMPANY = '65f2f0e7dfe20a9b55b49d35';

    // Insert all parent accounts at once
    const parentAccountsWithOrgId = fixedParentAccounts.map((account) => ({
      ...account,
      organization: ORGANIZATION,
      company: COMPANY,
    }));

    const savedParentAccounts = await ParentAccount.insertMany(
      parentAccountsWithOrgId
    );

    // Create a lookup map for parent accounts for faster access
    const parentAccountMap = savedParentAccounts.reduce((map, parent) => {
      map[parent.accountName] = parent;
      return map;
    }, {});

    // Prepare all child accounts
    const childAccounts = fixedAccounts.map((account) => ({
      ...account,
      parentAccount: null,
      organization: ORGANIZATION,
      company: COMPANY,
    }));

    // Save all child accounts in one batch
    const savedChildAccounts = await Account.insertMany(childAccounts);

    // Update parent accounts with child references
    const bulkOps = [];
    savedChildAccounts.forEach((savedAccount, index) => {
      const parentName = fixedAccounts[index].parentAccount;
      const parentAccount = parentAccountMap[parentName];

      if (parentAccount) {
        bulkOps.push({
          updateOne: {
            filter: { _id: parentAccount._id },
            update: { $push: { childAccounts: savedAccount._id } },
          },
        });
      }
    });

    if (bulkOps.length > 0) {
      await ParentAccount.bulkWrite(bulkOps);
    }

    console.log(`Finished at: ${new Date().toISOString()}`);
  } catch (error) {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n📴 Database connection closed');
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
