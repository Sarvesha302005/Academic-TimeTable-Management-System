const mongoose = require('mongoose');

const facultyLeaveSchema = new mongoose.Schema({
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: [true, 'Faculty is required']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value >= this.startDate;
      },
      message: 'End date must be after or equal to start date'
    }
  },
  leaveType: {
    type: String,
    enum: ['casual', 'sick', 'earned', 'maternity', 'paternity', 'other'],
    required: [true, 'Leave type is required']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: String,
    trim: true
  },
  approvalDate: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  affectedClasses: [{
    timetableEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Timetable'
    },
    date: Date,
    slot: Number
  }],
  substituteArrangement: {
    isArranged: {
      type: Boolean,
      default: false
    },
    substituteFaculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty'
    }
  }
}, {
  timestamps: true
});

// Index for quick faculty leave queries
facultyLeaveSchema.index({ faculty: 1, startDate: 1, endDate: 1 });
facultyLeaveSchema.index({ status: 1 });

module.exports = mongoose.model('FacultyLeave', facultyLeaveSchema);