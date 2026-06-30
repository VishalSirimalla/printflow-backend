const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const studentSchema = new mongoose.Schema(
  {
    fullName:             { type: String, required: true, trim: true },
    college:              { type: String, required: true, trim: true },
    email:                { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:                { type: String, required: true, trim: true },
    password:             { type: String, required: true, minlength: 6, select: false },
    role:                 { type: String, default: 'student' },
    resetPasswordToken:   { type: String, select: false },
    resetPasswordExpire:  { type: Date,   select: false },
  },
  { timestamps: true }
);

studentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

studentSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Generate a raw token, store its SHA-256 hash, return the raw token to send in email
studentSchema.methods.createPasswordResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken  = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
  return rawToken;
};

studentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  return obj;
};

module.exports = mongoose.model('Student', studentSchema);
