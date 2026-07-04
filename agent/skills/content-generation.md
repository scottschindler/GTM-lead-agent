---
description: Write personalized outbound email copy from the upstream strategy and research, with a unique personalized landing page linked in every email.
---

# Content generation

Write the first outreach email only, and create a unique personalized landing
page that the email links to.

## Step 1 — Create the landing page

Skip this step if `landingPages` is false in the pipeline config (from
`get_lead`) and write the email without a landing page link.

Before drafting the email, call `create_landing_page`. This mints a unique URL
for this lead and stores the page content. Ground every field in upstream
stages:

- `headline` / `subheadline` — speak directly to the company using the
  messaging strategy angle (e.g. "What {Company} could ship on Vercel")
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
- `ctaLabel` / `ctaUrl` — match the messaging strategy CTA

The tool returns the page `url`.

## Step 2 — Write the email

Requirements:

- Ground every claim in research / hypotheses / opportunities
- Match the messaging strategy tone and technical depth
- Offer 2–3 subject line options
- If a landing page was created in step 1, include its URL in the email body,
  framed as something made specifically for them (e.g. "I put together a short
  page on what this could look like for {Company}: {url}")
- Include a clear CTA
- Include short objection responses the sender can use later

If messaging strategy was skipped, use a concise peer-engineer tone and medium
technical depth.

## Step 3 — Persist and record

Persist with `save_stage_output` stage `content_generation`, including
`landingPageSlug` and `landingPageUrl` from step 1 (omit both if landing pages
are disabled). Then call `send_message` with the best subject, body, and CTA.

Do not claim delivery or approval. `send_message` only queues the draft with
its send window for BDR review in the Inbox — a human approves or
denies it there, and approval is what releases the send.
