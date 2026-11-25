import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { TextField } from "../../components/auth/TextField";
import { supabase } from "../../lib/supabaseClient";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "../../lib/validation";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setServerError("");

    // Don't reveal whether an account exists: always go on to the code
    // step. Supabase sends nothing (and reports no error) for an unknown
    // email, so the page looks the same either way.
    const { error } = await supabase.auth.resetPasswordForEmail(values.email);
    if (error) {
      setServerError(error.message);
      return;
    }
    navigate("/auth/verify-reset-code", { replace: true, state: { email: values.email } });
  };

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter the email on your account and we'll send you a 6-digit code."
      footer={
        <Link className="text-link-small" to="/auth/login">
          <ArrowLeft size={14} aria-hidden="true" /> Back to log in
        </Link>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
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
        <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="spin" aria-hidden="true" /> Sending code…
            </>
          ) : (
            <>
              Send code <ArrowRight size={16} aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
