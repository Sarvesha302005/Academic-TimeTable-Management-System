const { spawn } = require('child_process');
const path = require('path');

class SchedulingService {
  /**
   * Call Python OR-Tools scheduler with constraints
   * @param {Object} data - Contains all scheduling data
   * @returns {Promise<Object>} - Generated timetable
   */
  async generateTimetable(data) {
    return new Promise((resolve, reject) => {

      const pythonScriptPath = path.resolve(
        path.join(__dirname, '../../python-scheduler/scheduler.py'));

      // Prepare input data for Python script
      // Data is already prepared in dictionary format by timetableService
      const inputData = JSON.stringify(data);

      console.log(`[DEBUG] Sending ${inputData.length} bytes to Python scheduler`);
      console.log(`[DEBUG] Data includes: ${Object.keys(data).join(', ')}`);

      // Spawn Python process using venv
      const venvPythonPath = path.resolve(
        path.join(__dirname, '../../python-scheduler/venv/Scripts/python.exe'));
      const pythonCommand = process.env.PYTHON_EXECUTABLE || venvPythonPath;
      console.log(`[DEBUG] Using Python: ${pythonCommand}`);
      const pythonProcess = spawn(pythonCommand, [pythonScriptPath]);

      let dataString = '';
      let errorString = '';

      // Send input data to Python script via stdin
      pythonProcess.stdin.write(inputData);
      pythonProcess.stdin.end();

      // Collect data from stdout
      pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
      });

      // Collect errors from stderr
      pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
        console.error(`Python stderr: ${data}`);
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python process exited with code ${code}`);
          console.error(`Error output: ${errorString}`);
          reject(new Error(`Scheduling failed: ${errorString || 'Unknown error'}`));
          return;
        }

        try {
          const result = JSON.parse(dataString);

          if (result.error) {
            reject(new Error(result.error));
            return;
          }

          resolve(result);
        } catch (error) {
          console.error('Failed to parse Python output:', dataString);
          reject(new Error(`Failed to parse scheduler output: ${error.message}`));
        }
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python scheduler: ${error.message}`));
      });
    });
  }

  /**
   * Validate scheduling constraints
   * @param {Object} data - Scheduling data to validate
   * @returns {Object} - Validation result
   */
  validateConstraints(data) {
    const errors = [];
    const warnings = [];

    // Check if courses exist
    if (!data.courses || Object.keys(data.courses).length === 0) {
      errors.push('No courses found');
    }

    // Check if faculty exist
    if (!data.teachers || data.teachers.length === 0) {
      errors.push('No faculty found');
    }

    // Check if rooms exist
    if (!data.rooms || (data.rooms.theory.length === 0 && data.rooms.lab.length === 0)) {
      errors.push('No rooms found');
    }

    // Check if time slots exist
    if (!data.timeSlots || data.timeSlots.length === 0) {
      errors.push('No time slots configured');
    }

    // Check if working days exist
    if (!data.workingDays || data.workingDays.length === 0) {
      errors.push('No working days configured');
    }

    // Check room capacity vs course requirements
    if (data.courses && data.room_capacities) {
      Object.entries(data.courses).forEach(([code, course]) => {
        // Check if any room has enough capacity
        // Since rooms are just IDs in data.rooms, we used room_capacities dict in prepareSchedulingData
        const roomCaps = data.room_capacities;
        const suitableRooms = Object.values(roomCaps).filter(cap => cap >= (course.totalStudents || 0));

        if (suitableRooms.length === 0) {
          warnings.push(`No suitable room found for course ${code}`);
        }
      });
    }

    // Check faculty preferences coverage
    // Teacher data is list and preferences are embedded in teacher objects (t.prefs)
    if (data.teachers) {
      const teachersWithPrefs = data.teachers.filter(t => t.prefs && Object.keys(t.prefs).length > 0);
      if (teachersWithPrefs.length === 0) {
        warnings.push("No faculty preferences found");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Dynamically reschedule lectures affected by an approved faculty leave
   * @param {String} leaveId - FacultyLeave document ID
   */
  async dynamicReschedule(leaveId) {
    try {
      const mongoose = require('mongoose');
      const FacultyLeave = require('../models/FacultyLeave');
      const Timetable = require('../models/Timetable');
      const TimeSlot = require('../models/TimeSlot');
      const TimetableAdjustment = require('../models/TimetableAdjustment');

      const leave = await FacultyLeave.findById(leaveId).populate('faculty');
      if (!leave) {
        console.error(`[Reschedule] Leave not found: ${leaveId}`);
        return;
      }

      console.log(`\n======================================================`);
      console.log(`[Reschedule] Leave approved for Faculty ${leave.faculty.name || leave.faculty._id}`);

      // Get the currently locked timetable
      // We assume one active academic calendar roughly matches the current time, or we get the latest locked one
      const timetable = await Timetable.findOne({ status: 'locked' }).sort({ lockedAt: -1 }).populate('entries.slot').populate('entries.course');

      if (!timetable) {
        console.log(`[Reschedule] No locked timetable found to apply compensation.`);
        console.log(`======================================================\n`);
        return;
      }

      console.log(`[Reschedule] Found locked timetable: ${timetable._id}, Entries: ${timetable.entries.length}`);
      console.log(`[Reschedule] Leave Faculty ID: ${leave.faculty._id}`);

      // Fetch workload rules for this academic calendar to prevent overloading
      const WorkloadRule = require('../models/WorkloadRule');
      const workloadRule = await WorkloadRule.findOne({ academicCalendar: timetable.academicCalendar, isActive: true });
      const maxSlotsPerDay = workloadRule ? workloadRule.maxHoursPerDay : 6;

      // Calculate days affected by leave
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      leaveStart.setHours(0, 0, 0, 0);
      leaveEnd.setHours(23, 59, 59, 999);

      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      let affectedCount = 0;
      let compensations = [];
      let pendingCompensations = [];

      // Loop through dates in the leave duration
      for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
        const dayStr = daysOfWeek[d.getDay()];

        // Find lectures scheduled on this day for this faculty
        const affectedEntries = timetable.entries.filter(entry => {
          const dayMatch = entry.day && entry.day.toLowerCase() === dayStr.toLowerCase();
          const facultyMatch = entry.faculty && entry.faculty.toString() === leave.faculty._id.toString();
          const dateInRange = !entry.date || (new Date(entry.date) >= leaveStart && new Date(entry.date) <= leaveEnd);

          if (facultyMatch && dayMatch) {
            console.log(`[Reschedule] Day: ${dayStr}, Match found? Day: ${dayMatch}, Faculty: ${facultyMatch}, DateInRange: ${dateInRange}`);
            if (!dateInRange) {
              console.log(`[Reschedule] Entry Date: ${entry.date}, Leave Range: ${leaveStart} to ${leaveEnd}`);
            }
          }

          return dayMatch && facultyMatch && dateInRange;
        });

        affectedCount += affectedEntries.length;

        // Record cancellations for these specific dates
        for (const entry of affectedEntries) {
          await TimetableAdjustment.create({
            academicCalendar: timetable.academicCalendar,
            timetable: timetable._id,
            leave: leave._id,
            date: new Date(d),
            day: dayStr,
            slot: entry.slot._id ? entry.slot._id : entry.slot,
            slotNumber: entry.slotNumber,
            course: entry.course._id ? entry.course._id : entry.course,
            faculty: entry.faculty,
            room: entry.room,
            year: entry.year,
            section: entry.section,
            type: entry.type,
            isCancellation: true
          });
        }

        // Group into contiguous blocks based on course, section, year, type
        affectedEntries.sort((a, b) => a.slotNumber - b.slotNumber);
        const blocks = [];
        let currentBlock = [];

        for (const entry of affectedEntries) {
          if (currentBlock.length === 0) {
            currentBlock.push(entry);
            continue;
          }
          const lastEntry = currentBlock[currentBlock.length - 1];
          const courseId1 = entry.course._id ? entry.course._id.toString() : entry.course.toString();
          const courseId2 = lastEntry.course._id ? lastEntry.course._id.toString() : lastEntry.course.toString();

          if (courseId1 === courseId2 &&
            entry.year === lastEntry.year &&
            entry.section === lastEntry.section &&
            entry.type === lastEntry.type) {
            currentBlock.push(entry);
          } else {
            blocks.push(currentBlock);
            currentBlock = [entry];
          }
        }
        if (currentBlock.length > 0) blocks.push(currentBlock);

        for (const block of blocks) {
          // Find contiguous compensation slots within 7 days after the missed date
          let compensationFound = false;
          const firstEntry = block[0];

          const searchStart = new Date(d);
          searchStart.setDate(searchStart.getDate() + 1); // Start searching from next day
          const searchEnd = new Date(d);
          searchEnd.setDate(searchEnd.getDate() + 7);

          // Get all time slots to iterate through
          const allSlots = await TimeSlot.find({ isActive: true }).sort({ slotNumber: 1 });

          // Search loop
          searchLoop: for (let searchDate = new Date(searchStart); searchDate <= searchEnd; searchDate.setDate(searchDate.getDate() + 1)) {
            const searchDayStr = daysOfWeek[searchDate.getDay()];

            // Skip weekends (Saturday and Sunday)
            if (searchDayStr === 'Sunday' || searchDayStr === 'Saturday') continue;

            // Skip if the search date falls within the leave period itself
            if (searchDate >= leaveStart && searchDate <= leaveEnd) continue;

            // Fetch adjustments for this specific date to consider in workload/availability
            const dateAdjustments = await TimetableAdjustment.find({
              academicCalendar: timetable.academicCalendar,
              date: {
                $gte: new Date(searchDate.setHours(0, 0, 0, 0)),
                $lte: new Date(searchDate.setHours(23, 59, 59, 999))
              }
            });

            // Reset searchDate hours for consistency
            searchDate.setHours(0, 0, 0, 0);

            // Check Faculty daily workload (Master - Cancellations + Compensations)
            const masterSlotsCount = timetable.entries.filter(e =>
              e.day === searchDayStr &&
              e.faculty.toString() === firstEntry.faculty.toString() &&
              !e.date
            ).length;

            const cancellationsCount = dateAdjustments.filter(a =>
              a.faculty.toString() === firstEntry.faculty.toString() &&
              a.isCancellation
            ).length;

            const compensationsCount = dateAdjustments.filter(a =>
              a.faculty.toString() === firstEntry.faculty.toString() &&
              a.isCompensation
            ).length;

            const currentWorkload = masterSlotsCount - cancellationsCount + compensationsCount;

            if (currentWorkload + block.length > maxSlotsPerDay) {
              continue; // Exceeds daily max workload
            }

            // 💡 User Request: Limit number of compensations per day to prevent clumping
            if (compensationsCount >= 2) {
              continue; // Max 2 compensations per day
            }

            // Check Faculty weekly workload (max 18 hours per week constraint)
            const diffMon = searchDate.getDay() - 1;
            const targetMon = new Date(searchDate);
            targetMon.setDate(searchDate.getDate() - diffMon);
            targetMon.setHours(0, 0, 0, 0);
            const targetFri = new Date(targetMon);
            targetFri.setDate(targetMon.getDate() + 4);
            targetFri.setHours(23, 59, 59, 999);

            let weekLoad = 0;
            const regularClasses = timetable.entries.filter(e => e.faculty.toString() === firstEntry.faculty.toString() && !e.date);
            weekLoad += regularClasses.length;

            const effectiveLeaveStart = new Date(Math.max(leaveStart, targetMon));
            const effectiveLeaveEnd = new Date(Math.min(leaveEnd, targetFri));

            if (effectiveLeaveStart <= effectiveLeaveEnd) {
              for (let dMiss = new Date(effectiveLeaveStart); dMiss <= effectiveLeaveEnd; dMiss.setDate(dMiss.getDate() + 1)) {
                if (dMiss.getDay() > 0 && dMiss.getDay() < 6) {
                  weekLoad -= regularClasses.filter(e => e.day === daysOfWeek[dMiss.getDay()]).length;
                }
              }
            }

            const weekAdjustments = await TimetableAdjustment.find({
              faculty: firstEntry.faculty,
              date: { $gte: targetMon, $lte: targetFri }
            });

            const weekComps = weekAdjustments.filter(a => a.isCompensation).length;
            const weekCancels = weekAdjustments.filter(a => a.isCancellation).length;

            weekLoad = weekLoad - weekCancels + weekComps;

            // Set max weekly load to strictly between 16 and 18 logic. Since we just limit to max:
            const maxHoursPerWeek = workloadRule && workloadRule.maxHoursPerWeek ? workloadRule.maxHoursPerWeek : 18;
            if (weekLoad + block.length > maxHoursPerWeek) {
              continue; // Exceeds weekly max workload
            }

            // Helper to check room availability on searchDate/searchDay
            const checkRoomBusy = (roomId, slotNumber) => {
              // 1. Check master TT
              const masterRecord = timetable.entries.find(e =>
                e.day === searchDayStr && e.slotNumber === slotNumber && e.room && e.room.toString() === roomId.toString() && !e.date
              );

              // 2. Check if master record is cancelled for this date
              if (masterRecord) {
                const isCancelled = dateAdjustments.some(a =>
                  a.isCancellation && a.slotNumber === slotNumber && a.room && a.room.toString() === roomId.toString()
                );
                if (isCancelled) return false; // Room is actually free
                return true; // Room is busy
              }

              // 3. Check for compensations in adjustments
              const compensation = dateAdjustments.find(a =>
                a.isCompensation && a.slotNumber === slotNumber && a.room && a.room.toString() === roomId.toString()
              );

              return !!compensation;
            };

            // Look for `block.length` contiguous free slots
            for (let i = 0; i <= allSlots.length - block.length; i++) {
              let allFree = true;

              for (let j = 0; j < block.length; j++) {
                const slot = allSlots[i + j];
                if (slot.isBreak) { allFree = false; break; }

                const isFacultyBusy = (() => {
                  const masterAtSlot = timetable.entries.find(e =>
                    e.day === searchDayStr && e.slotNumber === slot.slotNumber &&
                    e.faculty.toString() === firstEntry.faculty.toString() && !e.date
                  );
                  if (masterAtSlot) {
                    const cancelled = dateAdjustments.some(a => a.isCancellation && a.slotNumber === slot.slotNumber && a.faculty.toString() === firstEntry.faculty.toString());
                    if (cancelled) return false;
                    return true;
                  }
                  return dateAdjustments.some(a => a.isCompensation && a.slotNumber === slot.slotNumber && a.faculty.toString() === firstEntry.faculty.toString());
                })();

                if (isFacultyBusy) { allFree = false; break; }

                const isStudentBusy = (() => {
                  const masterAtSlot = timetable.entries.find(e =>
                    e.day === searchDayStr && e.slotNumber === slot.slotNumber &&
                    e.year === firstEntry.year && e.section === firstEntry.section && !e.date
                  );
                  if (masterAtSlot) {
                    const cancelled = dateAdjustments.some(a => a.isCancellation && a.slotNumber === slot.slotNumber && a.year === firstEntry.year && a.section === firstEntry.section);
                    if (cancelled) return false;
                    return true;
                  }
                  return dateAdjustments.some(a => a.isCompensation && a.slotNumber === slot.slotNumber && a.year === firstEntry.year && a.section === firstEntry.section);
                })();

                if (isStudentBusy) { allFree = false; break; }

                // Room availability check
                let targetRoomId = firstEntry.room;
                let roomBusy = false;

                if (firstEntry.type === 'P') {
                  // If it's a lab, we can check original room or search for any available lab
                  roomBusy = checkRoomBusy(targetRoomId, slot.slotNumber);

                  if (roomBusy) {
                    // Search for any other available lab
                    const RoomModel = require('../models/Room');
                    const availableLabs = await RoomModel.find({ roomType: 'lab', isActive: true });

                    for (const lab of availableLabs) {
                      const busy = checkRoomBusy(lab._id, slot.slotNumber);
                      if (!busy) {
                        targetRoomId = lab._id;
                        roomBusy = false;
                        break;
                      }
                    }
                  }
                } else {
                  roomBusy = checkRoomBusy(targetRoomId, slot.slotNumber);
                }

                if (roomBusy) { allFree = false; break; }

                // Store targetRoomId for actual assignment later if all slots in block are free
                if (j === 0) firstEntry.tempTargetRoom = targetRoomId;
                else if (firstEntry.tempTargetRoom.toString() !== targetRoomId.toString()) {
                  allFree = false; break;
                }
              }

              if (allFree) {
                const finalRoomId = firstEntry.tempTargetRoom;
                // Re-verify that the SAME targetRoomId is free for the ENTIRE block
                for (let j = 0; j < block.length; j++) {
                  const slot = allSlots[i + j];
                  const busy = checkRoomBusy(finalRoomId, slot.slotNumber);
                  if (busy) { allFree = false; break; }
                }
              }

              if (allFree) {
                const finalRoomId = firstEntry.tempTargetRoom;
                // Try to fetch room details for better logging if possible
                const RoomModel = require('../models/Room');
                const roomDoc = await RoomModel.findById(finalRoomId);
                const roomName = roomDoc ? roomDoc.roomNumber : finalRoomId;

                // Assign all entries in this block to the contiguous slots
                for (let j = 0; j < block.length; j++) {
                  const entry = block[j];
                  const slot = allSlots[i + j];

                  await TimetableAdjustment.create({
                    academicCalendar: timetable.academicCalendar,
                    timetable: timetable._id,
                    leave: leave._id,
                    day: searchDayStr,
                    date: new Date(searchDate),
                    slot: slot._id,
                    slotNumber: slot.slotNumber,
                    course: entry.course._id ? entry.course._id : entry.course,
                    faculty: entry.faculty,
                    room: finalRoomId,
                    year: entry.year,
                    section: entry.section,
                    type: entry.type,
                    isCompensation: true,
                    originalDate: new Date(d)
                  });

                  compensations.push({
                    courseId: entry.course._id ? entry.course._id : entry.course,
                    courseCode: entry.course.courseCode || 'Course',
                    fromDay: dayStr,
                    toDay: searchDayStr,
                    toTime: slot.startTime,
                    toDate: new Date(searchDate),
                    room: roomName
                  });

                  leave.affectedClasses.push({
                    timetableEntry: entry._id,
                    date: new Date(d),
                    slot: entry.slotNumber
                  });
                }

                compensationFound = true;
                break searchLoop;
              }
            } // End slots loop
          } // End searchDate loop

          if (!compensationFound) {
            const cCode = firstEntry.course.courseCode || 'Course';
            pendingCompensations.push(`${cCode} (${block.length} slots) on ${dayStr} (Starting Slot ${firstEntry.slotNumber})`);
          }
        } // End blocks loop
      }

      await timetable.save();
      await leave.save();

      console.log(`${affectedCount} lectures affected\n`);
      console.log(`Searching compensation slots...\n`);

      if (compensations.length > 0) {
        for (const comp of compensations) {
          console.log(`${comp.courseCode} → moved to ${comp.toDay.substring(0, 3)} ${comp.toTime} in Room ${comp.room}`);
        }
      } else if (affectedCount === 0) {
        console.log(`No lectures found to reschedule.`);
      }

      if (pendingCompensations.length > 0) {
        console.log(`\nPending (No slot found within 7 days):`);
        for (const p of pendingCompensations) {
          console.log(`- ${p}`);
        }
      }

      console.log(`\nUpdated timetable printed`);
      console.log(`======================================================\n`);

    } catch (error) {
      console.error(`[Reschedule] Error applying dynamic reschedule:`, error);
    }
  }
}

module.exports = new SchedulingService();