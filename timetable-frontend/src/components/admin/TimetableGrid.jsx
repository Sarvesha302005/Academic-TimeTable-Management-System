import React from 'react';

const getCourseColor = (code) => {
    if (!code) return 'bg-gray-100 border-gray-300 text-gray-700';
    const colors = [
        'bg-red-100 border-red-300 text-red-900',
        'bg-yellow-100 border-yellow-300 text-yellow-900',
        'bg-green-100 border-green-300 text-green-900',
        'bg-primary-50 border-primary-200 text-primary-900',
        'bg-primary-100 border-primary-300 text-primary-900',
        'bg-purple-100 border-purple-300 text-purple-900',
        'bg-pink-100 border-pink-300 text-pink-900',
    ];
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
        hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const TimetableGrid = ({ timetable, selectedYear, selectedSection }) => {
    if (!timetable || !timetable.entries) {
        return (
            <div className="text-center p-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                No timetable data to display
            </div>
        );
    }

    // Filter entries based on selection if provided
    const getFilteredEntries = () => {
        return timetable.entries.filter(entry => {
            return (!selectedYear || entry.year === parseInt(selectedYear)) &&
                (!selectedSection || entry.section === selectedSection);
        });
    };

    const filtered = getFilteredEntries();

    // Group entries by Day and Slot Number
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const grid = {};

    // Find max slot number to determine columns
    const maxSlot = filtered.reduce((max, curr) => Math.max(max, curr.slotNumber), 0) || 8;
    const slots = Array.from({ length: maxSlot }, (_, i) => i + 1);

    days.forEach(day => {
        grid[day] = {};
        slots.forEach(slotNum => {
            grid[day][slotNum] = filtered.filter(e => e.day === day && e.slotNumber === slotNum);
        });
    });

    return (
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
                                const entries = grid[day][slotNum] || [];
                                return (
                                    <td key={`${day}-${slotNum}`} className="px-2 py-2 text-xs border-r h-24 align-top">
                                        {entries.length > 0 ? (
                                            <div className="space-y-1">
                                                {entries.map((entry, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`p-1 rounded text-xs h-full flex flex-col justify-between overflow-hidden ${entry.type === 'P'
                                                            ? 'bg-green-100 border-green-300 text-green-900 font-medium'
                                                            : 'bg-purple-100 border-purple-300 text-purple-900'
                                                            }`}
                                                    >
                                                        <div className="font-bold truncate" title={entry.course?.courseName || 'No Name'}>
                                                            {entry.course?.isElective ? "Elective" : (entry.course?.courseCode || '???')}
                                                        </div>
                                                        <div className="text-[10px] truncate" title={typeof entry.faculty === 'object' ? entry.faculty?.name : entry.faculty}>
                                                            {typeof entry.faculty === 'object' ? entry.faculty?.name : (entry.faculty || 'No Faculty')}
                                                        </div>
                                                        <div className="flex justify-between text-[10px] opacity-70">
                                                            <span>{entry.room?.roomNumber || 'No Room'}</span>
                                                            {!entry.course?.isElective && (
                                                                <span>Y{entry.year}-{entry.section}</span>
                                                            )}
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
    );
};

export default TimetableGrid;
