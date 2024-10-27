import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaVideo, FaComments, FaBell } from 'react-icons/fa';

const Header: React.FC = () => {
  const location = useLocation();
  const isPatientPath = location.pathname.includes('patient');

  return (
    <header className="bg-[#1c5653] text-white p-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Link to={isPatientPath ? "/patient-dashboard" : "/provider-dashboard"} className="text-xl font-bold tracking-wide">
          TeleConsultMedChat
        </Link>
      </div>
      <div className="flex items-center space-x-4">
        <button className="bg-teal-800 p-2 rounded-full hover:bg-teal-900 transition duration-300">
          <FaVideo />
        </button>
        <button className="bg-teal-800 p-2 rounded-full hover:bg-teal-900 transition duration-300">
          <FaComments />
        </button>
        <button className="bg-teal-800 p-2 rounded-full hover:bg-teal-900 transition duration-300">
          <FaBell />
        </button>
      </div>
    </header>
  );
};

export default Header;
