const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    mobileNumber: { type: String, trim: true, default: '' },
    whatsappNumber: { type: String, trim: true },
    bloodGroup: { type: String, default: '' },
    country: { type: String, default: '' },
    state: { type: String, default: '' },
    district: { type: String, default: '' },
    streetAddress: { type: String, default: '' },
    pincode: { type: String, default: '' },
    terms: { type: Boolean, default: false },
    dataConsent: { type: Boolean, default: false },
    donationOpportunities: { type: Boolean, default: false },
    emergencyContact: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

donorSchema.index({ bloodGroup: 1, country: 1, state: 1, district: 1, isAvailable: 1 });
donorSchema.index({ mobileNumber: 1 });
donorSchema.index({ role: 1 });

module.exports = mongoose.model('Donor', donorSchema);
