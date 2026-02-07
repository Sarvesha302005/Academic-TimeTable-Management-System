const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  slotNumber: {
    type: Number,
    required: [true, 'Slot number is required'],
    min: 1
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    validate: {
      validator: function (v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Invalid time format. Use HH:MM'
    }
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    validate: {
      validator: function (v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Invalid time format. Use HH:MM'
    }
  },
  duration: {
    type: Number,
    required: [true, 'Duration in minutes is required'],
    min: 15
  },
  isBreak: {
    type: Boolean,
    default: false
  },
  breakType: {
    type: String,
    enum: ['short', 'lunch', null],
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Unique slot number constraint
timeSlotSchema.index({ slotNumber: 1 }, { unique: true });

module.exports = mongoose.model('TimeSlot', timeSlotSchema);