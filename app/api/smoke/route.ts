import { SmokeRequest } from "../../../lib/schemas";
import { triage } from "../../../lib/triage";
import { loadTickets, sample } from "../../../lib/tickets";
import { appendRun } from "../../../lib/runlog";
import { pickModel } from "../../../lib/llm";
import { DM_MODEL } from "../../../lib/decision";

export const maxDuration = 300;

export async function POST(request: Request) {
  const parsed = SmokeRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid smoke test request.", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
      { status: 400 },
    );
  }
  const { dataset, n, strategy, model } = parsed.data;
  const labelled = dataset === "100";
  const tickets = sample(await loadTickets(dataset), n);

  const results = new Array(tickets.length);
  let next = 0;
  const worker = async () => {
    while (next < tickets.length) {
      const i = next++;
      const t = tickets[i];
      const expected = labelled ? { category: t.category, priority: t.priority } : null;
      try {
        const r = await triage({ subject: t.subject, body: t.body, strategy, model });
        results[i] = { ticket_id: t.ticket_id, subject: t.subject, predicted: r, expected };
      } catch (e) {
        results[i] = { ticket_id: t.ticket_id, subject: t.subject, predicted: null, error: String(e).slice(0, 160), expected };
      }
      // free-tier LLM quota: pause between calls (DM has no such limit)
      if (strategy !== "dm") await new Promise((r) => setTimeout(r, 5000));
    }
  };
  // DM: 3 in parallel. LLM and dm+llm: one at a time.
  await Promise.all(Array.from({ length: strategy === "dm" ? 3 : 1 }, worker));

  const ok = results.filter((r) => r.predicted);
  const lat = ok.map((r) => r.predicted.latency_ms).sort((a, b) => a - b);
  const catMis = labelled ? ok.filter((r) => r.predicted.category !== r.expected.category).length : null;
  const priMis = labelled ? ok.filter((r) => r.predicted.priority !== r.expected.priority).length : null;
  const acc = (mis: number | null) => (mis === null || !ok.length ? null : (ok.length - mis) / ok.length);

  const modelName =
    strategy === "llm" ? pickModel(model) : strategy === "dm" ? DM_MODEL : `${DM_MODEL} + ${pickModel(model)}`;
  const run = {
    id: crypto.randomUUID(), ts: new Date().toISOString(), dataset, n: tickets.length, strategy,
    model: modelName, ok: ok.length, errors: results.length - ok.length,
    llm_calls: ok.reduce((s, r) => s + r.predicted.llm_calls, 0),
    category_acc: acc(catMis), priority_acc: acc(priMis),
    category_mismatch: catMis, priority_mismatch: priMis,
    avg_latency_ms: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : 0,
    p50_latency_ms: lat.length ? lat[Math.floor(lat.length / 2)] : 0,
    total_tokens: ok.reduce((s, r) => s + r.predicted.usage.total_tokens, 0),
    cost_usd: ok.reduce((s, r) => s + r.predicted.cost_usd, 0),
  };
  await appendRun(run);
  return Response.json({ run, results });
}