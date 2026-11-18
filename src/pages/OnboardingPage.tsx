import { useMemo, useState } from "react";
import { Loader2, LogOut, TriangleAlert } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { Stepper } from "../components/onboarding/Stepper";
import { AboutYouForm } from "../components/profile/AboutYouForm";
import { StudyGoalForm } from "../components/profile/StudyGoalForm";
import { TargetScoresForm } from "../components/profile/TargetScoresForm";
import { Logo } from "../components/layout/Logo";
import { supabase } from "../lib/supabaseClient";
import { useProfile } from "../lib/useProfile";

const steps = [{ label: "About you" }, { label: "Study goal" }, { label: "Target scores" }];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { profile, about, studyGoal, targetScores, loading, error, refetch, updateAbout, updateStudyGoal, updateTargetScores, completeOnboarding } =
    useProfile();

  const startingStep = useMemo(() => {
    if (!about) return 1;
    if (!studyGoal) return 2;
    return 3;
  }, [about, studyGoal]);

  const [step, setStep] = useState<number | null>(null);
  const currentStep = step ?? startingStep;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="onboarding-page">
        <main className="onboarding-main">
          <div className="auth-status-row">
            <Loader2 size={18} className="spin" aria-hidden="true" /> Loading your profile…
          </div>
        </main>
      </div>
    );
  }

  if (!loading && error) {
    return (
      <div className="onboarding-page">
        <main className="onboarding-main">
          <div className="dashboard-card empty-card" role="alert">
            <TriangleAlert size={20} />
            <strong>We couldn't load your profile.</strong>
            <p>{error}</p>
            <button className="button button-secondary" type="button" onClick={refetch}>
              Try again
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (profile?.onboarding_completed) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <div className="onboarding-page">
      <header className="dashboard-header">
        <Logo />
        <button className="button button-secondary" onClick={handleLogout} type="button">
          <LogOut size={16} aria-hidden="true" /> Log out
        </button>
      </header>

      <main className="onboarding-main">
        <h1>A few quick details before you start.</h1>
        <p>This takes about a minute and helps us tailor your dashboard. You can update it anytime.</p>

        <Stepper steps={steps} currentStep={currentStep} />

        <div className="dashboard-card onboarding-card">
          {currentStep === 1 && (
            <AboutYouForm
              defaultValues={
                about
                  ? {
                      firstName: about.first_name,
                      lastName: about.last_name,
                      gender: about.gender as "male" | "female" | "prefer_not_to_say" | "other",
                      age: about.age != null ? String(about.age) : "",
                      phoneCountryCode: about.phone_country_code ?? "",
                      phoneNumber: about.phone_number ?? "",
                      city: about.city,
                      country: about.country,
                    }
                  : {}
              }
              submitLabel="Continue"
              savingLabel="Saving…"
              onSave={(values) =>
                updateAbout({
                  first_name: values.firstName,
                  last_name: values.lastName,
                  gender: values.gender,
                  age: values.age ? Number(values.age) : null,
                  phone_country_code: values.phoneNumber ? values.phoneCountryCode || null : null,
                  phone_number: values.phoneNumber || null,
                  city: values.city,
                  country: values.country,
                  avatar_url: null,
                })
              }
              onSaved={() => setStep(2)}
            />
          )}

          {currentStep === 2 && (
            <StudyGoalForm
              defaultValues={
                studyGoal
                  ? {
                      examDate: studyGoal.exam_date ?? "",
                      ieltsType: studyGoal.ielts_type as "academic" | "general",
                      preparationLevel: studyGoal.preparation_level as "beginner" | "intermediate" | "advanced",
                    }
                  : {}
              }
              submitLabel="Continue"
              savingLabel="Saving…"
              onBack={() => setStep(1)}
              onSave={(values) =>
                updateStudyGoal({
                  exam_date: values.examDate || null,
                  ielts_type: values.ieltsType,
                  preparation_level: values.preparationLevel,
                })
              }
              onSaved={() => setStep(3)}
            />
          )}

          {currentStep === 3 && (
            <TargetScoresForm
              defaultValues={
                targetScores
                  ? {
                      listening: targetScores.listening != null ? String(targetScores.listening) : "",
                      reading: targetScores.reading != null ? String(targetScores.reading) : "",
                      writing: targetScores.writing != null ? String(targetScores.writing) : "",
                      speaking: targetScores.speaking != null ? String(targetScores.speaking) : "",
                      overall: targetScores.overall != null ? String(targetScores.overall) : "",
                    }
                  : {}
              }
              submitLabel="Finish setup"
              savingLabel="Saving…"
              onBack={() => setStep(2)}
              onSave={async (values) => {
                const result = await updateTargetScores({
                  listening: values.listening ? Number(values.listening) : null,
                  reading: values.reading ? Number(values.reading) : null,
                  writing: values.writing ? Number(values.writing) : null,
                  speaking: values.speaking ? Number(values.speaking) : null,
                  overall: Number(values.overall),
                });
                if (result.error) return result;
                return completeOnboarding();
              }}
              onSaved={() => navigate("/app/dashboard", { replace: true })}
            />
          )}
        </div>
      </main>
    </div>
  );
}
