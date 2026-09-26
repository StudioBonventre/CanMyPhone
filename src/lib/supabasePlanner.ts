import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabasePlannerClient } from "../automation/supabasePlannerClient";
import type { ServerPlannerClient } from "../automation/planner";
import { createSemanticServerClient } from "../automation/semanticServerClient";

let supabase: SupabaseClient | null | undefined;

function client(): SupabaseClient | null {
  if (supabase !== undefined) return supabase;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  supabase = url && key ? createClient(url, key, { auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }) : null;
  return supabase;
}

export function getSupabasePlannerClient(): ServerPlannerClient | null {
  const instance = client();
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!instance || !url || !key) return null;
  return createSupabasePlannerClient({
    supabaseUrl: url,
    publishableKey: key,
    getAccessToken: async () => {
      const current = await instance.auth.getSession();
      if (current.data.session?.access_token) return current.data.session.access_token;
      const anonymous = await instance.auth.signInAnonymously();
      return anonymous.data.session?.access_token ?? null;
    }
  });
}


export function getSupabaseSemanticClient() {
  const instance = client();
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!instance || !url || !key) return null;
  return createSemanticServerClient({
    supabaseUrl: url,
    publishableKey: key,
    getAccessToken: async () => {
      const current = await instance.auth.getSession();
      if (current.data.session?.access_token) return current.data.session.access_token;
      const anonymous = await instance.auth.signInAnonymously();
      return anonymous.data.session?.access_token ?? null;
    }
  });
}
