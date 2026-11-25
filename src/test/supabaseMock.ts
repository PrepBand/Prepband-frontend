import { vi } from "vitest";

/** A signed-out Supabase client stub, so component tests never reach the
 * real project. */
export const supabaseMock = {
  auth: {
    getSession: vi.fn(async () => ({ data: { session: { access_token: "test-token" } } })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe() {} } } })),
    signOut: vi.fn(async () => ({ error: null })),
  },
  from: vi.fn(() => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: "admin" }, error: null }) }) }),
  })),
};
