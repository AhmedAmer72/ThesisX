export default function TermsPage() {
  return (
    <div className="site-offset container max-w-2xl py-10 md:py-14 prose prose-invert">
      <h1 className="text-3xl font-semibold">Terms of Service</h1>
      <p className="text-muted mt-4 text-sm leading-relaxed">
        ThesisX is provided as a technology demonstration for the SoSoValue
        Buildathon. By using this application you agree that ThesisX does not
        provide investment advice, brokerage, or custody services. All fund
        outputs are AI-generated and may be inaccurate. Execution defaults to
        mock or testnet modes unless explicitly configured otherwise.
      </p>
      <p className="text-muted mt-4 text-sm leading-relaxed">
        You are solely responsible for any keys, wallets, or API credentials you
        configure. We may modify or discontinue features without notice during
        the MVP period.
      </p>
    </div>
  );
}
