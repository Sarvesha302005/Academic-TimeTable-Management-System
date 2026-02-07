const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: [true, 'Room number is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  roomType: {
    type: String,
    enum: ['classroom', 'lab', 'seminar_hall', 'auditorium'],
    required: [true, 'Room type is required']
  },
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: 1
  },
  building: {
    type: String,
    trim: true
  },
  floor: {
    type: Number
  },
  facilities: [{
    type: String,
    enum: ['projector', 'smartboard', 'computers', 'ac', 'audio_system', 'lab_equipment']
  }],
  availability: {
    Monday: [{
      slotNumber: Number,
      available: { type: Boolean, default: true }
    }],
    Tuesday: [{
      slotNumber: Number,
      available: { type: Boolean, default: true }
    }],
    Wednesday: [{
      slotNumber: Number,
      available: { type: Boolean, default: true }
    }],
    Thursday: [{
      slotNumber: Number,
      available: { type: Boolean, default: true }
    }],
    Friday: [{
      slotNumber: Number,
      available: { type: Boolean, default: true }
    }],
    Saturday: [{
      slotNumber: Number,
      available: { type: Boolean, default: true }
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for room type queries
roomSchema.index({ roomType: 1 });

module.exports = mongoose.model('Room', roomSchema);