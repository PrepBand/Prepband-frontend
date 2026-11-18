import { forwardRef, useId, type InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, id, ...inputProps }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const errorId = `${fieldId}-error`;

    return (
      <div className="form-field">
        <label className="form-label" htmlFor={fieldId}>{label}</label>
        <input
          ref={ref}
          id={fieldId}
          className={error ? "form-input has-error" : "form-input"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
        {error && (
          <p className="form-error" id={errorId} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

TextField.displayName = "TextField";
