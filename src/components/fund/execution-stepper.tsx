const steps = ["Proposed", "Approved", "Submitted", "Filled", "Reconciled"];

export function ExecutionStepper({
  currentStep,
}: {
  currentStep: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((step, i) => (
        <div
          key={step}
          className={`text-xs px-3 py-1.5 rounded-full border ${
            i <= currentStep
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface text-muted"
          }`}
        >
          {step}
        </div>
      ))}
    </div>
  );
}
