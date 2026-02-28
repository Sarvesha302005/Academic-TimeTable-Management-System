import React, { useState, useEffect, useMemo } from 'react';
import { adminAPI, timetableAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ReferenceLine, PieChart, Pie, Legend } from 'recharts';
import { Calendar, AlertCircle, AlertTriangle, Users, Clock, Activity, CheckCircle, XCircle } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const WorkloadOptimizationDashboard = () => {
    const [calendars, setCalendars] = useState([]);
    const [selectedCalendar, setSelectedCalendar] = useState('');
    const [calendarDetails, setCalendarDetails] = useState(null);
    const [timetable, setTimetable] = useState(null);
    const [facultyList, setFacultyList] = useState([]);
    const [rules, setRules] = useState([]);
    const [timeSlots, setTimeSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [calRes, facRes, ruleRes, slotRes] = await Promise.all([
                adminAPI.getAcademicCalendars(),
                adminAPI.getFaculty(),
                adminAPI.getWorkloadRules(),
                adminAPI.getTimeSlots()
            ]);
            setCalendars(calRes.data.data);
            setFacultyList(facRes.data.data);
            setRules(ruleRes.data.data);
            setTimeSlots(slotRes.data.data);
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
            const params = { academicCalendarId: calId };
            if (date) params.date = date;
            const response = await timetableAPI.getTimetable(params);
            setTimetable(response.data.data);
        } catch (err) {
            setTimetable(null);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Analytics Data
    const analytics = useMemo(() => {
        if (!timetable || (!timetable.entries && !timetable.timetable)) return null;

        const entries = timetable.entries || timetable.timetable || [];
        if (entries.length === 0) return null;

        const activeRule = rules.find(r => r.academicCalendar === selectedCalendar) || { maxHoursPerWeek: 20 };
        const maxHours = activeRule.maxHoursPerWeek;

        let totalAssignedHours = 0;
        let overloadedCount = 0;
        let teacherData = [];
        let distributionCounts = { balanced: 0, nearLimit: 0, overloaded: 0 };

        // Compute facultyDistribution manually from entries
        const facultyDistribution = {};
        entries.forEach(e => {
            const facultyId = typeof e.faculty === 'object' ? e.faculty?._id : e.faculty;
            if (facultyId) {
                // Assuming each slot maps to 1 credit hour
                facultyDistribution[facultyId] = (facultyDistribution[facultyId] || 0) + 1;
            }
        });

        // Process Faculty Workload
        Object.entries(facultyDistribution).forEach(([facultyId, hours]) => {
            const faculty = facultyList.find(f => f._id === facultyId);
            const name = faculty ? faculty.name : `Faculty ${facultyId.substring(0, 4)}`;

            totalAssignedHours += hours;
            const isOverloaded = hours > maxHours;

            let status = 'Balanced';
            if (hours > maxHours) {
                status = 'Overloaded';
                distributionCounts.overloaded++;
                overloadedCount++;
            } else if (hours >= maxHours * 0.8) {
                status = 'Near Limit';
                distributionCounts.nearLimit++;
            } else {
                status = 'Balanced';
                distributionCounts.balanced++;
            }

            teacherData.push({
                name,
                assignedHours: hours,
                maxHours: maxHours,
                status,
                isOverloaded
            });
        });

        // Sort teacher data by assigned hours descending
        teacherData.sort((a, b) => b.assignedHours - a.assignedHours);

        // Process Room Utilization
        const roomUsageObj = {};
        entries.forEach(e => {
            const roomName = typeof e.room === 'object' ? e.room?.roomNumber : e.room;
            if (roomName) {
                roomUsageObj[roomName] = (roomUsageObj[roomName] || 0) + 1;
            }
        });

        const workingDaysCount = calendarDetails?.workingDays?.length || 5;
        const slotsPerDay = timeSlots?.length || 8;
        const totalSlotsPerRoom = workingDaysCount * slotsPerDay;

        const roomData = Object.entries(roomUsageObj).map(([room, used]) => {
            const utilPercent = Math.round((used / totalSlotsPerRoom) * 100);
            return {
                room,
                usedSlots: used,
                totalSlots: totalSlotsPerRoom,
                utilization: utilPercent,
                isFull: utilPercent > 90
            };
        }).sort((a, b) => b.utilization - a.utilization);

        let overUsedRooms = roomData.filter(r => r.utilization > 90).length;

        const totalTeachers = teacherData.length;
        const avgLoad = totalTeachers > 0 ? (totalAssignedHours / totalTeachers).toFixed(1) : 0;
        const overallRoomUsage = timetable.statistics?.roomUtilization ? Math.round(timetable.statistics.roomUtilization * 100) : 0;

        // Ensure score stays bounded 0-100
        const optScore = Math.max(0, Math.min(100, 100 - (overloadedCount * 10) - (overUsedRooms * 5)));

        const pieData = [
            { name: 'Balanced', value: distributionCounts.balanced, color: '#10B981' }, // emerald-500
            { name: 'Near Limit', value: distributionCounts.nearLimit, color: '#F59E0B' }, // amber-500
            { name: 'Overloaded', value: distributionCounts.overloaded, color: '#EF4444' } // red-500
        ].filter(d => d.value > 0);

        return {
            maxHours,
            teacherData,
            roomData,
            totalTeachers,
            overloadedCount,
            avgLoad,
            overallRoomUsage,
            optScore,
            pieData,
            overUsedRooms
        };
    }, [timetable, facultyList, rules, selectedCalendar, calendarDetails, timeSlots]);


    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900 text-white p-3 rounded-lg text-sm shadow-xl font-sans">
                    <p className="font-bold mb-1">{label}</p>
                    <p className="flex justify-between gap-4"><span>Assigned:</span> <span className="font-bold">{payload[0].value} hrs</span></p>
                    {payload[1] && <p className="flex justify-between gap-4 text-gray-400"><span>Limit:</span> <span>{payload[1].value} hrs</span></p>}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans text-gray-800">
            {/* 1️⃣ Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Workload Optimization</h2>
                    <p className="text-sm text-gray-500 mt-1">Analyze timetable constraints, detect instructor overloads, and track resource utilization.</p>
                </div>
                {analytics && (
                    <div className="mt-4 sm:mt-0 flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
                        <Activity size={18} className="text-indigo-600" />
                        <span className="text-sm font-semibold text-indigo-900">Health: {analytics.optScore}%</span>
                        {analytics.optScore >= 80 ? <CheckCircle size={16} className="text-emerald-500 ml-1" /> : <AlertTriangle size={16} className="text-orange-500 ml-1" />}
                    </div>
                )}
            </div>

            <ErrorMessage message={error} onClose={() => setError('')} />

            {/* 2️⃣ Controls (Calendar Dropdown) */}
            <div className="bg-white p-5 flex items-center gap-4 rounded-xl shadow-sm border border-gray-100">
                <Calendar className="text-gray-400" size={20} />
                <select
                    className="w-full sm:w-1/3 py-2 px-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={selectedCalendar}
                    onChange={handleCalendarChange}
                >
                    <option value="">-- Select Active Calendar to Analyze --</option>
                    {calendars.map(cal => (
                        <option key={cal._id} value={cal._id}>
                            {cal.academicYear} - {cal.semester} {cal.isActive ? '(Active)' : ''}
                        </option>
                    ))}
                </select>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Week:</span>
                    <input
                        type="date"
                        className="py-2 px-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={selectedDate}
                        onChange={handleDateChange}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <LoadingSpinner size="lg" />
                    <p className="text-gray-500 mt-4 animate-pulse">Analyzing workload constraints...</p>
                </div>
            ) : analytics ? (
                <div className="space-y-6">
                    {/* 3️⃣ KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-blue-200 transition-colors">
                            <div>
                                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Teachers</p>
                                <p className="text-3xl font-bold text-gray-900">{analytics.totalTeachers}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 group-hover:bg-blue-100 transition-colors">
                                <Users size={24} />
                            </div>
                        </div>

                        <div className={`bg-white p-5 rounded-xl shadow-sm border flex items-center justify-between group transition-colors ${analytics.overloadedCount > 0 ? 'border-red-200 hover:border-red-300' : 'border-gray-100 hover:border-green-200'}`}>
                            <div>
                                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Overloaded</p>
                                <div className="flex items-center gap-2">
                                    <p className={`text-3xl font-bold ${analytics.overloadedCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{analytics.overloadedCount}</p>
                                    {analytics.overloadedCount > 0 && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1"><AlertCircle size={10} /> ACT</span>}
                                </div>
                            </div>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${analytics.overloadedCount > 0 ? 'bg-red-50 text-red-500 group-hover:bg-red-100' : 'bg-green-50 text-green-500 group-hover:bg-green-100'}`}>
                                <AlertTriangle size={24} />
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-amber-200 transition-colors">
                            <div>
                                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Avg Load</p>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-3xl font-bold text-gray-900">{analytics.avgLoad}</p>
                                    <span className="text-gray-400 font-medium">hrs</span>
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 group-hover:bg-amber-100 transition-colors">
                                <Clock size={24} />
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-teal-200 transition-colors">
                            <div className="w-full">
                                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Room Usage</p>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-3xl font-bold text-gray-900">{analytics.overallRoomUsage}%</p>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${analytics.overallRoomUsage > 85 ? 'bg-orange-400' : 'bg-teal-400'}`} style={{ width: `${analytics.overallRoomUsage}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4️⃣ Main Layout Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                        {/* Left Column: Tables & Alerts */}
                        <div className="xl:col-span-2 flex flex-col gap-6">

                            {/* Optimization Alerts */}
                            {(analytics.overloadedCount > 0 || analytics.overUsedRooms > 0) && (
                                <div className="bg-red-50/50 p-5 rounded-xl border border-red-100/80 shadow-sm relative overflow-hidden">
                                    <div className="absolute left-0 top-0 w-1 h-full bg-red-500"></div>
                                    <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <AlertTriangle size={16} /> Actionable Alerts
                                    </h3>
                                    <div className="space-y-2">
                                        {analytics.overloadedCount > 0 && (
                                            <div className="flex bg-white items-center gap-3 p-3 rounded-lg border border-red-100 text-sm shadow-sm">
                                                <div className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center shrink-0">
                                                    <Users size={16} />
                                                </div>
                                                <div className="text-gray-700">
                                                    <span className="font-bold text-red-600">{analytics.overloadedCount} teachers</span> are assigned workloads exceeding the limit of <span className="font-bold">{analytics.maxHours} hours</span>.
                                                </div>
                                            </div>
                                        )}
                                        {analytics.overUsedRooms > 0 && (
                                            <div className="flex bg-white items-center gap-3 p-3 rounded-lg border border-orange-100 text-sm shadow-sm">
                                                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center shrink-0">
                                                    <AlertCircle size={16} />
                                                </div>
                                                <div className="text-gray-700">
                                                    <span className="font-bold text-orange-600">{analytics.overUsedRooms} rooms</span> exceed 90% scheduling capacity.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Teacher Workload Table */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <h3 className="text-base font-bold text-gray-800">Teacher Workload Breakdown</h3>
                                </div>
                                <div className="overflow-x-auto max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                            <tr className="text-gray-500 uppercase tracking-wider text-xs">
                                                <th className="p-4 font-bold border-b border-gray-200">Teacher</th>
                                                <th className="p-4 font-bold border-b border-gray-200 text-center">Assigned Hrs</th>
                                                <th className="p-4 font-bold border-b border-gray-200 text-center">Max Hrs</th>
                                                <th className="p-4 font-bold border-b border-gray-200 text-left">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {analytics.teacherData.map((teacher, idx) => (
                                                <tr key={idx} className={`hover:bg-gray-50 transition-colors ${teacher.isOverloaded ? 'bg-red-50/30' : ''}`}>
                                                    <td className="p-4 font-semibold text-gray-800 flexItems-center gap-2">
                                                        {teacher.name}
                                                    </td>
                                                    <td className={`p-4 text-center font-bold ${teacher.isOverloaded ? 'text-red-600' : 'text-gray-700'}`}>
                                                        {teacher.assignedHours}
                                                    </td>
                                                    <td className="p-4 text-center text-gray-400 font-medium">
                                                        {teacher.maxHours}
                                                    </td>
                                                    <td className="p-4 text-left">
                                                        {teacher.isOverloaded ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                                                <XCircle size={12} /> Overloaded
                                                            </span>
                                                        ) : teacher.status === 'Near Limit' ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                                <AlertCircle size={12} /> Near Limit
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                                <CheckCircle size={12} /> OK
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Room Utilization Table */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <h3 className="text-base font-bold text-gray-800">Room Utilization Panel</h3>
                                </div>
                                <div className="overflow-x-auto max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                            <tr className="text-gray-500 uppercase tracking-wider text-xs">
                                                <th className="p-4 font-bold border-b border-gray-200">Room</th>
                                                <th className="p-4 font-bold border-b border-gray-200 text-center">Used Slots</th>
                                                <th className="p-4 font-bold border-b border-gray-200 text-center">Total Slots</th>
                                                <th className="p-4 font-bold border-b border-gray-200 flex-grow">Utilization</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {analytics.roomData.map((room, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-4 font-semibold text-gray-800">{room.room}</td>
                                                    <td className="p-4 text-center font-medium text-gray-700">{room.usedSlots}</td>
                                                    <td className="p-4 text-center text-gray-400 font-medium">{room.totalSlots}</td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`font-bold w-12 text-right ${room.isFull ? 'text-red-500' : 'text-gray-700'}`}>{room.utilization}%</span>
                                                            <div className="grow h-2 bg-gray-100 rounded-full overflow-hidden w-24">
                                                                <div className={`h-full rounded-full ${room.isFull ? 'bg-red-500' : room.utilization > 70 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(room.utilization, 100)}%` }}></div>
                                                            </div>
                                                            {room.isFull && <span className="text-red-500" title="High usage warning"><AlertTriangle size={14} /></span>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {analytics.roomData.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" className="p-8 text-center text-gray-400 italic">No room assignment data found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>

                        {/* Right Column: Charts */}
                        <div className="xl:col-span-1 flex flex-col gap-6">

                            {/* Distribution Pie Chart */}
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                                <h3 className="text-base font-bold text-gray-800 mb-2">Workload Distribution</h3>
                                <p className="text-xs text-gray-500 mb-4">Overall health of faculty assignments.</p>
                                <div className="h-64 flex-grow flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={analytics.pieData}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                                cx="50%"
                                                cy="50%"
                                            >
                                                {analytics.pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Bar Chart */}
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                                <h3 className="text-base font-bold text-gray-800 mb-2">Assigned vs Max Hours</h3>
                                <p className="text-xs text-gray-500 mb-4">Faculty workload breakdown with threshold line.</p>
                                <div className="flex-grow w-full h-full -ml-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.teacherData.slice(0, 15)} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                                axisLine={false}
                                                tickLine={false}
                                                angle={-45}
                                                textAnchor="end"
                                                height={60}
                                            />
                                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />

                                            <ReferenceLine y={analytics.maxHours} stroke="#ef4444" strokeDasharray="3 3" />

                                            <Bar dataKey="assignedHours" radius={[4, 4, 0, 0]}>
                                                {analytics.teacherData.slice(0, 15).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.isOverloaded ? '#ef4444' : '#6366f1'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Empty space filler for layout matching */}
                            <div className="grow bg-gray-50/50 rounded-xl border border-gray-100 flex items-center justify-center p-6 text-center shadow-inner">
                                <p className="text-sm font-medium text-gray-400 italic">"An optimized schedule ensures all constraints are met natively, without human intervention."</p>
                            </div>

                        </div>
                    </div>
                </div>
            ) : selectedCalendar ? (
                <div className="flex flex-col items-center justify-center py-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-gray-100 text-orange-200">
                        <AlertCircle size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">No Schedule Found</h3>
                    <p className="text-gray-500 text-center max-w-md">No workload data is available for this calendar. Please generate a schedule first in the <b>Dynamic Scheduling</b> tab.</p>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-gray-100 text-indigo-200">
                        <Activity size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">Ready to Optimize</h3>
                    <p className="text-gray-500 text-center max-w-md">Please select an active calendar from the dropdown above to view actionable scheduling intelligence.</p>
                </div>
            )}
        </div>
    );
};

export default WorkloadOptimizationDashboard;