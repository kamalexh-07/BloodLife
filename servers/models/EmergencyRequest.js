const mongoose = require('mongoose');

const emergencyRequestSchema = new mongoose.Schema(
  {
    patientName: { type: String, required: true, trim: true },
    bloodGroup: { type: String, required: true },
    country: { type: String, required: true },
    state: { type: String, required: true },
    district: { type: String, required: true },
    hospitalName: { type: String, required: true, trim: true },
    hospitalAddress: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    whatsappNumber: { type: String, trim: true },
    status: {
      type: String,
      enum: ['Open', 'Urgent', 'Fulfilled'],
      default: 'Open',
    },
  },
  { timestamps: true }
);

emergencyRequestSchema.index({ createdAt: -1 });
emergencyRequestSchema.index({ status: 1, bloodGroup: 1 });

module.exports = mongoose.model('EmergencyRequest', emergencyRequestSchema);
