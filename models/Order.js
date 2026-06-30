const mongoose = require('mongoose');

const printSettingsSchema = new mongoose.Schema(
  {
    color: { type: String, enum: ['bw', 'color'], default: 'bw' },
    printSide: { type: String, enum: ['single', 'double'], default: 'single' },
    orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
    paperSize: { type: String, enum: ['A4', 'A3'], default: 'A4' },
    pageRange: { type: String, default: 'all' },
    copies: { type: Number, default: 1, min: 1 },
    additionalNotes: { type: String, default: '' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    file: {
      fileName: { type: String, required: true },
      fileUrl: { type: String, required: true },
      fileSize: { type: Number },
      totalPages: { type: Number, default: 1 },
      publicId: { type: String },
    },
    printSettings: { type: printSettingsSchema, required: true },
    pricing: {
      pricePerPage: { type: Number, required: true },
      totalPages: { type: Number, required: true },
      copies: { type: Number, required: true },
      subtotal: { type: Number, required: true },
      serviceFee: { type: Number, default: 0.5 },
      grandTotal: { type: Number, required: true },
    },
    otp: { type: String },
    otpVerified: { type: Boolean, default: false },
    otpVerifiedAt: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'waiting_otp', 'otp_verified', 'printing', 'ready', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentMethod: { type: String, default: 'pay_at_shop' },
  },
  { timestamps: true }
);

// Generate unique order ID before saving
orderSchema.pre('save', function () {
  if (!this.orderId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderId = `PF-${timestamp}-${random}`;
  }
});

module.exports = mongoose.model('Order', orderSchema);
