import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';
import ChatRoom from '../components/ChatRoom';

const ProviderChatRoom: React.FC = () => {
  const { providerId, chatRoomId } = useParams<{ providerId?: string; chatRoomId?: string }>();
  const navigate = useNavigate();
  const supabase = useSupabase();

  useEffect(() => {
    if (!chatRoomId || !providerId) {
      navigate('/error');
    }
  }, [chatRoomId, providerId, navigate]);

  const endVisit = async () => {
    try {
      await supabase
        .from('chatrooms')
        .update({ isactive: false, endedat: new Date().toISOString() }) // finaliza la cita
        .eq('id', chatRoomId!);
      console.log('Visit ended, chat room is now inactive');
      navigate('/provider-dashboard');
    } catch (error: any) {
      console.error('Error ending visit:', error.message, error.details, error.hint);
    }
  };

  return (
    <ChatRoom 
      chatRoomId={parseInt(chatRoomId!)} 
      currentUserId={parseInt(providerId!)} 
      isProvider={true} 
      endVisit={endVisit}
    />
  );
};

export default ProviderChatRoom;
