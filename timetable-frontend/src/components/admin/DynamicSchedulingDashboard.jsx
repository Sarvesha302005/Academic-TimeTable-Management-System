import React, { useState, useEffect, useMemo } from 'react';
import { adminAPI, timetableAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import { Calendar, RefreshCw, AlertCircle, BookOpen, Users, AlertTriangle, Activity, Filter } from 'lucide-react';

const DynamicSchedulingDashboard = () => {
    const [calendars, setCalendars] = useState([]);
    const [selectedCalendar, setSelectedCalendar] = useState('');
    const [timetable, setTimetable] = useState(null);
    const [facultyList, setFacultyList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterYear, setFilterYear] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [filterFaculty, setFilterFaculty] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [calRes, facRes] = await Promise.all([
                adminAPI.getAcademicCalendars(),
                adminAPI.getFaculty()
            ]);
            setCalendars(calRes.data.data);
            setFacultyList(facRes.data.data);
        } catch {
            setError('Failed to fetch initial data');
        } finally {
            setLoading(false);
        }
    };

    const handleCalendarChange = async (e) => {
        const calId = e.target.value;
        setSelectedCalendar(calId);
        if (!calId) {
            setTimetable(null);
            return;
        }
        fetchTimetable(calId, selectedDate);
    };

    const handleDateChange = (e) => {
        const date = e.target.value;
        setSelectedDate(date);
        if (selectedCalendar) {
            fetchTimetable(selectedCalendar, date);
        }
    };

    const fetchTimetable = async (calId, date) => {
        try {
            setLoading(true);
            setError('');
            const params = { academicCalendarId: calId };
            if (date) params.date = date;
            const response = await timetableAPI.getTimetable(params);
            setTimetable(response.data.data);
        } catch (err) {
            if (err.response?.status === 404) {
                setTimetable(null);
            } else {
                setError('Failed to fetch timetable');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedCalendar) return;
        try {
            setGenerating(true);
            setError('');
            const response = await timetableAPI.generateTimetable(selectedCalendar);
            setTimetable(response.data.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Generation failed');
        } finally {
            setGenerating(false);
        }
    };

    // Filter entries
    const filteredEntries = useMemo(() => {
        if (!timetable?.entries) return [];
        return timetable.entries.filter(e => {
            const year = typeof e.year === 'number' ? e.year : parseInt(e.year);
            const facId = typeof e.faculty === 'object' ? e.faculty?._id : e.faculty;
            const facName = typeof e.faculty === 'object' ? e.faculty?.name : null;

            if (filterYear && year !== parseInt(filterYear)) return false;
            if (filterSection && (e.section || '').toUpperCase() !== filterSection.toUpperCase()) return false;
            if (filterFaculty && facId !== filterFaculty && facName !== filterFaculty) return false;
            return true;
        });
    }, [timetable, filterYear, filterSection, filterFaculty]);

    // Available years and sections for filters
    const { availableYears, availableSections } = useMemo(() => {
        if (!timetable?.entries) return { availableYears: [], availableSections: [] };
        const years = new Set();
        const sections = new Set();
        timetable.entries.forEach(e => {
            if (e.year) years.add(e.year);
            if (e.section) sections.add(e.section.toUpperCase());
        });
        return {
            availableYears: Array.from(years).sort(),
            availableSections: Array.from(sections).sort()
        };
    }, [timetable]);

    // Build grid data
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const maxSlot = filteredEntries.reduce((max, e) => Math.max(max, e.slotNumber || 0), 0) || 8;
    const slots = Array.from({ length: maxSlot }, (_, i) => i + 1);

    const grid = {};
    days.forEach(day => {
        grid[day] = {};
        slots.forEach(s => {
            grid[day][s] = filteredEntries.filter(e => e.day === day && e.slotNumber === s);
        });
    });

    // Stats
    const totalClasses = filteredEntries.length;
    const adjustedClasses = filteredEntries.filter(e => e.isAdjustment).length;
    const cancelledNotice = timetable?.entries ? timetable.entries.filter(e => e.isCancellation).length : 0;

    // Week range display
    const weekRangeStr = useMemo(() => {
        if (!selectedDate) return '';
        const d = new Date(selectedDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(d.setDate(diff));
        const sat = new Date(mon);
        sat.setDate(mon.getDate() + 5);
        return `${mon.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${sat.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }, [selectedDate]);

    // Helper: get display info from entry
    const getCourseCode = (entry) => {
        if (typeof entry.course === 'object') return entry.course?.courseCode || entry.course?.code || '???';
        return entry.course || '???';
    };
    const getCourseName = (entry) => {
        if (typeof entry.course === 'object') return entry.course?.courseName || entry.course?.name || '';
        return '';
    };
    const getFacultyName = (entry) => {
        if (typeof entry.faculty === 'object') return entry.faculty?.name || '';
        // lookup from list
        const f = facultyList.find(fac => fac._id === entry.faculty);
        return f ? f.name : '';
    };
    const getRoomNumber = (entry) => {
        if (typeof entry.room === 'object') return entry.room?.roomNumber || entry.room?.number || '';
        return entry.room || '';
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans text-gray-800">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100/50">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Dynamic Scheduling</h2>
                    <p className="text-sm text-gray-500 mt-1">View the live schedule with all rescheduled/compensated classes for any week.</p>
                </div>
            </div>

            <ErrorMessage message={error} onClose={() => setError('')} />

            {/* Controls */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Calendar Selector */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Academic Calendar</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <select
                                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                                value={selectedCalendar}
                                onChange={handleCalendarChange}
                            >
                                <option value="">-- Select --</option>
                                {calendars.map(cal => (
                                    <option key={cal._id} value={cal._id}>
                                        {cal.academicYear} - {cal.semester} {cal.isActive ? '★' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Date Picker */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">View Week For Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="date"
                                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={selectedDate}
                                onChange={handleDateChange}
                            />
                        </div>
                    </div>

                    {/* Generate Button */}
                    <div className="flex items-end">
                        <button
                            onClick={handleGenerate}
                            disabled={!selectedCalendar || generating}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-white shadow-sm transition-all text-sm
                                ${!selectedCalendar || generating
                                    ? 'bg-indigo-300 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 hover:shadow-lg active:scale-[0.98]'}`}
                        >
                            {generating ? <RefreshCw className="animate-spin" size={16} /> : <Activity size={16} />}
                            {generating ? 'Generating...' : timetable ? 'Re-generate' : 'Generate Schedule'}
                        </button>
                    </div>

                    {/* Refresh Button */}
                    <div className="flex items-end">
                        <button
                            onClick={() => selectedCalendar && fetchTimetable(selectedCalendar, selectedDate)}
                            disabled={!selectedCalendar || loading}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 shadow-sm hover:bg-indigo-100 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh View
                        </button>
                    </div>
                </div>
            </div>

            {/* Week Range Banner + Filters */}
            {timetable && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <Calendar size={18} className="text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-700">Showing schedule for: <span className="text-indigo-600">{weekRangeStr}</span></p>
                                <p className="text-xs text-gray-400">Master timetable merged with all rescheduled adjustments</p>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <Filter size={14} className="text-gray-400" />
                            <select className="text-sm py-1.5 px-3 bg-gray-50 border border-gray-200 rounded-lg" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                                <option value="">All Years</option>
                                {availableYears.map(y => <option key={y} value={y}>Year {y}</option>)}
                            </select>
                            <select className="text-sm py-1.5 px-3 bg-gray-50 border border-gray-200 rounded-lg" value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                                <option value="">All Sections</option>
                                {availableSections.map(s => <option key={s} value={s}>Section {s}</option>)}
                            </select>
                            <select className="text-sm py-1.5 px-3 bg-gray-50 border border-gray-200 rounded-lg" value={filterFaculty} onChange={e => setFilterFaculty(e.target.value)}>
                                <option value="">All Faculty</option>
                                {facultyList.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                            </select>
                            {(filterYear || filterSection || filterFaculty) && (
                                <button onClick={() => { setFilterYear(''); setFilterSection(''); setFilterFaculty(''); }} className="text-xs text-red-500 hover:text-red-700 font-medium">Clear</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            {timetable && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 group hover:border-indigo-200 transition-colors">
                        <BookOpen size={18} className="text-indigo-500 mb-2" />
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-0.5">Classes Shown</p>
                        <p className="text-2xl font-bold text-gray-900">{totalClasses}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 group hover:border-purple-200 transition-colors">
                        <Activity size={18} className="text-purple-500 mb-2" />
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-0.5">Rescheduled</p>
                        <p className="text-2xl font-bold text-purple-600">{adjustedClasses}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 group hover:border-blue-200 transition-colors">
                        <Users size={18} className="text-blue-500 mb-2" />
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-0.5">Status</p>
                        <p className={`text-sm font-bold ${timetable.status === 'locked' ? 'text-gray-600' : 'text-green-600'}`}>{timetable.status?.toUpperCase()}</p>
                    </div>
                    <div className={`p-4 rounded-xl shadow-sm border transition-colors ${adjustedClasses > 0 ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200'}`}>
                        <AlertCircle size={18} className={adjustedClasses > 0 ? 'text-purple-500 mb-2' : 'text-green-500 mb-2'} />
                        <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-0.5">Alert</p>
                        <p className="text-sm font-semibold text-gray-800">{adjustedClasses > 0 ? `${adjustedClasses} adjusted classes this week` : 'No adjustments this week'}</p>
                    </div>
                </div>
            )}

            {/* The Timetable Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl shadow-sm border border-gray-100">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-gray-500 font-medium animate-pulse">Loading live schedule...</p>
                </div>
            ) : timetable ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto relative">
                        {loading && (
                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                                <RefreshCw className="animate-spin text-indigo-500" size={24} />
                            </div>
                        )}
                        <table className="min-w-full divide-y divide-gray-200 border-collapse">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200 sticky left-0 bg-gray-50 z-10">Day / Slot</th>
                                    {slots.map(s => (
                                        <th key={s} className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[140px]">
                                            Slot {s}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {days.map(day => (
                                    <tr key={day} className="hover:bg-gray-50/50">
                                        <td className="px-3 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 border-r border-gray-200 bg-gray-50 sticky left-0 z-10">{day}</td>
                                        {slots.map(s => {
                                            const entries = grid[day]?.[s] || [];
                                            return (
                                                <td key={`${day}-${s}`} className="px-1.5 py-1.5 text-xs border-r border-gray-100 align-top h-24">
                                                    {entries.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {entries.map((entry, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={`p-1.5 rounded-lg text-xs flex flex-col justify-between overflow-hidden shadow-sm border transition-all
                                                                        ${entry.isAdjustment
                                                                            ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-200'
                                                                            : entry.type === 'P'
                                                                                ? 'bg-green-50 border-green-200'
                                                                                : 'bg-blue-50 border-blue-200'
                                                                        }`}
                                                                >
                                                                    <div className="font-bold truncate text-gray-800" title={getCourseName(entry)}>
                                                                        {getCourseCode(entry)}
                                                                    </div>
                                                                    <div className="text-[10px] truncate text-gray-600" title={getFacultyName(entry)}>
                                                                        {getFacultyName(entry) || 'N/A'}
                                                                    </div>
                                                                    <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                                                                        <span>{getRoomNumber(entry)}</span>
                                                                        <span>Y{entry.year}-{entry.section}</span>
                                                                    </div>
                                                                    {entry.isAdjustment && (
                                                                        <div className="mt-1 flex items-center gap-1">
                                                                            <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-pulse"></span>
                                                                            <span className="text-[9px] text-purple-700 font-bold uppercase">Compensated</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="h-full flex items-center justify-center text-gray-300">–</div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Legend */}
                    <div className="p-4 border-t border-gray-100 flex flex-wrap items-center gap-5 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded"></div>
                            <span>Regular Theory</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
                            <span>Practical/Lab</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-purple-50 border border-purple-300 rounded ring-1 ring-purple-200"></div>
                            <span>Rescheduled / Compensated</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                    <Calendar size={48} className="mb-4 text-gray-300" strokeWidth={1.5} />
                    <p className="text-lg font-medium text-gray-600">No schedule generated yet.</p>
                    <p className="text-sm mt-1">Select an active calendar and click "Generate Schedule" to begin.</p>
                </div>
            )}

            {/* Adjustment Breakdown */}
            {timetable && adjustedClasses > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-purple-500" />
                        Weekly Rescheduled Classes Breakdown
                    </h3>
                    <div className="space-y-3">
                        {days.flatMap(day => {
                            const dayAdjustments = filteredEntries.filter(e => e.day === day && e.isAdjustment);
                            if (dayAdjustments.length === 0) return [];

                            return dayAdjustments.map((adj, idx) => (
                                <div key={`${day}-${idx}`} className="flex items-center p-3 bg-purple-50/50 border border-purple-200 rounded-lg shadow-sm">
                                    <div className="w-16 text-center border-r border-purple-100 mr-4 shrink-0">
                                        <div className="text-xs font-bold text-purple-700">{day.slice(0, 3)}</div>
                                        <div className="text-[10px] text-gray-500">{adj.displayDate ? new Date(adj.displayDate).getDate() : ''}</div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-gray-800 truncate">{getCourseName(adj)} ({getCourseCode(adj)})</div>
                                        <div className="text-xs text-gray-600">
                                            Slot {adj.slotNumber} • {getFacultyName(adj)} • Year {adj.year}-Sec {adj.section} • Room {getRoomNumber(adj)}
                                        </div>
                                    </div>
                                    <div className="text-right ml-4 shrink-0">
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded uppercase tracking-wider">Compensated</span>
                                    </div>
                                </div>
                            ));
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DynamicSchedulingDashboard;