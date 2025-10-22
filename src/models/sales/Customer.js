const mongoose = require('mongoose');
// const { OpenAIEmbeddings } = require('@langchain/openai');
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
  department: { type: String },
  designation: { type: String },
  buildingNo: { type: String },
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

const CustomerSchema = new mongoose.Schema(
  {
    customerType: { type: String },
    comments: [
      {
        text: { type: String, default: ' ' },
        date: { type: Date, default: Date.now },
      },
    ],
    primaryContact: {
      salutation: { type: String },
      firstName: { type: String },
      lastName: { type: String },
    },
    companyName: { type: String },
    arabicCompanyName: { type: String },
    displayName: { type: String },
    vendorCode: { type: String },
    vatNumber: { type: String },
    emailAddress: { type: String },
    contactNumbers: {
      workPhone: { type: String },
      mobilePhone: { type: String },
    },
    currency: { type: String },
    openingBalance: {
      type: Number,
      default: 0,
    },
    paymentTerms: { type: String },
    portalLanguage: { type: String },
    document: { type: String },
    designation: String,
    department: String,
    billingAddress: AddressSchema,
    shippingAddress: AddressSchema,
    contactPersons: [ContactPersonSchema],
    arabicAddress: {
      addressLine1: { type: String },
      addressLine2: { type: String },
      city: { type: String },
      state: { type: String },
      region: { type: String },
      country: { type: String },
    },
    crNo: { type: String },
    tags: [
      {
        type: String,
      },
    ],
    region: { type: String },
    isActivated: { type: Boolean, default: true },
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
// CustomerSchema.methods.generateEmbedding = async function () {
//   try {
//     const embeddings = new OpenAIEmbeddings({
//       openAIApiKey: process.env.OPENAI_API_KEY,
//     });

//     // Fetch related data in parallel for efficiency
//     const [
//       assignedAgents,
//       recentInvoices,
//       recentQuotes,
//       recentProposals,
//       recentOrders,
//       recentPayments,
//       relatedProjects,
//       recentTransactions,
//     ] = await Promise.all([
//       mongoose.model('Agent').find({ _id: { $in: this.agent } }),
//       mongoose
//         .model('Invoice')
//         .find({ customer: this._id })
//         .sort({ createdAt: -1 })
//         .limit(10)
//         .select('id total status date'),
//       mongoose
//         .model('Quote')
//         .find({ customer: this._id })
//         .sort({ createdAt: -1 })
//         .limit(10)
//         .select('id total status date'),
//       mongoose
//         .model('Proposal')
//         .find({ customer: this._id })
//         .sort({ createdAt: -1 })
//         .limit(10)
//         .select('id total status date'),
//       mongoose
//         .model('SalesOrder')
//         .find({ customer: this._id })
//         .sort({ createdAt: -1 })
//         .limit(10)
//         .select('id total status salesOrderDate'),
//       mongoose
//         .model('PaymentReceived')
//         .find({ customer: this._id })
//         .sort({ createdAt: -1 })
//         .limit(10)
//         .select('id amountReceived paymentDate status'),
//       mongoose
//         .model('Project')
//         .find({ customer: this._id })
//         .sort({ createdAt: -1 })
//         .limit(5)
//         .select('projectName status budgetAmount'),
//       mongoose
//         .model('Transaction')
//         .find({ customer: this._id })
//         .sort({ createdAt: -1 })
//         .limit(20)
//         .select('debit credit amount type'),
//     ]);

//     // Calculate business metrics
//     const totalInvoiceAmount = recentInvoices.reduce(
//       (sum, inv) => sum + (inv.total || 0),
//       0
//     );
//     const totalQuoteAmount = recentQuotes.reduce(
//       (sum, quote) => sum + (quote.total || 0),
//       0
//     );
//     const totalProposalAmount = recentProposals.reduce(
//       (sum, proposal) => sum + (proposal.total || 0),
//       0
//     );
//     const totalOrderAmount = recentOrders.reduce(
//       (sum, order) => sum + (order.total || 0),
//       0
//     );
//     const totalPaymentsReceived = recentPayments.reduce(
//       (sum, payment) => sum + (payment.amountReceived || 0),
//       0
//     );
//     const totalProjectBudget = relatedProjects.reduce(
//       (sum, project) => sum + (project.budgetAmount || 0),
//       0
//     );

//     // Transaction summaries
//     const totalTransactionDebits = recentTransactions.reduce(
//       (sum, txn) => sum + (txn.debit || 0),
//       0
//     );
//     const totalTransactionCredits = recentTransactions.reduce(
//       (sum, txn) => sum + (txn.credit || 0),
//       0
//     );

//     // Get status summaries
//     const pendingInvoices = recentInvoices.filter(
//       (inv) => inv.status === 'pending'
//     ).length;
//     const activeProjects = relatedProjects.filter(
//       (proj) => proj.status === 'InProgress'
//     ).length;

//     // Format addresses for embedding
//     const billingAddressText = this.billingAddress
//       ? `${this.billingAddress.addressLine1 || ''} ${
//           this.billingAddress.city || ''
//         } ${this.billingAddress.state || ''} ${
//           this.billingAddress.country || ''
//         }`.trim()
//       : '';

//     const shippingAddressText = this.shippingAddress
//       ? `${this.shippingAddress.addressLine1 || ''} ${
//           this.shippingAddress.city || ''
//         } ${this.shippingAddress.state || ''} ${
//           this.shippingAddress.country || ''
//         }`.trim()
//       : '';

//     // Create comprehensive text representation
//     const customerText = `
//       Customer Name: ${this.displayName || ''}
//       Company Name: ${this.companyName || ''}
//       Arabic Company Name: ${this.arabicCompanyName || ''}
//       Customer Type: ${this.customerType || ''}
//       Status: ${this.isActivated ? 'Active' : 'Inactive'}

//       Primary Contact: ${this.primaryContact?.salutation || ''} ${
//         this.primaryContact?.firstName || ''
//       } ${this.primaryContact?.lastName || ''}
//       Email: ${this.emailAddress || ''}
//       Work Phone: ${this.contactNumbers?.workPhone || ''}
//       Mobile Phone: ${this.contactNumbers?.mobilePhone || ''}

//       VAT Number: ${this.vatNumber || ''}
//       CR Number: ${this.crNo || ''}
//       Vendor Code: ${this.vendorCode || ''}
//       Currency: ${this.currency || ''}
//       Payment Terms: ${this.paymentTerms || ''}

//       Billing Address: ${billingAddressText}
//       Shipping Address: ${shippingAddressText}

//       Contact Persons: ${this.contactPersons
//         .slice(0, 5)
//         .map(
//           (contact) =>
//             `${contact.firstName || ''} ${contact.lastName || ''} (${
//               contact.designation || ''
//             })`
//         )
//         .filter((name) => name.trim() !== ' ()')
//         .join(', ')}

//       Business Metrics:
//       Total Invoice Amount: ${totalInvoiceAmount}
//       Total Quote Amount: ${totalQuoteAmount}
//       Total Proposal Amount: ${totalProposalAmount}
//       Total Order Amount: ${totalOrderAmount}
//       Total Payments Received: ${totalPaymentsReceived}
//       Total Project Budget: ${totalProjectBudget}
//       Outstanding Balance: ${totalInvoiceAmount - totalPaymentsReceived}

//       Recent Activity:
//       Recent Invoices: ${recentInvoices.length}
//       Pending Invoices: ${pendingInvoices}
//       Recent Quotes: ${recentQuotes.length}
//       Recent Orders: ${recentOrders.length}
//       Active Projects: ${activeProjects}
//       Recent Transactions: ${recentTransactions.length}

//       Transaction Summary:
//       Total Debits: ${totalTransactionDebits}
//       Total Credits: ${totalTransactionCredits}
//       Net Position: ${totalTransactionCredits - totalTransactionDebits}

//       Assigned Agents: ${assignedAgents
//         .map((agent) => agent.fullName || '')
//         .filter((name) => name)
//         .join(', ')}

//       Customer Category: ${
//         this.customerType
//           ? this.customerType
//               .replace(/([a-z])([A-Z])/g, '$1 $2')
//               .replace(/^\w/, (c) => c.toUpperCase())
//           : ''
//       }

//       Business Relationship: ${
//         totalInvoiceAmount > 100000
//           ? 'High Value Customer'
//           : totalInvoiceAmount > 50000
//             ? 'Medium Value Customer'
//             : totalInvoiceAmount > 0
//               ? 'Regular Customer'
//               : 'New Customer'
//       }

//       Organization ID: ${this.organization}
//       Company ID: ${this.company}
//       Created: ${this.createdAt ? this.createdAt.toDateString() : ''}
//       Updated: ${this.updatedAt ? this.updatedAt.toDateString() : ''}
//     `
//       .replace(/\s+/g, ' ')
//       .trim();

//     // Optional: Log token count estimation
//     const estimatedTokens = Math.ceil(customerText.length / 4);
//     if (estimatedTokens > 7000) {
//       console.warn(
//         `Customer ${this.displayName} embedding text is quite large: ~${estimatedTokens} tokens`
//       );
//     }

//     // Generate embedding
//     const embedding = await embeddings.embedQuery(customerText);

//     // Store embedding in the document
//     this.embedding = embedding;
//     await this.save();

//     return embedding;
//   } catch (error) {
//     console.error('Error generating customer embedding:', error);
//     throw error;
//   }
// };

CustomerSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Customer', CustomerSchema);
