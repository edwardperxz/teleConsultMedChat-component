import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaBell, FaBars, FaComments, FaStethoscope, FaVideo } from 'react-icons/fa';
import { useSidebar } from '../contexts/SidebarContext';
import { CLINIC_NAME, CLINIC_TAGLINE } from '../utils/clinic';

const Header: React.FC = () => {
  const location = useLocation();
  const { setIsOpen } = useSidebar();
  const isPatientPath = location.pathname.includes('patient');

  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-white/75 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4 sm:py-4 lg:px-5 xl:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700 lg:hidden"
            aria-label="Open navigation"
          >
            <FaBars />
          </button>

          <Link to={isPatientPath ? '/patient-dashboard' : '/provider-dashboard'} className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 via-emerald-500 to-cyan-500 text-white shadow-lg shadow-teal-200/60 transition group-hover:scale-105 sm:h-11 sm:w-11">
              <FaStethoscope />
            </div>
            <div>
              <div className="text-base font-semibold uppercase tracking-[0.15em] text-slate-900 sm:text-lg sm:tracking-[0.2em]">{CLINIC_NAME}</div>
              <div className="text-[0.7rem] font-medium text-slate-500 sm:text-xs">{CLINIC_TAGLINE}</div>
            </div>
          </Link>
        </div>

        <div className="hidden items-center gap-2 xl:flex 2xl:gap-3">
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
            Live care network active
          </div>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700">
            <FaVideo />
          </button>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700">
            <FaComments />
          </button>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700">
            <FaBell />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;