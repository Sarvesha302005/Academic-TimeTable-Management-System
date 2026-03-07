import React, { useState, useEffect, useMemo } from 'react';
import { adminAPI, timetableAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ReferenceLine, PieChart, Pie, Legend } from 'recharts';
import { Calendar, AlertCircle, AlertTriangle, Users, Clock, Activity, CheckCircle, XCircle } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const WorkloadOptimizationDashboard = () => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        try {
            setLoading(true);
            setError('');
            const res = await adminAPI.getWorkloadReport();
            setReport(res.data.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch workload report');
        } finally {
            setLoading(false);
        }
    };

    // Prepare chart data from python report
    const chartData = useMemo(() => {
        if (!report || !report.faculty_metrics) return [];
        return Object.entries(report.faculty_metrics).map(([name, metrics]) => ({
            name,
            assignedHours: metrics.total_hours,
            status: metrics.status,
            isOverloaded: metrics.status === 'Overloaded'
        })).sort((a, b) => b.assignedHours - a.assignedHours);
    }, [report]);

    const pieData = useMemo(() => {
        if (!report || !report.faculty_metrics) return [];
        const counts = { Balanced: 0, Underloaded: 0, Overloaded: 0 };
        Object.values(report.faculty_metrics).forEach(m => {
            counts[m.status] = (counts[m.status] || 0) + 1;
        });
        return [
            { name: 'Balanced', value: counts.Balanced, color: '#10B981' }, // Emerald for Good
            { name: 'Underloaded', value: counts.Underloaded, color: '#A4123F' }, // Primary for Underloaded (Available)
            { name: 'Overloaded', value: counts.Overloaded, color: '#DC2626' } // Uniform Red for Overloaded
        ].filter(d => d.value > 0);
    }, [report]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900 text-white p-3 rounded-lg text-sm shadow-xl border border-gray-700">
                    <p className="font-bold mb-1">{label}</p>
                    <p className="flex justify-between gap-4">
                        <span>Load:</span>
                        <span className="font-bold text-primary-400">{payload[0].value} hrs</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Target: 17 hrs</p>
                </div>
            );
        }
        return null;
    };

    if (loading && !report) {
        return (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl shadow-sm border border-gray-100">
                <LoadingSpinner size="lg" />
                <p className="text-gray-500 mt-4 animate-pulse font-medium">Executing CP-SAT Workload Analyzer...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans text-gray-800">
            {/* 1️⃣ Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-primary-600 bg-clip-text text-transparent flex items-center gap-2">
                        <Activity className="text-primary-600" /> Faculty Workload Optimization
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Real-time scheduling intelligence from Python CP-SAT Solver.</p>
                </div>
                <div className="flex gap-3 mt-4 sm:mt-0">
                    <button
                        onClick={fetchReport}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all shadow-md font-medium text-sm"
                        disabled={loading}
                    >
                        {loading ? <LoadingSpinner size="sm" /> : <Activity size={16} />}
                        Recalculate Analysis
                    </button>
                    {report && (
                        <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100">
                            <CheckCircle size={18} className="text-emerald-500" />
                            <span className="text-sm font-bold text-emerald-900">Fairness: {report.global_metrics.fairness_score_pct}%</span>
                        </div>
                    )}
                </div>
            </div>

            <ErrorMessage message={error} onClose={() => setError('')} />

            {report ? (
                <div className="space-y-6 animate-in fade-in duration-500">
                    {/* 2️⃣ KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-primary-200 transition-all">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Faculty</p>
                                <p className="text-3xl font-black text-gray-900">{Object.keys(report.faculty_metrics).length}</p>
                            </div>
                            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-500 group-hover:scale-110 transition-transform">
                                <Users size={24} />
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-red-200 transition-all">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Overloaded</p>
                                <p className={`text-3xl font-black ${chartData.filter(d => d.isOverloaded).length > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                    {chartData.filter(d => d.isOverloaded).length}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                                <AlertTriangle size={24} />
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-amber-200 transition-all">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Average Load</p>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-3xl font-black text-gray-900">{report.global_metrics.average_load}</p>
                                    <span className="text-gray-400 font-bold text-sm">hrs</span>
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                                <Clock size={24} />
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center gap-2 group hover:border-emerald-200 transition-all">
                            <div className="flex justify-between items-center">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Workload Variance</p>
                                <span className="text-emerald-600 font-bold text-sm">{report.global_metrics.variance}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.max(5, 100 - report.global_metrics.variance * 10)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* 3️⃣ Left Column: Detailed List */}
                        <div className="xl:col-span-2 space-y-6">
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <Users size={18} className="text-gray-400" /> Detailed Workload Balance
                                    </h3>
                                    <span className="text-xs font-medium text-gray-400 italic">Target: 17 hrs/week</span>
                                </div>
                                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead className="bg-white sticky top-0 z-10">
                                            <tr className="text-gray-400 uppercase tracking-widest text-[10px]">
                                                <th className="p-4 border-b border-gray-100">Faculty Member</th>
                                                <th className="p-4 border-b border-gray-100 text-center">Total Hours</th>
                                                <th className="p-4 border-b border-gray-100 text-center">Optimization Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {chartData.map((faculty, idx) => (
                                                <tr key={idx} className="hover:bg-primary-50/30 transition-colors">
                                                    <td className="p-4 font-semibold text-gray-700">{faculty.name}</td>
                                                    <td className="p-4 text-center font-black text-gray-900">{faculty.assignedHours}</td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${faculty.status === 'Overloaded' ? 'bg-red-50 text-red-600 border-red-100' :
                                                            faculty.status === 'Balanced' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                'bg-primary-50 text-primary-600 border-primary-100'
                                                            }`}>
                                                            {faculty.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* 4️⃣ Right Column: Visualizations */}
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-800 mb-6">Distribution Overview</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={8}
                                                dataKey="value"
                                                cx="50%"
                                                cy="50%"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="font-bold text-gray-800 mb-6">Workload Ranking</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={chartData.slice(0, 10)}
                                            layout="vertical"
                                            margin={{ left: 20, right: 20 }}
                                        >
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={100}
                                                tick={{ fill: '#64748b', fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                            <Bar dataKey="assignedHours" radius={[0, 4, 4, 0]} barSize={20}>
                                                {chartData.slice(0, 10).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.isOverloaded ? '#DC2626' : '#A4123F'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-4 text-center italic">* Displaying top 10 loaded faculty</p>
                            </div>

                            <div className="bg-primary-950 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden border border-primary-800/50">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <CheckCircle size={100} />
                                </div>
                                <h4 className="font-bold text-primary-300 uppercase text-[10px] tracking-widest mb-3">Optimization Insight</h4>
                                <p className="text-sm leading-relaxed relative z-10 text-primary-50">
                                    The current schedule targets <strong>17 hours</strong> per teacher. Using lexicographic optimization, we've minimized the maximum deviation to maintain extreme fairness across departments.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-32 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Activity size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-700">No Analysis Cached</h3>
                    <p className="text-gray-500 max-w-sm text-center mt-2">Click the button above to generate a fresh workload report from the scheduler.</p>
                </div>
            )}
        </div>
    );
};

export default WorkloadOptimizationDashboard;