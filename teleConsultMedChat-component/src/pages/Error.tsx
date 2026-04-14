import React from 'react';
import { Link } from 'react-router-dom';
import { FaExclamationTriangle, FaHome, FaStethoscope } from 'react-icons/fa';
import { CLINIC_NAME } from '../utils/clinic';

const ErrorPage: React.FC = () => {
  return (
    <section className="grid min-h-[72vh] place-items-center rounded-[2rem] border border-white/70 bg-white/85 px-6 py-12 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:px-10">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <FaExclamationTriangle className="text-2xl" />
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-teal-700">
          <FaStethoscope />
          {CLINIC_NAME}
        </div>
        <h1 className="display-font mt-4 text-4xl font-semibold text-slate-900">We could not load this consultation page</h1>
        <p className="mt-4 text-base leading-8 text-slate-500">
          The requested route is missing, expired, or the room is no longer available. Return to the dashboard and continue from the latest live state.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/patient-dashboard" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:-translate-y-0.5">
            <FaHome />
            Patient dashboard
          </Link>
          <Link to="/provider-dashboard" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700">
            <FaHome />
            Provider dashboard
          </Link>
        </div>
      </div>
    </section>
  );
};
export default ErrorPage;