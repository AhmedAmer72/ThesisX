const steps = ["Describe", "Generate", "Review", "Approve", "Monitor"] as const;

export function CreateStepper({ phase }: { phase: string }) {
  const index =
    phase === "form"
      ? 0
      : phase === "generating"
        ? 1
        : phase === "review"
          ? 2
          : phase === "error"
            ? 1
            : 0;

  return (
    <ol className="flex flex-wrap gap-2 text-xs">
      {steps.map((step, i) => (
        <li
          key={step}
          className={`rounded-full px-3 py-1 border ${
            i <= index
              ? "border-amber-500/50 text-amber-300 bg-amber-500/10"
              : "border-border text-muted"
          }`}
        >
          {i + 1}. {step}
        </li>
      ))}
    </ol>
  );
}
