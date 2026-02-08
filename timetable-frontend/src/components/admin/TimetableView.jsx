import React, { useState, useEffect } from 'react';
import { adminAPI, timetableAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import TimetableGrid from './TimetableGrid';

const TimetableView = () => {
    const [calendars, setCalendars] = useState([]);
    const [selectedCalendar, setSelectedCalendar] = useState('');
    const [timetable, setTimetable] = useState(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedSection, setSelectedSection] = useState('');

    useEffect(() => {
        fetchCalendars();
    }, []);

    const fetchCalendars = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getAcademicCalendars();
            setCalendars(response.data.data);
        } catch (err) {
            setError('Failed to fetch calendars');
        } finally {
            setLoading(false);
        }
    };

    const fetchTimetable = async (calendarId) => {
        if (!calendarId) return;

        try {
            setLoading(true);
            setError('');
            const response = await timetableAPI.getTimetable({ academicCalendarId: calendarId });
            setTimetable(response.data.data);

            // Reset filters when new timetable is loaded
            setSelectedYear('');
            setSelectedSection('');

        } catch (err) {
            console.error(err);
            if (err.response?.status === 404) {
                setError('No timetable found for this calendar. Please generate one first.');
            } else {
                setError('Failed to fetch timetable');
            }
            setTimetable(null);
        } finally {
            setLoading(false);
        }
    };

    const handleCalendarChange = (e) => {
        const calendarId = e.target.value;
        setSelectedCalendar(calendarId);
        if (calendarId) {
            fetchTimetable(calendarId);
        } else {
            setTimetable(null);
        }
    };

    const handleLock = async () => {
        if (!selectedCalendar) return;
        if (!window.confirm('Locking this timetable will replace any currently active timetable. Continue?')) return;

        try {
            setActionLoading(true);
            await adminAPI.lockTimetable({ academicCalendarId: selectedCalendar });
            alert('Timetable locked successfully! It is now visible to faculty/students.');
            fetchTimetable(selectedCalendar); // Refresh status
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to lock timetable');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnlock = async () => {
        if (!selectedCalendar) return;
        if (!window.confirm('Are you sure you want to unlock this timetable?')) return;

        try {
            setActionLoading(true);
            await adminAPI.unlockTimetable({ academicCalendarId: selectedCalendar });
            alert('Timetable unlocked successfully!');
            fetchTimetable(selectedCalendar); // Refresh status
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to unlock timetable');
        } finally {
            setActionLoading(false);
        }
    };

    // Extract unique years and sections from timetable entries
    const getUniqueOptions = () => {
        if (!timetable || !timetable.entries) return { years: [], sections: [] };

        const years = [...new Set(timetable.entries.map(e => e.year))].sort((a, b) => a - b);
        const sections = [...new Set(timetable.entries.map(e => e.section))].sort();

        return { years, sections };
    };

    const { years, sections } = getUniqueOptions();

    return (
        <div className="space-y-6">
            <div className="card">
                <h2 className="text-2xl font-bold mb-6">View Timetable</h2>
                <ErrorMessage message={error} onClose={() => setError('')} />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 items-end">
                    <div className="md:col-span-1">
                        <label className="label">Academic Calendar</label>
                        <select
                            className="input-field"
                            value={selectedCalendar}
                            onChange={handleCalendarChange}
                        >
                            <option value="">-- Select Calendar --</option>
                            {calendars.map(cal => (
                                <option key={cal._id} value={cal._id}>
                                    {cal.academicYear} - {cal.semester} ({cal.isActive ? 'Active' : 'Inactive'})
                                </option>
                            ))}
                        </select>
                    </div>

                    {timetable && (
                        <>
                            <div className="md:col-span-1">
                                <label className="label">Year</label>
                                <select
                                    className="input-field"
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                >
                                    <option value="">All Years</option>
                                    {years.map(y => (
                                        <option key={y} value={y}>Year {y}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-1">
                                <label className="label">Section</label>
                                <select
                                    className="input-field"
                                    value={selectedSection}
                                    onChange={(e) => setSelectedSection(e.target.value)}
                                >
                                    <option value="">All Sections</option>
                                    {sections.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-1 flex space-x-2">
                                {timetable.status === 'locked' ? (
                                    <button
                                        onClick={handleUnlock}
                                        disabled={actionLoading}
                                        className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded w-full"
                                    >
                                        {actionLoading ? 'Unlock...' : 'Unlock Timetable'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleLock}
                                        disabled={actionLoading}
                                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded w-full"
                                    >
                                        {actionLoading ? 'Locking...' : 'Lock Timetable'}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {timetable && (
                    <div className="mb-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${timetable.status === 'locked' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            Status: {timetable.status.charAt(0).toUpperCase() + timetable.status.slice(1)}
                        </span>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center p-12">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : timetable ? (
                    <TimetableGrid
                        timetable={timetable}
                        selectedYear={selectedYear}
                        selectedSection={selectedSection}
                    />
                ) : (
                    <div className="text-center p-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        {selectedCalendar ? 'No timetable generated for this calendar' : 'Select a calendar to view timetable'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimetableView;
