import { z } from "zod";
import { Category, Priority } from "./schemas";

export const DM_MODEL = process.env.DECISION_MODEL ?? "vllm-sr/d3";
export const DM_THRESHOLD = Number(process.env.DM_THRESHOLD ?? 0.7);

const choice = <T extends z.ZodTypeAny>(e: T) =>
  z.object({ choice: e, probabilities: z.record(z.string(), z.number()) });

const DmResponse = z.object({
  answers: z.object({
    category: choice(Category),
    priority: choice(Priority),
    needs_human_review: z.object({ noul: z.number().min(0).max(1) }),
  }),
  usage: z.object({ input_tokens: z.number() }),
});

export async function decideTicket(subject: string, body: string) {
  const t0 = Date.now();
  const res = await fetch(`${process.env.DECISION_BASE_URL}/v1/systemone`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DECISION_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DM_MODEL,
      state: `Subject: ${subject}\n\n${body}`,
      questions: {
        category: {
          type: "choice",
          instructions: "Which category fits this support ticket?",
          criteria: {
            technical_bug: "something is broken: errors, crashes, UI glitches, slow or wrong behaviour",
            billing: "invoices, payments, refunds, pricing, charges, subscriptions",
            account: "login, password, access, permissions, profile, user management",
            feature_request: "asks for new functionality or an improvement",
          },
        },
        priority: {
          type: "choice",
          instructions: "How urgent is this ticket?",
          criteria: {
            low: "cosmetic or minor, no real impact",
            medium: "annoying, a workaround exists",
            high: "blocking, outage, money or security at risk",
          },
        },
        needs_human_review: {
          type: "noul",
          instructions: "Does this ticket need a human to look at it (sensitive, ambiguous, angry customer, legal)?",
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Decision API ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const d = DmResponse.parse(await res.json());
  const a = d.answers;
  const p = (o: { choice: string; probabilities: Record<string, number> }) =>
    o.probabilities[o.choice] ?? 0;

  return {
    category: a.category.choice,
    priority: a.priority.choice,
    needs_human_review: a.needs_human_review.noul > 0.5,
    confidence: { category: p(a.category), priority: p(a.priority) },
    input_tokens: d.usage.input_tokens,
    latency_ms: Date.now() - t0,
  };
}