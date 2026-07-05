import type { Lead } from "../../agent/lib/types";
import {
  DEMO_FINISHED_LEAD,
  DEMO_FINISHED_LEAD_ID,
  DEMO_REVIEW_LEAD,
  DEMO_REVIEW_LEAD_ID,
} from "./demo-review-lead";

export const DEMO_NEEDS_REVIEW_COUNT = 3;

export function hasDraftedSend(lead: Lead): boolean {
  return lead.stages.content_generation?.output?.send?.status === "drafted";
}

export function hasReviewedSend(lead: Lead): boolean {
  const send = lead.stages.content_generation?.output?.send;
  return send !== undefined && send.status !== "drafted";
}

export function withDemoLeads(leads: Lead[]): Lead[] {
  const next = [...leads];

  if (
    !next.some((lead) => lead.id === DEMO_REVIEW_LEAD_ID) &&
    !next.some(hasDraftedSend)
  ) {
    next.unshift(DEMO_REVIEW_LEAD);
  }

  if (
    !next.some((lead) => lead.id === DEMO_FINISHED_LEAD_ID) &&
    !next.some(hasReviewedSend)
  ) {
    next.push(DEMO_FINISHED_LEAD);
  }

  return next;
}

export function countNeedsReview(leads: Lead[]): number {
  return Math.max(DEMO_NEEDS_REVIEW_COUNT, leads.filter(hasDraftedSend).length);
}
