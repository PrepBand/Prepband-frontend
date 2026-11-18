import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { studyGoalSchema, type StudyGoalFormValues } from "../../lib/validation";

type StudyGoalFormProps = {
  defaultValues: Partial<StudyGoalFormValues>;
  onSave: (values: StudyGoalFormValues) => Promise<{ error: string | null }>;
  onSaved: () => void;
  submitLabel: string;
  savingLabel: string;
  onBack?: () => void;
};

export function StudyGoalForm({ defaultValues, onSave, onSaved, submitLabel, savingLabel, onBack }: StudyGoalFormProps) {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudyGoalFormValues>({
    resolver: zodResolver(studyGoalSchema),
    defaultValues: {
      examDate: "",
      ieltsType: undefined,
      preparationLevel: undefined,
      ...defaultValues,
    },
  });

  const onSubmit = async (values: StudyGoalFormValues) => {
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

      <div className="form-field">
        <label className="form-label" htmlFor="goal-ielts-type">
          IELTS type
        </label>
        <select id="goal-ielts-type" className="form-input" {...register("ieltsType")}>
          <option value="" disabled>
            Choose a test type
          </option>
          <option value="academic">Academic</option>
          <option value="general">General Training</option>
        </select>
        {errors.ieltsType && (
          <p className="form-error" role="alert">
            {errors.ieltsType.message}
          </p>
        )}
      </div>

      <div className="setup-row">
        <div className="form-field">
          <label className="form-label" htmlFor="goal-level">
            Preparation level
          </label>
          <select id="goal-level" className="form-input" {...register("preparationLevel")}>
            <option value="" disabled>
              Choose your level
            </option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          {errors.preparationLevel && (
            <p className="form-error" role="alert">
              {errors.preparationLevel.message}
            </p>
          )}
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="goal-exam-date">
            Expected exam date <span className="form-label-optional">(optional)</span>
          </label>
          <input id="goal-exam-date" type="date" className="form-input" {...register("examDate")} />
        </div>
      </div>

      <div className="setup-actions">
        <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="spin" aria-hidden="true" /> {savingLabel}
            </>
          ) : (
            <>
              {submitLabel} <ArrowRight size={16} aria-hidden="true" />
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
