import { promises as fs } from "fs";
import path from "path";

export type Ticket = {
  ticket_id: string; subject: string; body: string;
  category?: string; priority?: string; needs_human_review?: boolean;
};

export async function loadTickets(dataset: "100" | "500"): Promise<Ticket[]> {
  const f = dataset === "100" ? "support_tickets_100_labelled.json" : "support_tickets_500.json";
  return JSON.parse(await fs.readFile(path.join(process.cwd(), "data", f), "utf8"));
}

export function sample<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}