import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { AuthLayout } from "../../components/auth/AuthLayout";
import { PasswordField } from "../../components/auth/PasswordField";
import { supabase } from "../../lib/supabaseClient";
import { resetPasswordSchema, type ResetPasswordFormValues } from "../../lib/validation";

type Status = "checking" | "ready" | "invalid" | "done";

export function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    let handled = false;

    const check = (hasSession: boolean) => {
      if (handled) return;
      handled = true;
      setStatus(hasSession ? "ready" : "invalid");
    };

    supabase.auth.getSession().then(({ data }) => check(Boolean(data.session)));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) check(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setServerError("");
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      setServerError(error.message);
      return;
    }
    await supabase.auth.signOut();
    setStatus("done");
  };

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a new password for your Prepband account."
      footer={
        <Link className="text-link-small" to="/auth/login">
          <ArrowLeft size={14} aria-hidden="true" /> Back to log in
        </Link>
      }
    >
      {status === "checking" && (
        <div className="auth-status-row">
          <Loader2 size={18} className="spin" aria-hidden="true" /> Verifying your reset link…
        </div>
      )}

      {status === "invalid" && (
        <div className="auth-success" role="alert">
          <TriangleAlert size={22} />
          <strong>This link is invalid or has expired.</strong>
          <p>Request a new password reset link and try again.</p>
          <Link className="button button-primary auth-submit" to="/auth/forgot-password">
            Request a new link
          </Link>
        </div>
      )}

      {status === "ready" && (
        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {serverError && (
            <p className="form-banner form-banner-error" role="alert">
              {serverError}
            </p>
          )}
          <PasswordField
            label="New password"
            hint="Use 8+ characters with upper and lower case, a number and a symbol."
            autoComplete="new-password"
            placeholder="Create a new password"
            error={errors.password?.message}
            {...register("password")}
          />
          <PasswordField
            label="Confirm new password"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="spin" aria-hidden="true" /> Updating…
              </>
            ) : (
              <>
                Update password <ArrowRight size={16} aria-hidden="true" />
              </>
            )}
          </button>
        </form>
      )}

      {status === "done" && (
        <div className="auth-success" role="status">
          <CheckCircle2 size={22} />
          <strong>Password updated.</strong>
          <p>You can now log in with your new password.</p>
          <Link className="button button-primary auth-submit" to="/auth/login">
            Go to log in
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
