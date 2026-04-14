import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaClock, FaSpinner, FaUserMd, FaWifi } from 'react-icons/fa';
import { useSupabase } from '../contexts/SupabaseContext';
import { DEMO_PATIENT_ID, formatDateTime } from '../utils/clinic';

interface ChatRoomRecord {
  id: number;
  isactive: boolean;
  createdat: string;
}

interface WaitingRoomRecord {
  id: number;
  createdat: string;
}

const WaitingRoom: React.FC = () => {
  const { patientId } = useParams<{ patientId?: string }>();
  const navigate = useNavigate();
  const supabase = useSupabase();
  const [isActive, setIsActive] = useState(false);
  const [chatRoomId, setChatRoomId] = useState<number | null>(null);
  const [waitingRoomId, setWaitingRoomId] = useState<number | null>(null);
  const [waitingSince, setWaitingSince] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) {
      navigate('/patient-dashboard');
    }
  }, [patientId, navigate]);

  useEffect(() => {
    const checkChatRoom = async () => {
      setIsLoading(true);

      const [waitingResult, chatResult] = await Promise.all([
        supabase
          .from('waitingrooms')
          .select('id, createdat')
          .eq('patientid', DEMO_PATIENT_ID)
          .order('createdat', { ascending: false })
          .limit(1),
        supabase
          .from('chatrooms')
          .select('id, isactive, createdat')
          .eq('patientid', DEMO_PATIENT_ID)
          .order('createdat', { ascending: false })
          .limit(1),
      ]);

      if (waitingResult.error) {
        setError(waitingResult.error.message);
      }

      if (chatResult.error) {
        setError(chatResult.error.message);
      }

      const waitingRoom = (waitingResult.data?.[0] ?? null) as WaitingRoomRecord | null;
      const chatRoom = (chatResult.data?.[0] ?? null) as ChatRoomRecord | null;

      setWaitingRoomId(waitingRoom?.id ?? null);
      setWaitingSince(waitingRoom?.createdat ?? null);
      setIsActive(Boolean(chatRoom?.isactive));
      setChatRoomId(chatRoom?.id ?? null);
      setIsLoading(false);

      if (chatRoom?.isactive && chatRoom.id) {
        navigate(`/patient-chat-room/${DEMO_PATIENT_ID}/${chatRoom.id}`, { replace: true });
      }
    };

    void checkChatRoom();

    const roomChannel = supabase
      .channel('waiting-room-chatrooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chatrooms', filter: `patientid=eq.${DEMO_PATIENT_ID}` }, () => {
        void checkChatRoom();
      })
      .subscribe();

    const waitingChannel = supabase
      .channel('waiting-room-waitingrooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waitingrooms', filter: `patientid=eq.${DEMO_PATIENT_ID}` }, () => {
        void checkChatRoom();
      })
      .subscribe();

    const interval = window.setInterval(() => {
      void checkChatRoom();
    }, 10000);

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(roomChannel);
      void supabase.removeChannel(waitingChannel);
    };
  }, [supabase, patientId, navigate]);

  useEffect(() => {
    if (isActive && chatRoomId) {
      navigate(`/patient-chat-room/${DEMO_PATIENT_ID}/${chatRoomId}`);
    }
  }, [isActive, chatRoomId, navigate]);

  if (isLoading) {
    return (
      <section className="flex min-h-[72vh] items-center justify-center rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <FaSpinner className="animate-spin text-3xl text-teal-600" />
          <div>
            <h2 className="display-font text-2xl font-semibold text-slate-900">Checking your waiting room</h2>
            <p className="mt-2 text-sm text-slate-500">We are syncing your place in the live queue.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="grid min-h-[72vh] place-items-center rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-10">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-700 shadow-sm">
          <FaUserMd className="text-2xl" />
        </div>
        <div className="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-teal-700">Live waiting room</div>
        <h1 className="display-font mt-4 text-4xl font-semibold text-slate-900">Your doctor will join shortly</h1>
        <p className="mt-4 text-base leading-8 text-slate-500">
          You are currently in the live queue. This room updates in real time and will move you into the consultation the moment the doctor opens the session.
        </p>

        {error && (
          <div className="mt-6 rounded-[1.4rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-left">
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
              <FaClock className="text-teal-600" />
              Waiting since
            </div>
            <div className="mt-3 text-lg font-semibold text-slate-900">{waitingSince ? formatDateTime(waitingSince) : 'Just joined'}</div>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-left">
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
              <FaWifi className="text-teal-600" />
              Live status
            </div>
            <div className="mt-3 text-lg font-semibold text-slate-900">{isActive ? 'Consultation is live' : 'Waiting for doctor availability'}</div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate('/patient-dashboard')}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700"
          >
            Return to dashboard
          </button>
          <div className="rounded-2xl bg-teal-50 px-5 py-3 text-sm font-medium text-teal-800">
            Queue reference #{waitingRoomId ?? patientId}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WaitingRoom;