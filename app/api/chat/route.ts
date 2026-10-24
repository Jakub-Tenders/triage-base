import { llm, LLM_MODEL } from "../../../lib/llm";
import { ChatRequest } from "../../../lib/schemas";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const msgs = (body as { messages?: { role?: string }[] })?.messages;
  if (Array.isArray(msgs) && msgs.some((m) => m?.role === "system")) {
    return Response.json({ error: "System messages are not allowed." }, { status: 400 });
  }

  const parsed = ChatRequest.safeParse(body);
  if (!parsed.success || !parsed.data.messages.at(-1)?.content.trim()) {
    return Response.json(
      { error: "Provide a non-empty messages array (role user/assistant) ending with a non-empty user message." },
      { status: 400 },
    );
  }

  try {
    const completion = await llm.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: "You are a helpful support assistant. Answer briefly." },
        ...parsed.data.messages,
      ],
    });
    return Response.json({ answer: completion.choices[0]?.message?.content ?? "" });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "LLM request failed." }, { status: 502 });
  }
}