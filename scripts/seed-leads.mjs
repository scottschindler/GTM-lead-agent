import { readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const profiles = [
  {
    id: "lead_seed",
    name: "Paul Copplestone",
    email: "paul@supabase.com",
    company: "Supabase",
    companyDomain: "supabase.com",
    source: "pricing-page",
    timezone: "America/Los_Angeles",
  },
  {
    id: "lead_06",
    name: "Karri Saarinen",
    email: "karri@linear.app",
    company: "Linear",
    companyDomain: "linear.app",
    source: "newsletter",
    timezone: "America/Los_Angeles",
  },
  {
    id: "lead_07",
    name: "Toby Lutke",
    email: "toby@shopify.com",
    company: "Shopify",
    companyDomain: "shopify.com",
    source: "pricing-page",
    timezone: "America/Toronto",
  },
  {
    id: "lead_08",
    name: "Dylan Field",
    email: "dylan@figma.com",
    company: "Figma",
    companyDomain: "figma.com",
    source: "customer-story",
    timezone: "America/Los_Angeles",
  },
  {
    id: "lead_09",
    name: "Patrick Collison",
    email: "patrick@stripe.com",
    company: "Stripe",
    companyDomain: "stripe.com",
    source: "docs-visit",
    timezone: "America/Los_Angeles",
  },
  {
    id: "lead_12",
    name: "Spencer Kimball",
    email: "spencer@cockroachlabs.com",
    company: "Cockroach Labs",
    companyDomain: "cockroachlabs.com",
    source: "demo-request",
    timezone: "America/New_York",
  },
  {
    id: "lead_13",
    name: "Solomon Hykes",
    email: "solomon@dagger.io",
    company: "Dagger",
    companyDomain: "dagger.io",
    source: "github-star",
    timezone: "America/Los_Angeles",
  },
  {
    id: "lead_14",
    name: "Evan Bacon",
    email: "evan@expo.dev",
    company: "Expo",
    companyDomain: "expo.dev",
    source: "docs-visit",
    timezone: "America/Los_Angeles",
  },
  {
    id: "lead_15",
    name: "Analyse Prakash",
    email: "analyse@temporal.io",
    company: "Temporal",
    companyDomain: "temporal.io",
    source: "pricing-page",
    timezone: "America/Los_Angeles",
  },
  {
    id: "lead_16",
    name: "Simon Willison",
    email: "simon@simonwillison.net",
    company: "Datasette",
    companyDomain: "datasette.io",
    source: "newsletter",
    timezone: "America/Los_Angeles",
  },
  {
    id: "lead_17",
    name: "Sarah Drasner",
    email: "sarah@astro.build",
    company: "Astro",
    companyDomain: "astro.build",
    source: "conference",
    timezone: "America/Denver",
  },
  {
    id: "lead_18",
    name: "Peter Steinberger",
    email: "peter@steipete.me",
    company: "Polytomic",
    companyDomain: "polytomic.com",
    source: "referral",
    timezone: "Europe/Vienna",
  },
  {
    id: "lead_20",
    name: "Jessica McKellar",
    email: "jessica@pilot.com",
    company: "Pilot",
    companyDomain: "pilot.com",
    source: "pricing-page",
    timezone: "America/Los_Angeles",
  },
  {
    id: "lead_21",
    name: "Jarred Sumner",
    email: "jarred@bun.sh",
    company: "Bun",
    companyDomain: "bun.sh",
    source: "demo-request",
    timezone: "America/Los_Angeles",
  },
  {
    id: "lead_27",
    name: "Erik Bernhardsson",
    email: "erik@modal.com",
    company: "Modal",
    companyDomain: "modal.com",
    source: "ai-infra-research",
    timezone: "America/New_York",
  },
  {
    id: "lead_28",
    name: "Tuhin Srivastava",
    email: "tuhin@baseten.co",
    company: "Baseten",
    companyDomain: "baseten.co",
    source: "model-deploy-page",
    timezone: "America/Los_Angeles",
  },
  {
    id: "lead_29",
    name: "Michael Grinich",
    email: "michael@workos.com",
    company: "WorkOS",
    companyDomain: "workos.com",
    source: "enterprise-auth-webinar",
    timezone: "America/Los_Angeles",
  },
  {
    id: "lead_30",
    name: "James Hawkins",
    email: "james@posthog.com",
    company: "PostHog",
    companyDomain: "posthog.com",
    source: "product-analytics-guide",
    timezone: "Europe/London",
  },
  {
    id: "lead_31",
    name: "Zach Lloyd",
    email: "zach@warp.dev",
    company: "Warp",
    companyDomain: "warp.dev",
    source: "developer-tools-newsletter",
    timezone: "America/New_York",
  },
];

const now = new Date().toISOString();
const leadsDir = join(process.cwd(), "data/leads");

function emptyStages() {
  const pending = () => ({ status: "pending", updatedAt: now });
  return {
    intake: pending(),
    research: pending(),
    qualification: pending(),
    hypothesis: pending(),
    opportunity_mapping: pending(),
    messaging_strategy: pending(),
    sequence_planning: pending(),
    content_generation: pending(),
    engagement_intent: pending(),
    learning: pending(),
  };
}

for (const profile of profiles) {
  const lead = {
    ...profile,
    createdAt: now,
    updatedAt: now,
    currentStage: "intake",
    outcome: "open",
    stages: emptyStages(),
    engagementEvents: [],
    intentScore: 0,
  };
  lead.stages.intake = {
    status: "done",
    updatedAt: now,
    output: { leadId: profile.id, source: profile.source },
  };
  writeFileSync(
    join(leadsDir, `${profile.id}.json`),
    `${JSON.stringify(lead, null, 2)}\n`,
  );
}

writeFileSync(join(process.cwd(), "data/activity.jsonl"), "");
for (const file of readdirSync(join(process.cwd(), "data/landing-pages"))) {
  if (file.endsWith(".json")) {
    rmSync(join(process.cwd(), "data/landing-pages", file));
  }
}

console.log(`Wrote ${profiles.length} leads`);
