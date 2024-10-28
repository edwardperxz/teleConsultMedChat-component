import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../contexts/SupabaseContext';

const PatientDashboard: React.FC = () => {
  const supabase = useSupabase();
  const navigate = useNavigate();
  const startNewVisit = async () => {
    const patientId = 2;
    console.log('Attempting to insert into waitingrooms:', { patientId });
    const { data: insertData, error: insertError } = await supabase
      .from('waitingrooms')
      .insert([{ patientid: patientId }])
      .select()
      .single();

    if (insertError) {
      console.error('Error starting new visit:', insertError.message, insertError.details, insertError.hint);
    } else {
      const waitingRoomId = insertData.id;
      console.log('New visit started successfully', insertData);
      navigate(`/waiting-room/${patientId}/${waitingRoomId}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-6 md:p-12 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Iniciar Nueva Cita</h2>
        <button
          onClick={startNewVisit}
          className="w-full bg-teal-700 text-white p-2 rounded hover:bg-teal-900 transition duration-300"
        >
          Solicitar Cita
        </button>
      </div>
    </div>
  );
};

export default PatientDashboard;