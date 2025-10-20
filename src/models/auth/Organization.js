const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    department: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
      },
    ],

    arabicName: {
      type: String,
    },

    letterheadName: {
      type: String,
      default: '',
    },
    letterheadArabicName: {
      type: String,
      default: '',
    },

    organizationLogo: {
      type: String,
    },
    organizationSeal: {
      type: String,
    },
    organizationSignature: {
      type: String,
    },
    salesColor: {
      type: String,
    },
    salesFontColor: {
      type: String,
      default: 'white',
    },
    procurementColor: {
      type: String,
    },
    procurementFontColor: {
      type: String,
      default: 'white',
    },
    cr: {
      type: String,
    },
    vat: {
      type: String,
    },
    organizationAddress: {
      type: String,
    },
    buildingNumber: {
      type: String,
    },
    additionalNumber: {
      type: String,
    },
    organizationCity: {
      type: String,
    },
    organizationState: {
      type: String,
    },
    organizationZip: {
      type: String,
    },
    organizationCountry: {
      type: String,
    },
    organizationDistrict: {
      type: String,
    },
    landlineNumber: {
      type: String,
    },
    mobileNumber: {
      type: String,
    },
    faxNumber: {
      type: String,
    },
    pOBox: {
      type: String,
    },
    organizationEmail: {
      type: String,
    },
    webURL: {
      type: String,
    },
    organizationLocation: {
      type: String,
    },
    baseCurrency: {
      type: String,
      default: 'AED',
    },
    fiscalYear: {
      type: String,
    },
    language: {
      type: String,
    },
    timeZone: {
      type: String,
    },
    arabic: {
      buildingNumber: {
        type: String,
      },
      additionalNumber: {
        type: String,
      },
      organizationDistrict: {
        type: String,
      },
      organizationCity: {
        type: String,
      },
      organizationState: {
        type: String,
      },
      organizationZip: {
        type: String,
      },
      organizationCountry: {
        type: String,
      },
      vat: {
        type: String,
      },
      cr: {
        type: String,
      },
      address: {
        type: String,
      },

      bankName: {
        type: String,
      },
      accountNumber: {
        type: String,
      },
      branchName: {
        type: String,
      },
      accountName: {
        type: String,
      },
    },

    accountName: {
      type: String,
    },
    bankName: {
      type: String,
    },
    accountNumber: {
      type: String,
    },
    iBANNumber: {
      type: String,
    },
    branchName: {
      type: String,
    },

    attendance: {
      type: String,
      enum: ['web', 'mobile', 'biometric'],
      default: 'web',
    },

    inventoryFeatures: {
      goods: {
        type: Boolean,
        default: true,
      },
      consumables: {
        type: Boolean,
        default: false,
      },
      materials: {
        type: Boolean,
        default: false,
      },
    },

    fleetsFeatures: {
      equipment: {
        type: Boolean,
        default: true,
      },
      vehicle: {
        type: Boolean,
        default: true,
      },
      hasRentals: {
        type: Boolean,
        default: false,
      },
    },

    crmFeatures: {
      project: {
        type: Boolean,
        default: false,
      },
      product: {
        type: Boolean,
        default: false,
      },
      services: {
        type: Boolean,
        default: false,
      },
      items: {
        type: Boolean,
        default: false,
      },
      properties: {
        type: Boolean,
        default: false,
      },
    },

    invoiceFeatures: {
      vat: {
        type: Boolean,
        default: true,
      },
      summary: {
        type: Boolean,
        default: false,
      },
      proforma: {
        type: Boolean,
        default: false,
      },
    },

    quotationFeatures: {
      quotation: {
        type: Boolean,
        default: true,
      },
      proposal: {
        type: Boolean,
        default: false,
      },
    },

    costCenter: {
      type: Boolean,
      default: false,
    },

    salesFeatures: {
      inventoryInvoice: {
        type: Boolean,
        default: true,
      },
      manpowerInvoice: {
        type: Boolean,
        default: false,
      },
      equipmentInvoice: {
        type: Boolean,
        default: false,
      },
    },

    salesTemplate: {
      quotation: {
        type: String,
        default: 'QuoteSecond',
      },
      salesOrder: {
        type: String,
        default: 'SalesOrder',
      },
      deliveryNote: {
        type: String,
        default: 'DeliveryChallan',
      },
      invoice: {
        type: String,
        default: 'Invoice',
      },
      paymentReceived: {
        type: String,
        default: 'PaymentReceived',
      },
      creditNote: {
        type: String,
        default: 'CreditNote',
      },
    },

    procurementTemplate: {
      purchaseOrder: {
        type: String,
        default: 'PurchaseOrderWithMinFooter',
      },
      rfq: {
        type: String,
        default: 'RFQDetails',
      },
      rfp: {
        type: String,
        default: 'RFPDetails',
      },
      purchaseReceive: {
        type: String,
        default: 'PurchaseReceiveDetails',
      },
      bills: {
        type: String,
        default: 'BillsDetails',
      },
      paymentMade: {
        type: String,
        default: 'PaymentMadeDetails',
      },
    },

    accountTemplate: {
      pcr: {
        type: String,
        default: 'PCRTemplate',
      },
      pcc: {
        type: String,
        default: 'PCCTemplate',
      },
      expense: {
        type: String,
        default: 'ExpenseTemplate',
      },
      projectExpense: {
        type: String,
        default: 'ExpenseTemplate',
      },
    },

    hrmTemplate: {
      leavemanagement: {
        type: String,
        default: 'LeaveTamplate1',
      },
      payrollInd: {
        type: String,
        default: 'payrollTamplate1',
      },
      payrollGroup: {
        type: String,
        default: 'grouppayrollTamplate1',
      },
      payrollProject: {
        type: String,
        default: 'ProjectPayrollTamplate1',
      },
    },

    dashboardModules: {
      hrm: {
        enabled: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
      },
      finance: {
        enabled: { type: Boolean, default: false },
        order: { type: Number, default: 1 },
      },
      sales: {
        enabled: { type: Boolean, default: false },
        order: { type: Number, default: 2 },
      },
      crm: {
        enabled: { type: Boolean, default: false },
        order: { type: Number, default: 3 },
      },
      inventory: {
        enabled: { type: Boolean, default: false },
        order: { type: Number, default: 4 },
      },
      procurementmanagement: {
        enabled: { type: Boolean, default: false },
        order: { type: Number, default: 6 },
      },
      recruit: {
        enabled: { type: Boolean, default: false },
        order: { type: Number, default: 8 },
      },
    },

    qrCode: {
      type: Boolean,
      default: true,
    },

    vendorId: {
      type: String,
    },

    isAccrualAccounting: {
      type: Boolean,
      default: true,
    },

    // Email Server Configuration
    emailServerConfig: {
      // IMAP Server Configuration
      imap: {
        host: {
          type: String,
          trim: true,
        },
        port: {
          type: Number,
          default: 993,
          min: 1,
          max: 65535,
        },
        secure: {
          type: Boolean,
          default: true, // true for SSL/TLS
        },
        enabled: {
          type: Boolean,
          default: true,
        },
      },

      // SMTP Server Configuration
      smtp: {
        host: {
          type: String,
          trim: true,
        },
        port: {
          type: Number,
          default: 587,
          min: 1,
          max: 65535,
        },
        secure: {
          type: Boolean,
          default: false, // true for 465, false for other ports
        },
        enabled: {
          type: Boolean,
          default: true,
        },
      },

      // Common email provider presets
      provider: {
        type: String,
        enum: [
          'gmail',
          'outlook',
          'yahoo',
          'icloud',
          'zoho',
          'hostinger',
          'custom',
        ],
        default: 'custom',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', OrganizationSchema);
