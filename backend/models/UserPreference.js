const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    genres: {
      type: [String],
      required: true,
      validate: {
        validator: function(v) {
          return v && v.length > 0;
        },
        message: 'At least one genre must be provided',
      },
    },
    topArtists: {
      type: [String],
      default: [],
    },
    topTracks: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('UserPreference', userPreferenceSchema);
