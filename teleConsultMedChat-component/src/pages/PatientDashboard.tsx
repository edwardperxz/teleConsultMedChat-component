import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCalendarCheck, FaClock, FaComments, FaPlus, FaSpinner, FaStethoscope, FaUserMd } from 'react-icons/fa';
import { useSupabase } from '../contexts/SupabaseContext';
import { DEMO_PATIENT_ID, formatDateTime } from '../utils/clinic';

interface ChatRoomRecord {
  id: number;
  isactive: boolean;
  createdat: string;
  endedat: string | null;
}

interface WaitingRoomRecord {
  id: number;
  createdat: string;
}

interface PatientProfile {
  id: number;
  name: string;
}

const PatientDashboard: React.FC = () => {
  const supabase = useSupabase();
  const navigate = useNavigate();
  const [patientName, setPatientName] = useState('');
  const [waitingRoom, setWaitingRoom] = useState<WaitingRoomRecord | null>(null);
  const [chatRoom, setChatRoom] = useState<ChatRoomRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [patientResult, waitingResult, chatResult] = await Promise.all([
        supabase.from('users').select('id, name').eq('id', DEMO_PATIENT_ID).single(),
        supabase
          .from('waitingrooms')
          .select('id, createdat')
          .eq('patientid', DEMO_PATIENT_ID)
          .order('createdat', { ascending: false })
          .limit(1),
        supabase
          .from('chatrooms')
          .select('id, isactive, createdat, endedat')
          .eq('patientid', DEMO_PATIENT_ID)
          .order('createdat', { ascending: false })
          .limit(1),
      ]);

      const profile = patientResult.data as PatientProfile | null;
      setPatientName(profile?.name ?? 'Patient');
      setWaitingRoom(((waitingResult.data?.[0] ?? null) as WaitingRoomRecord | null));
      setChatRoom(((chatResult.data?.[0] ?? null) as ChatRoomRecord | null));
    } catch (dashboardError: any) {
      setError(dashboardError?.message ?? 'Unable to load your dashboard right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();

    const waitingChannel = supabase
      .channel('patient-dashboard-waiting')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waitingrooms', filter: `patientid=eq.${DEMO_PATIENT_ID}` }, () => {
        void loadDashboard();
      })
      .subscribe();

    const chatChannel = supabase
      .channel('patient-dashboard-chatrooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chatrooms', filter: `patientid=eq.${DEMO_PATIENT_ID}` }, () => {
        void loadDashboard();
      })
      .subscribe();

    const interval = window.setInterval(() => {
      void loadDashboard();
    }, 10000);

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(waitingChannel);
      void supabase.removeChannel(chatChannel);
    };
  }, [supabase]);

  const startNewVisit = async () => {
    if (chatRoom?.isactive) {
      navigate(`/patient-chat-room/${DEMO_PATIENT_ID}/${chatRoom.id}`);
      return;
    }

    if (waitingRoom) {
      navigate(`/waiting-room/${DEMO_PATIENT_ID}/${waitingRoom.id}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: insertData, error: insertError } = await supabase
        .from('waitingrooms')
        .insert([{ patientid: DEMO_PATIENT_ID }])
        .select('id, createdat')
        .single();

      if (insertError) {
        throw insertError;
      }

      const newWaitingRoom = insertData as WaitingRoomRecord;
      setWaitingRoom(newWaitingRoom);
      navigate(`/waiting-room/${DEMO_PATIENT_ID}/${newWaitingRoom.id}`);
    } catch (visitError: any) {
      setError(visitError?.message ?? 'Unable to request a consultation right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickStats = [
    { label: 'Current status', value: chatRoom?.isactive ? 'In consultation' : waitingRoom ? 'Waiting for a doctor' : 'Ready to request', icon: FaCalendarCheck },
    { label: 'Patient', value: patientName || 'Loading...', icon: FaUserMd },
    { label: 'Live updates', value: 'Enabled', icon: FaComments },
  ];

  if (isLoading) {
    return (
      <section className="flex min-h-[72vh] items-center justify-center rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <FaSpinner className="animate-spin text-3xl text-teal-600" />
          <div>
            <h2 className="display-font text-2xl font-semibold text-slate-900">Loading patient dashboard</h2>
            <p className="mt-2 text-sm text-slate-500">Preparing your live consultation workspace.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5 lg:space-y-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-[linear-gradient(135deg,_rgba(13,148,136,0.96),_rgba(8,145,178,0.95))] p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)] sm:p-6 lg:p-7 xl:p-8">
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold uppercase tracking-[0.3em] text-teal-100">
            <FaStethoscope />
            Patient dashboard
          </div>
          <h1 className="display-font mt-4 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
            Request a live consultation in seconds.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-teal-50/90 sm:text-base lg:text-lg lg:leading-8">
            Your consultation flow is fully synchronized with the care team. Start a new visit, track the waiting room, and continue into the live doctor chat when your session is ready.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 lg:mt-8">
            <button
              onClick={startNewVisit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-teal-800 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 sm:px-5"
            >
              {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaPlus />}
              {waitingRoom || chatRoom?.isactive ? 'Open current session' : 'Request consultation'}
            </button>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-teal-50">
              Real-time queue tracking is active.
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 xl:gap-4">
          {quickStats.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.label} className="rounded-[1.4rem] border border-white/70 bg-white/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:p-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-slate-500 sm:text-sm">{item.label}</div>
                  <Icon className="text-teal-600" />
                </div>
                <div className="mt-2 text-xl font-semibold text-slate-900 sm:mt-3 sm:text-2xl">{item.value}</div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-[1.7rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3 xl:gap-6">
        <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:col-span-2 lg:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-700">Live status</div>
              <h2 className="display-font mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">Consultation progress</h2>
            </div>
            <div className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${chatRoom?.isactive ? 'bg-emerald-50 text-emerald-700' : waitingRoom ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
              {chatRoom?.isactive ? 'In session' : waitingRoom ? 'Queued' : 'No active request'}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:mt-6">
            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 lg:p-5">
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
                <FaClock className="text-teal-600" />
                Queue timestamp
              </div>
              <div className="mt-2 text-base font-semibold text-slate-900 sm:mt-3 sm:text-lg">{waitingRoom ? formatDateTime(waitingRoom.createdat) : 'No waiting request'}</div>
            </div>
            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 lg:p-5">
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
                <FaCalendarCheck className="text-teal-600" />
                Latest consultation
              </div>
              <div className="mt-2 text-base font-semibold text-slate-900 sm:mt-3 sm:text-lg">{chatRoom ? formatDateTime(chatRoom.createdat) : 'No consultation yet'}</div>
            </div>
          </div>

          <div className="mt-5 rounded-[1.35rem] border border-dashed border-teal-200 bg-teal-50/70 p-4 text-sm leading-7 text-teal-900 lg:mt-6 lg:p-5">
            This interface mirrors a real telehealth workflow: a patient requests care, enters a live waiting room, and is routed into a doctor-led chat as soon as the consultation opens.
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-700">Next action</div>
          <h3 className="display-font mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">Start a new visit</h3>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            If you are not already waiting or in a live session, create a new consultation request and the care team will pick it up in real time.
          </p>

          <button
            onClick={startNewVisit}
            disabled={isSubmitting}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 lg:mt-6"
          >
            {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaPlus />}
            {waitingRoom || chatRoom?.isactive ? 'Open current session' : 'Request consultation'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default PatientDashboard;