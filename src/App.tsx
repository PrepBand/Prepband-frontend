import { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { lazyPage } from "./lib/lazyPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { RequireOnboarding } from "./components/auth/RequireOnboarding";
import { LandingPage } from "./pages/LandingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { StatusPage } from "./pages/StatusPage";
import { RequireAdmin } from "./components/admin/RequireAdmin";

// Everything below loads on first visit to that page, so a visitor on the
// landing page doesn't download the forms library, the admin area or the
// Speaking test.
const LoginPage = lazyPage(() => import("./pages/auth/LoginPage"), "LoginPage");
const SignupPage = lazyPage(() => import("./pages/auth/SignupPage"), "SignupPage");
const ForgotPasswordPage = lazyPage(() => import("./pages/auth/ForgotPasswordPage"), "ForgotPasswordPage");
const VerifyResetCodePage = lazyPage(() => import("./pages/auth/VerifyResetCodePage"), "VerifyResetCodePage");
const ResetPasswordPage = lazyPage(() => import("./pages/auth/ResetPasswordPage"), "ResetPasswordPage");
const DashboardPage = lazyPage(() => import("./pages/DashboardPage"), "DashboardPage");
const OnboardingPage = lazyPage(() => import("./pages/OnboardingPage"), "OnboardingPage");
const ProfilePage = lazyPage(() => import("./pages/ProfilePage"), "ProfilePage");
const PracticePage = lazyPage(() => import("./pages/PracticePage"), "PracticePage");
const PracticeHistoryPage = lazyPage(() => import("./pages/PracticeHistoryPage"), "PracticeHistoryPage");
const MockTestsPage = lazyPage(() => import("./pages/MockTestsPage"), "MockTestsPage");
const CertificatesPage = lazyPage(() => import("./pages/CertificatesPage"), "CertificatesPage");
const ProgressPage = lazyPage(() => import("./pages/ProgressPage"), "ProgressPage");
const ResourcesPage = lazyPage(() => import("./pages/ResourcesPage"), "ResourcesPage");
const ReviewMistakesPage = lazyPage(() => import("./pages/ReviewMistakesPage"), "ReviewMistakesPage");
const StudyPlanPage = lazyPage(() => import("./pages/StudyPlanPage"), "StudyPlanPage");
const AttemptPage = lazyPage(() => import("./pages/AttemptPage"), "AttemptPage");
const AttemptResultsPage = lazyPage(() => import("./pages/AttemptResultsPage"), "AttemptResultsPage");
const FullMockPage = lazyPage(() => import("./pages/FullMockPage"), "FullMockPage");
const CertificateDetailPage = lazyPage(() => import("./pages/CertificateDetailPage"), "CertificateDetailPage");
const VerifyCertificatePage = lazyPage(() => import("./pages/VerifyCertificatePage"), "VerifyCertificatePage");
const LegalPage = lazyPage(() => import("./pages/LegalPage"), "LegalPage");
const ContactPage = lazyPage(() => import("./pages/ContactPage"), "ContactPage");
const AboutPage = lazyPage(() => import("./pages/AboutPage"), "AboutPage");
const AdminOverviewPage = lazyPage(() => import("./pages/admin/AdminOverviewPage"), "AdminOverviewPage");
const AdminTestsPage = lazyPage(() => import("./pages/admin/AdminTestsPage"), "AdminTestsPage");
const AdminTestEditorPage = lazyPage(() => import("./pages/admin/AdminTestEditorPage"), "AdminTestEditorPage");
const AdminUsersPage = lazyPage(() => import("./pages/admin/AdminUsersPage"), "AdminUsersPage");
const AdminExaminerPage = lazyPage(() => import("./pages/admin/AdminExaminerPage"), "AdminExaminerPage");
const AdminSpeechLabPage = lazyPage(() => import("./pages/admin/AdminSpeechLabPage"), "AdminSpeechLabPage");
const AdminAuditPage = lazyPage(() => import("./pages/admin/AdminAuditPage"), "AdminAuditPage");
const AdminAnalyticsPage = lazyPage(() => import("./pages/admin/AdminAnalyticsPage"), "AdminAnalyticsPage");
const AdminCertificatesPage = lazyPage(() => import("./pages/admin/AdminCertificatesPage"), "AdminCertificatesPage");
const AdminResourcesPage = lazyPage(() => import("./pages/admin/AdminResourcesPage"), "AdminResourcesPage");
const AdminResourceEditorPage = lazyPage(() => import("./pages/admin/AdminResourceEditorPage"), "AdminResourceEditorPage");

export default function App() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="/privacy" element={<LegalPage />} />
        <Route path="/terms" element={<LegalPage />} />
        <Route path="/cookies" element={<LegalPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/403" element={<StatusPage kind="forbidden" />} />
        <Route path="/500" element={<StatusPage kind="error" />} />
        <Route path="/503" element={<StatusPage kind="unavailable" />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/verify-reset-code" element={<VerifyResetCodePage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/dashboard"
          element={
            <ProtectedRoute>
              <RequireOnboarding>
                <DashboardPage />
              </RequireOnboarding>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/profile"
          element={
            <ProtectedRoute>
              <RequireOnboarding>
                <ProfilePage />
              </RequireOnboarding>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/practice"
          element={
            <ProtectedRoute>
              <RequireOnboarding>
                <PracticePage />
              </RequireOnboarding>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/practice-history"
          element={
            <ProtectedRoute>
              <RequireOnboarding>
                <PracticeHistoryPage />
              </RequireOnboarding>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/mock-tests"
          element={
            <ProtectedRoute>
              <RequireOnboarding>
                <MockTestsPage />
              </RequireOnboarding>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/certificates"
          element={
            <ProtectedRoute>
              <RequireOnboarding>
                <CertificatesPage />
              </RequireOnboarding>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/progress"
          element={
            <ProtectedRoute>
              <RequireOnboarding>
                <ProgressPage />
              </RequireOnboarding>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/review"
          element={
            <ProtectedRoute>
              <RequireOnboarding>
                <ReviewMistakesPage />
              </RequireOnboarding>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/study-plan"
          element={
            <ProtectedRoute>
              <RequireOnboarding>
                <StudyPlanPage />
              </RequireOnboarding>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/resources"
          element={
            <ProtectedRoute>
              <RequireOnboarding>
                <ResourcesPage />
              </RequireOnboarding>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/attempt/:testId"
          element={
            <ProtectedRoute>
              <RequireOnboarding>
                <AttemptPage />
              </RequireOnboarding>
            </ProtectedRoute>
          }
        />
        {/* Admin: anyone who isn't an admin (signed out included) sees the 404 page. */}
        <Route path="/admin" element={<RequireAdmin><AdminOverviewPage /></RequireAdmin>} />
        <Route path="/admin/tests" element={<RequireAdmin><AdminTestsPage /></RequireAdmin>} />
        <Route path="/admin/tests/:testId" element={<RequireAdmin><AdminTestEditorPage /></RequireAdmin>} />
        <Route path="/admin/users" element={<RequireAdmin><AdminUsersPage /></RequireAdmin>} />
        <Route path="/admin/examiner" element={<RequireAdmin><AdminExaminerPage /></RequireAdmin>} />
        <Route path="/admin/speech-lab" element={<RequireAdmin><AdminSpeechLabPage /></RequireAdmin>} />
        <Route path="/admin/analytics" element={<RequireAdmin><AdminAnalyticsPage /></RequireAdmin>} />
        <Route path="/admin/certificates" element={<RequireAdmin><AdminCertificatesPage /></RequireAdmin>} />
        <Route path="/admin/audit" element={<RequireAdmin><AdminAuditPage /></RequireAdmin>} />
        <Route path="/admin/resources" element={<RequireAdmin><AdminResourcesPage /></RequireAdmin>} />
        <Route path="/admin/resources/:resourceId" element={<RequireAdmin><AdminResourceEditorPage /></RequireAdmin>} />
        <Route path="/admin/*" element={<RequireAdmin><NotFoundPage /></RequireAdmin>} />
        <Route
          path="/app/results/:attemptId"
          element={
            <ProtectedRoute>
              <RequireOnboarding>
                <AttemptResultsPage />
              </RequireOnboarding>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/full-mock/:mockId"
          element={
            <ProtectedRoute>
              <RequireOnboarding>
                <FullMockPage />
              </RequireOnboarding>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/full-mock/:mockId/:module"
          element={
            <ProtectedRoute>
              <RequireOnboarding>
                <AttemptPage />
              </RequireOnboarding>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/certificates/:certificateId"
          element={
            <ProtectedRoute>
              <RequireOnboarding>
                <CertificateDetailPage />
              </RequireOnboarding>
            </ProtectedRoute>
          }
        />
        {/* Public: anyone holding a certificate ID can check it (FR-CERT-06). */}
        <Route path="/verify" element={<VerifyCertificatePage />} />
        <Route path="/verify/:code" element={<VerifyCertificatePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

function PageLoading() {
  return (
    <p className="page-loading" role="status" aria-live="polite">
      Loading…
    </p>
  );
}
