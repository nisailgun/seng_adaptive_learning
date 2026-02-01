import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String }, // Optional for OAuth users
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  email: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  
  // OAuth fields
  googleId: { type: String, unique: true, sparse: true },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  profilePicture: { type: String },
  
  // Email verification
  emailVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  
  // GDPR Consent (FR19)
  dataProcessingConsent: { type: Boolean, default: true },
  marketingConsent: { type: Boolean, default: false },
  analyticsConsent: { type: Boolean, default: true },
  consentDate: { type: Date, default: Date.now },
  consentUpdatedAt: { type: Date }
}, { timestamps: true });

// Pre-save middleware to hash password only if it's been modified and is not already hashed
UserSchema.pre('save', async function(next) {
  // Skip hashing if password wasn't modified or doesn't exist
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  // Skip if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$') || this.password.startsWith('$2y$')) {
    return next();
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(this.password, 10);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export default UserModel;
