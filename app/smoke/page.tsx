"use client";
import { useEffect, useState } from "react";

const STRATS = ["llm", "dm", "dm+llm"];

export default function SmokePage() {
  const [strategy, setStrategy] = useState("llm");
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState("");
  const [dataset, setDataset] = useState("100");
  const [n, setN] = useState(10);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/triage").then((r) => r.json()).then((d) => {
      setModels(d.models);
      setModel(d.models[0] ?? "");
    });
  }, []);

  async function run() {
    setBusy(true); setData(null); setError(null);
    const r = await fetch("/api/smoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset, n, strategy, model }),
    });
    const d = await r.json();
    if (r.ok) setData(d); else setError([d.error, ...(d.issues ?? [])].join(" | "));
    setBusy(false);
  }

  const run_ = data?.run;
  return (
    <main className="chat">
      <a href="/">← chat</a>
      <h1>Smoke test</h1>
      <label>Strategy{" "}
        <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
          {STRATS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>{" "}
      <label>LLM model{" "}
        <select value={model} onChange={(e) => setModel(e.target.value)}>
          {models.map((m) => <option key={m}>{m}</option>)}
        </select>
      </label>{" "}
      <label>Dataset{" "}
        <select value={dataset} onChange={(e) => setDataset(e.target.value)}>
          <option value="100">100 labelled</option>
          <option value="500">500</option>
        </select>
      </label>{" "}
      <label>Sample{" "}
        <input type="number" min={1} max={500} value={n} onChange={(e) => setN(Number(e.target.value))} />
      </label>
      <button onClick={run} disabled={busy}>{busy ? "Running..." : "Run smoke test"}</button>
      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}
      {run_ && (
        <section>
          <p>
            {run_.strategy} · {run_.model} · ok {run_.ok} / errors {run_.errors} · avg {run_.avg_latency_ms} ms · ${run_.cost_usd.toFixed(5)} · LLM calls {run_.llm_calls}
          </p>
          {run_.category_mismatch !== null && (
            <p><strong>Mismatches:</strong> category {run_.category_mismatch}, priority {run_.priority_mismatch} (of {run_.ok})</p>
          )}
          <table style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th align="left">Ticket</th><th>Pred cat</th><th>Pred prio</th>
                {data.results[0]?.expected && <><th>True cat</th><th>True prio</th></>}
              </tr>
            </thead>
            <tbody>
              {data.results.map((r: any) => (
                <tr key={r.ticket_id}>
                  <td>{r.ticket_id} {r.subject.slice(0, 40)}</td>
                  {r.predicted ? (
                    <>
                      <td style={{ color: r.expected && r.predicted.category !== r.expected.category ? "red" : undefined }}>{r.predicted.category}</td>
                      <td style={{ color: r.expected && r.predicted.priority !== r.expected.priority ? "red" : undefined }}>{r.predicted.priority}</td>
                    </>
                  ) : (
                    <td colSpan={2} style={{ color: "red" }}>{r.error}</td>
                  )}
                  {r.expected && <><td>{r.expected.category}</td><td>{r.expected.priority}</td></>}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}