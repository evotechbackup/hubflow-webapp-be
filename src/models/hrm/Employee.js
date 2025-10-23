const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { OpenAIEmbeddings } = require('@langchain/openai');

const addressSchema = {
  addressLine1: { type: String },
  addressLine2: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String },
  postalCode: { type: Number },
};

const EmployeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    nickName: {
      type: String,
    },
    email: {
      type: String,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeDepartment',
    },
    location: {
      type: String,
    },
    designation: {
      type: String,
    },
    role: {
      type: String,
    },
    roleCode: {
      type: String,
    },
    maxLeaves: {
      type: Number,
      default: 0,
    },
    employmentType: {
      type: String,
    },
    contractType: {
      type: String,
    },
    contractStartDate: {
      type: Date,
      default: null,
    },
    contractEndDate: {
      type: Date,
      default: null,
    },
    employeeStatus: {
      type: String,
      default: 'active',
    },
    activeDate: {
      type: Date,
      default: null,
    },
    inactiveDate: {
      type: Date,
      default: null,
    },
    visaStatus: {
      type: String,
    },
    gosiStatus: {
      type: Boolean,
      default: false,
    },
    sourceOfHire: {
      type: String,
    },
    dateOfJoining: {
      type: Date,
      default: null,
    },
    currentExperience: {
      type: String,
    },
    reportingManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    age: {
      type: Number,
    },
    gender: {
      type: String,
    },
    maritalStatus: {
      type: String,
    },
    aboutMe: {
      type: String,
    },
    askMe: {
      type: String,
    },
    passportNumber: {
      type: String,
    },
    passportExpiry: {
      type: Date,
      default: null,
    },
    idNumber: {
      type: String,
    },
    nationalIdExpiry: {
      type: Date,
      default: null,
    },
    aadhaarNumber: {
      type: Number,
    },
    workPhoneNo: {
      type: Number,
    },
    personalMobile: {
      type: Number,
    },
    extension: {
      type: String,
    },
    seatingLocation: {
      type: String,
    },
    tags: {
      type: String,
    },
    currentAddress: {
      type: addressSchema,
      default: null,
    },
    isPermanentSameAsCurrent: {
      type: Boolean,
      default: false,
    },
    permanentAddress: {
      type: addressSchema,
      default: null,
    },
    personalEmail: {
      type: String,
    },
    isActivated: {
      type: Boolean,
      default: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    yearlyPay: {
      type: Number,
    },
    monthlyPay: {
      type: Number,
    },
    hourlyPay: {
      type: Number,
    },
    overtimePay: {
      type: Number,
      default: 0,
    },
    dailyPay: {
      type: Number,
    },
    dailyWorkingHours: {
      type: Number,
      default: 10,
    },
    monthlyWorkingDays: {
      type: Number,
      default: 24,
    },

    govFee: {
      type: Number,
      default: 0,
    },

    invoiceRate: {
      monthlyWorkingDays: {
        type: Number,
        default: 24,
      },
      monthlyPay: {
        type: Number,
        default: 0,
      },
      hourlyPay: {
        type: Number,
        default: 0,
      },
      overtimePay: {
        type: Number,
        default: 0,
      },
      dailyWorkingHours: {
        type: Number,
        default: 10,
      },
    },

    totalCTC: {
      type: Number,
      default: 0,
    },

    wallets: [
      {
        month: {
          type: String,
          required: true,
        },
        value: {
          type: Number,
          default: 0,
        },
      },
    ],

    totalWallet: {
      type: Number,
      default: 0,
    },

    ctc: {
      accomodation: {
        value: {
          type: Number,
          default: 0,
        },
        type: {
          type: String,
          enum: ['month', 'year'],
          default: 'month',
        },
      },
      food: {
        value: {
          type: Number,
          default: 0,
        },
        type: {
          type: String,
          enum: ['month', 'year'],
          default: 'month',
        },
      },
      transportation: {
        value: {
          type: Number,
          default: 0,
        },
        type: {
          type: String,
          enum: ['month', 'year'],
          default: 'month',
        },
      },
      medical: {
        value: {
          type: Number,
          default: 0,
        },
        type: {
          type: String,
          enum: ['month', 'year'],
          default: 'month',
        },
      },
      airTickets: {
        value: {
          type: Number,
          default: 0,
        },
        type: {
          type: String,
          enum: ['month', 'year'],
          default: 'month',
        },
      },
      projectAllowance: {
        value: {
          type: Number,
          default: 0,
        },
        type: {
          type: String,
          enum: ['month', 'year'],
          default: 'month',
        },
      },
      mobileAllowance: {
        value: {
          type: Number,
          default: 0,
        },
        type: {
          type: String,
          enum: ['month', 'year'],
          default: 'month',
        },
      },
      otherAllowance: [
        {
          name: {
            type: String,
          },
          value: {
            type: Number,
            default: 0,
          },
          type: {
            type: String,
            enum: ['month', 'year'],
            default: 'month',
          },
        },
      ],
    },

    files: [
      {
        name: {
          type: String,
          default: '',
        },
        filename: {
          type: String,
          default: '',
        },
        date: {
          type: Date,
          default: Date.now, // Set the default value to the current date
        },
        notify: {
          type: Boolean,
          default: false,
        },
        expiryDate: {
          type: Date,
        },
        reminderDate: {
          type: Date,
        },
      },
    ],

    hrpFiles: [
      {
        name: {
          type: String,
          default: '',
        },
        filename: {
          type: String,
          default: '',
        },
        date: {
          type: Date,
          default: Date.now,
        },
        notify: {
          type: Boolean,
          default: false,
        },
        expiryDate: {
          type: Date,
        },
        reminderDate: {
          type: Date,
        },
      },
    ],

    salaryTaken: {
      type: Number,
      default: 0,
    },
    salaries: [
      {
        month: {
          type: String,
        },
        value: {
          type: Number,
          default: 0,
        },
      },
    ],
    advanceTaken: {
      type: Number,
      default: 0,
    },
    advances: [
      {
        month: {
          type: String,
        },
        value: {
          type: Number,
          default: 0,
        },
      },
    ],
    loanTaken: {
      type: Number,
      default: 0,
    },
    loans: [
      {
        month: {
          type: String,
        },
        value: {
          type: Number,
          default: 0,
        },
      },
    ],

    employeeGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HRMEmployeeGroup',
    },
    division: {
      type: String,
    },
    camp: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeCamp',
    },

    currProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    currJobSite: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobSite',
    },
    currJobStatus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobStatus',
    },

    projectHistory: [
      {
        project: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Project',
        },
        startDate: {
          type: Date,
        },
        endDate: {
          type: Date,
        },
        invoiceRate: {
          type: Number,
          default: 0,
        },
        payrollRate: {
          type: Number,
          default: 0,
        },
        jobSite: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'JobSite',
        },
      },
    ],

    nationality: {
      type: String,
    },
    religion: {
      type: String,
    },

    addUser: {
      type: Boolean,
      default: false,
    },

    hasEmployeeAppAccess: {
      type: Boolean,
      default: false,
    },
    username: {
      type: String,
    },
    password: {
      type: String,
    },

    hasPOSAppAccess: {
      type: Boolean,
      default: false,
    },
    posUsername: {
      type: String,
    },
    posPassword: {
      type: String,
    },

    optionalUserId: {
      type: String,
      default: '',
    },

    employeeTeam: {
      type: String,
      default: '',
    },

    embedding: {
      type: [Number],
      index: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

EmployeeSchema.index({
  organization: 1,
  company: 1,
});

EmployeeSchema.index({ idNumber: 1, organization: 1 }, { unique: true });

EmployeeSchema.plugin(mongoosePaginate);

// Add method to generate and store embeddings
EmployeeSchema.methods.generateEmbedding = async function () {
  try {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const department = await mongoose
      .model('EmployeeDepartment')
      .findById(this.department);
    const employeeGroup = await mongoose
      .model('HRMEmployeeGroup')
      .findById(this.employeeGroup);
    const camp = await mongoose.model('EmployeeCamp').findById(this.camp);
    const project = await mongoose.model('Project').findById(this.currProject);
    const jobSite = await mongoose.model('JobSite').findById(this.currJobSite);
    const jobStatus = await mongoose
      .model('JobStatus')
      .findById(this.currJobStatus);

    // Create text representation of employee data for embedding
    const employeeText = `
      Name: ${this.firstName} ${this.lastName}
      Email: ${this.email}
      Department: ${department?.name || ''}
      Employee Group: ${employeeGroup?.name || ''}
      Designation: ${this.designation}
      Role: ${this.role}
      Role Code: ${this.roleCode}
      Passport Number: ${this.passportNumber}
      National id: ${this.idNumber}
      Camp: ${camp?.name || ''}
      Nationality: ${this.nationality}
      Current Project: ${project?.name || ''}
      Current Job Site: ${jobSite?.name || ''}
      Current Job Status: ${jobStatus?.name || ''}
      Organization ID: ${this.organization}
    `;

    // Generate embedding
    const embedding = await embeddings.embedQuery(employeeText);

    // Store embedding in the document
    this.embedding = embedding;
    await this.save();

    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
};

module.exports = mongoose.model('Employee', EmployeeSchema);
