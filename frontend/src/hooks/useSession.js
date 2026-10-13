import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
export function useSession() {
  const [session, setSession] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({
      data
    }) => setSession(data.session));
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);
  return session;
}
