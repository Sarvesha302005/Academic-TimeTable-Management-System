import React, { useState } from 'react';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import { PreferenceForm, LeaveApplicationForm, FacultyTimetable } from '../components/faculty/index';

export const FacultyDashboard = () => {
  const [activeTab, setActiveTab] = useState('preferences');

  const tabs = [
    { id: 'preferences', label: 'Course Preferences' },
    { id: 'timetable', label: 'My Timetable' },
    { id: 'leave', label: 'Apply Leave' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'preferences': return <PreferenceForm />;
      case 'timetable': return <FacultyTimetable />;
      case 'leave': return <LeaveApplicationForm />;
      default: return <PreferenceForm />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
        <main className="flex-1 p-8">{renderContent()}</main>
      </div>
    </div>
  );
};

export const StudentDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto p-8">
        <StudentTimetable />
      </main>
    </div>
  );
};

import StudentTimetable from '../components/student/StudentTimetable';