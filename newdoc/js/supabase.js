import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const db = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
export async function currentUser() {
  if (!configured) return null;
  const { data: { user }, error } = await db.auth.getUser();
  if (error) throw error;
  return user;
}
export async function requireUser() {
  if (!configured) {
    location.replace('login.html?setup=1');
    return null;
  }
  const user = await currentUser();
  if (!user) location.replace('login.html');
  return user;
}
export async function signedFile(bucket, path) {
  if (!path) return null;
  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
