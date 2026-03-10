const timetableService = require('../services/timetableService');
const Timetable = require('../models/Timetable');
const Faculty = require('../models/Faculty');
const AcademicCalendar = require('../models/AcademicCalendar');
const TimetableAdjustment = require('../models/TimetableAdjustment');

class TimetableController {

  // ================= ADMIN =================

  // Generate timetable (Admin)
  async generateTimetable(req, res, next) {
    try {
      const { academicCalendarId } = req.body;

      if (!academicCalendarId) {
        return res.status(400).json({
          success: false,
          error: 'Academic calendar ID is required'
        });
      }

      console.log(`Generating timetable for academicCalendarId: ${academicCalendarId}`);

      // Call the service - it now returns just the timetable
      const timetable = await timetableService.generateTimetable(academicCalendarId);

      if (!timetable) {
        return res.status(500).json({
          success: false,
          error: 'Timetable generation failed - no data returned'
        });
      }

      console.log(`Timetable generated successfully with ID: ${timetable._id}`);

      // Populate the timetable for response
      const populatedTimetable = await Timetable.findById(timetable._id)
        .populate('entries.slot')
        .populate('entries.course')
        .populate('entries.faculty')
        .populate('entries.room')
        .populate('academicCalendar');

      if (!populatedTimetable) {
        return res.status(500).json({
          success: false,
          error: 'Timetable generated but not found after population'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Timetable generated successfully',
        data: populatedTimetable,
        generationTime: timetable.metadata?.generationTime || 0,
        statistics: timetable.statistics || {}
      });

    } catch (error) {
      console.error('Error in generateTimetable controller:', error);
      next(error);
    }
  }

  // Get timetable (Admin view)
  async getTimetable(req, res, next) {
    try {
      const { academicCalendarId, date } = req.query;

      if (!academicCalendarId) {
        return res.status(400).json({
          success: false,
          error: 'Academic calendar ID is required'
        });
      }
      const query = { academicCalendar: academicCalendarId };
      if (date) {
        query.status = 'locked';
      } else {
        query.status = { $in: ['generated', 'locked'] };
      }

      const timetable = await Timetable.findOne(query)
        .sort(date ? { lockedAt: -1 } : { updatedAt: -1 })
        .populate('entries.slot')
        .populate('entries.course')
        .populate('entries.faculty')
        .populate('entries.room')
        .populate('academicCalendar');

      if (!timetable) {
        return res.status(404).json({
          success: false,
          error: 'Timetable not found'
        });
      }

      let entries = timetable.entries.map(e => ({ ...e.toObject(), isMaster: true }));
      // Prepare a result container that will hold entries and statistics
      let result = {
        _id: timetable._id,
        status: timetable.status,
        academicCalendar: timetable.academicCalendar,
        entries: [],
        statistics: timetable.statistics || {}
      };
      let startDate, endDate;

      if (date) {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        // Find Monday of that week
        const day = targetDate.getDay();
        const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(targetDate.setDate(diff));
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 5); // To Saturday
        endDate.setHours(23, 59, 59, 999);

        const adjustments = await TimetableAdjustment.find({
          academicCalendar: academicCalendarId,
          date: { $gte: startDate, $lte: endDate }
        }).populate('slot course faculty room');

        const adjustedEntries = [];
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        days.forEach((dayName, dayIdx) => {
          const currentDayDate = new Date(startDate);
          currentDayDate.setDate(startDate.getDate() + dayIdx);
          const dateStr = currentDayDate.toDateString();

          // Get master entries for this day
          const dayMasterEntries = entries.filter(e => e.day === dayName);

          // Get adjustments for this specific date
          const dayAdjustments = adjustments.filter(a => a.date.toDateString() === dateStr);

          // Apply adjustments
          dayMasterEntries.forEach(me => {
            const cancellation = dayAdjustments.find(a =>
              a.slotNumber === me.slotNumber &&
              a.isCancellation &&
              a.year === me.year &&
              a.section === me.section
            );
            if (!cancellation) {
              adjustedEntries.push({ ...me, displayDate: dateStr });
            }
          });

          // Add compensations
          dayAdjustments.filter(a => a.isCompensation).forEach(comp => {
            adjustedEntries.push({
              ...comp.toObject(),
              displayDate: dateStr,
              isAdjustment: true
            });
          });
        });
        entries = adjustedEntries;

        // Recalculate statistics for the dated view
        const facultyDistribution = {};
        const roomDistribution = {};
        entries.forEach(e => {
          const fId = e.faculty?._id || e.faculty;
          const rId = e.room?._id || e.room;
          if (fId) {
            facultyDistribution[fId] = (facultyDistribution[fId] || 0) + 1;
          }
          if (rId) {
            const rNum = e.room?.roomNumber || rId;
            roomDistribution[rNum] = (roomDistribution[rNum] || 0) + 1;
          }
        });

        result.statistics = {
          ...timetable.statistics,
          facultyDistribution,
          roomDistribution,
          totalClasses: entries.length
        };
      }

      result.entries = entries;

      // If no date was provided, just return the master timetable entries and existing statistics
      if (!date) {
        result.statistics = timetable.statistics || {};
      }

      res.status(200).json({
        success: true,
        data: result,
        isDated: !!date,
        weekRange: date ? { start: startDate, end: endDate } : null
      });

    } catch (error) {
      next(error);
    }
  }

  // Get timetable statistics (Admin)
  async getTimetableStatistics(req, res, next) {
    try {
      const { academicCalendarId } = req.query;

      if (!academicCalendarId) {
        return res.status(400).json({
          success: false,
          error: 'Academic calendar ID is required'
        });
      }

      const timetable = await Timetable.findOne({
        academicCalendar: academicCalendarId,
        status: { $in: ['generated', 'locked'] }
      })
        .sort({ updatedAt: -1 });

      if (!timetable) {
        return res.status(404).json({
          success: false,
          error: 'Timetable not found'
        });
      }

      res.status(200).json({
        success: true,
        data: timetable.statistics
      });

    } catch (error) {
      next(error);
    }
  }

  // Get conflicts (Admin)
  async getConflicts(req, res, next) {
    try {
      const { academicCalendarId } = req.query;

      if (!academicCalendarId) {
        return res.status(400).json({
          success: false,
          error: 'Academic calendar ID is required'
        });
      }

      const timetable = await Timetable.findOne({ academicCalendar: academicCalendarId });

      if (!timetable) {
        return res.status(404).json({
          success: false,
          error: 'Timetable not found'
        });
      }

      res.status(200).json({
        success: true,
        data: timetable.conflicts || []
      });

    } catch (error) {
      next(error);
    }
  }

  // ================= FACULTY =================

  /**
   *  faculty timetable
   * - fetch full timetable
   * - filter entries in JS (safe & reliable)
   * - return day-wise formatted data
   */
  async getFacultyTimetable(req, res, next) {
    try {
      const { academicCalendarId } = req.query;

      if (!academicCalendarId) {
        return res.status(400).json({
          success: false,
          error: 'Academic calendar ID is required'
        });
      }

      const faculty = await Faculty.findOne({ clerkUserId: req.userId });
      if (!faculty) {
        return res.status(404).json({ success: false, error: 'Faculty profile not found' });
      }

      const { date } = req.query;
      let startDate, endDate;

      if (date) {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        // Find Monday of that week
        const day = targetDate.getDay();
        const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(targetDate.setDate(diff));
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 5); // To Saturday
        endDate.setHours(23, 59, 59, 999);
      }

      const timetable = await Timetable.findOne({ academicCalendar: academicCalendarId, status: 'locked' })
        .sort({ lockedAt: -1 })
        .populate('entries.slot entries.course entries.faculty entries.room');

      if (!timetable) {
        return res.status(404).json({ success: false, error: 'Timetable not generated yet' });
      }

      // 🔑 Get master entries for THIS faculty
      let entries = timetable.entries
        .filter(e => e.faculty && e.faculty._id.toString() === faculty._id.toString())
        .map(e => ({ ...e.toObject(), isMaster: true }));

      // 🔑 If date is provided, MERGE with adjustments
      if (date) {
        const adjustments = await TimetableAdjustment.find({
          faculty: faculty._id,
          date: { $gte: startDate, $lte: endDate }
        }).populate('slot course faculty room');

        const adjustedEntries = [];
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        days.forEach((dayName, dayIdx) => {
          const currentDayDate = new Date(startDate);
          currentDayDate.setDate(startDate.getDate() + dayIdx);
          const dateStr = currentDayDate.toDateString();

          // Get master entries for this day
          const dayMasterEntries = entries.filter(e => e.day === dayName);

          // Get adjustments for this specific date
          const dayAdjustments = adjustments.filter(a => a.date.toDateString() === dateStr);

          // Apply adjustments
          dayMasterEntries.forEach(me => {
            const cancellation = dayAdjustments.find(a => a.slotNumber === me.slotNumber && a.isCancellation);
            if (!cancellation) {
              adjustedEntries.push({ ...me, displayDate: dateStr });
            }
          });

          // Add compensations
          dayAdjustments.filter(a => a.isCompensation).forEach(comp => {
            adjustedEntries.push({
              ...comp.toObject(),
              displayDate: dateStr,
              isAdjustment: true
            });
          });
        });
        entries = adjustedEntries;
      }

      // 🔑 Format day-wise
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const formatted = {};

      days.forEach(day => {
        const dayEntries = entries.filter(e => e.day === day);
        formatted[day] = dayEntries
          .sort((a, b) => a.slotNumber - b.slotNumber)
          .map(e => ({
            slotNumber: e.slotNumber,
            course: {
              code: e.course.courseCode,
              name: e.course.courseName
            },
            year: e.year,
            section: e.section,
            room: {
              number: e.room.roomNumber,
              building: e.room.building
            },
            isAdjustment: e.isAdjustment || false,
            displayDate: e.displayDate
          }));
      });

      res.status(200).json({
        success: true,
        data: {
          faculty: { name: faculty.name, department: faculty.department },
          timetable: formatted,
          isDated: !!date,
          weekRange: date ? { start: startDate, end: endDate } : null
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // ================= STUDENT =================

  // Get student timetable
  async getStudentTimetable(req, res, next) {
    try {
      const { academicCalendarId, year: yearStr, section, date } = req.query;
      const year = parseInt(yearStr);

      if (!academicCalendarId || !year || !section) {
        return res.status(400).json({ success: false, error: 'Academic calendar ID, year, and section are required' });
      }

      let startDate, endDate;
      if (date) {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const day = targetDate.getDay();
        const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(targetDate.setDate(diff));
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 5);
        endDate.setHours(23, 59, 59, 999);
      }

      const timetable = await Timetable.findOne({ academicCalendar: academicCalendarId, status: 'locked' })
        .sort({ lockedAt: -1 })
        .populate('entries.slot entries.course entries.faculty entries.room');

      if (!timetable) {
        return res.status(404).json({ success: false, error: 'Timetable not found' });
      }

      // 🔑 Filter master entries
      let entries = timetable.entries.filter(e =>
        e.year === year && e.section?.toUpperCase() === section.toUpperCase()
      ).map(e => ({ ...e.toObject(), isMaster: true }));

      // 🔑 Merge with adjustments
      if (date) {
        const adjustments = await TimetableAdjustment.find({
          year,
          section,
          date: { $gte: startDate, $lte: endDate }
        }).populate('slot course faculty room');

        const adjustedEntries = [];
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        days.forEach((dayName, dayIdx) => {
          const currentDayDate = new Date(startDate);
          currentDayDate.setDate(startDate.getDate() + dayIdx);
          const dateStr = currentDayDate.toDateString();

          const dayMasterEntries = entries.filter(e => e.day === dayName);
          const dayAdjustments = adjustments.filter(a => a.date.toDateString() === dateStr);

          dayMasterEntries.forEach(me => {
            const cancellation = dayAdjustments.find(a => a.slotNumber === me.slotNumber && a.isCancellation);
            if (!cancellation) {
              adjustedEntries.push({ ...me, displayDate: dateStr });
            }
          });

          dayAdjustments.filter(a => a.isCompensation).forEach(comp => {
            adjustedEntries.push({
              ...comp.toObject(),
              displayDate: dateStr,
              isAdjustment: true
            });
          });
        });
        entries = adjustedEntries;
      }

      // 🔑 Format day-wise
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const formatted = {};

      days.forEach(day => {
        const dayEntries = entries.filter(e => e.day === day);
        formatted[day] = dayEntries
          .sort((a, b) => a.slotNumber - b.slotNumber)
          .map(e => ({
            slotNumber: e.slotNumber,
            time: e.slot.startTime + ' - ' + e.slot.endTime,
            course: {
              code: e.course.courseCode,
              name: e.course.courseName
            },
            faculty: e.faculty ? e.faculty.name : 'Unknown',
            room: {
              number: e.room.roomNumber,
              building: e.room.building
            },
            isAdjustment: e.isAdjustment || false,
            displayDate: e.displayDate
          }));
      });

      res.status(200).json({
        success: true,
        data: {
          year,
          section,
          timetable: formatted,
          isDated: !!date,
          weekRange: date ? { start: startDate, end: endDate } : null
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // ================= COMMON =================

  async getActiveCalendar(req, res, next) {
    try {
      const calendar = await AcademicCalendar.findOne({ isActive: true });

      if (!calendar) {
        return res.status(404).json({
          success: false,
          error: 'No active academic calendar found'
        });
      }

      res.status(200).json({
        success: true,
        data: calendar
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TimetableController();
