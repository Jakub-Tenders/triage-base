# LLM vs Decision Model: report

## 1. Decision model research

Hosted options I found (course slides plus a few searches):

| Option | Provider | Endpoint | Access | Verdict |
|---|---|---|---|---|
| d3 / d3-turbo (27B) | vLLM Semantic Router | `POST decision.vllm-sr.ai/v1/systemone` | free key, one click, no account | **selected** |
| Jev | TypeSafe AI, also via OpenRouter | `/v1/systemone` | early access, input tokens charged on OpenRouter | not free |
| Mercury Decide | Inception via OpenRouter | OpenRouter | reportedly a free route (I did not verify it) | possible alternative |
| Decisions API (GPT-6 Luna) | OpenAI | `/v1/decisions` | public beta, paid | not free |
| Clef / Strands Decider | Cloudflare / AWS | open weights | self-host only | too heavy for my laptop |

**Why d3:** it is the only one I found that is hosted, free and needs no account, just a key. It uses the same `/v1/systemone` contract as Jev, so the integration follows the documented format. The free API limits are fine for a 10 to 20 ticket smoke test.

## 2. Integration strategy

The user picks the strategy from the front end, on the triage page and on the smoke test page:

- `llm`: Gemini does everything (category, priority, human review, one sentence summary). The answer is validated with Zod, with one retry if the JSON is invalid.
- `dm`: the decision model answers 3 typed questions in one call (category and priority as `choice`, needs_human_review as `noul`). It generates no text, so there is no summary.
- `dm+llm`: DM first. If the lowest of its category and priority confidences is under 0.7 (`DM_THRESHOLD`), the ticket is escalated to the LLM. Otherwise the DM answer is kept.

Why: category and priority are a closed set of options, the volume can be high, and I can act on a probability (the threshold). The LLM is only needed when the DM is unsure.

Other choices:
- The ticket text is untrusted, so both the DM and the LLM answers are validated with Zod before reaching the front end.
- The smoke test, the logs and `/admin` record the strategy and the model used. For `dm+llm` the model shows as DM + LLM.
- The smoke test runs the DM 3 tickets at a time, but the LLM one at a time with a 5 s pause, because of the Gemini free tier rate limit.

## 3. Results

Dataset: the 100 labelled set, 10 random tickets per run. Each run samples different random tickets.

| Strategy | Model | ok / errors | Category acc | Priority acc | Avg latency | LLM calls | Tokens | Cost |
|---|---|---|---|---|---|---|---|---|
| llm | gemini-3.5-flash | 10 / 0 | 100% | 80% | 6256 ms | 10 | 6754 | $0 (free tier) |
| dm | vllm-sr/d3 | 10 / 0 | 90% | 60% | 581 ms | 0 | 7397 | $0 (free key) |
| dm+llm | vllm-sr/d3 + gemini-3.7-flash | 10 / 0 | 100% | 60% | 16064 ms | 3 | 5400 | $0 |

Earlier `llm` runs with `gemini-3.7-flash` are also in `/admin`: 5 ok out of 10 (accuracy 80% / 60%), 2 ok out of 10, and two runs with 0 ok out of 10. The errors were Gemini 429 "quota exceeded" (plus one 503 "high demand"), so those accuracy numbers are not meaningful. I switched to `gemini-3.5-flash` to get a clean run.

## 4. Analysis

- **Speed:** the DM answers in about 0.6 s per ticket. The LLM took about 6 s per ticket with gemini-3.5-flash, and gemini-3.7-flash was much slower (one call took about 112 s on the triage page). The 16 s average for `dm+llm` comes from only 3 escalated tickets: 7 of 10 were answered by the DM alone, so those 3 LLM calls took about 50 s each.
- **Reliability:** the DM never failed (30 tickets over 3 runs). The hosted LLM hit quota errors on the free tier, so a DM-first strategy also makes the app more robust.
- **Category:** all three strategies are good, between 90% and 100%. The one DM mistake was an invitation email ticket labelled `account` that it called `technical_bug`.
- **Priority:** priority is harder for every strategy. The LLM got 80%. The DM got 60%, and its mistakes were mostly saying `medium` where the label is `low`, so it overrates the urgency of minor tickets. `dm+llm` stayed at 60%.
- **Why dm+llm did not improve priority:** my guess is that the DM was confident but wrong on some priorities, so those tickets were never escalated. I did not log the confidence per ticket, so I could not check this. It is the first thing I would measure next, as the slides say: is a confidence of 0.9 really right 9 times out of 10?
- **Cost:** everything ran on free tiers, so the cost column is $0. The real saving is the number of LLM calls: 3 instead of 10 with `dm+llm` on this sample.
- **Tokens:** the DM used more tokens (7397) than the LLM (6754) on its 10 tickets, even though it is cheaper. It counts the input only, with its own tokenizer, plus the three questions (about 291 tokens for a short ticket, against about 103 for the same ticket with Gemini), and it generates no output tokens. Tokens are not comparable across providers.

## 5. Limits

- 10 tickets per run is a tiny sample, so the percentages move a lot (one ticket is 10 points).
- Each run used different random tickets, so the runs are not directly comparable.
- The models are not the same everywhere: the `llm` run used gemini-3.5-flash and the `dm+llm` run used gemini-3.7-flash, because the 3.7 quota ran out.
- I did not independently check the vendor numbers for the decision model.

## 6. What I would do next

- Run the three strategies on the same sample of at least 50 tickets.
- Log the DM confidence per ticket and tune `DM_THRESHOLD` (0.5, 0.7, 0.9).
- Rewrite the priority criteria sent to the DM, since the `low` and `medium` descriptions are where it fails.