const mongoose = require('mongoose');

const timetableAdjustmentSchema = new mongoose.Schema({
    academicCalendar: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicCalendar',
        required: true
    },
    timetable: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Timetable',
        required: true
    },
    leave: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FacultyLeave',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    day: {
        type: String, // Monday, Tuesday, etc.
        required: true
    },
    slot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TimeSlot',
        required: true
    },
    slotNumber: {
        type: Number,
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    faculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        required: true
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    type: {
        type: String
    },
    year: {
        type: Number,
        required: true
    },
    section: {
        type: String,
        required: true
    },
    isCancellation: {
        type: Boolean,
        default: false
    },
    isCompensation: {
        type: Boolean,
        default: false
    },
    originalDate: {
        type: Date // The original date that was missed (for compensations)
    }
}, {
    timestamps: true
});

// Index for quick queries by date and academic calendar
timetableAdjustmentSchema.index({ academicCalendar: 1, date: 1 });
timetableAdjustmentSchema.index({ timetable: 1, date: 1 });

module.exports = mongoose.model('TimetableAdjustment', timetableAdjustmentSchema);
