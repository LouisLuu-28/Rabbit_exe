import { supabase } from "@/integrations/supabase/client";

export async function getActiveSessionUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    return { user: session.user, error: null as string | null };
  }

  const { data, error } = await supabase.auth.refreshSession();

  if (data.session?.user) {
    return { user: data.session.user, error: null as string | null };
  }

  return {
    user: null,
    error: error?.message || "Auth session missing",
  };
}
