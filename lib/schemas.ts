import { z } from "zod";

export const CATEGORIES = ["technical_bug", "billing", "account", "feature_request"] as const;
export const PRIORITIES = ["low", "medium", "high"] as const;
export const STRATEGIES = ["llm", "dm", "dm+llm"] as const;

export const Category = z.enum(CATEGORIES);
export const Priority = z.enum(PRIORITIES);
export const Strategy = z.enum(STRATEGIES);

export const TriageRequest = z.object({
  subject: z.string().trim().min(1, "subject is required").max(300),
  body: z.string().trim().min(1, "body is required").max(8000),
  strategy: Strategy.default("llm"),
  model: z.string().optional(),
});
export type TriageRequest = z.infer<typeof TriageRequest>;

export const Usage = z.object({
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
});

export const TriageResponse = z.object({
  category: Category,
  priority: Priority,
  needs_human_review: z.boolean(),
  summary: z.string(),
  usage: Usage,
  model_used: z.string(),
  strategy: Strategy,
  llm_calls: z.number().int(),
  latency_ms: z.number(),
  cost_usd: z.number(),
  confidence: z.object({ category: z.number(), priority: z.number() }).optional(),
});
export type TriageResponse = z.infer<typeof TriageResponse>;

export const LlmOut = z.object({
  category: Category,
  priority: Priority,
  needs_human_review: z.boolean(),
  summary: z.string().max(400),
});

export const ChatRequest = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .min(1),
});

export const SmokeRequest = z.object({
  dataset: z.enum(["100", "500"]),
  n: z.number().int().min(1).max(500),
  strategy: Strategy,
  model: z.string().optional(),
});