import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AboutYouForm } from "../components/profile/AboutYouForm";
import { StudyGoalForm } from "../components/profile/StudyGoalForm";
import { TargetScoresForm } from "../components/profile/TargetScoresForm";
import { Logo } from "../components/layout/Logo";
import { useProfile } from "../lib/useProfile";

type Tab = "about" | "goal" | "scores";

const tabs: { id: Tab; label: string }[] = [
  { id: "about", label: "About me" },
  { id: "goal", label: "Study goal" },
  { id: "scores", label: "Target score" },
];

export function ProfilePage() {
  const navigate = useNavigate();
  const { profile, about, studyGoal, targetScores, loading, error, refetch, updateAbout, updateStudyGoal, updateTargetScores } =
    useProfile();
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    if (!savedMessage) return;
    const timeout = setTimeout(() => setSavedMessage(""), 3000);
    return () => clearTimeout(timeout);
  }, [savedMessage]);

  const initials = profile?.avatar_initials || "?";

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <Logo />
        <div className="dashboard-header-actions">
          <button className="button button-secondary button-sm" type="button" onClick={() => navigate("/app/dashboard")}>
            Back to dashboard
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {loading && (
          <div className="auth-status-row">
            <Loader2 size={18} className="spin" aria-hidden="true" /> Loading your profile…
          </div>
        )}

        {!loading && error && (
          <div className="dashboard-card empty-card" role="alert">
            <TriangleAlert size={20} />
            <strong>We couldn't load your profile.</strong>
            <p>{error}</p>
            <button className="button button-secondary" type="button" onClick={refetch}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="profile-heading-row">
              <span className="dashboard-avatar profile-avatar-large" aria-hidden="true">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials}
              </span>
              <div>
                <h1>
                  {about ? `${about.first_name} ${about.last_name}` : profile?.display_name || "Your profile"}
                </h1>
              </div>
            </div>

            <nav className="profile-tabs" aria-label="Profile sections">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`profile-tab${activeTab === tab.id ? " profile-tab-active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="dashboard-card profile-tab-card">
              {savedMessage && (
                <p className="form-banner form-banner-success" role="status">
                  <CheckCircle2 size={16} aria-hidden="true" /> {savedMessage}
                </p>
              )}

              {activeTab === "about" && (
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
                  submitLabel="Save changes"
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
                      avatar_url: about?.avatar_url ?? null,
                    })
                  }
                  onSaved={() => setSavedMessage("Your details have been saved.")}
                />
              )}

              {activeTab === "goal" && (
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
                  submitLabel="Save changes"
                  savingLabel="Saving…"
                  onSave={(values) =>
                    updateStudyGoal({
                      exam_date: values.examDate || null,
                      ielts_type: values.ieltsType,
                      preparation_level: values.preparationLevel,
                    })
                  }
                  onSaved={() => setSavedMessage("Your study goal has been saved.")}
                />
              )}

              {activeTab === "scores" && (
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
                  submitLabel="Save changes"
                  savingLabel="Saving…"
                  onSave={(values) =>
                    updateTargetScores({
                      listening: values.listening ? Number(values.listening) : null,
                      reading: values.reading ? Number(values.reading) : null,
                      writing: values.writing ? Number(values.writing) : null,
                      speaking: values.speaking ? Number(values.speaking) : null,
                      overall: Number(values.overall),
                    })
                  }
                  onSaved={() => setSavedMessage("Your target scores have been saved.")}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
