import { createClient } from '@supabase/supabase-js';

const SUPABASE_DEFAULT_URL = 'https://zxkvyajmvkxufsogsrug.supabase.co';
const SUPABASE_DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4a3Z5YWptdmt4dWZzb2dzcnVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODk2NTM1MDksImV4cCI6MjAwNTIyOTUwOX0.tKgbmVvqZMU2hywCbhYWSVKXLU8VKrACH4Ez8oGSULk';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')) 
  ? process.env.NEXT_PUBLIC_SUPABASE_URL 
  : SUPABASE_DEFAULT_URL;
  
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder') 
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
  : SUPABASE_DEFAULT_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
