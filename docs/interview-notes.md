# Notes

## Most Important Product-Relevant Takeaways

## Team Structure / Who's Who

- Ryan is in BDR leadership and partners with the GTM engineering team weekly on projects. He described himself as the "customer" for this exercise.
- Cameron is on Vercel's GTM engineering team. He joined Vercel around 1.5 years ago, originally under Drew Salid on sales engineering / solutions architecture, then moved with Drew onto the new GTM engineering team.
- The GTM engineering team is engineering-first, not a RevOps-style function.
- They do not have a dedicated PM; engineers effectively own product areas themselves.
- The team sits between go-to-market and the core product org, and helps channel customer/prospect feedback back into product.
- GTM engineers sometimes join sales calls, help with customer-facing conversations, and do some work that feels a bit like developer advocacy.

## Ryan's Workflow / Day To Day / Operating Reality

- Ryan manages or supports BDR workflows where leads come in through Salesforce reports.
- He manually builds reports for different lead segments, such as:
  - MQLs / marketing leads
  - Product leads
  - Other segment-specific lead groups
- Examples of marketing leads:
  - Event registrations
  - Event attendance
  - Website visits
- Examples of product leads:
  - New account signups
  - Accounts with spend / bill spikes
- BDRs currently use a manual process:
  - First email is a templatized "manual task"
  - Rep edits it and sends
  - Later emails in the sequence are more standard / boring sequence emails
- Current personalization often requires:
  - Checking LinkedIn
  - Researching the company
  - Consolidating findings mentally
  - Adjusting the message appropriately
- Skill varies a lot by rep:
  - Senior BDRs are much faster and better at relevance
  - Junior BDRs may spend 5-7 minutes per email, sometimes more
- Volume varies by season:
  - In event-heavy periods, reps may get 10-20 leads/day
  - Slower periods may be around 5/day
- Ryan emphasized that BDR work is all about opportunity cost:
  - Time saved on email prep can be spent on calls or other selling work
- Ryan said calling is actually one of their best channels, while email is their worst channel.
- A "good" reply rate is still only around 20%, so there is lots of non-response / uncertainty in email outreach.
- Ryan's team is very top of funnel:
  - They focus on booking meetings
  - Then hand off to AEs and SAs / SEs later in the cycle

## Core Problems They Are Trying To Solve

- The current process is too manual, both at the report-building step and the per-email personalization step.
- Personalization quality is too inconsistent across BDR skill levels.
- They want to improve speed and consistency.
- They do not want AI that simply dumps all known data points into an email. Ryan explicitly said the issue with some AI products is that they tell you all the data they know, but don't produce a compelling narrative.
- Qualification is a major issue:
  - Not every lead handed over is worth rep time
  - Ryan wants the team focused on accounts that are enterprise-eligible
  - He specifically does not want BDR time wasted on lower-value pro-tier deals
- They see qualification and email generation as closely linked:
  - First determine whether the lead is worth pursuing
  - Then determine the right outreach
- They also care about multi-step sequences, not just one email:
  - If no response on email 1, then email 2, etc.
- They want stronger observability:
  - Whether a prompt revision improved reply rate
  - Whether the agent's research was useful
  - Whether delivery rates were the issue
  - How changes affect MQL -> SQL conversion

## Success Metrics / Business Logic

- The most important metric is MQL to SQL conversion, not just opens or replies.
- They do already track:
  - Open rates
  - Reply rates
  - Sequence experiments in Outreach
- They want a way to connect outcomes more directly to:
  - Prompt versions
  - Prompt revisions
  - Agent behavior
- Their team prioritizes projects based on ROI / revenue impact.
- Cameron said the team's prioritization is basically tied to revenue.
- Ryan emphasized not just gross dollars, but net incremental dollars relative to what would have happened anyway.

## Existing Workflow / Systems / Tools

- Leads currently come through Salesforce reports.
- They rely heavily on Snowflake as a data warehouse.
- Cameron said:
  - They ETL from Salesforce into Snowflake
  - They sometimes reverse ETL fields back up into Salesforce
- For the exercise, Cameron said you can assume everything is in one spot, effectively Snowflake.
- They also use enrichment / external data sources such as:
  - Harmonic
  - Clearbit
  - Clay
- Despite paying for these tools, Ryan said reps still often go straight to LinkedIn.
- Outreach is the tool handling their current email sequences and experiments.
- They are also building many internal tools in Slack, and Ryan liked the idea of a Slack-centric workflow.

## Data That Seems Available / Usable In The Product

- Salesforce lead/report data
- Snowflake warehouse data, including enrichment and potentially merged datasets
- Marketing signals:
  - Event registration
  - Event attendance
  - Website visits
- Product signals:
  - New account signup
  - Spending spike / bill spike
- Firmographic / enrichment data from Harmonic, Clearbit, Clay
- LinkedIn-derived context, which they clearly see as valuable for personalization
- Sequence performance data:
  - Open rates
  - Reply rates
  - Experiments

## Important Product Requirements Implied By What They Said

- The product should not just write emails. It should likely:
  - Ingest leads
  - Qualify / prioritize them
  - Enrich them
  - Generate outreach
  - Keep a human in the loop
  - Measure outcomes
- The qualification layer is important because they don't want wasted BDR effort on poor-fit accounts.
- The messaging should be based on a narrative / angle, not a raw dump of facts.
- Human review matters:
  - If edits are needed, the reviewer should likely be a BDR or BDR leader like Ryan
  - Not an engineer
- A Slack-based approval workflow is likely a good fit because:
  - Salesforce is disliked as a UI
  - They already build a lot in Slack
- The product should probably support prompt tuning / prompt versions, because they explicitly want to connect prompt changes to outcomes.
- Showing evidence / rationale behind lead qualification and email angle would likely be useful because they care about understanding whether the agent's reasoning is actually good.

## Things They Said About Existing Internal Products / Maturity

- This "auto outbound" concept is not purely hypothetical:
  - Cameron and Ryan said a version of it already exists internally.
- Cameron said the auto outbound project has been shaped with Ryan and built by someone on the team named Aman, who acted somewhat like the product owner.
- They said:
  - Auto outbound v1 failed
  - Later versions are working better now
- Ryan said they can quantify the revenue impact of auto outbound and similar systems.
- They gave another example of an internal AI / GTM system:
  - An inbound agent, originally tied to Drew's open-sourced lead agent work, which has improved a lot over the last year.
- They also mentioned a separate internal video recorder / Zoom app project being built on Vercel-related primitives.

## How They Think About GTM Engineering

- GTM engineering at Vercel is about applying engineering to sales problems.
- Engineers are expected to own:
  - Roadmap
  - Stakeholder communication
  - Iteration
  - Product decisions
- Projects are never "done"; they are constantly iterated on based on stakeholder feedback and measured outcomes.
- Good GTM engineers need:
  - Engineering ability
  - Product judgment
  - Comfort with sales context
  - Some customer-facing ability

## Subtle But Important Implications For Your Build

- Since a version already exists internally, the winning move is probably not "invent a wild new concept."
- It is more likely:
  - Show strong product judgment
  - Simplify the workflow
  - Make decisioning auditable
  - Show prompt/ROI instrumentation
  - Make the operator experience excellent
- Since Ryan is the "customer," optimize for:
  - BDR manager visibility
  - Rep time savings
  - Lead quality
  - Control over the system
- Since Cameron is GTM engineering, also show:
  - Clean product thinking
  - How this would be iterated
  - How prompt versions / experiments could be measured
  - How the system fits into a broader GTM tooling stack

## Short Version: What Matters Most For The Product

If compressed into the key truths:

- Input: Salesforce + Snowflake + enrichment data
- User problem: BDRs waste time manually researching and personalizing inconsistent outbound
- Real bottleneck: qualification + narrative generation, not just drafting text
- Primary user: BDR / BDR manager
- Best UX: likely Slack-first or at least very lightweight review workflow
- Core metric: MQL -> SQL and revenue impact
- Differentiator: prompt control + observability + human-in-the-loop

## Possible Next Step

Turn this into a product requirements doc for the MVP with:

- Goals
- Users
- Core workflows
- Data model
- Screens
- Non-goals
- Demo plan
