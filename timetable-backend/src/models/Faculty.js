const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  clerkUserId: {
    type: String,
    unique: true,
    sparse: true
  },
  facultyId: {
    type: String,
    required: [true, 'Faculty ID is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  designation: {
    type: String,
    enum: ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Guest Faculty'],
    required: [true, 'Designation is required']
  },
  specialization: [String],
  contactNumber: {
    type: String,
    trim: true
  },
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

// Index for quick lookups
facultySchema.index({ department: 1 });

module.exports = mongoose.model('Faculty', facultySchema);
