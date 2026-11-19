import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { PasswordField } from "../../components/auth/PasswordField";
import { TextField } from "../../components/auth/TextField";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabaseClient";
import { loginSchema, type LoginFormValues } from "../../lib/validation";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [serverError, setServerError] = useState("");
  const { session, loading: authLoading } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const infoMessage = searchParams.get("signedup")
    ? "Account created. Log in to continue."
    : searchParams.get("reset")
      ? "Your password has been updated. Log in with your new password."
      : null;

  const onSubmit = async (values: LoginFormValues) => {
    setServerError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      setServerError(
        error.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : error.message,
      );
      return;
    }
    navigate("/app/dashboard", { replace: true });
  };

  // Already logged in (e.g. navigated here via the header's "Log in" link
  // after clicking the logo away from the dashboard) - bounce straight
  // back in instead of making them re-submit the form against a session
  // that's still perfectly valid.
  if (!authLoading && session) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <AuthLayout
      title="Log in"
      subtitle="Welcome back. Pick up your practice where you left off."
      footer={
        <span>
          Don't have an account yet? <Link to="/auth/signup">Register for free</Link>
        </span>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {infoMessage && (
          <div className="form-banner form-banner-success" role="status">
            <CheckCircle2 size={16} aria-hidden="true" /> {infoMessage}
          </div>
        )}
        {serverError && (
          <p className="form-banner form-banner-error" role="alert">
            {serverError}
          </p>
        )}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <div>
          <PasswordField
            label="Password"
            autoComplete="current-password"
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register("password")}
          />
          <Link className="text-link-small forgot-link" to="/auth/forgot-password">Forgot password?</Link>
        </div>
        <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="spin" aria-hidden="true" /> Logging in…
            </>
          ) : (
            <>
              Sign in <ArrowRight size={16} aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
