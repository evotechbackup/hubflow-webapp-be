const mongoose = require('mongoose');
// const { OpenAIEmbeddings } = require("@langchain/openai");
const mongoosePaginate = require('mongoose-paginate-v2');

const AddressSchema = new mongoose.Schema({
  attention: { type: String },
  country: { type: String },
  region: { type: String },
  addressLine1: { type: String },
  addressLine2: { type: String },
  city: { type: String },
  state: { type: String },
  postalCode: { type: String },
  phone: { type: String },
  faxNumber: { type: String },
});

const ContactPersonSchema = new mongoose.Schema({
  salutation: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  emailAddress: { type: String },
  workPhone: { type: String },
  mobile: { type: String },
  designation: { type: String },
  department: { type: String },
});

const vendorSchema = new mongoose.Schema(
  {
    primaryContact: {
      salutation: String,
      firstName: String,
      lastName: String,
    },
    companyName: String,
    displayName: String,
    vendorID: String,
    vendorSupplierNo: String,
    vendorType: String,
    vendorSubType: String,
    emailAddress: String,
    contactNumbers: {
      workPhone: String,
      mobilePhone: String,
    },
    currency: String,
    paymentTerms: String,
    websiteUrl: String,
    industry: String,
    openingBalance: Number,
    portalEnabled: {
      type: Boolean,
      default: false,
    },
    portalLanguage: String,
    document: String,
    billingAddress: AddressSchema,
    shippingAddress: AddressSchema,
    contactPersons: [ContactPersonSchema],
    remarks: String,
    isActivated: {
      type: Boolean,
      default: true,
    },
    hasPortalAccess: {
      type: Boolean,
      default: false,
    },
    username: String,
    serviceDescription: String,
    vat: String,
    cr: String,

    bankDetails: {
      accountName: String,
      bankName: String,
      accountNumber: String,
      iBANNumber: String,
      branchName: String,
    },
    tags: [String],

    region: String,

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    user: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

// Add method to generate and store embeddings
// vendorSchema.methods.generateEmbedding = async function () {
//   try {
//     const embeddings = new OpenAIEmbeddings({
//       openAIApiKey: process.env.OPENAI_API_KEY,
//     });

//     // Fetch related data in parallel for efficiency
//     const [
//       assignedAgents,
//       recentPurchaseQuotations,
//       recentPaymentRequests,
//       recentPaymentVouchers,
//       recentRFQs,
//       recentPurchaseReceives,
//       vendorQuotes,
//       recentExpenses,
//       recentTransactions,
//     ] = await Promise.all([
//       mongoose.model("Agent").find({ _id: { $in: this.agent } }) || [],
//       mongoose
//         .model("PurchaseQuotation")
//         .find({ vendor: this._id })
//         .sort({ createdAt: -1 })
//         .limit(10)
//         .select("id total status date paymentTerms") || [],
//       mongoose
//         .model("Bill")
//         .find({ vendor: this._id })
//         .sort({ createdAt: -1 })
//         .limit(10)
//         .select("id total status billDate dueDate approval") || [],
//       mongoose
//         .model("PaymentMade")
//         .find({ vendor: this._id })
//         .sort({ createdAt: -1 })
//         .limit(10)
//         .select("id amountPaid paymentDate status") || [],
//       mongoose
//         .model("RFQ")
//         .find({ vendor: { $in: [this._id] } })
//         .sort({ createdAt: -1 })
//         .limit(5)
//         .select("id date status") || [],
//       mongoose
//         .model("PurchaseReceived")
//         .find({ vendor: this._id })
//         .sort({ createdAt: -1 })
//         .limit(10)
//         .select("id receivedDate") || [],
//       mongoose
//         .model("VendorQuote")
//         .find({ vendor: this._id })
//         .sort({ createdAt: -1 })
//         .limit(10)
//         .select("id total status date approval") || [],
//       mongoose
//         .model("Expense")
//         .find({ vendor: this._id })
//         .sort({ createdAt: -1 })
//         .limit(10)
//         .select("id amount date status approval") || [],
//       mongoose
//         .model("Transaction")
//         .find({ vendor: this._id })
//         .sort({ createdAt: -1 })
//         .limit(20)
//         .select("debit credit amount type") || [],
//     ]);

//     // Calculate business metrics with null checks
//     const totalPurchaseAmount = Array.isArray(recentPurchaseQuotations)
//       ? recentPurchaseQuotations.reduce((sum, po) => sum + (po?.total || 0), 0)
//       : 0;
//     const totalPaymentRequests = Array.isArray(recentPaymentRequests)
//       ? recentPaymentRequests.reduce((sum, pr) => sum + (pr?.total || 0), 0)
//       : 0;
//     const totalVendorQuoteAmount = Array.isArray(vendorQuotes)
//       ? vendorQuotes.reduce((sum, quote) => sum + (quote?.total || 0), 0)
//       : 0;
//     const totalExpenseAmount = Array.isArray(recentExpenses)
//       ? recentExpenses.reduce((sum, expense) => sum + (expense?.amount || 0), 0)
//       : 0;
//     const totalPaymentVouchers = Array.isArray(recentPaymentVouchers)
//       ? recentPaymentVouchers.reduce(
//           (sum, pv) => sum + (pv?.amountPaid || 0),
//           0
//         )
//       : 0;

//     // Transaction summaries with null checks
//     const totalTransactionDebits = Array.isArray(recentTransactions)
//       ? recentTransactions.reduce((sum, txn) => sum + (txn?.debit || 0), 0)
//       : 0;
//     const totalTransactionCredits = Array.isArray(recentTransactions)
//       ? recentTransactions.reduce((sum, txn) => sum + (txn?.credit || 0), 0)
//       : 0;

//     // Get status summaries with null checks
//     const pendingPaymentRequests = Array.isArray(recentPaymentRequests)
//       ? recentPaymentRequests.filter((pr) => pr?.status === "pending").length
//       : 0;
//     const approvedPaymentRequests = Array.isArray(recentPaymentRequests)
//       ? recentPaymentRequests.filter(
//           (pr) => pr?.approval === "approved1" || pr?.approval === "approved2"
//         ).length
//       : 0;
//     const pendingExpenses = Array.isArray(recentExpenses)
//       ? recentExpenses.filter((expense) => expense?.status === "pending").length
//       : 0;

//     // Format addresses for embedding
//     const billingAddressText = this.billingAddress
//       ? `${this.billingAddress.addressLine1 || ""} ${
//           this.billingAddress.city || ""
//         } ${this.billingAddress.state || ""} ${
//           this.billingAddress.country || ""
//         }`.trim()
//       : "";

//     const shippingAddressText = this.shippingAddress
//       ? `${this.shippingAddress.addressLine1 || ""} ${
//           this.shippingAddress.city || ""
//         } ${this.shippingAddress.state || ""} ${
//           this.shippingAddress.country || ""
//         }`.trim()
//       : "";

//     // Create comprehensive text representation
//     const vendorText = `
//       Vendor Name: ${this.displayName || ""}
//       Company Name: ${this.companyName || ""}
//       Vendor ID: ${this.vendorID || ""}
//       Vendor Supplier Number: ${this.vendorSupplierNo || ""}
//       Vendor Type: ${this.vendorType || ""}
//       Vendor Sub Type: ${this.vendorSubType || ""}
//       Status: ${this.isActivated ? "Active" : "Inactive"}

//       Primary Contact: ${this.primaryContact?.salutation || ""} ${
//       this.primaryContact?.firstName || ""
//     } ${this.primaryContact?.lastName || ""}
//       Email: ${this.emailAddress || ""}
//       Work Phone: ${this.contactNumbers?.workPhone || ""}
//       Mobile Phone: ${this.contactNumbers?.mobilePhone || ""}
//       Website: ${this.websiteUrl || ""}

//       VAT Number: ${this.vat || ""}
//       CR Number: ${this.cr || ""}
//       Currency: ${this.currency || ""}
//       Opening Balance: ${this.openingBalance || 0}
//       Payment Terms: ${this.paymentTerms || ""}
//       Industry: ${this.industry || ""}

//       Portal Access: ${this.hasPortalAccess ? "Yes" : "No"}
//       Portal Enabled: ${this.portalEnabled ? "Yes" : "No"}
//       Portal Language: ${this.portalLanguage || ""}
//       Username: ${this.username || ""}

//       Service Description: ${this.serviceDescription || ""}
//       Remarks: ${this.remarks || ""}

//       Billing Address: ${billingAddressText}
//       Shipping Address: ${shippingAddressText}

//       Contact Persons: ${(this.contactPersons || [])
//         .slice(0, 5)
//         .map(
//           (contact) =>
//             `${contact?.firstName || ""} ${contact?.lastName || ""} (${
//               contact?.designation || ""
//             }) - ${contact?.department || ""}`
//         )
//         .filter((name) => name.trim() !== " () - ")
//         .join(", ")}

//       Business Metrics:
//       Total Purchase Orders: ${totalPurchaseAmount}
//       Total Payment Requests: ${totalPaymentRequests}
//       Total Payment Vouchers: ${totalPaymentVouchers}
//       Total Vendor Quotes: ${totalVendorQuoteAmount}
//       Total Expenses: ${totalExpenseAmount}

//       Recent Activity:
//       Recent Purchase Orders: ${recentPurchaseQuotations?.length || 0}
//       Recent Payment Requests: ${recentPaymentRequests?.length || 0}
//       Pending Payment Requests: ${pendingPaymentRequests}
//       Approved Payment Requests: ${approvedPaymentRequests}
//       Recent Payment Vouchers: ${recentPaymentVouchers?.length || 0}
//       Recent RFQs: ${recentRFQs?.length || 0}
//       Recent Purchase Receives: ${recentPurchaseReceives?.length || 0}
//       Recent Vendor Quotes: ${vendorQuotes?.length || 0}
//       Recent Expenses: ${recentExpenses?.length || 0}
//       Pending Expenses: ${pendingExpenses}
//       Recent Transactions: ${recentTransactions?.length || 0}

//       Transaction Summary:
//       Total Debits: ${totalTransactionDebits}
//       Total Credits: ${totalTransactionCredits}
//       Net Position: ${totalTransactionCredits - totalTransactionDebits}

//       Assigned Agents: ${(assignedAgents || [])
//         .map((agent) => agent?.fullName || "")
//         .filter((name) => name)
//         .join(", ")}

//       Vendor Category: ${
//         this.vendorType
//           ? this.vendorType
//               .replace(/([a-z])([A-Z])/g, "$1 $2")
//               .replace(/^\w/, (c) => c.toUpperCase())
//           : ""
//       }

//       Business Relationship: ${
//         totalPurchaseAmount > 500000
//           ? "Strategic Vendor"
//           : totalPurchaseAmount > 100000
//           ? "Major Vendor"
//           : totalPurchaseAmount > 50000
//           ? "Regular Vendor"
//           : totalPurchaseAmount > 0
//           ? "Occasional Vendor"
//           : "New Vendor"
//       }

//       Performance Status: ${
//         pendingPaymentRequests > 5
//           ? "High Activity"
//           : recentPaymentVouchers?.length > recentPaymentRequests?.length
//           ? "Payment Current"
//           : "Standard"
//       }

//       Organization ID: ${this.organization}
//     `
//       .replace(/\s+/g, " ")
//       .trim();

//     // Optional: Log token count estimation
//     const estimatedTokens = Math.ceil(vendorText.length / 4);
//     if (estimatedTokens > 7000) {
//       console.warn(
//         `Vendor ${this.displayName} embedding text is quite large: ~${estimatedTokens} tokens`
//       );
//     }

//     // Generate embedding
//     const embedding = await embeddings.embedQuery(vendorText);

//     // Store embedding in the document
//     this.embedding = embedding;
//     await this.save();

//     return embedding;
//   } catch (error) {
//     console.error("Error generating vendor embedding:", error);
//     throw error;
//   }
// };

vendorSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Vendor', vendorSchema);
