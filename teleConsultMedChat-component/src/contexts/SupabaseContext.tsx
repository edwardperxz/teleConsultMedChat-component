import React, { createContext, useContext, ReactNode } from 'react';
import { supabase } from '../utils/supabaseClient';

const SupabaseContext = createContext(supabase);

interface SupabaseProviderProps {
  children: ReactNode;
}

export const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ children }) => {
  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => useContext(SupabaseContext);