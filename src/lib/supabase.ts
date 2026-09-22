import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fhytgbmdnkejhxqydtpe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoeXRnYm1kbmtlamh4cXlkdHBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwOTM4MTIsImV4cCI6MjEwNTY2OTgxMn0.h2K4aTmWzn1BFfQPFdkKuFBtgVppXPUj5-PKHe0ZQEg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});