import React, { useState, useEffect, useRef } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: number;
  senderid: number;
  content: string;
  chatroomid: number;
  sentat: string;
}

const PatientChatRoom: React.FC<{ chatRoomId: number; currentUserId: number }> = ({ chatRoomId, currentUserId }) => {
  const supabase = useSupabase();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('chatroomid', chatRoomId)
        .order('sentat', { ascending: true });
      setMessages(data as Message[] || []);
    };
    fetchMessages();
  }, [supabase, chatRoomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const checkChatRoomStatus = async () => {
      const { data } = await supabase
        .from('chatrooms')
        .select('isactive')
        .eq('id', chatRoomId)
        .single();

      if (data && !data.isactive) {
        navigate('/patient-dashboard');
      }
    };

    const interval = setInterval(() => {
      checkChatRoomStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [supabase, chatRoomId, navigate]);

  const sendMessage = async () => {
    await supabase.from('messages').insert([{ chatroomid: chatRoomId, senderid: currentUserId, content: newMessage }]);
    setNewMessage('');
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chatroomid', chatRoomId)
      .order('sentat', { ascending: true });
    setMessages(data as Message[] || []);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 rounded-lg max-w-xs md:max-w-md ${
                msg.senderid === currentUserId ? 'bg-green-500 text-white ml-auto' : 'bg-gray-200 text-black mr-auto'
              }`}
            >
              <strong>{msg.senderid === currentUserId ? 'Yo' : 'Proveedor'}:</strong> {msg.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 bg-white border-t border-gray-300">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="border p-2 w-full rounded mb-2 md:mb-0"
        />
        <button onClick={sendMessage} className="bg-green-600 text-white p-2 rounded w-full md:w-auto md:ml-2">
          Enviar
        </button>
      </div>
    </div>
  );
};



export default PatientChatRoom;
