const timetableService = require('../services/timetableService');
const Timetable = require('../models/Timetable');
const Faculty = require('../models/Faculty');
const AcademicCalendar = require('../models/AcademicCalendar');

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
      const { academicCalendarId } = req.query;

      if (!academicCalendarId) {
        return res.status(400).json({
          success: false,
          error: 'Academic calendar ID is required'
        });
      }

      const timetable = await Timetable.findOne({ academicCalendar: academicCalendarId })
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

      res.status(200).json({
        success: true,
        data: timetable
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

      const faculty = await Faculty.findOne({
        $or: [
          { facultyId: req.user.facultyId },
          { email: req.user.email }
        ]
      });

      if (!faculty) {
        return res.status(404).json({
          success: false,
          error: 'Faculty profile not found'
        });
      }

      // Fetch FULL timetable
      const timetable = await Timetable.findOne({ academicCalendar: academicCalendarId })
        .sort({ updatedAt: -1 })
        .populate('entries.slot')
        .populate('entries.course')
        .populate('entries.faculty')
        .populate('entries.room');

      if (!timetable) {
        return res.status(404).json({
          success: false,
          error: 'Timetable not generated yet'
        });
      }

      // Filter entries for THIS faculty
      const facultyEntries = timetable.entries.filter(
        e => e.faculty && e.faculty._id.toString() === faculty._id.toString()
      );

      if (!facultyEntries.length) {
        return res.status(200).json({
          success: true,
          data: {
            faculty: {
              name: faculty.name,
              department: faculty.department
            },
            timetable: {}
          }
        });
      }

      // Format day-wise
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const formatted = {};

      days.forEach(day => {
        formatted[day] = facultyEntries
          .filter(e => e.day === day)
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
            }
          }));
      });

      res.status(200).json({
        success: true,
        data: {
          faculty: {
            name: faculty.name,
            department: faculty.department
          },
          timetable: formatted
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
      const { academicCalendarId, year, section } = req.query;

      if (!academicCalendarId || !year || !section) {
        return res.status(400).json({
          success: false,
          error: 'Academic calendar ID, year, and section are required'
        });
      }

      const timetable = await timetableService.getTimetableByYearSection(
        academicCalendarId,
        parseInt(year),
        section
      );

      if (!timetable) {
        return res.status(404).json({
          success: false,
          error: 'Timetable not found for this year and section'
        });
      }

      // Format day-wise
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const formatted = {};

      days.forEach(day => {
        formatted[day] = (timetable.entries || [])
          .filter(e => e.day === day)
          .sort((a, b) => a.slotNumber - b.slotNumber)
          .map(e => ({
            slotNumber: e.slotNumber,
            time: e.slot.startTime + ' - ' + e.slot.endTime,
            course: {
              code: e.course.courseCode,
              name: e.course.courseName
            },
            faculty: e.faculty.name,
            room: {
              number: e.room.roomNumber,
              building: e.room.building
            }
          }));
      });

      res.status(200).json({
        success: true,
        data: {
          year,
          section,
          timetable: formatted
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
