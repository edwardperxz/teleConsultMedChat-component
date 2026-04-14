import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaCalendarCheck, FaChartLine, FaFileMedical, FaHeadset, FaHome, FaTimes, FaUserMd } from 'react-icons/fa';
import { useSidebar } from '../contexts/SidebarContext';
import { CLINIC_NAME } from '../utils/clinic';

const Sidebar: React.FC = () => {
  const { isOpen, setIsOpen } = useSidebar();
  const location = useLocation();
  const isPatientPath = location.pathname.includes('patient');

  const navigationItems = [
    { label: 'Dashboard', path: isPatientPath ? '/patient-dashboard' : '/provider-dashboard', icon: FaHome },
    { label: 'Appointments', path: '#', icon: FaCalendarCheck },
    { label: 'Analytics', path: '#', icon: FaChartLine },
    { label: 'Medical Records', path: '#', icon: FaFileMedical },
    { label: 'Doctors', path: '#', icon: FaUserMd },
    { label: 'Support', path: '#', icon: FaHeadset },
  ];

  return (
    <div className="relative z-40">
      {isOpen && (
        <button
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-[17rem] border-r border-white/60 bg-slate-950/95 text-white shadow-2xl shadow-slate-900/20 transition-transform duration-300 lg:sticky lg:top-0 lg:flex lg:h-screen lg:max-h-screen lg:overflow-y-auto lg:w-[15.5rem] lg:translate-x-0 lg:flex-col xl:w-[17rem] 2xl:w-80 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 lg:px-3.5 xl:px-5 xl:py-5">
          <div>
            <div className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-teal-200 xl:text-xs xl:tracking-[0.35em] 2xl:text-sm">Control Center</div>
            <div className="mt-1 text-base font-semibold text-white xl:text-lg 2xl:text-xl">{CLINIC_NAME}</div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 lg:hidden"
            aria-label="Close navigation"
          >
            <FaTimes />
          </button>
        </div>

        <div className="px-3 py-3 lg:px-2.5 xl:px-4 xl:py-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 xl:rounded-3xl xl:p-5">
            <div className="text-xs font-medium text-slate-300 xl:text-sm">Mode</div>
            <div className="mt-2 text-lg font-semibold text-white xl:text-xl 2xl:text-2xl">{isPatientPath ? 'Patient Workspace' : 'Provider Workspace'}</div>
            <p className="mt-2 text-[0.82rem] leading-6 text-slate-300 xl:text-sm">Live consultations, real-time updates, and centralized clinical workflows in one place.</p>
          </div>
        </div>

        <nav className="flex-1 px-2 pb-3 lg:px-1.5 xl:px-4 xl:pb-5">
          <ul className="space-y-1.5 xl:space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.path !== '#' && location.pathname === item.path;

              if (item.path === '#') {
                return (
                  <li key={item.label}>
                    <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-[0.82rem] font-medium text-slate-300 transition hover:bg-white/8 hover:text-white xl:py-3 xl:text-sm">
                      <Icon className="text-teal-300" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              }

              return (
                <li key={item.label}>
                  <Link
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[0.82rem] font-medium transition xl:py-3 xl:text-sm ${isActive ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30' : 'text-slate-300 hover:bg-white/8 hover:text-white'}`}
                  >
                    <Icon className={isActive ? 'text-white' : 'text-teal-300'} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 px-3 py-3 lg:px-2.5 xl:px-4 xl:py-4">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-teal-500/20 to-cyan-500/10 p-4 xl:rounded-3xl xl:p-5">
            <div className="text-xs font-medium text-teal-100 xl:text-sm">System health</div>
            <div className="mt-2 text-sm font-semibold text-white xl:text-base 2xl:text-lg">Realtime sync enabled</div>
            <p className="mt-1 text-[0.8rem] leading-5 text-slate-300 xl:text-sm xl:leading-6">Messages, room status, and queue updates are streaming live.</p>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Sidebar;