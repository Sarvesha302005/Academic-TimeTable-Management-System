import React, { useState } from 'react';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import AcademicCalendarForm from '../components/admin/AcademicCalendarForm';
import TimeSlotForm from '../components/admin/TimeSlotForm';
import CourseForm from '../components/admin/CourseForm';
import FacultyForm from '../components/admin/FacultyForm';
import RoomForm from '../components/admin/RoomForm';
import WorkloadRuleForm from '../components/admin/WorkloadRuleForm';
import TimetableGenerator from '../components/admin/TimetableGenerator';
import LeaveApproval from '../components/admin/LeaveApproval';
import TimetableView from '../components/admin/TimetableView';
import DynamicSchedulingDashboard from '../components/admin/DynamicSchedulingDashboard';
import WorkloadOptimizationDashboard from '../components/admin/WorkloadOptimizationDashboard';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('calendar');

  const tabs = [
    { id: 'calendar', label: 'Academic Calendar' },
    { id: 'timeslots', label: 'Time Slots' },
    { id: 'courses', label: 'Courses' },
    { id: 'faculty', label: 'Faculty' },
    { id: 'rooms', label: 'Rooms' },
    { id: 'workload', label: 'Workload Rules' },
    { id: 'generate', label: 'Generate Timetable' },
    { id: 'view', label: 'View Timetable' },
    { id: 'dynamicDashboard', label: 'Dynamic Scheduling' },
    { id: 'workloadOptimization', label: 'Workload Optimization' },
    { id: 'leaves', label: 'Leave Approvals' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dynamicDashboard': return <DynamicSchedulingDashboard />;
      case 'workloadOptimization': return <WorkloadOptimizationDashboard />;
      case 'calendar': return <AcademicCalendarForm />;
      case 'timeslots': return <TimeSlotForm />;
      case 'courses': return <CourseForm />;
      case 'faculty': return <FacultyForm />;
      case 'rooms': return <RoomForm />;
      case 'workload': return <WorkloadRuleForm />;
      case 'generate': return <TimetableGenerator />;
      case 'view': return <TimetableView />;
      case 'leaves': return <LeaveApproval />;
      default: return <DynamicSchedulingDashboard />;
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
        <main className="flex-1 p-8 overflow-y-auto min-w-0">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;