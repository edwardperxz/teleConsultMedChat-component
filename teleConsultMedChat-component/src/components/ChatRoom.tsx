import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';

interface Message {
  id: number;
  senderid: number;
  content: string;
  chatroomid: number;
  sentat: string;
}
interface ChatRoomProps {
  chatRoomId: number;
  currentUserId: number;
  isProvider?: boolean;
  endVisit?: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ chatRoomId, currentUserId, isProvider = false, endVisit }) => {
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
    const interval = setInterval(fetchMessages, 1000); // el chat se actualiza cada 1 segundo
    const messageSubscription = supabase
      .channel(`public:messages:chatroomid=eq.${chatRoomId}`)
      .on<Message>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((messages) => [...messages, payload.new]);
      })
      .subscribe();

    if (!isProvider) {
      const chatRoomSubscription = supabase
        .channel(`public:chatrooms:id=eq.${chatRoomId}`)
        .on<{ isactive: boolean }>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chatrooms' }, (payload) => {
          if (payload.new.isactive === false) {
            navigate('/patient-dashboard');
          }
        })
        .subscribe();
      return () => {
        clearInterval(interval);
        supabase.removeChannel(messageSubscription);
        supabase.removeChannel(chatRoomSubscription);
      };
    } else {
      return () => {
        clearInterval(interval);
        supabase.removeChannel(messageSubscription);
      };
    }
  }, [supabase, chatRoomId, isProvider, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    await supabase.from('messages').insert([{ chatroomid: chatRoomId, senderid: currentUserId, content: newMessage }]);
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`p-4 rounded-lg max-w-xs md:max-w-md ${msg.senderid === currentUserId ? 'bg-blue-500 text-white ml-auto' : 'bg-gray-200 text-black mr-auto'}`}>
              <strong>{msg.senderid === currentUserId ? 'Yo' : 'Otro'}:</strong> {msg.content}
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
        <button onClick={sendMessage} className="bg-blue-600 text-white p-2 rounded w-full md:w-auto md:ml-2">
          Enviar
        </button>
        {isProvider && endVisit && (
          <button onClick={endVisit} className="bg-red-600 text-white p-2 rounded w-full md:w-auto md:ml-2 mt-2">
            Finalizar Chat
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatRoom;