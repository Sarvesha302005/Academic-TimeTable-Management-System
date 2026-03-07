import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const Sidebar = ({ activeTab, setActiveTab, tabs }) => {
  const { userRole } = useAuth();

  return (
    <div className="w-64 bg-white shadow-md h-screen overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 capitalize">{userRole} Dashboard</h2>
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-2 rounded-lg transition duration-200 ${activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'text-gray-700 hover:bg-primary-50'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;