import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export const AnalyticsCharts = ({ timetable, facultyList }) => {
    if (!timetable || !timetable.statistics) return null;

    const { facultyDistribution, roomDistribution } = timetable.statistics;

    // Process Faculty Data
    const facultyData = [];
    if (facultyDistribution) {
        const maxHours = 20; // This could come from WorkloadRules
        Object.entries(facultyDistribution).forEach(([facultyId, hours]) => {
            const isOverloaded = hours > maxHours;

            // If we don't have facultyList mapped directly here, we just use the ID/Name we have
            let name = facultyId;
            if (facultyList && facultyList.length > 0) {
                const matched = facultyList.find(f => f._id === facultyId || f.name === facultyId);
                if (matched) name = matched.name;
                else if (name.length > 10) name = `Faculty ${name.substring(0, 4)}`;
            } else if (name.length > 10) {
                name = `Faculty ${name.substring(0, 4)}`;
            }

            facultyData.push({
                name,
                assignedHours: hours,
                maxHours,
                isOverloaded
            });
        });
    }

    // Sort faculty data by assigned hours descending
    facultyData.sort((a, b) => b.assignedHours - a.assignedHours);
    // Limit to top 10 for bar chart readability
    const displayFacultyData = facultyData.slice(0, 10);

    // Process Room Data
    const roomData = [];
    const roomColors = ['#4F46E5', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

    if (roomDistribution) {
        Object.entries(roomDistribution).forEach(([room, classCount], idx) => {
            let name = room;
            if (name.length > 10) name = `Room ${name.substring(0, 3)}`;

            roomData.push({
                name,
                value: classCount,
                color: roomColors[idx % roomColors.length]
            });
        });
    }

    const CustomBarTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg text-sm">
                    <p className="font-semibold text-gray-800 mb-1">{label}</p>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].payload.isOverloaded ? '#EF4444' : '#4F46E5' }}></span>
                        <span className="text-gray-600">Assigned: <span className="font-bold text-gray-900">{payload[0].value}h</span></span>
                    </div>
                    {payload[1] && (
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-3 h-3 rounded-full bg-gray-200"></span>
                            <span className="text-gray-500">Max Limit: {payload[1].value}h</span>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    const CustomPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg text-sm flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: data.color }}></div>
                    <div>
                        <p className="font-semibold text-gray-800">{data.name}</p>
                        <p className="text-gray-500">{data.value} classes</p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-md font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                    Faculty Workload (Top 10)
                </h3>
                <div className="h-64">
                    {facultyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={displayFacultyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <RechartsTooltip content={<CustomBarTooltip />} cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="assignedHours" radius={[4, 4, 0, 0]} barSize={32}>
                                    {displayFacultyData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.isOverloaded ? '#EF4444' : '#4F46E5'} />
                                    ))}
                                </Bar>
                                <Bar dataKey="maxHours" fill="#E5E7EB" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">No faculty data available</div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-md font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <span className="w-2 h-6 bg-teal-500 rounded-full"></span>
                    Room Utilization Breakdown
                </h3>
                <div className="h-64 flex items-center justify-center">
                    {roomData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={roomData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {roomData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<CustomPieTooltip />} />
                                <Legend iconType="circle" formatter={(value) => <span className="text-gray-600 text-xs">{value}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">No room data available</div>
                    )}
                </div>
            </div>
        </div>
    );
};