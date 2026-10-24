"use client";
import { useEffect, useState } from "react";
import type { Run } from "../../lib/runlog";

const pct = (v: number | null) => (v === null ? "-" : (v * 100).toFixed(1) + "%");

export default function Admin() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  useEffect(() => { fetch("/api/runs").then((r) => r.json()).then(setRuns); }, []);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-2)));
  const cmp = runs.filter((r) => sel.includes(r.id));
  const rows: [string, (r: Run) => string][] = [
    ["strategy", (r) => r.strategy], ["model", (r) => r.model], ["dataset / n", (r) => `${r.dataset} / ${r.n}`],
    ["ok / errors", (r) => `${r.ok} / ${r.errors}`], ["LLM calls", (r) => String(r.llm_calls)],
    ["category acc", (r) => pct(r.category_acc)], ["priority acc", (r) => pct(r.priority_acc)],
    ["mismatch cat / prio", (r) => `${r.category_mismatch ?? "-"} / ${r.priority_mismatch ?? "-"}`],
    ["avg latency (ms)", (r) => String(r.avg_latency_ms)], ["p50 latency (ms)", (r) => String(r.p50_latency_ms)],
    ["tokens", (r) => String(r.total_tokens)], ["cost ($)", (r) => r.cost_usd.toFixed(5)],
  ];
  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 1100, margin: "0 auto" }}>
      <a href="/">← back</a>
      <h1>Admin: smoke test runs</h1>
      <p>Tick two runs to compare side by side.</p>
      <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
        <thead><tr><th></th><th>time</th><th>strategy</th><th>model</th><th>data</th><th>n</th><th>ok/err</th><th>cat acc</th><th>prio acc</th><th>avg ms</th><th>LLM calls</th><th>tokens</th><th>cost $</th></tr></thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id}>
              <td><input type="checkbox" checked={sel.includes(r.id)} onChange={() => toggle(r.id)} /></td>
              <td>{new Date(r.ts).toLocaleString()}</td><td>{r.strategy}</td><td>{r.model}</td><td>{r.dataset}</td><td>{r.n}</td>
              <td>{r.ok}/{r.errors}</td><td>{pct(r.category_acc)}</td><td>{pct(r.priority_acc)}</td>
              <td>{r.avg_latency_ms}</td><td>{r.llm_calls}</td><td>{r.total_tokens}</td><td>{r.cost_usd.toFixed(5)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {cmp.length === 2 && (
        <>
          <h2>Comparison</h2>
          <table border={1} cellPadding={6} style={{ borderCollapse: "collapse" }}>
            <thead><tr><th></th><th>Run A</th><th>Run B</th></tr></thead>
            <tbody>{rows.map(([k, f]) => <tr key={k}><td><b>{k}</b></td><td>{f(cmp[0])}</td><td>{f(cmp[1])}</td></tr>)}</tbody>
          </table>
        </>
      )}
    </main>
  );
}