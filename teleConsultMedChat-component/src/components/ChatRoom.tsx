import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCircle, FaClock, FaComments, FaPaperPlane, FaPhoneSlash, FaShieldAlt, FaSpinner, FaUser, FaUserMd, FaWifi } from 'react-icons/fa';
import { useSupabase } from '../contexts/SupabaseContext';
import { DEMO_PATIENT_ID, DEMO_PROVIDER_ID, formatDateTime } from '../utils/clinic';

interface Message {
  id: number;
  senderid: number | string;
  content: string;
  chatroomid: number;
  sentat: string;
  optimistic?: boolean;
}

interface ChatRoomProps {
  chatRoomId: number;
  currentUserId: number;
  isProvider?: boolean;
  endVisit?: () => void;
}

interface ChatRoomRecord {
  id: number;
  providerid: number;
  patientid: number;
  isactive: boolean;
  createdat: string;
  endedat: string | null;
}

interface Participant {
  id: number;
  name: string;
  usertype: 'patient' | 'provider';
}

const sortMessages = (messages: Message[]) => [...messages].sort((left, right) => new Date(left.sentat).getTime() - new Date(right.sentat).getTime());

const areMessagesEquivalent = (currentMessages: Message[], nextMessages: Message[]) => {
  if (currentMessages.length !== nextMessages.length) {
    return false;
  }

  return currentMessages.every((message, index) => {
    const nextMessage = nextMessages[index];
    return message.id === nextMessage.id
      && message.content === nextMessage.content
      && normalizeSenderId(message.senderid) === normalizeSenderId(nextMessage.senderid)
      && message.sentat === nextMessage.sentat;
  });
};

const mergeMessages = (currentMessages: Message[], nextMessages: Message[]) => {
  const messageMap = new Map<number, Message>();

  currentMessages.forEach((message) => messageMap.set(message.id, message));
  nextMessages.forEach((message) => messageMap.set(message.id, message));

  return sortMessages(Array.from(messageMap.values()));
};

const normalizeSenderId = (value: number | string | null | undefined) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? -1 : parsed;
};

const ChatRoom: React.FC<ChatRoomProps> = ({ chatRoomId, currentUserId, isProvider = false, endVisit }) => {
  const supabase = useSupabase();
  const navigate = useNavigate();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pendingOwnMessageScrollRef = useRef(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [room, setRoom] = useState<ChatRoomRecord | null>(null);
  const [participants, setParticipants] = useState<{ patient: Participant | null; provider: Participant | null }>({ patient: null, provider: null });
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRoom = async () => {
    const { data, error: roomError } = await supabase
      .from('chatrooms')
      .select('id, providerid, patientid, isactive, createdat, endedat')
      .eq('id', chatRoomId)
      .single();

    if (roomError) {
      throw roomError;
    }

    const roomRecord = data as ChatRoomRecord;
    setRoom(roomRecord);

    const [providerResult, patientResult] = await Promise.all([
      supabase.from('users').select('id, name, usertype').eq('id', roomRecord.providerid).single(),
      supabase.from('users').select('id, name, usertype').eq('id', roomRecord.patientid).single(),
    ]);

    setParticipants({
      provider: providerResult.data ? ({ ...(providerResult.data as Participant), usertype: 'provider' }) : null,
      patient: patientResult.data ? ({ ...(patientResult.data as Participant), usertype: 'patient' }) : null,
    });
  };

  const loadMessages = async () => {
    const { data, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('chatroomid', chatRoomId)
      .order('sentat', { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    const nextMessages = sortMessages((data as Message[]) ?? []);
    setMessages((currentMessages) => (areMessagesEquivalent(currentMessages, nextMessages) ? currentMessages : nextMessages));
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const initialize = async () => {
      try {
        await Promise.all([loadRoom(), loadMessages()]);
      } catch (chatError: any) {
        if (!isMounted) {
          return;
        }

        setError(chatError?.message ?? 'Unable to load the consultation room.');
        navigate('/error', { replace: true });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void initialize();

    const messageChannel = supabase
      .channel(`messages-room-${chatRoomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chatroomid=eq.${chatRoomId}` }, (payload: any) => {
        setMessages((currentMessages) => mergeMessages(currentMessages, [payload.new as Message]));
      })
      .subscribe();

    const roomChannel = supabase
      .channel(`room-status-${chatRoomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chatrooms', filter: `id=eq.${chatRoomId}` }, (payload: any) => {
        const updatedRoom = payload.new as ChatRoomRecord;
        setRoom((currentRoom) => {
          if (
            currentRoom
            && currentRoom.id === updatedRoom.id
            && currentRoom.providerid === updatedRoom.providerid
            && currentRoom.patientid === updatedRoom.patientid
            && currentRoom.isactive === updatedRoom.isactive
            && currentRoom.createdat === updatedRoom.createdat
            && currentRoom.endedat === updatedRoom.endedat
          ) {
            return currentRoom;
          }

          return updatedRoom;
        });

        if (!updatedRoom.isactive && !isProvider) {
          navigate('/patient-dashboard', { replace: true });
        }
      })
      .subscribe();

    // Silent fallback sync only for message stream so the main chat layout stays stable.
    const fallbackSync = window.setInterval(() => {
      void loadMessages();
    }, 1400);

    return () => {
      isMounted = false;
      window.clearInterval(fallbackSync);
      void supabase.removeChannel(messageChannel);
      void supabase.removeChannel(roomChannel);
    };
  }, [chatRoomId, isProvider, navigate, supabase]);

  useLayoutEffect(() => {
    if (pendingOwnMessageScrollRef.current) {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
      pendingOwnMessageScrollRef.current = false;
    }
  }, [messages]);

  const patientName = participants.patient?.name ?? `Patient ${DEMO_PATIENT_ID}`;
  const providerName = participants.provider?.name ?? `Doctor ${DEMO_PROVIDER_ID}`;
  const isRoomActive = room?.isactive ?? true;
  const currentActorId = isProvider ? (room?.providerid ?? currentUserId) : (room?.patientid ?? currentUserId);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedMessage = newMessage.trim();

    if (!trimmedMessage || !isRoomActive) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const optimisticId = -Date.now();
      const optimisticMessage: Message = {
        id: optimisticId,
        senderid: currentActorId,
        content: trimmedMessage,
        chatroomid: chatRoomId,
        sentat: new Date().toISOString(),
        optimistic: true,
      };

      pendingOwnMessageScrollRef.current = true;
      setMessages((currentMessages) => mergeMessages(currentMessages, [optimisticMessage]));
      setNewMessage('');

      const { data: insertedMessage, error: insertError } = await supabase.from('messages').insert([
        {
          chatroomid: chatRoomId,
          senderid: currentActorId,
          content: trimmedMessage,
        },
      ]).select('*').single();

      if (insertError) {
        throw insertError;
      }

      if (insertedMessage) {
        setMessages((currentMessages) => {
          const withoutOptimistic = currentMessages.filter((message) => message.id !== optimisticId);
          return mergeMessages(withoutOptimistic, [insertedMessage as Message]);
        });
      }
    } catch (sendError: any) {
      setMessages((currentMessages) => currentMessages.filter((message) => !message.optimistic));
      setError(sendError?.message ?? 'Unable to send the message right now.');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <section className="flex min-h-[75vh] items-center justify-center rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600">
            <FaSpinner className="animate-spin text-2xl" />
          </div>
          <div>
            <h2 className="display-font text-2xl font-semibold text-slate-900">Loading consultation room</h2>
            <p className="mt-2 text-sm text-slate-500">Synchronizing patient, doctor, and live messages.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl">
      <div className="grid min-h-[72vh] xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-h-[72vh] flex-col border-b border-slate-200/80 xl:border-b-0 xl:border-r">
          <div className="flex flex-col gap-4 border-b border-slate-200/80 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-start lg:justify-between lg:px-7">
            <div className="flex items-start gap-4">
              <button
                onClick={() => navigate(isProvider ? '/provider-dashboard' : '/patient-dashboard')}
                className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700"
                aria-label="Go back"
              >
                <FaArrowLeft />
              </button>

              <div>
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-teal-700">
                  <FaCircle className={isRoomActive ? 'text-emerald-500' : 'text-rose-500'} />
                  Live consultation
                </div>
                <h2 className="display-font mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Doctor - patient chat</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {isProvider ? 'Attending doctor' : 'Patient'} conversation between {providerName} and {patientName}.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-left lg:flex-col lg:items-end lg:text-right">
              <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${isRoomActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                <FaWifi />
                {isRoomActive ? 'Connected' : 'Ended'}
              </span>
              <span className="text-xs text-slate-500">Room #{chatRoomId}</span>
            </div>
          </div>

          {error && (
            <div className="border-b border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 sm:px-8">
              {error}
            </div>
          )}

          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-7">
            {messages.length === 0 ? (
              <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/80 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                  <FaComments className="text-xl" />
                </div>
                <h3 className="display-font mt-4 text-2xl font-semibold text-slate-900">Conversation ready</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Start the consultation with a clear, clinical exchange. Every message is synchronized in real time.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const senderId = normalizeSenderId(message.senderid);
                  const isProviderMessage = senderId === room?.providerid;
                  const isOwnMessage = senderId === currentActorId;
                  const senderRole = isProviderMessage ? 'Doctor' : 'Patient';
                  const senderName = isProviderMessage ? providerName : patientName;
                  const senderLabel = isOwnMessage ? `You (${senderRole})` : `${senderRole}: ${senderName}`;
                  const ownMessageStyle = isProviderMessage
                    ? 'bg-gradient-to-br from-sky-600 to-blue-700 text-white'
                    : 'bg-gradient-to-br from-teal-600 to-emerald-600 text-white';
                  const incomingMessageStyle = isProviderMessage
                    ? 'border border-sky-200 bg-sky-50 text-slate-900'
                    : 'border border-emerald-200 bg-emerald-50 text-slate-900';

                  return (
                    <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[min(100%,44rem)] rounded-[1.6rem] px-4 py-3 shadow-sm sm:px-5 sm:py-4 ${isOwnMessage ? ownMessageStyle : incomingMessageStyle}`}>
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
                          {isProviderMessage ? <FaUserMd /> : <FaUser />}
                          {senderLabel}
                        </div>
                        <p className="text-sm leading-7 sm:text-[0.98rem]">{message.content}</p>
                        <div className={`mt-2 flex items-center gap-2 text-xs ${isOwnMessage ? 'text-white/80' : 'text-slate-400'}`}>
                          <FaClock />
                          {formatDateTime(message.sentat)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="border-t border-slate-200/80 bg-white px-4 py-4 sm:px-6 lg:px-7">
            <div className="flex flex-col gap-3 rounded-[1.6rem] border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center">
              <input
                type="text"
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                placeholder={isRoomActive ? 'Write a clinical message...' : 'This consultation has ended.'}
                disabled={!isRoomActive || isSending}
                className="min-h-12 flex-1 rounded-[1.1rem] border border-transparent bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition placeholder:text-slate-400 focus:border-teal-300 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
              <button
                type="submit"
                disabled={!isRoomActive || isSending || !newMessage.trim()}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[1.1rem] bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                Send message
              </button>
              {isProvider && endVisit && (
                <button
                  type="button"
                  onClick={endVisit}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[1.1rem] border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100"
                >
                  <FaPhoneSlash />
                  End consultation
                </button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-2">
                <FaShieldAlt />
                Encrypted clinical messaging
              </span>
              <span>{messages.length} message{messages.length === 1 ? '' : 's'} in this session</span>
            </div>
          </form>
        </div>

        <aside className="bg-[linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(15,23,42,0.92))] px-4 py-5 text-white sm:px-6 sm:py-6 xl:px-6 2xl:px-7">
          <div className="rounded-[1.7rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-slate-950/20">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-200">Session Summary</div>
            <h3 className="display-font mt-3 text-2xl font-semibold text-white">{isProvider ? 'Doctor workspace' : 'Patient workspace'}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Monitor the live consultation, keep the conversation organized, and close the visit when treatment is complete.
            </p>

            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Doctor</div>
                <div className="mt-1 text-lg font-semibold text-white">{providerName}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Patient</div>
                <div className="mt-1 text-lg font-semibold text-white">{patientName}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Status</div>
                <div className="mt-1 text-lg font-semibold text-white">{isRoomActive ? 'In consultation' : 'Consultation ended'}</div>
                <div className="mt-1 text-sm text-slate-300">Started {formatDateTime(room?.createdat)}</div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-teal-400/20 bg-teal-400/10 p-4 text-sm leading-7 text-teal-50">
              Real-time updates stay in sync through Supabase Realtime and fallback refreshes, so both sides of the consultation see the same state.
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default ChatRoom;