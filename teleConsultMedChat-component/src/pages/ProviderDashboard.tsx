import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useNavigate } from 'react-router-dom';

interface WaitingPatient {
  patientid: number;
  name?: string;
}

const ProviderDashboard: React.FC = () => {
  const supabase = useSupabase();
  const navigate = useNavigate();
  const [waitingPatients, setWaitingPatients] = useState<WaitingPatient[]>([]);

  useEffect(() => {
    const fetchWaitingPatients = async () => {
      try {
        const { data: waitingData, error: waitingError } = await supabase
          .from('waitingrooms')
          .select('patientid');

        if (waitingError) {
          throw waitingError;
        }

        console.log('Waiting data:', waitingData);  // Log de los datos recuperados

        if (waitingData && waitingData.length > 0) {
          const patientIds = waitingData.map(patient => patient.patientid);
          const { data: patientData, error: patientError } = await supabase
            .from('users')
            .select('id, name')
            .in('id', patientIds)
            .eq('usertype', 'patient'); // Asegurarse de filtrar solo los pacientes

          if (patientError) {
            throw patientError;
          }

          console.log('Patient data:', patientData);  // Log de los datos de los pacientes

          const combinedData = waitingData.map(patient => ({
            ...patient,
            name: patientData.find(p => p.id === patient.patientid)?.name
          }));

          console.log('Combined data:', combinedData);  // Log de los datos combinados

          setWaitingPatients(combinedData);
        } else {
          console.log('No patients waiting');
        }
      } catch (error: any) {
        console.error('Error in fetchWaitingPatients:', error.message, error.details, error.hint);
      }
    };

    fetchWaitingPatients();
  }, [supabase]);

  const startVisit = async (patientId: number) => {
    const providerId = 1; // Este debería ser el ID del proveedor actual.
    try {
      const { data, error } = await supabase
        .from('chatrooms')
        .insert([{ providerid: providerId, patientid: patientId, isactive: true }]) // Asegurarse de que isactive sea true
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('Chat room data:', data);  // Log de los datos del chat room
      const chatRoomId = data.id;

      await supabase
        .from('waitingrooms')
        .delete()
        .match({ patientid: patientId });

      console.log('Visit started with chat room ID:', chatRoomId);
      navigate(`/provider-chat-room/${providerId}/${chatRoomId}`);
    } catch (error: any) {
      console.error('Error starting visit:', error.message, error.details, error.hint);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-6 md:p-12 w-full max-w-4xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Pacientes en Espera</h2>
        <ul className="space-y-4">
          {waitingPatients.length > 0 ? (
            waitingPatients.map((patient) => (
              <li key={patient.patientid} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg shadow">
                <span>Paciente {patient.name}</span>
                <button
                  onClick={() => startVisit(patient.patientid)}
                  className="bg-green-600 text-white p-2 rounded hover:bg-green-700 transition duration-300"
                >
                  Iniciar Visita
                </button>
              </li>
            ))
          ) : (
            <p className="text-center text-gray-600">No hay pacientes en espera.</p>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ProviderDashboard;
