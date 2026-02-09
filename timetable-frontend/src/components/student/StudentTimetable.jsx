import React, { useState, useEffect } from 'react';
import { studentAPI, timetableAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const getCourseColor = (code) => {
  if (!code) return 'bg-gray-100 border-gray-300 text-gray-700';
  const colors = [
    'bg-red-100 border-red-300 text-red-900',
    'bg-yellow-100 border-yellow-300 text-yellow-900',
    'bg-green-100 border-green-300 text-green-900',
    'bg-blue-100 border-blue-300 text-blue-900',
    'bg-indigo-100 border-indigo-300 text-indigo-900',
    'bg-purple-100 border-purple-300 text-purple-900',
    'bg-pink-100 border-pink-300 text-pink-900',
  ];
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const StudentTimetable = () => {
  const [timetableData, setTimetableData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(1);
  const [section, setSection] = useState('A');

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const calRes = await timetableAPI.getActiveCalendar();
      const academicCalendarId = calRes.data.data._id;

      const res = await studentAPI.getFormattedTimetable({
        academicCalendarId,
        year,
        section
      });
      setTimetableData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, [year, section]);

  if (loading) return <LoadingSpinner />;
  if (!timetableData) return <div className="card">No timetable available</div>;

  const { timetable } = timetableData;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Flatten for max slot calculation
  const allEntries = Object.values(timetable).flat();
  const maxSlot = allEntries.reduce((max, curr) => Math.max(max, curr.slotNumber), 0) || 8;
  const slots = Array.from({ length: maxSlot }, (_, i) => i + 1);

  // Group entries into a grid
  const grid = {};
  days.forEach(day => {
    grid[day] = {};
    slots.forEach(slotNum => {
      // Use filter instead of find to support multiple entries (like admin)
      grid[day][slotNum] = timetable[day]?.filter(e => e.slotNumber === slotNum) || [];
    });
  });

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Class Timetable</h2>
        <div className="flex space-x-4">
          <select className="input-field w-32" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
            {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
          <select className="input-field w-32" value={section} onChange={(e) => setSection(e.target.value)}>
            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                Day / Slot
              </th>
              {slots.map(slotNum => (
                <th key={slotNum} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Slot {slotNum}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {days.map(day => (
              <tr key={day}>
                <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r bg-gray-50">
                  {day}
                </td>
                {slots.map(slotNum => {
                  const entries = grid[day][slotNum];
                  return (
                    <td key={`${day}-${slotNum}`} className="px-2 py-2 text-xs border-r h-24 align-top">
                      {entries.length > 0 ? (
                        <div className="space-y-1">
                          {entries.map((entry, idx) => (
                            <div
                              key={idx}
                              className={`p-1 rounded text-xs h-full flex flex-col justify-between overflow-hidden ${getCourseColor(entry.course?.code)}`}
                            >
                              <div className="font-bold truncate" title={entry.course?.name}>
                                {entry.course?.code || '???'}
                              </div>
                              <div className="text-[10px] truncate" title={entry.faculty?.name}>
                                {entry.faculty?.name || 'No Faculty'}
                              </div>
                              <div className="flex justify-between text-[10px] opacity-70">
                                <span>{entry.room?.number || 'Room ?'}</span>
                                <span>Y{year}-{section}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-300">
                          -
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentTimetable;