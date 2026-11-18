import { useRef, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";

type OtpCodeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
  disabled?: boolean;
};

const LENGTH = 6;

export function OtpCodeField({ value, onChange, error, autoFocus, disabled }: OtpCodeFieldProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  const setDigitAt = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(""));
  };

  const handleChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    setDigitAt(index, digit);
    if (digit && index < LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Backspace" || digits[index] || index === 0) return;
    // Current box is already empty — clear the previous one too and move
    // back into it, so holding backspace deletes through the whole code
    // instead of needing two presses per box.
    event.preventDefault();
    setDigitAt(index - 1, "");
    inputRefs.current[index - 1]?.focus();
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    const focusIndex = Math.min(pasted.length, LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="form-field">
      <label className="form-label" htmlFor="otp-digit-0">
        6-digit code
      </label>
      <div
        className={error ? "otp-row has-error" : "otp-row"}
        role="group"
        aria-label="6-digit verification code"
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            id={index === 0 ? "otp-digit-0" : undefined}
            className="otp-box"
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digit}
            onChange={(event) => handleChange(index, event)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            autoFocus={autoFocus && index === 0}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "otp-error" : undefined}
          />
        ))}
      </div>
      {error && (
        <p className="form-error" id="otp-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
