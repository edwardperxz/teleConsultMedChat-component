import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';

const WaitingRoom: React.FC = () => {
  const { patientId } = useParams<{ patientId?: string }>();
  const navigate = useNavigate();
  const supabase = useSupabase();
  const [isActive, setIsActive] = useState(false);
  const [chatRoomId, setChatRoomId] = useState<number | null>(null);

  useEffect(() => {
    if (!patientId) {
      navigate('/patient-dashboard');
    }
  }, [patientId, navigate]);

  useEffect(() => {
    const checkChatRoom = async () => {
      const { data, error } = await supabase
        .from('chatrooms')
        .select('*')
        .eq('patientid', parseInt(patientId!))
        .order('createdat', { ascending: false })
        .limit(1)
        .single();
      if (data) {
        setIsActive(data.isactive);
        setChatRoomId(data.id);
      } else if (error) {
        console.error('Error fetching chat room:', error.message, error.details, error.hint);
      }
    };

    const interval = setInterval(() => {
      checkChatRoom();
    }, 3000);

    return () => clearInterval(interval);
  }, [supabase, patientId]);

  useEffect(() => {
    if (isActive && chatRoomId) {
      navigate(`/patient-chat-room/${patientId}/${chatRoomId}`);
    }
  }, [isActive, chatRoomId, navigate, patientId]);

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