import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { RequireOnboarding } from "./components/auth/RequireOnboarding";
import { LandingPage } from "./pages/LandingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PracticePage } from "./pages/PracticePage";
import { PracticeHistoryPage } from "./pages/PracticeHistoryPage";
import { MockTestsPage } from "./pages/MockTestsPage";
import { CertificatesPage } from "./pages/CertificatesPage";
import { ProgressPage } from "./pages/ProgressPage";
import { LegalPage } from "./pages/LegalPage";
import { ContactPage } from "./pages/ContactPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { SignupPage } from "./pages/auth/SignupPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { VerifyResetCodePage } from "./pages/auth/VerifyResetCodePage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/legal" element={<LegalPage />} />
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
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
