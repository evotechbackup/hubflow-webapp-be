const mongoose = require('mongoose');
const crypto = require('crypto');

const EmailCredentialsSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    emailAccount: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    authMethod: {
      type: String,
      enum: ['password', 'oauth2', 'app_password'],
      default: 'password',
    },

    imap: {
      username: {
        type: String,
        // required: true,
        trim: true,
      },
      password: {
        type: String,
        // required: true,
      },
      enabled: {
        type: Boolean,
        default: true,
      },
      tls: {
        type: Boolean,
        default: true,
      },
    },

    smtp: {
      username: {
        type: String,
        // required: true,
        trim: true,
      },
      password: {
        type: String,
        // required: true,
      },
      enabled: {
        type: Boolean,
        default: true,
      },
      secure: {
        type: Boolean,
        default: false,
      },
    },

    // OAuth2 Configuration (for Gmail, Outlook, etc.)
    oauth2: {
      clientId: String,
      clientSecret: String,
      refreshToken: String,
      accessToken: String,
      tokenExpiry: Date,
      scope: [String],
      // Provider-specific
      tenantId: String, // For Microsoft/Outlook
      redirectUri: String,
    },

    // Account status and metadata
    isActive: {
      type: Boolean,
      default: true,
    },

    // Optional: Encryption key reference for additional security
    encryptionKeyId: {
      type: String,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        organizationId: 1,
        user: 1,
        emailAccount: 1,
      },
    ],
  }
);

// Compound index for unique constraint
EmailCredentialsSchema.index(
  { organizationId: 1, user: 1, emailAccount: 1 },
  { unique: true }
);

// Index for efficient queries
EmailCredentialsSchema.index({ organizationId: 1, isActive: 1 });
EmailCredentialsSchema.index({ user: 1, isActive: 1 });

// Pre-save middleware to encrypt passwords
EmailCredentialsSchema.pre('save', function (next) {
  try {
    // Only encrypt if passwords are modified
    if (this.isModified('imap.password') && this.imap.password) {
      this.imap.password = encryptPassword(this.imap.password);
    }

    if (this.isModified('smtp.password') && this.smtp.password) {
      this.smtp.password = encryptPassword(this.smtp.password);
    }

    if (this.isModified('oauth2.accessToken') && this.oauth2?.accessToken) {
      this.oauth2.accessToken = encryptPassword(this.oauth2.accessToken);
    }

    if (this.isModified('oauth2.refreshToken') && this.oauth2?.refreshToken) {
      this.oauth2.refreshToken = encryptPassword(this.oauth2.refreshToken);
    }

    if (this.isModified('oauth2.clientSecret') && this.oauth2?.clientSecret) {
      this.oauth2.clientSecret = encryptPassword(this.oauth2.clientSecret);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Method to decrypt passwords when needed
EmailCredentialsSchema.methods.getDecryptedCredentials = function () {
  try {
    const result = {
      imap: {
        ...this.imap.toObject(),
        password: this.imap.password
          ? decryptPassword(this.imap.password)
          : null,
      },
      smtp: {
        ...this.smtp.toObject(),
        password: this.smtp.password
          ? decryptPassword(this.smtp.password)
          : null,
      },
    };

    // Include OAuth2 credentials if available
    if (this.oauth2) {
      result.oauth2 = {
        ...this.oauth2.toObject(),
        accessToken: this.oauth2.accessToken
          ? decryptPassword(this.oauth2.accessToken)
          : null,
        refreshToken: this.oauth2.refreshToken
          ? decryptPassword(this.oauth2.refreshToken)
          : null,
        clientSecret: this.oauth2.clientSecret
          ? decryptPassword(this.oauth2.clientSecret)
          : null,
      };
    }

    return result;
  } catch (error) {
    console.error('Error decrypting credentials:', error);
    throw new Error('Failed to decrypt credentials');
  }
};

// Static method to find credentials by organization and client
EmailCredentialsSchema.statics.findByOrganizationAndClient = function (
  organizationId,
  user
) {
  return this.find({
    organizationId,
    user,
    isActive: true,
  });
};

// Static method to find credentials by email account
EmailCredentialsSchema.statics.findByEmailAccount = function (
  organizationId,
  emailAccount
) {
  return this.findOne({
    organizationId,
    emailAccount,
    isActive: true,
  });
};

function getEncryptionKey() {
  const key = process.env.EMAIL_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('EMAIL_ENCRYPTION_KEY environment variable is required');
  }

  // Ensure key is 32 bytes for AES-256
  return crypto.scryptSync(key, 'salt', 32);
}

// Encryption/Decryption functions (secure implementation)
function encryptPassword(password) {
  if (!password) return password;

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16); // 16 bytes for CBC

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Error encrypting password:', error);
    throw new Error('Failed to encrypt password');
  }
}

function decryptPassword(encryptedPassword) {
  if (!encryptedPassword) return encryptedPassword;

  try {
    const key = getEncryptionKey();

    const parts = encryptedPassword.split(':');

    if (parts.length !== 2) {
      throw new Error('Invalid encrypted password format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Error decrypting password:', error);
    throw new Error('Failed to decrypt password');
  }
}

// Virtual for getting organization details
EmailCredentialsSchema.virtual('organization', {
  ref: 'Organization',
  localField: 'organizationId',
  foreignField: '_id',
  justOne: true,
});

// Ensure virtual fields are serialized
EmailCredentialsSchema.set('toJSON', { virtuals: true });
EmailCredentialsSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('EmailCredentials', EmailCredentialsSchema);
