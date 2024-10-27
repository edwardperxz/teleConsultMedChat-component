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
import { checkEnvVariables } from './utils/checkEnv'; // Si es necesario para depuración

const App: React.FC = () => {
  checkEnvVariables(); // Verificar variables de entorno

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
                  <Route path="/" element={<PatientDashboard />} />
                  <Route path="/patient-dashboard" element={<PatientDashboard />} />
                  <Route path="/provider-dashboard" element={<ProviderDashboard />} />
                  <Route path="/provider-chat-room/:providerId/:chatRoomId" element={<ProviderChatRoomWithId />} />
                  <Route path="/patient-chat-room/:patientId/:chatRoomId" element={<PatientChatRoomWithId />} />
                  <Route path="/waiting-room/:patientId/:chatRoomId" element={<WaitingRoomWithId />} />
                </Routes>
              </main>
            </div>
          </div>
        </Router>
      </SidebarProvider>
    </SupabaseProvider>
  );
};

const ProviderChatRoomWithId: React.FC = () => {
  const { providerId, chatRoomId } = useParams<{ providerId: string; chatRoomId: string }>();
  const currentUserId = parseInt(providerId || '0');
  return <ProviderChatRoom chatRoomId={parseInt(chatRoomId || '0')} currentUserId={currentUserId} />;
};

const PatientChatRoomWithId: React.FC = () => {
  const { patientId, chatRoomId } = useParams<{ patientId: string; chatRoomId: string }>();
  const currentUserId = parseInt(patientId || '0');
  return <PatientChatRoom chatRoomId={parseInt(chatRoomId || '0')} currentUserId={currentUserId} />;
};

const WaitingRoomWithId: React.FC = () => {
  const { patientId, chatRoomId } = useParams<{ patientId: string; chatRoomId: string }>();
  const currentUserId = parseInt(patientId || '0');
  return <WaitingRoom chatRoomId={parseInt(chatRoomId || '0')} currentUserId={currentUserId} />;
};

export default App;
