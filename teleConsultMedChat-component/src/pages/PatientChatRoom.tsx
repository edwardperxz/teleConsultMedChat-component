import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';
import ChatRoom from '../components/ChatRoom';

const PatientChatRoom: React.FC = () => {
  const { patientId, chatRoomId } = useParams<{ patientId?: string; chatRoomId?: string }>();
  const navigate = useNavigate();
  const supabase = useSupabase();

  useEffect(() => {
    if (!chatRoomId || !patientId) {
      navigate('/error', { replace: true });
    }
  }, [chatRoomId, patientId, navigate]);
  useEffect(() => {
    const checkChatRoomStatus = async () => {
      const { data, error } = await supabase
        .from('chatrooms')
        .select('isactive')
        .eq('id', parseInt(chatRoomId!))
        .single();
      if (error) {
      } else if (data && !data.isactive) {
        navigate('/patient-dashboard', { replace: true });
      }
    };

    const interval = setInterval(() => {
      checkChatRoomStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [supabase, chatRoomId, navigate]);

  return (
    <ChatRoom 
      chatRoomId={parseInt(chatRoomId!)} 
      currentUserId={parseInt(patientId!)} 
      isProvider={false} 
    />
  );
};

export default PatientChatRoom;