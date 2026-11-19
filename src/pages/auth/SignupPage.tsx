import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { PasswordField } from "../../components/auth/PasswordField";
import { TextField } from "../../components/auth/TextField";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabaseClient";
import { signupSchema, type SignupFormValues } from "../../lib/validation";

export function SignupPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const { session, loading: authLoading } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", agreeToTerms: false },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setServerError("");
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.name },
      },
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    // signUp() logs the user in immediately since email confirmation is off.
    // Drop that session and send them to log in instead, so signup always
    // ends on the login screen rather than skipping straight to the dashboard.
    if (data.session) {
      await supabase.auth.signOut();
    }
    navigate("/auth/login?signedup=1", { replace: true });
  };

  // Already logged in - don't offer to create a second account over an
  // active session; send them back into the app instead.
  if (!authLoading && session) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle="Set up your profile and start practicing for free."
      footer={
        <span>
          Already have an account? <Link to="/auth/login">Log in</Link>
        </span>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && (
          <p className="form-banner form-banner-error" role="alert">
            {serverError}
          </p>
        )}
        <TextField
          label="Full name"
          autoComplete="name"
          placeholder="Jordan Lee"
          error={errors.name?.message}
          {...register("name")}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <PasswordField
          label="Password"
          hint="Use 8+ characters with upper and lower case, a number and a symbol."
          autoComplete="new-password"
          placeholder="Create a password"
          error={errors.password?.message}
          {...register("password")}
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <label className="checkbox-field checkbox-field-terms">
          <input type="checkbox" {...register("agreeToTerms")} />
          <span>I agree to the Terms of Use and Privacy Policy.</span>
        </label>
        {errors.agreeToTerms?.message && (
          <p className="form-error" role="alert">{errors.agreeToTerms.message}</p>
        )}
        <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="spin" aria-hidden="true" /> Creating account…
            </>
          ) : (
            <>
              Create account <ArrowRight size={16} aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
