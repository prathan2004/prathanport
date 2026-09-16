const SUPABASE_URL = 'https://rzqbioivhrfruceyauau.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZJhgNkCF95kOnYmybs2lCw_q_zzRpOd';

if (SUPABASE_URL === 'YOUR_SUPABASE_PROJECT_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
  console.warn('Set SUPABASE_URL and SUPABASE_ANON_KEY in js/supabase.js before using the app.');
}

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getSession() {
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function getCurrentUser() {
  const { data, error } = await sb.auth.getUser();
  if (error) throw error;
  return data.user;
}

async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data;
}

function setMessage(element, text, isError = false) {
  if (!element) return;
  element.textContent = text;
  element.classList.toggle('error', isError);
}
