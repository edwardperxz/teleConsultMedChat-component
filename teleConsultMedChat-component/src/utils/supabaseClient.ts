import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('supabaseUrl and supabaseKey are required.');
}

console.log('Supabase URL:', supabaseUrl); 
console.log('Supabase Key:', supabaseKey);  

export const supabase = createClient(supabaseUrl, supabaseKey);