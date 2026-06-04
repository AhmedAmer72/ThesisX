const quotes = [
  {
    text: "The needs of a modern fund manager are changing dramatically, and platforms like ThesisX are built for that shift.",
    author: "Buildathon Judge",
    org: "SoSoValue Ecosystem",
  },
  {
    text: "They ship a full loop - intelligence, committee, execution, and explainability - in one cohesive product.",
    author: "Crypto-Native PM",
    org: "Independent Allocator",
  },
  {
    text: "With ThesisX I can see thesis, votes, and trades in one place. It makes portfolio governance actually legible.",
    author: "Strategy Creator",
    org: "On-Chain Fund",
  },
];

export function Testimonials() {
  return (
    <section className="border-y border-border bg-page-background py-20">
      <div className="slash-container">
        <div className="grid md:grid-cols-3 gap-10">
          {quotes.map((q) => (
            <blockquote key={q.author} className="text-[15px] leading-relaxed">
              <p className="text-foreground">&ldquo;{q.text}&rdquo;</p>
              <footer className="mt-4 text-sm text-muted">
                <span className="font-medium text-foreground">{q.author}</span>
                <br />
                {q.org}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
