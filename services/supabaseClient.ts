import { createClient } from '@supabase/supabase-js';

// Configuration using the provided credentials
const supabaseUrl = 'https://mofmtzqcdnsaulvorvez.supabase.co';
// Note: In production, use process.env.REACT_APP_SUPABASE_KEY
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZm10enFjZG5zYXVsdm9ydmV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NDQzODAsImV4cCI6MjA4MTMyMDM4MH0.Iq8FqcKGmY6OfCnh1b3L6-4bDHO-BtHCKmH8nX1-eVs';

export const supabase = createClient(supabaseUrl, supabaseKey);