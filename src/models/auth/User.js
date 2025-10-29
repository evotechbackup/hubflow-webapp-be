const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [3, 'Full name must be at least 3 characters long'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
      match: [
        /^[a-zA-Z0-9_ ]+$/,
        'Full name can only contain letters, numbers, underscores, and spaces',
      ],
    },
    userName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please enter a valid email address',
      ],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    role: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      min: 3,
      max: 20,
    },
    profilePic: {
      type: String,
      default: '',
    },
    signature: {
      type: String,
      default: '',
    },
    employeeId: {
      type: String,
      default: '',
    },
    userid: {
      type: String,
      unique: true,
    },
    deactivated: {
      type: Boolean,
      default: false,
    },

    lastLogin: {
      type: Date,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },

    customer: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
      },
    ],

    vendor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
      },
    ],

    properties: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CRMProperties',
      },
    ],

    twoFactor: {
      type: Boolean,
      default: false,
    },
    hierarchy: {
      type: Number,
      default: 4,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save middleware to hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Hash password with cost of 12
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    return next();
  } catch (error) {
    return next(error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch {
    throw new Error('Password comparison failed');
  }
};

// Instance method for user serialization (removes sensitive data)
userSchema.methods.toSafeObject = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.__v;
  return userObject;
};

// Static method to find user by email or username
userSchema.statics.findByCredentials = async function (identifier) {
  const user = await this.findOne({
    $or: [{ email: identifier }, { userName: identifier }],
    deactivated: false,
  });
  return user;
};

// Virtual for user's full profile (excluding password)
userSchema.virtual('profile').get(function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    deactivated: this.deactivated,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
});

const User = mongoose.model('User', userSchema);

module.exports = User;
