import { TriageRequest } from "../../../lib/schemas";
import { triage } from "../../../lib/triage";
import { LLM_MODELS } from "../../../lib/llm";

export async function GET() {
  return Response.json({ models: LLM_MODELS });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = TriageRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid triage request.",
        issues: parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`),
      },
      { status: 400 },
    );
  }
  try {
    return Response.json(await triage(parsed.data));
  } catch (err) {
    console.error(err);
    return Response.json({ error: `Triage failed: ${String(err).slice(0, 200)}` }, { status: 502 });
  }
}