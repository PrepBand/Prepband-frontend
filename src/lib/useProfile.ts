import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "./supabaseClient";
import type { Tables } from "./database.types";

export type Profile = Tables<"profiles">;
export type AboutInfo = Tables<"profile_about">;
export type StudyGoal = Tables<"profile_study_goals">;
export type TargetScores = Tables<"profile_target_scores">;

type AboutUpdate = Omit<AboutInfo, "user_id" | "created_at" | "updated_at">;
type StudyGoalUpdate = Omit<StudyGoal, "user_id" | "created_at" | "updated_at">;
type TargetScoresUpdate = Omit<TargetScores, "user_id" | "created_at" | "updated_at">;

export function useProfile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [about, setAbout] = useState<AboutInfo | null>(null);
  const [studyGoal, setStudyGoal] = useState<StudyGoal | null>(null);
  const [targetScores, setTargetScores] = useState<TargetScores | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProfile = useCallback(async () => {
    if (!session) {
      setProfile(null);
      setAbout(null);
      setStudyGoal(null);
      setTargetScores(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const userId = session.user.id;
    const [profileRes, aboutRes, studyGoalRes, targetScoresRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("profile_about").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("profile_study_goals").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("profile_target_scores").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    if (profileRes.error) {
      setError(profileRes.error.message);
    } else {
      setProfile(profileRes.data);
    }
    setAbout(aboutRes.data ?? null);
    setStudyGoal(studyGoalRes.data ?? null);
    setTargetScores(targetScoresRes.data ?? null);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateAbout = useCallback(
    async (updates: AboutUpdate) => {
      if (!session) return { error: "Not signed in." };
      const { data, error: upsertError } = await supabase
        .from("profile_about")
        .upsert({ user_id: session.user.id, ...updates })
        .select()
        .single();
      if (upsertError) return { error: upsertError.message };
      setAbout(data);
      return { error: null };
    },
    [session],
  );

  const updateStudyGoal = useCallback(
    async (updates: StudyGoalUpdate) => {
      if (!session) return { error: "Not signed in." };
      const { data, error: upsertError } = await supabase
        .from("profile_study_goals")
        .upsert({ user_id: session.user.id, ...updates })
        .select()
        .single();
      if (upsertError) return { error: upsertError.message };
      setStudyGoal(data);
      return { error: null };
    },
    [session],
  );

  const updateTargetScores = useCallback(
    async (updates: TargetScoresUpdate) => {
      if (!session) return { error: "Not signed in." };
      const { data, error: upsertError } = await supabase
        .from("profile_target_scores")
        .upsert({ user_id: session.user.id, ...updates })
        .select()
        .single();
      if (upsertError) return { error: upsertError.message };
      setTargetScores(data);
      return { error: null };
    },
    [session],
  );

  const completeOnboarding = useCallback(async () => {
    if (!session) return { error: "Not signed in." };
    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", session.user.id)
      .select()
      .single();
    if (updateError) return { error: updateError.message };
    setProfile(data);
    return { error: null };
  }, [session]);

  return {
    profile,
    about,
    studyGoal,
    targetScores,
    loading,
    error,
    refetch: fetchProfile,
    updateAbout,
    updateStudyGoal,
    updateTargetScores,
    completeOnboarding,
  };
}
