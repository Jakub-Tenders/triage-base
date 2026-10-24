import OpenAI from "openai";

export const llm = new OpenAI({
  baseURL: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,
});

export const LLM_MODEL = process.env.LLM_MODEL!;
export const LLM_MODELS = (process.env.LLM_MODELS ?? LLM_MODEL ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);

export function pickModel(m?: string) {
  return m && LLM_MODELS.includes(m) ? m : LLM_MODEL;
}

const num = (v?: string) => (v ? Number(v) : 0);
export const llmCost = (inTok: number, outTok: number) =>
  (inTok * num(process.env.LLM_PRICE_IN) + outTok * num(process.env.LLM_PRICE_OUT)) / 1e6;
export const dmCost = (inTok: number) => (inTok * num(process.env.DECISION_PRICE_IN)) / 1e6;