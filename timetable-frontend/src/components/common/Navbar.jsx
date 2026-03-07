import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import amritaLogo from '../../assets/amrita-logo.png';

const Navbar = () => {
  const { user, userRole, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="px-6 h-16 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-primary-600 tracking-tight">Schedulix</h1>
        </div>

        <div className="flex items-center space-x-6">
          <img src={amritaLogo} alt="Amrita Logo" className="h-8 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity" />
          <div className="h-8 w-px bg-gray-200"></div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 leading-tight">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{userRole}</p>
          </div>
          <button
            onClick={logout}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;