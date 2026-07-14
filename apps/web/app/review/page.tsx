"use client";

import { useState } from "react";
import type { ObservationInput, ReviewResult } from "@em/shared";

const SAMPLE_DIFF = `--- a/src/components/TransactionList.tsx
+++ b/src/components/TransactionList.tsx
@@
-import { useMemo } from "react";
+import { useEffect, useState } from "react";
@@
 export function TransactionList({ transactions, query }) {
-  const filtered = useMemo(
-    () => transactions.filter((t) => t.name.includes(query)),
-    [transactions, query]
-  );
+  const [filtered, setFiltered] = useState([]);
+  useEffect(() => {
+    setFiltered(transactions.filter((t) => t.name.includes(query)));
+  }, [transactions, query]);
`;

type ReviewResultWithTruncation = ReviewResult & { truncated?: boolean };

type Mode = "pr" | "diff";

export default function ReviewPage() {
  const [mode, setMode] = useState<Mode>("pr");
  const [prUrl, setPrUrl] = useState("");
  const [diff, setDiff] = useState(SAMPLE_DIFF);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResultWithTruncation | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runReview() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const [url, body] =
        mode === "pr" ? ["/api/github/review", { prUrl }] : ["/api/review", { diff }];
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "review failed");
      setResult(data as ReviewResultWithTruncation);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="wrap">
      <h1>Reviewer</h1>
      <p className="sub">
        Paste a GitHub PR link (public repos only) or a raw diff. The reviewer retrieves
        observations from the shared memory, cites them as [#n], then proposes new ones to
        remember. <a href="/">← home</a>
      </p>

      <div className="grid">
        <div>
          <div className="row" style={{ marginBottom: 12 }}>
            <button className={mode === "pr" ? "" : "ghost"} onClick={() => setMode("pr")}>
              PR link
            </button>
            <button className={mode === "diff" ? "" : "ghost"} onClick={() => setMode("diff")}>
              Paste diff
            </button>
          </div>

          {mode === "pr" ? (
            <input
              className="input"
              type="text"
              placeholder="https://github.com/owner/repo/pull/123"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
            />
          ) : (
            <textarea value={diff} onChange={(e) => setDiff(e.target.value)} />
          )}

          <div style={{ marginTop: 12 }}>
            <button onClick={runReview} disabled={loading || (mode === "pr" && !prUrl.trim())}>
              {loading ? "Reviewing…" : mode === "pr" ? "Review PR" : "Review diff"}
            </button>
          </div>

          {error && <p style={{ color: "#f87171" }}>Error: {error}</p>}

          {result?.truncated && (
            <p style={{ color: "#fbbf24" }}>
              Large PR — only the first ~12,000 characters were reviewed; some files may not have
              been seen.
            </p>
          )}

          {result && (
            <div className="panel" style={{ marginTop: 20 }}>
              <h2>Review</h2>
              <div className="review">{result.review}</div>
            </div>
          )}
        </div>

        <aside>
          {result && <WhyRetrieved result={result} />}
          {result && <Proposals proposals={result.proposals} />}
        </aside>
      </div>
    </main>
  );
}

function WhyRetrieved({ result }: { result: ReviewResult }) {
  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <h2>Why retrieved</h2>
      {result.retrieved.length === 0 && <p className="sub">No observations matched.</p>}
      {result.retrieved.map((r, i) => (
        <div className="hit" key={r.observation.id}>
          <div className="title">
            [#{i + 1}] {r.observation.title}
          </div>
          <div className="meta">
            <span className="score">score {r.score.toFixed(2)}</span> · {r.observation.type}
            {r.observation.repository ? ` · ${r.observation.repository}` : ""}
          </div>
          <div>
            {(r.observation.technology ?? []).map((t) => (
              <span className="tag" key={t}>
                {t}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Proposals({ proposals }: { proposals: ObservationInput[] }) {
  return (
    <div className="panel">
      <h2>Reflector · save to memory?</h2>
      {proposals.length === 0 && <p className="sub">Nothing new proposed.</p>}
      {proposals.map((p, i) => (
        <ProposalChip key={i} proposal={p} />
      ))}
    </div>
  );
}

function ProposalChip({ proposal }: { proposal: ObservationInput }) {
  const [state, setState] = useState<"pending" | "saving" | "saved" | "dismissed">("pending");

  if (state === "dismissed") return null;
  if (state === "saved") return <div className="chip saved">✓ Saved: {proposal.title}</div>;

  async function save() {
    setState("saving");
    const res = await fetch("/api/observations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(proposal),
    });
    setState(res.ok ? "saved" : "pending");
  }

  return (
    <div className="chip">
      <div className="title">{proposal.title}</div>
      <div className="meta">{proposal.content}</div>
      <div>
        {(proposal.technology ?? []).map((t) => (
          <span className="tag" key={t}>
            {t}
          </span>
        ))}
      </div>
      <div className="row">
        <button onClick={save} disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : "Save"}
        </button>
        <button className="ghost" onClick={() => setState("dismissed")}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
