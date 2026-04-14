import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useParams } from 'react-router-dom';
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

const App: React.FC = () => {
  useEffect(() => {
    checkEnvVariables();
  }, []);

  return (
    <SupabaseProvider>
      <SidebarProvider>
        <Router>
          <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(19,78,74,0.18),_transparent_32%),linear-gradient(180deg,_#f4fbfa_0%,_#eef5f4_100%)] text-slate-900">
            <div className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col lg:flex-row">
              <Sidebar />
              <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto px-3 py-5 sm:px-4 sm:py-6 lg:px-5 lg:py-6 xl:px-8">
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