import { Check } from "lucide-react";

type Step = {
  label: string;
};

type StepperProps = {
  steps: Step[];
  currentStep: number;
};

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <ol className="stepper" aria-label="Onboarding progress">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const status = stepNumber < currentStep ? "complete" : stepNumber === currentStep ? "current" : "upcoming";
        return (
          <li className={`stepper-item stepper-${status}`} key={step.label}>
            <span className="stepper-circle" aria-hidden="true">
              {status === "complete" ? <Check size={14} strokeWidth={2.6} /> : stepNumber}
            </span>
            <span className="stepper-label">{step.label}</span>
            {stepNumber < steps.length && <span className="stepper-connector" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
