import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "./supabaseClient";

/**
 * Whether the signed-in user has the admin role. Reads the caller's own
 * `user_roles` row (RLS allows exactly that, and nothing can write it from
 * the client), so this is only a UI decision about what to show. Every
 * admin API call is still gated server-side by `require_admin`.
 *
 * Cached per user id for the session, so moving between pages doesn't
 * re-query or flash a loading state.
 */
const cache = new Map<string, boolean>();

export function useIsAdmin() {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user.id ?? null;
  const [isAdmin, setIsAdmin] = useState<boolean | null>(userId ? cache.get(userId) ?? null : null);

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    const cached = cache.get(userId);
    if (cached !== undefined) {
      setIsAdmin(cached);
      return;
    }
    let active = true;
    setIsAdmin(null);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        const admin = !error && (data?.role === "admin" || data?.role === "super_admin");
        if (!error) cache.set(userId, admin);
        if (active) setIsAdmin(admin);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  return { isAdmin: isAdmin === true, loading: authLoading || (userId !== null && isAdmin === null) };
}
