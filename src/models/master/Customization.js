const mongoose = require('mongoose');

const CustomizationSchema = new mongoose.Schema(
  {
    // Sales
    customerType: [{ name: String }],
    customerTags: [{ name: String }],
    customerClassification: [{ name: String, code: String }],
    customerBusinessType: [{ name: String }, { code: String }],
    customerCompanyType: [{ name: String }, { code: String }],
    customerGroup: [{ name: String }, { code: String }],

    // Procurement
    vendorType: [{ name: String }],
    vendorSubType: [{ name: String }],
    vendorTags: [{ name: String }],
    incoTerms: [{ name: String, code: String }],
    vendorClassification: [{ name: String, code: String }],
    vendorBusinessType: [{ name: String }, { code: String }],
    vendorCompanyType: [{ name: String }, { code: String }],
    vendorGroup: [{ name: String }, { code: String }],

    // HRM
    officeLocations: [{ name: String }],
    employmentTypes: [{ name: String }],
    employmentContracts: [{ name: String }],
    visaStatus: [{ name: String }],
    employeeTeams: [{ name: String }],

    // inventory
    inventoryTypes: [{ name: String }],
    inventoryTags: [{ name: String }],

    // General
    shipmentTypes: [{ name: String }],

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
  },
  { timestamps: true }
);

CustomizationSchema.index({
  organization: 1,
});

module.exports = mongoose.model('Customization', CustomizationSchema);
