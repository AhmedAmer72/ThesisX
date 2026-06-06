export default function DisclosuresPage() {
  return (
    <div className="site-offset container max-w-2xl py-10 md:py-14">
      <h1 className="text-3xl font-semibold">Risk Disclosures</h1>
      <ul className="mt-6 space-y-4 text-sm text-muted leading-relaxed list-disc pl-5">
        <li>
          Digital assets are volatile. AI-generated portfolios may concentrate
          risk or omit material factors.
        </li>
        <li>
          Demo mode uses synthetic or cached intelligence; live mode depends on
          third-party API availability and accuracy.
        </li>
        <li>
          Mock execution does not represent real fills. Testnet execution may
          differ from mainnet behavior.
        </li>
        <li>
          Kill switches reduce but do not eliminate operational risk. Always
          verify allocations before approval.
        </li>
        <li>
          ThesisX is not registered as an investment adviser or broker-dealer.
        </li>
      </ul>
    </div>
  );
}
