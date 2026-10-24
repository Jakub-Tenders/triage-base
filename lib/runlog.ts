import { promises as fs } from "fs";
import path from "path";

const FILE = path.join(process.cwd(), ".data", "runs.json");

export type Run = {
  id: string; ts: string; dataset: string; n: number; strategy: string; model: string;
  ok: number; errors: number; llm_calls: number;
  category_acc: number | null; priority_acc: number | null;
  category_mismatch: number | null; priority_mismatch: number | null;
  avg_latency_ms: number; p50_latency_ms: number; total_tokens: number; cost_usd: number;
};

export async function readRuns(): Promise<Run[]> {
  try { return JSON.parse(await fs.readFile(FILE, "utf8")); } catch { return []; }
}
export async function appendRun(run: Run) {
  const runs = await readRuns();
  runs.push(run);
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(runs, null, 2));
}