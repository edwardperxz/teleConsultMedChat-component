import React from 'react';
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
  checkEnvVariables(); 
  return (
    <SupabaseProvider>
      <SidebarProvider>
        <Router>
          <div className="flex flex-col md:flex-row min-h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-y-auto">
              <Header />
              <main className="flex-1 p-4">
                <Routes>
                  <Route key="home" path="/" element={<PatientDashboard/>} />
                  <Route key="patient-dashboard" path="/patient-dashboard" element={<PatientDashboard/>} />
                  <Route key="provider-dashboard" path="/provider-dashboard" element={<ProviderDashboard/>} />
                  <Route key="provider-chat-room" path="/provider-chat-room/:providerId/:chatRoomId" element={<ProviderChatRoomWrapper/>} />
                  <Route key="patient-chat-room" path="/patient-chat-room/:patientId/:chatRoomId" element={<PatientChatRoomWrapper/>} />
                  <Route key="waiting-room" path="/waiting-room/:patientId/:chatRoomId" element={<WaitingRoomWrapper/>} />
                  <Route key="error" path="/error" element={<ErrorPage/>} />
                </Routes>
              </main>
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