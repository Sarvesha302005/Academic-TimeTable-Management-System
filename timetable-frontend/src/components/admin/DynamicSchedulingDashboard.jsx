import React, { useState, useEffect } from 'react';
import { adminAPI, timetableAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import TimetableGrid from './TimetableGrid';
import { AnalyticsCharts } from './AnalyticsCharts';
import { Calendar, RefreshCw, Lock, Unlock, AlertCircle, BookOpen, Users, AlertTriangle, Activity, Download, Settings } from 'lucide-react';
// import { jsPDF } from 'jspdf';
// import html2canvas from 'html2canvas';

const DynamicSchedulingDashboard = () => {
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState('');
  const [calendarDetails, setCalendarDetails] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [timeSlots, setTimeSlots] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [calRes, slotRes, facRes] = await Promise.all([
        adminAPI.getAcademicCalendars(),
        adminAPI.getTimeSlots(),
        adminAPI.getFaculty()
      ]);
      setCalendars(calRes.data.data);
      setTimeSlots(slotRes.data.data);
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
      setCalendarDetails(null);
      setTimetable(null);
      return;
    }

    const cal = calendars.find(c => c._id === calId);
    setCalendarDetails(cal);

    fetchTimetable(calId);
  };

  const fetchTimetable = async (calId) => {
    try {
      setLoading(true);
      const response = await timetableAPI.getTimetable({ academicCalendarId: calId });
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
      setError(''); // Clear errors
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPDF = () => {
    // Logic to export to PDF later
    window.print();
  };

  const handleExportExcel = () => {
    alert("Excel export functionality coming soon!");
  };

  // Derive stats
  const totalClasses = timetable?.entries ? timetable.entries.length : 0;

  let totalTeachers = 0;
  let overloadedCount = 0;
  let backToBackWarning = 0;
  const maxHours = 20; // Default max

  if (timetable?.entries) {
    const facultyDistribution = {};
    timetable.entries.forEach(e => {
      const facultyId = typeof e.faculty === 'object' ? e.faculty?._id : e.faculty;
      if (facultyId) {
        facultyDistribution[facultyId] = (facultyDistribution[facultyId] || 0) + 1;
      }
    });

    totalTeachers = Object.keys(facultyDistribution).length;

    Object.values(facultyDistribution).forEach(hours => {
      if (hours > maxHours) overloadedCount++;
    });
  }

  const roomUtil = timetable?.statistics?.roomUtilization ? (timetable.statistics.roomUtilization * 100).toFixed(1) : 0;

  const optScore = Math.max(0, 100 - (overloadedCount * 10));

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans selection:bg-indigo-100 selection:text-indigo-900 text-gray-800">

      {/* 1️⃣ Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100/50">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Dynamic Scheduling</h2>
          <p className="text-sm text-gray-500 mt-1">Manage, generate, and optimize academic timetables.</p>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <button onClick={handleExportPDF} disabled={!timetable} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            <Download size={16} /> Export PDF
          </button>
          <button onClick={handleExportExcel} disabled={!timetable} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg shadow-sm hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            <Activity size={16} /> Export Excel
          </button>
        </div>
      </div>

      <ErrorMessage message={error} onClose={() => setError('')} />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* 2️⃣ Control Panel Card */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Settings size={18} className="text-indigo-500" /> Control Panel
              </h3>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Active Calendar</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:bg-gray-100 transition-colors appearance-none"
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

              {calendarDetails && (
                <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100/50 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-indigo-600/70 font-semibold mb-0.5 uppercase tracking-wider">Working Days</p>
                    <p className="text-lg font-bold text-indigo-900">{calendarDetails.workingDays?.length || 5}</p>
                  </div>
                  <div className="h-8 w-px bg-indigo-200"></div>
                  <div>
                    <p className="text-xs text-indigo-600/70 font-semibold mb-0.5 uppercase tracking-wider">Time Slots</p>
                    <p className="text-lg font-bold text-indigo-900">{timeSlots.length}</p>
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={!selectedCalendar || generating}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-white shadow-sm transition-all
                            ${!selectedCalendar || generating
                      ? 'bg-indigo-300 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 hover:shadow-indigo-200/50 hover:shadow-lg active:scale-[0.98]'}`}
                >
                  {generating ? <RefreshCw className="animate-spin" size={18} /> : <Activity size={18} />}
                  {generating ? 'Generating Optimally...' : timetable ? 'Re-optimize Schedule' : 'Generate Schedule'}
                </button>
              </div>

              {timetable && (
                <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    {timetable.status === 'locked' ? <Lock size={16} className="text-gray-500" /> : <Unlock size={16} className="text-green-500" />}
                    Status
                  </span>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider
                                ${timetable.status === 'locked' ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                    {timetable.status}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 6️⃣ Alerts Panel (Moved here for better dashboard flow on large screens) */}
          {timetable && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-400 to-red-500"></div>
              <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle size={18} className="text-orange-500" /> Alerts & Warnings
              </h3>
              <div className="space-y-3">
                {overloadedCount > 0 ? (
                  <div className="flex gap-3 text-sm p-3 bg-red-50 text-red-800 rounded-lg border border-red-100">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" />
                    <div><span className="font-bold">{overloadedCount} teachers</span> are assigned workloads exceeding {maxHours} hours.</div>
                  </div>
                ) : (
                  <div className="flex gap-3 text-sm p-3 bg-green-50 text-green-800 rounded-lg border border-green-100">
                    <span>✅ Workload constraints satisfied.</span>
                  </div>
                )}

                {roomUtil > 90 && (
                  <div className="flex gap-3 text-sm p-3 bg-orange-50 text-orange-800 rounded-lg border border-orange-100">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5 text-orange-500" />
                    <div>Room utilization exceeds 90%. Expect tight scheduling margins.</div>
                  </div>
                )}

                {backToBackWarning > 0 && (
                  <div className="flex gap-3 text-sm p-3 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-100">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-yellow-500" />
                    <div>Multiple back-to-back sessions detected for Faculty.</div>
                  </div>
                )}

                {overloadedCount === 0 && roomUtil <= 90 && backToBackWarning === 0 && (
                  <div className="text-sm text-gray-500 italic mt-2">No critical warnings detected.</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="xl:col-span-3 space-y-6">
          {/* 3️⃣ KPI Cards Section */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 group hover:border-indigo-200 transition-colors relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-50 rounded-full group-hover:bg-indigo-100 transition-colors"></div>
              <BookOpen size={20} className="text-indigo-500 mb-3 relative z-10" />
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1 relative z-10">Total Classes</p>
              <p className="text-2xl font-bold text-gray-900 relative z-10">{totalClasses}</p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 group hover:border-blue-200 transition-colors relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors"></div>
              <Users size={20} className="text-blue-500 mb-3 relative z-10" />
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1 relative z-10">Total Teachers</p>
              <p className="text-2xl font-bold text-gray-900 relative z-10">{totalTeachers}</p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 group hover:border-red-200 transition-colors relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-red-50 rounded-full group-hover:bg-red-100 transition-colors"></div>
              <AlertTriangle size={20} className={`mb-3 relative z-10 ${overloadedCount > 0 ? 'text-red-500' : 'text-gray-400'}`} />
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1 relative z-10">Overloaded</p>
              <div className="flex items-center gap-2 relative z-10">
                <p className={`text-2xl font-bold ${overloadedCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{overloadedCount}</p>
                {overloadedCount > 0 && <span className="text-xs font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded">Action Req</span>}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 group hover:border-teal-200 transition-colors relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-teal-50 rounded-full group-hover:bg-teal-100 transition-colors"></div>
              <Activity size={20} className="text-teal-500 mb-3 relative z-10" />
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1 relative z-10">Room Util</p>
              <div className="flex items-center gap-2 relative z-10">
                <p className="text-2xl font-bold text-gray-900">{roomUtil}%</p>
                <div className="grow h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${roomUtil > 85 ? 'bg-orange-400' : 'bg-teal-400'}`} style={{ width: `${Math.min(roomUtil, 100)}%` }}></div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 p-5 rounded-xl shadow-md border border-indigo-700 relative overflow-hidden flex flex-col justify-end text-white">
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">Opt. Score</p>
              <div className="flex items-baseline gap-1">
                <p className="text-4xl font-black">{optScore}</p>
                <span className="text-lg font-bold text-indigo-300">/100</span>
              </div>
            </div>
          </div>

          {/* 5️⃣ Live Timetable Section */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl shadow-sm border border-gray-100">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-gray-500 font-medium animate-pulse">Processing constraints and generating schedule...</p>
            </div>
          ) : timetable ? (
            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100">
              {/* The TimetableGrid handles its own internal filtering layout and empty states now */}
              <TimetableGrid timetable={timetable} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
              <Calendar size={48} className="mb-4 text-gray-300" strokeWidth={1.5} />
              <p className="text-lg font-medium text-gray-600">No schedule generated yet.</p>
              <p className="text-sm mt-1">Select an active calendar and click "Generate Schedule" to begin.</p>
            </div>
          )}
        </div>
      </div>

      {/* 7️⃣ Analytics Section (Imported Component) */}
      {timetable && (
        <AnalyticsCharts timetable={timetable} facultyList={facultyList} />
      )}
    </div>
  );
};

export default DynamicSchedulingDashboard;
