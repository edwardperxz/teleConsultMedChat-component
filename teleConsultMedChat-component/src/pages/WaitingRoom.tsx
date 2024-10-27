import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';

const WaitingRoom: React.FC<{ chatRoomId: number; currentUserId: number }> = ({ chatRoomId, currentUserId }) => {
  const supabase = useSupabase();
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const checkChatRoom = async () => {
      const { data, error } = await supabase
        .from('chatrooms')
        .select('*')
        .eq('id', chatRoomId)
        .single();

      if (data) {
        setIsActive(data.isactive); 
      } else if (error) {
        console.error('Error fetching chat room:', error.message, error.details, error.hint);
      }
    };

    const interval = setInterval(() => {
      checkChatRoom();
    }, 3000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [supabase, chatRoomId, currentUserId, navigate]);

  useEffect(() => {
    if (isActive) {
      navigate(`/patient-chat-room/${currentUserId}/${chatRoomId}`);
    }
  }, [isActive, navigate, currentUserId, chatRoomId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-6 md:p-12 w-full max-w-md text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Esperando al Proveedor...</h2>
        <p className="text-gray-600">Por favor, espera mientras tu proveedor se une a la sala de chat.</p>
      </div>
    </div>
  );
};

export default WaitingRoom;
