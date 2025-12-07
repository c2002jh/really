const mongoose = require('mongoose');

const analysisResultSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: false,
      default: 'anonymous',
    },
    filePaths: {
      eeg1: { type: String, required: true },
      eeg2: { type: String, required: true },
      ecg: { type: String, required: true },
      gsr: { type: String, required: true },
    },
    thetaPower: {
      type: Number,
      required: true,
    },
    hrv: {
      type: Number,
      required: true,
    },
    p300Latency: {
      type: Number,
      required: true,
    },
    engagement: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    arousal: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    valence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    overallPreference: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AnalysisResult', analysisResultSchema);
