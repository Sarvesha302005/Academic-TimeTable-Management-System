const timetableService = require('../services/timetableService');

class StudentController {
  // Raw timetable (optional)
  async viewTimetable(req, res, next) {
    try {
      const { academicCalendarId, year, section } = req.query;

      if (!academicCalendarId || !year || !section) {
        return res.status(400).json({
          success: false,
          error: 'Academic calendar ID, year, and section are required'
        });
      }

      const timetable =
        await timetableService.getTimetableByYearSection(
          academicCalendarId,
          parseInt(year),
          section
        );

      if (!timetable || timetable.status !== 'locked') {
        return res.status(404).json({
          success: false,
          error: 'Timetable not published yet'
        });
      }

      res.status(200).json({ success: true, data: timetable });
    } catch (error) {
      next(error);
    }
  }

  // ✅ MAIN ENDPOINT USED BY FRONTEND
  async getFormattedTimetable(req, res, next) {
    try {
      const { academicCalendarId, year, section } = req.query;

      if (!academicCalendarId || !year || !section) {
        return res.status(400).json({
          success: false,
          error: 'Academic calendar ID, year, and section are required'
        });
      }

      const timetable =
        await timetableService.getTimetableByYearSection(
          academicCalendarId,
          parseInt(year),
          section
        );

      if (!timetable || !['generated', 'locked'].includes(timetable.status)) {
        return res.status(404).json({
          success: false,
          error: 'Timetable not available'
        });
      }

      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const formatted = {};

      days.forEach(day => {
        formatted[day] = timetable.entries
          .filter(e => e.day === day)
          .sort((a, b) => a.slotNumber - b.slotNumber)
          .map(e => ({
            slotNumber: e.slotNumber,
            slot: {
              startTime: e.slot?.startTime || '?',
              endTime: e.slot?.endTime || '?'
            },
            course: {
              code: e.course?.courseCode || '?',
              name: e.course?.courseName || '?'
            },
            faculty: {
              name: e.faculty?.name || 'No Faculty'
            },
            room: {
              number: e.room?.roomNumber || '?'
            }
          }));
      });

      res.status(200).json({
        success: true,
        data: {
          academicCalendar: timetable.academicCalendar,
          year: Number(year),
          section,
          timetable: formatted,
          statistics: timetable.statistics
        }
      });
    } catch (err) {
      next(err);
    }
  }
}
module.exports = new StudentController();
