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
        path.join(__dirname, '../../python-scheduler/venv/bin/python'));
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
}

module.exports = new SchedulingService();