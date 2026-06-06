export default function PrivacyPage() {
  return (
    <div className="site-offset container max-w-2xl py-10 md:py-14">
      <h1 className="text-3xl font-semibold">Privacy Policy</h1>
      <p className="text-muted mt-4 text-sm leading-relaxed">
        ThesisX stores fund prompts, generated theses, portfolio snapshots, and
        execution metadata locally in your configured database (SQLite by
        default). Third-party services (SoSoValue, OpenAI, SoDEX) receive only
        the data required for features you enable via environment variables.
      </p>
      <p className="text-muted mt-4 text-sm leading-relaxed">
        Audit logs may record request IDs, fund IDs, and operational metadata
        for debugging. Do not submit personal data you are not authorized to
        process.
      </p>
    </div>
  );
}
