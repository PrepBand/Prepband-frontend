import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ label, error, hint, id, ...inputProps }, ref) => {
    const [visible, setVisible] = useState(false);
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const errorId = `${fieldId}-error`;
    const hintId = `${fieldId}-hint`;

    return (
      <div className="form-field">
        <label className="form-label" htmlFor={fieldId}>{label}</label>
        {hint && (
          <p className="form-hint" id={hintId}>
            {hint}
          </p>
        )}
        <div className="password-input-wrap">
          <input
            ref={ref}
            id={fieldId}
            type={visible ? "text" : "password"}
            className={error ? "form-input has-error" : "form-input"}
            aria-invalid={error ? true : undefined}
            aria-describedby={[hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined}
            {...inputProps}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {error && (
          <p className="form-error" id={errorId} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

PasswordField.displayName = "PasswordField";
