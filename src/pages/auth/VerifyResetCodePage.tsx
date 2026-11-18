import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Loader2, MailCheck } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { OtpCodeField } from "../../components/auth/OtpCodeField";
import { useResendCooldown } from "../../hooks/useResendCooldown";
import { supabase } from "../../lib/supabaseClient";
import { otpSchema, type OtpFormValues } from "../../lib/validation";

export function VerifyResetCodePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email ?? "";
  const [serverError, setServerError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [isResending, setIsResending] = useState(false);
  const { secondsLeft, canResend, start } = useResendCooldown(60);

  const {
    control,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  if (!email) {
    return (
      <AuthLayout
        title="Enter reset code"
        subtitle="We couldn't find an email address to verify."
        footer={
          <Link className="text-link-small" to="/auth/forgot-password">
            <ArrowLeft size={14} aria-hidden="true" /> Back to forgot password
          </Link>
        }
      >
        <div className="auth-success" role="alert">
          <p>Request a new reset code to continue.</p>
          <Link className="button button-primary auth-submit" to="/auth/forgot-password">
            Request a new code
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const onSubmit = async (values: OtpFormValues) => {
    setServerError("");
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: values.code,
      type: "recovery",
    });
    if (error) {
      setServerError(
        error.message.toLowerCase().includes("expired") || error.message.toLowerCase().includes("invalid")
          ? "That code is incorrect or has expired. Request a new one below."
          : error.message,
      );
      resetField("code");
      return;
    }
    navigate("/auth/reset-password", { replace: true });
  };

  const handleResend = async () => {
    if (isResending) return;
    setServerError("");
    setResendMessage("");
    setIsResending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setIsResending(false);
    if (error) {
      setServerError(error.message);
      return;
    }
    setResendMessage("We sent a new code to your email.");
    start();
  };

  return (
    <AuthLayout
      title="Enter reset code"
      subtitle={`Enter the 6-digit code we sent to ${email}.`}
      footer={
        <Link className="text-link-small" to="/auth/forgot-password">
          <ArrowLeft size={14} aria-hidden="true" /> Use a different email
        </Link>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && (
          <p className="form-banner form-banner-error" role="alert">
            {serverError}
          </p>
        )}
        {resendMessage && (
          <p className="form-banner form-banner-success" role="status">
            <MailCheck size={16} aria-hidden="true" /> {resendMessage}
          </p>
        )}
        <Controller
          control={control}
          name="code"
          render={({ field }) => (
            <OtpCodeField
              value={field.value}
              onChange={field.onChange}
              error={errors.code?.message}
              autoFocus
              disabled={isSubmitting}
            />
          )}
        />
        <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="spin" aria-hidden="true" /> Verifying…
            </>
          ) : (
            <>
              Verify code <ArrowRight size={16} aria-hidden="true" />
            </>
          )}
        </button>
        <button className="otp-resend" type="button" onClick={handleResend} disabled={!canResend || isResending}>
          {isResending ? "Sending…" : canResend ? "Resend code" : `Resend code in ${secondsLeft}s`}
        </button>
      </form>
    </AuthLayout>
  );
}
