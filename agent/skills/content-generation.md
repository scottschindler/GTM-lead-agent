---
description: Decide the messaging strategy, then write personalized outbound email copy from it, with a unique personalized landing page linked in every email.
---

# Content generation

Decide how to communicate with this buyer, then write the first outreach email
only, and create a unique personalized landing page that the email links to.

## Step 1 — Messaging strategy

Produce a communication strategy before any outreach copy. Choose:

- `messagingAngle` — the core narrative in one sentence
- `technicalDepth` — `low` | `medium` | `high` (prefer `low` when landing pages are enabled)
- `tone` — must include concise; e.g. peer engineer, concise, non-salesy
- `story` — one sentence, account-specific
- `hooks` — one best opening hook grounded in research
- `cta` — the ask (demo, architecture chat, specific resource)
- `customerExamples` — relevant patterns from opportunity mapping references
- `likelyObjections` — what they may push back on

If opportunity mapping or hypotheses were skipped, ground the strategy in
research alone and keep claims modest.

Do not persist the strategy separately — it is saved as the
`messagingStrategy` field of the `content_generation` stage output in step 4.

## Step 2 — Create the landing page

Skip this step if `landingPages` is false in the pipeline config (from
`get_lead`) and write the email without a landing page link.

Before drafting the email, call `create_landing_page`. This mints a unique URL
for this lead and stores the page content. It does **not** complete or write the
`content_generation` stage by itself. Ground every field in upstream stages:

- `headline` / `subheadline` — speak directly to the company using the
  messaging angle from step 1 (e.g. "What {Company} could ship on Vercel")
- `personalNote` — 1–2 sentences addressed to the recipient by first name,
  saying this page was put together for them and why
- `brandColor` — the prospect's primary brand color as 6-digit hex if you know
  it from research (e.g. Supabase green `#3ecf8e`); omit if unsure
- `opportunities` — the top 2–4 items from opportunity mapping, rewritten as
  prospect-facing pain → solution → outcome
- `stories` — 2–3 real customer stories from opportunity mapping references
  that best match this account, with the real metric and vercel.com URL. Never
  invent stories, metrics, or URLs.
- `stats` — up to 4 headline proof numbers (Forrester TEI or story metrics)
- `ctaLabel` / `ctaUrl` — match the CTA from step 1

The tool returns the page `url`.

## Step 3 — Write the email

Write a **short** first-touch email. Hard limit: **120 words** in the body,
excluding the signature.

Structure (4–5 short paragraphs max):

1. Greeting
2. One personalized hook from step 1
3. One sentence on value / fit
4. One-line landing page tease + URL if step 2 ran (e.g. "I put together a
   short page on what this could look like for {Company}: {url}")
5. One short CTA question, then sign-off

Requirements:

- Ground every claim in research / hypotheses / opportunities — but keep the
  email itself minimal; proof points belong on the landing page, not in the email
- When a landing page exists, do **not** list customer stories, metrics, or
  numbered proof points in the email — tease the page in one sentence instead
- Match the tone and technical depth chosen in step 1
- Offer 2–3 subject line options (each under 8 words)
- Include a clear CTA
- Save 1–3 short `objectionResponses` for the sender's reference only — do not
  expand the email body with them

## Step 4 — Persist and record

Persist with `save_stage_output` stage `content_generation`, including the
`messagingStrategy` object from step 1 and `landingPageSlug` / `landingPageUrl`
from step 2 (omit the landing page fields if landing pages are disabled). Then
call `send_message` with the best subject, body, and CTA. Do not move to
learning until both the stage output and `send_message` are done.

Do not claim delivery or approval. `send_message` only queues the draft with
its send window for BDR review in the Inbox — a human approves or
denies it there, and approval is what releases the send.
