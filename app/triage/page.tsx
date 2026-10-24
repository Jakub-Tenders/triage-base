"use client";
import { useEffect, useState } from "react";

const STRATS = ["llm", "dm", "dm+llm"];

export default function TriagePage() {
  const [strategy, setStrategy] = useState("llm");
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errors, setErrors] = useState<string[] | null>(null);

  useEffect(() => {
    fetch("/api/triage").then((r) => r.json()).then((d) => {
      setModels(d.models);
      setModel(d.models[0] ?? "");
    });
  }, []);

  async function run() {
    setBusy(true); setResult(null); setErrors(null);
    const r = await fetch("/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body, strategy, model }),
    });
    const d = await r.json();
    if (r.ok) setResult(d); else setErrors([d.error, ...(d.issues ?? [])]);
    setBusy(false);
  }

  return (
    <main className="chat">
      <a href="/">← chat</a>
      <h1>Ticket triage</h1>
      <label>Strategy{" "}
        <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
          {STRATS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>{" "}
      <label>LLM model{" "}
        <select value={model} onChange={(e) => setModel(e.target.value)}>
          {models.map((m) => <option key={m}>{m}</option>)}
        </select>
      </label>
      <input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <textarea rows={6} placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} />
      <button onClick={run} disabled={busy}>{busy ? "Triaging..." : "Triage"}</button>
      {errors && <div role="alert" style={{ color: "red" }}>{errors.map((e, i) => <p key={i}>{e}</p>)}</div>}
      {result && (
        <section>
          <p><strong>{result.category}</strong> / <strong>{result.priority}</strong> / human review: {String(result.needs_human_review)}</p>
          {result.summary && <p>{result.summary}</p>}
          <p>
            Tokens: in {result.usage.input_tokens}, out {result.usage.output_tokens}, total {result.usage.total_tokens}
            {" · "}{result.latency_ms} ms · ${result.cost_usd.toFixed(5)} · {result.model_used} · LLM calls: {result.llm_calls}
            {result.confidence && ` · confidence cat ${result.confidence.category.toFixed(2)}, prio ${result.confidence.priority.toFixed(2)}`}
          </p>
        </section>
      )}
    </main>
  );
}