import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { bandOptions } from "../../data/bands";
import { targetScoresSchema, type TargetScoresFormValues } from "../../lib/validation";

type TargetScoresFormProps = {
  defaultValues: Partial<TargetScoresFormValues>;
  onSave: (values: TargetScoresFormValues) => Promise<{ error: string | null }>;
  onSaved: () => void;
  submitLabel: string;
  savingLabel: string;
  onBack?: () => void;
};

const skillFields: { name: "listening" | "reading" | "writing" | "speaking"; label: string }[] = [
  { name: "listening", label: "Listening" },
  { name: "reading", label: "Reading" },
  { name: "writing", label: "Writing" },
  { name: "speaking", label: "Speaking" },
];

export function TargetScoresForm({
  defaultValues,
  onSave,
  onSaved,
  submitLabel,
  savingLabel,
  onBack,
}: TargetScoresFormProps) {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TargetScoresFormValues>({
    resolver: zodResolver(targetScoresSchema),
    defaultValues: {
      listening: "",
      reading: "",
      writing: "",
      speaking: "",
      overall: "",
      ...defaultValues,
    },
  });

  const onSubmit = async (values: TargetScoresFormValues) => {
    setServerError("");
    const { error } = await onSave(values);
    if (error) {
      setServerError(error);
      return;
    }
    onSaved();
  };

  return (
    <form className="auth-form onboarding-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {serverError && (
        <p className="form-banner form-banner-error" role="alert">
          {serverError}
        </p>
      )}

      <div className="setup-row target-scores-grid">
        {skillFields.map(({ name, label }) => (
          <div className="form-field" key={name}>
            <label className="form-label" htmlFor={`target-${name}`}>
              {label} <span className="form-label-optional">(optional)</span>
            </label>
            <select id={`target-${name}`} className="form-input" {...register(name)}>
              <option value="">Not sure yet</option>
              {bandOptions.map((band) => (
                <option key={band} value={band}>
                  {band}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="target-overall">
          Overall target band
        </label>
        <select id="target-overall" className="form-input" {...register("overall")}>
          <option value="" disabled>
            Choose your overall target
          </option>
          {bandOptions.map((band) => (
            <option key={band} value={band}>
              {band}
            </option>
          ))}
        </select>
        {errors.overall && (
          <p className="form-error" role="alert">
            {errors.overall.message}
          </p>
        )}
      </div>

      <div className="setup-actions">
        <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="spin" aria-hidden="true" /> {savingLabel}
            </>
          ) : (
            <>
              {submitLabel} <CheckCircle2 size={16} aria-hidden="true" />
            </>
          )}
        </button>
        {onBack && (
          <button className="button button-secondary" type="button" onClick={onBack} disabled={isSubmitting}>
            Back
          </button>
        )}
      </div>
    </form>
  );
}
