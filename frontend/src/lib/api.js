import { supabase } from './supabase';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export async function api(path, options = {}) {
  const {
    data: {
      session
    }
  } = await supabase.auth.getSession();
  const headers = {
    ...options.headers
  };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers
  });
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      detail = (await response.json()).detail || detail;
    } catch {/* keep status */}
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return response.status === 204 ? null : response.json();
}
