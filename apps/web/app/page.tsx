export default function Home() {
  return (
    <main className="wrap">
      <h1>Engram AI</h1>
      <p className="sub">
        A RAG-plus-culture system: engineers (or agents) contribute distilled observations,
        and every future review retrieves and cites them. Corrections propagate — the system learns.
      </p>

      <div className="panel" style={{ maxWidth: 640 }}>
        <h2>Milestone 1 · The culture loop</h2>
        <p>
          Paste a git diff → the reviewer retrieves relevant observations from the shared
          memory and cites them → after the review, it proposes new observations to remember.
          You approve, and the next similar diff surfaces them.
        </p>
        <p>
          <a href="/review">→ Open the Reviewer</a>
        </p>
      </div>
    </main>
  );
}
