const Timetable = require('../models/Timetable');
const Course = require('../models/Course');
const Faculty = require('../models/Faculty');
const Room = require('../models/Room');
const TimeSlot = require('../models/TimeSlot');
const AcademicCalendar = require('../models/AcademicCalendar');
const FacultyPreference = require('../models/FacultyPreference');
const WorkloadRule = require('../models/WorkloadRule');
const schedulingService = require('./schedulingService');

class TimetableService {

  /* =========================================================
     PREPARE DATA FOR OR-TOOLS
  ========================================================= */
  async prepareSchedulingData(academicCalendarId) {
    const academicCalendar = await AcademicCalendar.findById(academicCalendarId);
    if (!academicCalendar) throw new Error('Academic calendar not found');

    const [courses, faculty, rooms, timeSlots, preferences, workloadRule] =
      await Promise.all([
        Course.find({ isActive: true }).populate('assignedFaculty').lean(),
        Faculty.find({ isActive: true }).lean(),
        Room.find({ isActive: true }).lean(),
        TimeSlot.find({ isActive: true, isBreak: false }).sort({ slotNumber: 1 }).lean(),
        FacultyPreference.find({ academicCalendar: academicCalendarId })
          .populate('preferences.course')
          .lean(),
        WorkloadRule.findOne({ academicCalendar: academicCalendarId, isActive: true }).lean()
      ]);

    console.log(`Total courses fetched from DB: ${courses.length}`);

    /* ---------- COURSES ---------- */
    const coursesDict = {};
    const courseSectionsMap = {}; // Maps courseCode -> [sections]

    courses.forEach(c => {
      if (!c || !c.courseCode) {
        console.warn('Skipping invalid course:', c);
        return;
      }

      // Track all sections for this course
      if (!courseSectionsMap[c.courseCode]) {
        courseSectionsMap[c.courseCode] = new Set();
      }

      const sections = c.sections || ['A'];
      sections.forEach(section => {
        courseSectionsMap[c.courseCode].add(section);

        // Create a unique key that includes section
        const courseKey = `${c.courseCode}-${section}`;

        const hasExplicit =
          (c.lectureHours || 0) + (c.tutorialHours || 0) + (c.practicalHours || 0) > 0;

        coursesDict[courseKey] = {
          name: c.courseName || c.courseCode,
          L: hasExplicit ? (c.lectureHours || 0) : (c.courseType === 'theory' ? (c.weeklyHours || 0) : 0),
          T: hasExplicit ? (c.tutorialHours || 0) : (c.courseType === 'tutorial' ? (c.weeklyHours || 0) : 0),
          P: hasExplicit ? (c.practicalHours || 0) : (c.courseType === 'lab' ? (c.weeklyHours || 0) : 0),
          year: c.year || 1,
          sem: c.semester || 1,
          lab: c.courseType === 'lab',
          section: section,
          originalCourseCode: c.courseCode,
          courseId: c._id.toString(),
          assignedFaculty: c.assignedFaculty?._id?.toString(),
          isElective: c.isElective || false
        };
      });
    });

    console.log(`Processed ${Object.keys(coursesDict).length} course-section combinations`);

    // Log course sections mapping
    Object.keys(courseSectionsMap).forEach(courseCode => {
      const sections = Array.from(courseSectionsMap[courseCode]);
      console.log(`Course ${courseCode} has sections: ${sections.join(', ')}`);
    });

    /* ---------- TEACHERS (WORKLOAD ENFORCED) ---------- */
    const teachers = faculty.map(f => {
      if (!f || !f._id) return null;

      const pref = preferences.find(p =>
        p.faculty && p.faculty.toString() === f._id.toString()
      );

      // Course-level preferences with priority
      const prefCourses = {};

      // 1. Add explicit preferences from FacultyPreference model
      if (pref && pref.preferences) {
        pref.preferences.forEach(p => {
          if (p.course && p.course.courseCode) {
            // store COURSE preference, not section
            prefCourses[p.course.courseCode] = p.priority || 3;
          }
        });
      }




      const workloadMin = workloadRule?.minHoursPerWeek ?? 10;
      const workloadMax = workloadRule?.maxHoursPerWeek ?? 20;

      return {
        id: f._id.toString(),
        name: f.name || `Faculty_${f._id.toString().slice(-6)}`,
        min: workloadMin,
        max: workloadMax,
        prefs: prefCourses,
        fallbackCourses: f.fallbackCourses || [] // Ensure fallback faculty support
      };
    }).filter(teacher => teacher !== null);

    console.log(`Processed ${teachers.length} valid faculty`);

    // Debug teacher preferences
    teachers.forEach((teacher, i) => {
      const prefEntries = Object.entries(teacher.prefs || {});
      console.log(
        `Teacher ${i + 1}: ${teacher.name} has ${prefEntries.length} course preferences`
      );
      if (prefEntries.length > 0) {
        console.log(
          '  Preferences:',
          prefEntries.map(([c, p]) => `${c}(priority ${p})`).join(', ')
        );
      }
    });


    /* ---------- CLASSES ---------- */
    const classMap = new Map();
    courses.forEach(c => {
      if (!c || !c.courseCode) return;

      const year = c.year || 1;
      const sections = c.sections || ['A'];

      sections.forEach(section => {
        const id = `Y${year}-${section}`;

        if (!classMap.has(id)) {
          classMap.set(id, {
            id,
            year: year,
            sems: [c.semester || 1],
            strength: c.totalStudents || 30, // Changed default from 60 to 30
            section: section,
            courses: []
          });
        }

        // Add this course to the class's course list
        const classData = classMap.get(id);
        const courseKey = `${c.courseCode}-${section}`;
        if (coursesDict[courseKey]) {
          classData.courses.push(courseKey);
        }
      });
    });

    console.log(`Created ${classMap.size} class groups:`);
    classMap.forEach((classData, id) => {
      console.log(`  ${id}: ${classData.courses.length} courses`);
    });

    /* ---------- ROOMS ---------- */
    const roomsDict = {
      theory: rooms.filter(r => r && r.roomType !== 'lab').map(r => r.roomNumber).filter(Boolean),
      lab: rooms.filter(r => r && r.roomType === 'lab').map(r => r.roomNumber).filter(Boolean)
    };

    const roomCapacities = {};
    rooms.forEach(r => {
      if (r && r.roomNumber) {
        roomCapacities[r.roomNumber] = r.capacity || 60; // Changed default from 30 to 60
      }
    });

    return {
      courses: coursesDict,
      teachers,
      classes: Array.from(classMap.values()).map(classData => ({
        ...classData,
        courseRefs: classData.courses
      })),
      rooms: roomsDict,
      workingDays: academicCalendar.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      timeSlots: timeSlots || [],
      schedule: {
        days: academicCalendar.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        hours: [...new Set((timeSlots || []).map(t => t && t.startTime).filter(Boolean))]
      },
      room_capacities: roomCapacities
    };
  }

  /* =========================================================
     GENERATE TIMETABLE
  ========================================================= */
  async generateTimetable(academicCalendarId) {
    try {
      const data = await this.prepareSchedulingData(academicCalendarId);

      const validation = schedulingService.validateConstraints(data);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // We'll attempt to repair conflicts by re-running the scheduler with forbidden assignments
      const maxAttempts = 1;
      const forbiddenAssignments = [];
      let finalResult = null;
      let lastAttemptResult = null;
      let attempt = 0;

      while (attempt < maxAttempts) {
        attempt += 1;
        console.log(`Scheduling attempt ${attempt} (forbiddenAssignments=${forbiddenAssignments.length})`);

        // attach forbidden assignments into the data payload
        data.forbiddenAssignments = forbiddenAssignments.slice();

        const start = Date.now();
        const result = await schedulingService.generateTimetable(data);
        const generationTime = Date.now() - start;

        if (result.status !== 'success') {
          throw new Error(result.error || 'Scheduling failed');
        }

        /* ---------- MAP LOOKUPS ---------- */
        const courseMap = new Map();
        const idToCourseKey = new Map();

        // Get all active courses
        const allCourses = await Course.find({ isActive: true });
        allCourses.forEach(c => {
          if (!c || !c.courseCode) return;

          const sections = c.sections || ['A'];
          sections.forEach(section => {
            const courseKey = `${c.courseCode}-${section}`;
            // Store the course document but note which section this is for
            const courseObj = c.toObject();
            courseObj._section = section; // Add section to the stored object
            courseObj.originalCourseCode = c.courseCode; // Ensure original code is available
            courseMap.set(courseKey, courseObj);
            idToCourseKey.set(c._id.toString(), courseKey);
          });
        });

        console.log(`Course map size: ${courseMap.size}`);

        // Additional reverse lookup maps for readable conflict messages
        const idToCourseCode = new Map(allCourses.map(c => [c._id.toString(), c.courseCode]));
        const idToRoomNumber = new Map((await Room.find({ isActive: true })).map(r => [r._id.toString(), r.roomNumber]));
        const idToFacultyName = new Map((await Faculty.find({ isActive: true })).map(f => [f._id.toString(), f.name]));

        // Expose these local maps for use in conflict descriptions
        const facultyIdToName = idToFacultyName;

        const roomMap = new Map(
          (await Room.find({ isActive: true })).map(r => [r.roomNumber, r._id.toString()])
        );

        const facultyMap = new Map(
          (await Faculty.find({ isActive: true })).map(f => [f.name, f._id.toString()])
        );

        const slotMap = new Map(
          (await TimeSlot.find({ isActive: true })).map(s => [s.startTime, s])
        );

        /* ---------- FLATTEN SOLVER OUTPUT ---------- */
        const entries = [];
        Object.entries(result.solution).forEach(([classId, list]) => {
          list.forEach(e => {
            if (!e || !e.course || !e.slot) return;

            const [day, time] = e.slot.split('_');
            const courseObj = courseMap.get(e.course);

            if (!courseObj) {
              console.warn(`Course not found for key: ${e.course}`);
              return;
            }

            const slot = slotMap.get(time);
            if (!slot) {
              console.warn(`Slot not found for time: ${time}`);
              return;
            }

            // Get faculty ID from name
            const facultyId = facultyMap.get(e.teacher);
            if (!facultyId) {
              console.warn(`Faculty not found for name: ${e.teacher}`);
              return;
            }

            // Get room ID
            const roomId = roomMap.get(e.room);
            if (!roomId) {
              console.warn(`Room not found for: ${e.room}`);
              return;
            }

            // Extract section from course key (e.course is like "CSE23111-A")
            const section = e.course.split('-')[1] || 'A';

            entries.push({
              day,
              classId: classId,
              slot: slot._id,
              slotNumber: slot.slotNumber,
              course: courseObj._id,
              faculty: facultyId,
              faculty: facultyId,
              room: roomId,
              year: courseObj.year || 1,
              section: section,
              type: e.type // Save the session type (L/T/P)
            });
          });
        });

        console.log(`Created ${entries.length} timetable entries`);

        const stats = this.calculateStatistics(entries, data);

        // Detect conflicts (faculty, room, student/class) per day+slot
        const conflicts = [];
        const grouped = {};

        entries.forEach(e => {
          const key = `${e.day}_${e.slotNumber}`;

          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(e);
        });




        Object.entries(grouped).forEach(([key, list]) => {
          const [day, slotNumber] = key.split('_');

          // Faculty conflicts: same faculty in multiple entries for same slot
          const facultyMap = {};
          // Room conflicts: same room used multiple times in same slot
          const roomMap = {};
          // Student/class conflicts: same year+section has more than one entry
          const classMap = {};

          list.forEach(e => {
            facultyMap[e.faculty] = facultyMap[e.faculty] || [];
            facultyMap[e.faculty].push(e);

            roomMap[e.room] = roomMap[e.room] || [];
            roomMap[e.room].push(e);

            const classKey = e.classId;
            classMap[classKey] = classMap[classKey] || [];
            classMap[classKey].push(e);
          });

          Object.entries(facultyMap).forEach(([fac, arr]) => {
            if (arr.length > 1) {
              // use facultyId->name mapping when available
              const facultyName = facultyIdToName?.get(fac) || fac;
              conflicts.push({
                type: 'faculty_conflict',
                description: `Faculty ${facultyName} has ${arr.length} classes in ${day} slot ${slotNumber}`,
                entries: arr.map(a => ({ day: a.day, slotNumber: a.slotNumber, course: idToCourseCode.get(a.course.toString()) || a.course, faculty: facultyIdToName?.get(a.faculty) || a.faculty, room: idToRoomNumber.get(a.room) || a.room, year: a.year, section: a.section }))
              });
            }
          });

          Object.entries(roomMap).forEach(([rm, arr]) => {
            if (arr.length > 1) {
              const roomNum = idToRoomNumber?.get(rm) || rm;
              conflicts.push({
                type: 'room_conflict',
                description: `Room ${roomNum} is double-booked in ${day} slot ${slotNumber}`,
                entries: arr.map(a => ({ day: a.day, slotNumber: a.slotNumber, course: idToCourseCode.get(a.course.toString()) || a.course, faculty: facultyIdToName?.get(a.faculty) || a.faculty, room: idToRoomNumber?.get(a.room) || a.room, year: a.year, section: a.section }))
              });
            }
          });
          Object.entries(classMap).forEach(([cls, arr]) => {
            if (arr.length > 1) {
              conflicts.push({
                type: 'student_conflict',
                description: `Class ${cls} has ${arr.length} simultaneous sessions in ${day} slot ${slotNumber}`,
                entries: arr.map(a => ({ day: a.day, slotNumber: a.slotNumber, course: idToCourseCode.get(a.course.toString()) || a.course, faculty: facultyIdToName?.get(a.faculty) || a.faculty, room: idToRoomNumber?.get(a.room) || a.room, year: a.year, section: a.section }))
              });
            }
          });
        });

        // Detect multi-faculty assignment for same class-course across timetable
        const classCourseMap = new Map();
        entries.forEach(e => {
          const key = `${e.classId}_${e.course}`;
          if (!classCourseMap.has(key)) classCourseMap.set(key, new Set());
          classCourseMap.get(key).add(e.faculty);
        });

        classCourseMap.forEach((facSet, key) => {
          if (facSet.size > 1) {
            // key is constructed as `${e.classId}_${e.course}`
            // e.classId is like "Y1-A", e.course is the database ID
            const lastUnderscore = key.lastIndexOf('_');
            const classId = key.substring(0, lastUnderscore);
            const courseId = key.substring(lastUnderscore + 1);

            // parse classId "Y1-A" -> year=1, section=A
            const yearMatch = classId.match(/Y(\d+)-(.+)/);
            const year = yearMatch ? yearMatch[1] : '1';
            const section = yearMatch ? yearMatch[2] : 'A';

            // collect entries for this course
            const conflictEntries = entries.filter(en => en.course.toString() === courseId && en.year.toString() === Number(year).toString() && en.section === section);

            const courseCode = idToCourseCode.get(courseId) || courseId;
            const facultyNames = Array.from(facSet).map(f => facultyIdToName?.get(f) || f);

            conflicts.push({
              type: 'faculty_assignment_conflict',
              description: `Course ${courseCode} for Y${year}-${section} assigned to multiple faculties: ${facultyNames.join(', ')}`,
              entries: conflictEntries.map(a => ({ day: a.day, slotNumber: a.slotNumber, course: courseCode, faculty: facultyIdToName?.get(a.faculty) || a.faculty, room: idToRoomNumber?.get(a.room) || a.room, year: a.year, section: a.section }))
            });
          }
        });

        // Save this attempt in case we need to fall back to it
        lastAttemptResult = { entries, conflicts, stats, generationTime };

        // If no conflicts, accept this result
        if (conflicts.length === 0) {
          finalResult = { entries, conflicts, stats, generationTime };
          console.log(`Scheduling attempt ${attempt} succeeded without conflicts`);
          break;
        }

        // Build forbidden assignments to resolve faculty_assignment_conflict
        let newBans = 0;

        // compute faculty assignment sets to pick winners
        classCourseMap.forEach((facSet, key) => {
          if (facSet.size <= 1) return;

          const [year, section, courseId] = key.split('_');
          // Use idToCourseKey map to get the solver course key (e.g., CSE101-A)
          const courseKey = idToCourseKey.get(courseId) || null;

          // pick keeper: prefer teacher who has preference for this base course
          const baseCourse = courseKey ? courseKey.split('-')[0] : null;

          const candidates = Array.from(facSet);

          // helper: find teacher object from data.teachers
          const findTeacherObj = tid => data.teachers.find(t => t.id === tid);

          // choose best candidate
          let keeper = candidates[0];
          // prefer those with explicit preference
          const prefCandidates = candidates.filter(tid => {
            const tobj = findTeacherObj(tid);
            return tobj && baseCourse && tobj.prefs && Object.prototype.hasOwnProperty.call(tobj.prefs, baseCourse);
          });
          if (prefCandidates.length > 0) {
            // pick one with smallest priority value
            keeper = prefCandidates.sort((a, b) => {
              const pa = findTeacherObj(a).prefs[baseCourse] || 99;
              const pb = findTeacherObj(b).prefs[baseCourse] || 99;
              return pa - pb;
            })[0];
          } else {
            // pick teacher with smallest current assignment count
            const facCounts = {};
            entries.forEach(en => { facCounts[en.faculty] = (facCounts[en.faculty] || 0) + 1; });
            keeper = candidates.sort((a, b) => (facCounts[a] || 0) - (facCounts[b] || 0))[0];
          }

          // ban all others
          candidates.forEach(tid => {
            if (tid === keeper) return;
            const classId = `Y${year}-${section}`;
            const ban = { class: classId, course: courseKey || courseId, teacher: tid };
            // avoid duplicate bans
            const exists = forbiddenAssignments.some(f => f.class === ban.class && f.course === ban.course && f.teacher === ban.teacher);
            if (!exists) {
              forbiddenAssignments.push(ban);
              newBans += 1;
            }
          });
        });

        console.warn(`Attempt ${attempt} produced ${conflicts.length} conflicts; added ${newBans} new forbidden assignments`);

        if (newBans === 0) {
          // no progress can be made using this strategy
          console.warn('No new bans could be generated to resolve conflicts - aborting repair attempts');
          finalResult = { entries, conflicts, stats, generationTime };
          break;
        }

        // Otherwise loop and retry
      }

      // if no conflict-free result found, fall back to the last attempt's result (if any)
      if (!finalResult) {
        if (lastAttemptResult) {
          console.warn('All repair attempts exhausted - falling back to last solver result');
          finalResult = lastAttemptResult;
        } else {
          finalResult = { entries: [], conflicts: [], stats: {}, generationTime: 0 };
        }
      }

      // Use finalResult to populate timetable
      const entries = finalResult.entries || [];
      const conflicts = finalResult.conflicts || [];
      const stats = finalResult.stats || this.calculateStatistics(entries, data);
      const generationTime = finalResult.generationTime || 0;

      let timetable = await Timetable.findOne({
        academicCalendar: academicCalendarId,
        status: { $in: ['draft', 'generated'] }
      });

      if (!timetable) {
        timetable = new Timetable({ academicCalendar: academicCalendarId });
      }

      timetable.entries = entries;
      timetable.status = 'generated';
      timetable.generatedAt = new Date();
      timetable.statistics = stats;
      timetable.conflicts = conflicts;
      timetable.metadata = {
        generationTime,
        constraintsSatisfied: conflicts.length === 0,
        totalCoursesScheduled: entries.length,
        sectionsScheduled: [...new Set(entries.map(e => e.section))],
        attempts: attempt,
        forbiddenAssignmentsUsed: forbiddenAssignments
      };

      if (conflicts.length > 0) {
        console.warn(`Found ${conflicts.length} conflicts during timetable generation`);
        conflicts.forEach((c, i) => console.warn(`Conflict[${i}]:`, c.description));
      }

      await timetable.save();

      console.log(`Generated timetable with ${entries.length} entries for ${academicCalendarId}`);
      console.log(`Timetable saved with ID: ${timetable._id} (conflicts: ${conflicts.length})`);

      return timetable;

    } catch (error) {
      console.error('Error in generateTimetable:', error);
      throw error;
    }
  }

  /* =========================================================
     STATISTICS CALCULATION
  ========================================================= */
  calculateStatistics(entries, data) {
    const facultyLoad = {};
    const roomLoad = {};

    entries.forEach(e => {
      facultyLoad[e.faculty] = (facultyLoad[e.faculty] || 0) + 1;
      roomLoad[e.room] = (roomLoad[e.room] || 0) + 1;
    });

    const totalSlots = data.timeSlots.length * data.workingDays.length;
    const totalFacultySlots = Object.keys(facultyLoad).length * totalSlots;
    const totalRoomSlots = Object.keys(roomLoad).length * totalSlots;

    return {
      totalClasses: entries.length,
      facultyUtilization: totalFacultySlots > 0 ?
        Number((Object.values(facultyLoad).reduce((a, b) => a + b, 0) / totalFacultySlots).toFixed(2)) : 0,
      roomUtilization: totalRoomSlots > 0 ?
        Number((Object.values(roomLoad).reduce((a, b) => a + b, 0) / totalRoomSlots).toFixed(2)) : 0,
      facultyDistribution: facultyLoad,
      roomDistribution: roomLoad
    };
  }

  /* =========================================================
     STUDENT VIEW
  ========================================================= */
  async getTimetableByYearSection(academicCalendarId, year, section) {
    const t = await Timetable.findOne({
      academicCalendar: academicCalendarId,
      status: { $in: ['generated', 'locked'] }
    })
      .sort({ updatedAt: -1 })
      .populate('entries.slot entries.course entries.faculty entries.room');

    if (!t) return null;

    return {
      ...t.toObject(),
      entries: t.entries.filter(
        e =>
          e.year === year &&
          e.section?.toUpperCase() === section.toUpperCase()
      )
    };
  }

  /* =========================================================
     FACULTY VIEW
  ========================================================= */
  async getTimetableByFaculty(academicCalendarId, facultyId) {
    const t = await Timetable.findOne({
      academicCalendar: academicCalendarId,
      status: { $in: ['generated', 'locked'] }
    })
      .sort({ updatedAt: -1 })
      .populate('entries.slot entries.course entries.faculty entries.room');

    if (!t) return null;

    return {
      ...t.toObject(),
      entries: t.entries.filter(e =>
        (e.faculty._id || e.faculty).toString() === facultyId
      )
    };
  }

  /* =========================================================
     ADDITIONAL HELPER METHODS (OPTIONAL)
  ========================================================= */

  // Get all timetables for an academic calendar
  async getTimetables(academicCalendarId) {
    return await Timetable.find({ academicCalendar: academicCalendarId })
      .sort({ generatedAt: -1 });
  }

  // Delete a timetable
  async deleteTimetable(timetableId) {
    return await Timetable.findByIdAndDelete(timetableId);
  }

  // Update timetable status (draft, generated, locked)
  async updateTimetableStatus(timetableId, status) {
    const validStatuses = ['draft', 'generated', 'locked'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    return await Timetable.findByIdAndUpdate(
      timetableId,
      { status, updatedAt: new Date() },
      { new: true }
    );
  }
}

module.exports = new TimetableService();



