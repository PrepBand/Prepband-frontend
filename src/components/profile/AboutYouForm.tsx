import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Camera, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { dialCodes } from "../../data/countries";
import { aboutYouSchema, type AboutYouFormValues } from "../../lib/validation";

type AboutYouFormProps = {
  defaultValues: Partial<AboutYouFormValues>;
  onSave: (values: AboutYouFormValues) => Promise<{ error: string | null }>;
  onSaved: () => void;
  submitLabel: string;
  savingLabel: string;
  onBack?: () => void;
};

export function AboutYouForm({ defaultValues, onSave, onSaved, submitLabel, savingLabel, onBack }: AboutYouFormProps) {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AboutYouFormValues>({
    resolver: zodResolver(aboutYouSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      gender: undefined,
      age: "",
      phoneCountryCode: "",
      phoneNumber: "",
      city: "",
      country: "",
      ...defaultValues,
    },
  });

  const onSubmit = async (values: AboutYouFormValues) => {
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

      <div className="avatar-upload-row">
        <span className="avatar-upload-placeholder" aria-hidden="true">
          <Camera size={20} strokeWidth={1.8} />
        </span>
        <div>
          <p className="avatar-upload-title">Profile photo</p>
          <p className="avatar-upload-hint">
            Photo uploads are coming soon <span className="skill-badge">Coming soon</span>
          </p>
        </div>
      </div>

      <div className="setup-row">
        <div className="form-field">
          <label className="form-label" htmlFor="about-first-name">
            First name
          </label>
          <input id="about-first-name" className="form-input" {...register("firstName")} />
          {errors.firstName && (
            <p className="form-error" role="alert">
              {errors.firstName.message}
            </p>
          )}
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="about-last-name">
            Last name
          </label>
          <input id="about-last-name" className="form-input" {...register("lastName")} />
          {errors.lastName && (
            <p className="form-error" role="alert">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      <div className="setup-row">
        <div className="form-field">
          <label className="form-label" htmlFor="about-gender">
            Gender
          </label>
          <select id="about-gender" className="form-input" {...register("gender")}>
            <option value="" disabled>
              Choose an option
            </option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
          {errors.gender && (
            <p className="form-error" role="alert">
              {errors.gender.message}
            </p>
          )}
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="about-age">
            Age <span className="form-label-optional">(optional)</span>
          </label>
          <input id="about-age" type="number" min={10} max={100} className="form-input" {...register("age")} />
          {errors.age && (
            <p className="form-error" role="alert">
              {errors.age.message}
            </p>
          )}
        </div>
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="about-phone-number">
          Phone number <span className="form-label-optional">(optional)</span>
        </label>
        <div className="phone-field-row">
          <select className="form-input phone-code-select" aria-label="Country code" {...register("phoneCountryCode")}>
            <option value="">Code</option>
            {dialCodes.map((entry) => (
              <option key={entry.name} value={entry.dialCode}>
                {entry.dialCode} {entry.name}
              </option>
            ))}
          </select>
          <input
            id="about-phone-number"
            type="tel"
            className="form-input"
            placeholder="300 1234567"
            {...register("phoneNumber")}
          />
        </div>
        {errors.phoneCountryCode && (
          <p className="form-error" role="alert">
            {errors.phoneCountryCode.message}
          </p>
        )}
      </div>

      <div className="setup-row">
        <div className="form-field">
          <label className="form-label" htmlFor="about-city">
            City
          </label>
          <input id="about-city" className="form-input" {...register("city")} />
          {errors.city && (
            <p className="form-error" role="alert">
              {errors.city.message}
            </p>
          )}
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="about-country">
            Country
          </label>
          <input id="about-country" className="form-input" {...register("country")} />
          {errors.country && (
            <p className="form-error" role="alert">
              {errors.country.message}
            </p>
          )}
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
