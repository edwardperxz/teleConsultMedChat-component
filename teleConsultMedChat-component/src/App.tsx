import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, useParams } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import PatientDashboard from './pages/PatientDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import ProviderChatRoom from './pages/ProviderChatRoom';
import PatientChatRoom from './pages/PatientChatRoom';
import WaitingRoom from './pages/WaitingRoom';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { checkEnvVariables } from './utils/checkEnv';
import ErrorPage from './pages/Error';

const FIRST_VISIT_MODAL_KEY = 'teleconsult-demo-first-visit-seen';

const App: React.FC = () => {
  useEffect(() => {
    checkEnvVariables();
  }, []);

  return (
    <SupabaseProvider>
      <SidebarProvider>
        <Router>
          <FirstVisitDemoModal />
          <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(19,78,74,0.18),_transparent_32%),linear-gradient(180deg,_#f4fbfa_0%,_#eef5f4_100%)] text-slate-900">
            <div className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col lg:flex-row">
              <Sidebar />
              <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-5 lg:px-4 lg:py-5 xl:px-7 xl:py-6 2xl:px-8">
                  <Routes>
                    <Route key="home" path="/" element={<PatientDashboard />} />
                    <Route key="patient-dashboard" path="/patient-dashboard" element={<PatientDashboard />} />
                    <Route key="provider-dashboard" path="/provider-dashboard" element={<ProviderDashboard />} />
                    <Route key="provider-chat-room" path="/provider-chat-room/:providerId/:chatRoomId" element={<ProviderChatRoomWrapper />} />
                    <Route key="patient-chat-room" path="/patient-chat-room/:patientId/:chatRoomId" element={<PatientChatRoomWrapper />} />
                    <Route key="waiting-room" path="/waiting-room/:patientId/:chatRoomId" element={<WaitingRoomWrapper />} />
                    <Route key="error" path="/error" element={<ErrorPage />} />
                  </Routes>
                </main>
              </div>
            </div>
          </div>
        </Router>
      </SidebarProvider>
    </SupabaseProvider>
  );
};

const FirstVisitDemoModal: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (location.pathname !== '/') {
      setIsOpen(false);
      return;
    }

    const alreadySeen = window.localStorage.getItem(FIRST_VISIT_MODAL_KEY) === 'true';
    setIsOpen(!alreadySeen);
  }, [location.pathname]);

  const closeModal = () => {
    window.localStorage.setItem(FIRST_VISIT_MODAL_KEY, 'true');
    setIsOpen(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-lg rounded-3xl border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.24)] sm:p-7">
        <h2 className="display-font text-2xl font-semibold text-slate-900">Demo Quick Guide</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          This is a demo environment.
          As a <span className="font-semibold text-slate-900">Patient</span>, click <span className="font-semibold text-slate-900">Start consultation</span>, wait in the waiting room, then chat when the doctor starts the visit.
          As a <span className="font-semibold text-slate-900">Doctor</span>, open the Provider Dashboard, pick a waiting patient, click <span className="font-semibold text-slate-900">Start consultation</span>, and exchange messages in real time.
        </p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={closeModal}
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:-translate-y-0.5"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

const ProviderChatRoomWrapper: React.FC = () => {
  const { providerId, chatRoomId } = useParams<{ providerId: string; chatRoomId: string }>();
  if (!providerId || !chatRoomId) {
    return <ErrorPage />;
  }
  return <ProviderChatRoom />;
};

const PatientChatRoomWrapper: React.FC = () => {
  const { patientId, chatRoomId } = useParams<{ patientId: string; chatRoomId: string }>();
  if (!patientId || !chatRoomId) {
    return <ErrorPage />;
  }
  return <PatientChatRoom />;
};

const WaitingRoomWrapper: React.FC = () => {
  const { patientId, chatRoomId } = useParams<{ patientId: string; chatRoomId: string }>();
  if (!patientId || !chatRoomId) {
    return <ErrorPage />;
  }
  return <WaitingRoom />;
};

export default App;