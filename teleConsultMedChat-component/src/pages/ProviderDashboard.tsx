import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowRight, FaClock, FaComments, FaSpinner, FaStethoscope, FaUsers } from 'react-icons/fa';
import { useSupabase } from '../contexts/SupabaseContext';
import { DEMO_PROVIDER_ID, formatDateTime } from '../utils/clinic';

interface WaitingPatient {
  patientid: number;
  name?: string;
}

interface ActiveConsultation {
  id: number;
  patientid: number;
  createdat: string;
  patientName?: string;
}

interface UserRecord {
  id: number;
  name: string;
}

const ProviderDashboard: React.FC = () => {
  const supabase = useSupabase();
  const navigate = useNavigate();
  const [waitingPatients, setWaitingPatients] = useState<WaitingPatient[]>([]);
  const [activeConsultations, setActiveConsultations] = useState<ActiveConsultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWaitingPatients = async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? false;

    try {
      if (showLoading) {
        setIsLoading(true);
      } else if (!isLoading) {
        setIsRefreshing(true);
      }

      const { data: waitingData, error: waitingError } = await supabase
        .from('waitingrooms')
        .select('patientid, createdat');
      if (waitingError) {
        throw waitingError;
      }
      const typedWaitingData = (waitingData as WaitingPatient[] | null) ?? [];
      if (typedWaitingData.length > 0) {
        const patientIds = typedWaitingData.map((patient: WaitingPatient) => patient.patientid);
        const { data: patientData, error: patientError } = await supabase
          .from('users')
          .select('id, name')
          .in('id', patientIds)
          .eq('usertype', 'patient');
        if (patientError) {
          throw patientError;
        }
        const typedPatientData = ((patientData ?? []) as UserRecord[]);
        const combinedData = typedWaitingData.map((patient: WaitingPatient) => ({
          ...patient,
          name: typedPatientData.find((p: UserRecord) => p.id === patient.patientid)?.name,
        }));
        setWaitingPatients(combinedData);
      } else {
        setWaitingPatients([]);
      }

      const { data: chatData, error: chatError } = await supabase
        .from('chatrooms')
        .select('id, patientid, createdat')
        .eq('providerid', DEMO_PROVIDER_ID)
        .eq('isactive', true)
        .order('createdat', { ascending: false });

      if (chatError) {
        throw chatError;
      }

      const activeRooms = (chatData ?? []) as ActiveConsultation[];

      if (activeRooms.length > 0) {
        const patientIds = activeRooms.map(room => room.patientid);
        const { data: patientRecords } = await supabase
          .from('users')
          .select('id, name')
          .in('id', patientIds)
          .eq('usertype', 'patient');

        const patientMap = new Map<number, string>();
        (patientRecords as UserRecord[] | null | undefined)?.forEach((record) => {
          patientMap.set(record.id, record.name);
        });

        setActiveConsultations(activeRooms.map((room) => ({ ...room, patientName: patientMap.get(room.patientid) ?? `Patient ${room.patientid}` })));
      } else {
        setActiveConsultations([]);
      }

      setError(null);
    } catch (error: any) {
      setError(error?.message ?? 'Unable to load provider workspace right now.');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchWaitingPatients({ showLoading: true });

    const waitingChannel = supabase
      .channel('provider-dashboard-waiting')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waitingrooms' }, () => {
        void fetchWaitingPatients();
      })
      .subscribe();

    const chatChannel = supabase
      .channel('provider-dashboard-chatrooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chatrooms' }, () => {
        void fetchWaitingPatients();
      })
      .subscribe();

    const fallbackSync = window.setInterval(() => {
      void fetchWaitingPatients();
    }, 2500);

    return () => {
      window.clearInterval(fallbackSync);
      void supabase.removeChannel(waitingChannel);
      void supabase.removeChannel(chatChannel);
    };
  }, [supabase]);

  const startVisit = async (patientId: number) => {
    try {
      const { data, error } = await supabase
        .from('chatrooms')
        .insert([{ providerid: DEMO_PROVIDER_ID, patientid: patientId, isactive: true }])
        .select()
        .single();
      if (error) {
        throw error;
      }

      const createdRoom = data as { id: number } | null;
      if (!createdRoom?.id) {
        throw new Error('Unable to create consultation room.');
      }

      const chatRoomId = createdRoom.id;
      await supabase
        .from('waitingrooms')
        .delete()
        .match({ patientid: patientId });
      navigate(`/provider-chat-room/${DEMO_PROVIDER_ID}/${chatRoomId}`);
    } catch (error: any) {
      setError(error?.message ?? 'Unable to start the consultation right now.');
    }
  };

  const metrics = [
    { label: 'Waiting requests', value: waitingPatients.length, icon: FaUsers },
    { label: 'Active consultations', value: activeConsultations.length, icon: FaComments },
    { label: 'Realtime sync', value: 'On', icon: FaClock },
  ];

  if (isLoading) {
    return (
      <section className="flex min-h-[72vh] items-center justify-center rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <FaSpinner className="animate-spin text-3xl text-teal-600" />
          <div>
            <h2 className="display-font text-2xl font-semibold text-slate-900">Loading provider dashboard</h2>
            <p className="mt-2 text-sm text-slate-500">Tracking the live queue and active consultations.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(13,148,136,0.92))] p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)] sm:p-6 lg:p-7 xl:p-8">
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold uppercase tracking-[0.3em] text-teal-100">
          <FaStethoscope />
          Provider dashboard
        </div>
        <h1 className="display-font mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
          Manage the live clinical queue with complete clarity.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200 sm:text-base lg:text-lg lg:leading-8">
          Every waiting request and active consultation syncs in real time. Start a room, move the patient into the consultation, and close the visit when treatment is complete.
        </p>
        <div className="mt-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-teal-50">
          {isRefreshing ? 'Updating live queue...' : 'Live queue sync enabled'}
        </div>
      </div>

      {error && (
        <div className="rounded-[1.7rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 lg:gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div key={metric.label} className="rounded-[1.4rem] border border-white/70 bg-white/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-slate-500 sm:text-sm">{metric.label}</div>
                <Icon className="text-teal-600" />
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 sm:mt-3 sm:text-3xl">{metric.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6">
        <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-700">Waiting room</div>
              <h2 className="display-font mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">Patients ready for care</h2>
            </div>
            <div className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Live queue
            </div>
          </div>

          <div className="mt-5 space-y-3 lg:mt-6">
            {waitingPatients.length > 0 ? (
              waitingPatients.map((patient, index) => (
                <div key={`${patient.patientid}-${index}`} className="flex flex-col gap-4 rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Patient</div>
                    <div className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">{patient.name ?? `Patient ${patient.patientid}`}</div>
                  </div>
                  <button
                    onClick={() => startVisit(patient.patientid)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition hover:-translate-y-0.5"
                  >
                    Start consultation
                    <FaArrowRight />
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <p className="text-sm font-medium text-slate-500">No patients are waiting right now.</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-700">Active sessions</div>
          <h3 className="display-font mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">Ongoing consultations</h3>
          <div className="mt-4 space-y-3 lg:mt-5">
            {activeConsultations.length > 0 ? (
              activeConsultations.map((consultation) => (
                <div key={consultation.id} className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Patient</div>
                  <div className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">{consultation.patientName ?? `Patient ${consultation.patientid}`}</div>
                  <div className="mt-2 text-sm text-slate-500">Started {formatDateTime(consultation.createdat)}</div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <p className="text-sm font-medium text-slate-500">No active consultations.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProviderDashboard;