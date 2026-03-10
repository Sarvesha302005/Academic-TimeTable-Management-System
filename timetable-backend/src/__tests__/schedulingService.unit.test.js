const schedulingService = require('../services/schedulingService');

describe('SchedulingService.validateConstraints', () => {
  test('valid data returns isValid true with no critical errors', () => {
    const data = {
      courses: { 'CSE101': { totalStudents: 30, year: 1 } },
      teachers: [{ id: 'T1', prefs: {} }],
      rooms: { theory: ['R1'], lab: ['L1'] },
      timeSlots: ['Mon_1'],
      workingDays: ['Monday'],
      room_capacities: { R1: 50, L1: 30 }
    };

    const res = schedulingService.validateConstraints(data);
    expect(res.isValid).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  test('missing courses returns error', () => {
    const data = {
      courses: {},
      teachers: [{ id: 'T1' }],
      rooms: { theory: [], lab: [] },
      timeSlots: [],
      workingDays: []
    };

    const res = schedulingService.validateConstraints(data);
    expect(res.isValid).toBe(false);
    expect(res.errors).toEqual(expect.arrayContaining(['No courses found']));
  });
});
