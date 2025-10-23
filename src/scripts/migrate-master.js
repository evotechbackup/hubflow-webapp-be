const mongoose = require('mongoose');
const Customization = require('../models/master/Customization');
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

const SHIPMENT_TYPES = [
  'ACCOUNTS',
  'AIR EXPORT',
  'AIR IMPORT',
  'BREAKBULK',
  'CLEARANCE',
  'CO LOAD',
  'CROSS TRADE AIR',
  'CROSS TRADE SEA',
  'CUSTOMER SERVICE',
  'CUSTOMER SERVICE AND OPERATION',
  'FCL EXPORT',
  'FCL IMPORT',
  'FTL EXPORT',
  'FTL IMPORT',
  'GENERAL CARGO',
  'HANDLING PERSON',
  'LAND TRANSPORTATION EXPORT',
  'LCL EXPORT',
  'LCL IMPORT',
  'LTL EXPORT',
  'LTL IMPORT',
  'MESSINA LINE SEA EXPORT',
  'NVOCC EXPORT',
  'NVOCC IMPORT',
  'OPERATION',
  'PACKING AND RELOCATION AIR EXPORT',
  'RELOCATION EXPORT',
  'RMX EXPORT',
  'RMX IMPORT',
  'ROAD TRANSPORTATION DOMESTIC',
  'ROAD TRANSPORTATION EXPORT',
  'ROAD TRANSPORTATION IMPORT',
  'ROAD TRANSPORTATION',
  'SALES',
  'SALES COORDINATOR',
  'SERVICE JOB',
  'SOC EXPORT',
  'SOC IMPORT',
  'TRADING',
  'TRANSIT IN',
  'TRANSIT OUT',
  'TRANSPORTATION',
  'WAREHOUSE',
  'WAREHOUSE-IN',
  'WAREHOUSE-OUT',
];

// Main execution
async function main() {
  console.log('\n🚀 Migrate Master Script');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}\n`);

  try {
    await connectDB();

    const customization = await Customization.findOne({
      organization: '65f2f117dfe20a9b55b49daa',
    });

    customization.shipmentTypes = SHIPMENT_TYPES.map((item) => ({
      name: item,
    }));
    await customization.save();

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
