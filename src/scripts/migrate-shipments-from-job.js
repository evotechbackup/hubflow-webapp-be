const mongoose = require('mongoose');
const Jobs = require('../models/operations/Jobs');
const Shipment = require('../models/operations/Shipment');
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
  console.log('\n🚀 Migrate Master Script');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}\n`);

  try {
    await connectDB();

    const jobs = await Jobs.find().lean();

    for (const job of jobs) {
      // `SHPT-${year}-${month}-${day}-${count + 1}`
      const id = job.id?.split('-');
      const shipment = new Shipment({
        ...job,
        jobId: job._id,
        id: `SHPT-${id[1]}-${id[2]}-${id[3]}-${id[4]}`,
      });
      await shipment.save();

      await Jobs.updateOne({ _id: job._id }, { shipments: [shipment._id] });
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
