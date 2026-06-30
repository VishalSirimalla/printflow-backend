const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const pricingSchema = new mongoose.Schema(
  {
    blackWhitePrice:       { type: Number, default: 1.5,  min: 0 },
    colorPrice:            { type: Number, default: 5.0,  min: 0 },
    a3Price:               { type: Number, default: 10.0, min: 0 },
    legalPrice:            { type: Number, default: 8.0,  min: 0 },
    duplexCharge:          { type: Number, default: 0.5,  min: 0 },
    spiralBindingCharge:   { type: Number, default: 30.0, min: 0 },
    hardBindingCharge:     { type: Number, default: 80.0, min: 0 },
    singlePageLamination:  { type: Number, default: 15.0, min: 0 },
    documentLamination:    { type: Number, default: 50.0, min: 0 },
    minimumOrderCharge:    { type: Number, default: 10.0, min: 0 },
  },
  { _id: false }
);

const adminSchema = new mongoose.Schema(
  {
    shopName:             { type: String, required: true, trim: true },
    ownerName:            { type: String, required: true, trim: true },
    email:                { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:                { type: String, required: true, trim: true },
    password:             { type: String, required: true, minlength: 6, select: false },
    shopAddress:          { type: String, required: true, trim: true },
    role:                 { type: String, default: 'admin' },
    rating:               { type: Number, default: 4.5, min: 0, max: 5 },
    isOpen:               { type: Boolean, default: true },
    holidayMode:          { type: Boolean, default: false },
    openingTime:          { type: String, default: '09:00' },
    closingTime:          { type: String, default: '20:00' },
    pricing:              { type: pricingSchema, default: () => ({}) },
    resetPasswordToken:   { type: String, select: false },
    resetPasswordExpire:  { type: Date,   select: false },
  },
  { timestamps: true }
);

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

adminSchema.methods.createPasswordResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken  = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000;
  return rawToken;
};

adminSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  return obj;
};

module.exports = mongoose.model('Admin', adminSchema);
