"use client";

import { useMemo, useState } from "react";

type PromptVersion = {
  id: string;
  version: number;
  status: "Active" | "Draft" | "Archived";
  editedBy: string;
  updatedAt: string;
  replyRate: number;
  meetingRate: number;
  approvalRate: number;
  sampleSize: number;
  note: string;
  body: string;
};

type PromptTemplate = {
  id: string;
  name: string;
  stage: string;
  description: string;
  versions: PromptVersion[];
};

const INITIAL_TEMPLATES: PromptTemplate[] = [
  {
    id: "messaging-draft",
    name: "First email draft",
    stage: "Email",
    description:
      "Controls the structure, length, tone, and proof level of the first outbound email.",
    versions: [
      {
        id: "messaging-draft-v6",
        version: 6,
        status: "Active",
        editedBy: "Jordan",
        updatedAt: "Jul 6",
        replyRate: 19.6,
        meetingRate: 7.4,
        approvalRate: 94,
        sampleSize: 268,
        note: "Best performer. Short, technical, and easiest for BDRs to approve.",
        body:
          "Write 4 to 5 short paragraphs. Open with one researched hook, connect it to a concrete Vercel value hypothesis, tease the personalized page when available, and end with one clear CTA. Avoid filler, fake urgency, unsupported claims, and long proof dumps. Keep the body under 120 words.",
      },
      {
        id: "messaging-draft-v5",
        version: 5,
        status: "Archived",
        editedBy: "Alex",
        updatedAt: "Jul 4",
        replyRate: 16.1,
        meetingRate: 5.9,
        approvalRate: 89,
        sampleSize: 231,
        note: "Good replies, but BDRs edited too many CTAs.",
        body:
          "Write a concise first email with a personal hook, one relevant product outcome, a customer-style proof point, and a soft CTA. Keep it friendly and technical.",
      },
    ],
  },
  {
    id: "landing-page-copy",
    name: "Landing page copy",
    stage: "Page",
    description:
      "Controls the personalized page headline, note, proof points, and CTA copy.",
    versions: [
      {
        id: "landing-page-copy-v4",
        version: 4,
        status: "Active",
        editedBy: "Maya",
        updatedAt: "Jul 6",
        replyRate: 18.2,
        meetingRate: 6.8,
        approvalRate: 91,
        sampleSize: 214,
        note: "Best page variant. Clearer story and fewer proof points.",
        body:
          "Write a short personalized page for the account. Use one headline tied to the company, one personal note, two opportunity cards, one relevant customer story, and one CTA. Keep claims grounded. Prefer concrete workflow outcomes over broad platform language.",
      },
      {
        id: "landing-page-copy-v3",
        version: 3,
        status: "Archived",
        editedBy: "Scott",
        updatedAt: "Jul 3",
        replyRate: 15.9,
        meetingRate: 5.6,
        approvalRate: 86,
        sampleSize: 188,
        note: "Too much page content for quick review.",
        body:
          "Create a personalized landing page with a headline, long account note, three opportunities, two customer stories, stats, and CTA. Include enough proof for a technical buyer to evaluate the fit.",
      },
    ],
  },
  {
    id: "subject-lines",
    name: "Subject lines",
    stage: "Subject",
    description:
      "Controls how subject options are generated and ranked for the first send.",
    versions: [
      {
        id: "subject-lines-v5",
        version: 5,
        status: "Active",
        editedBy: "Jordan",
        updatedAt: "Jul 6",
        replyRate: 20.4,
        meetingRate: 7.1,
        approvalRate: 93,
        sampleSize: 252,
        note: "Highest reply rate. Short and account-specific.",
        body:
          "Generate 2 to 3 subject lines under 8 words. Prefer specific workflow language from the account research. Avoid hype, urgency, first-name gimmicks, and vague one-word subjects. Pick the subject most likely to feel useful to an engineering or product leader.",
      },
      {
        id: "subject-lines-v4",
        version: 4,
        status: "Archived",
        editedBy: "Maya",
        updatedAt: "Jul 4",
        replyRate: 17.6,
        meetingRate: 6.2,
        approvalRate: 88,
        sampleSize: 205,
        note: "Good opens, but some subjects felt too generic.",
        body:
          "Generate short subject lines that mention the company, Vercel, or a relevant product area. Keep each subject under 8 words and avoid spammy phrasing.",
      },
    ],
  },
  {
    id: "cta-objections",
    name: "CTA and objections",
    stage: "CTA",
    description:
      "Controls the ask at the end of the message and the sender-only objection notes.",
    versions: [
      {
        id: "cta-objections-v3",
        version: 3,
        status: "Active",
        editedBy: "Alex",
        updatedAt: "Jul 5",
        replyRate: 17.9,
        meetingRate: 6.5,
        approvalRate: 92,
        sampleSize: 223,
        note: "Best close. Specific ask without sounding pushy.",
        body:
          "End with one clear CTA tied to the account hypothesis. Ask for a short technical conversation, not a generic demo. Save 1 to 2 concise objection notes for the sender, focused on existing tooling, migration effort, or timing. Do not put objection handling in the buyer-facing email body.",
      },
      {
        id: "cta-objections-v2",
        version: 2,
        status: "Archived",
        editedBy: "Scott",
        updatedAt: "Jul 2",
        replyRate: 15.1,
        meetingRate: 5.2,
        approvalRate: 87,
        sampleSize: 176,
        note: "Too soft. BDRs often rewrote the ask.",
        body:
          "Close with a low-pressure CTA asking whether the topic is relevant. Include common objections and short responses for the sender.",
      },
    ],
  },
];

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function cloneTemplates(templates: PromptTemplate[]): PromptTemplate[] {
  return templates.map((template) => ({
    ...template,
    versions: template.versions.map((version) => ({ ...version })),
  }));
}

function getBestVersion(template: PromptTemplate): PromptVersion {
  return [...template.versions].sort((a, b) => b.meetingRate - a.meetingRate)[0];
}

export function PromptConfigurator() {
  const [templates, setTemplates] = useState(() => cloneTemplates(INITIAL_TEMPLATES));
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0].id);
  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId,
  ) ?? templates[0];
  const activeVersion =
    selectedTemplate.versions.find((version) => version.status === "Active") ??
    selectedTemplate.versions[0];
  const [selectedVersionId, setSelectedVersionId] = useState(activeVersion.id);
  const selectedVersion =
    selectedTemplate.versions.find((version) => version.id === selectedVersionId) ??
    activeVersion;
  const [draftText, setDraftText] = useState(selectedVersion.body);
  const [draftNote, setDraftNote] = useState("BDR demo edit");

  const bestPerformers = useMemo(
    () =>
      templates
        .map((template) => ({
          template,
          version: getBestVersion(template),
        }))
        .sort((a, b) => b.version.meetingRate - a.version.meetingRate),
    [templates],
  );

  function selectTemplate(templateId: string) {
    const nextTemplate = templates.find((template) => template.id === templateId);
    if (!nextTemplate) return;
    const nextVersion =
      nextTemplate.versions.find((version) => version.status === "Active") ??
      nextTemplate.versions[0];
    setSelectedTemplateId(templateId);
    setSelectedVersionId(nextVersion.id);
    setDraftText(nextVersion.body);
    setDraftNote(nextVersion.note);
  }

  function selectVersion(versionId: string) {
    const nextVersion = selectedTemplate.versions.find(
      (version) => version.id === versionId,
    );
    if (!nextVersion) return;
    setSelectedVersionId(versionId);
    setDraftText(nextVersion.body);
    setDraftNote(nextVersion.note);
  }

  function saveDraftVersion() {
    setTemplates((current) =>
      current.map((template) => {
        if (template.id !== selectedTemplate.id) return template;
        const nextVersionNumber =
          Math.max(...template.versions.map((version) => version.version)) + 1;
        const newVersion: PromptVersion = {
          id: `${template.id}-v${nextVersionNumber}`,
          version: nextVersionNumber,
          status: "Draft",
          editedBy: "You",
          updatedAt: "Now",
          replyRate: selectedVersion.replyRate,
          meetingRate: selectedVersion.meetingRate,
          approvalRate: selectedVersion.approvalRate,
          sampleSize: 0,
          note: draftNote || "Unsaved demo note",
          body: draftText,
        };
        return {
          ...template,
          versions: [newVersion, ...template.versions],
        };
      }),
    );
    const nextVersionNumber =
      Math.max(...selectedTemplate.versions.map((version) => version.version)) + 1;
    setSelectedVersionId(`${selectedTemplate.id}-v${nextVersionNumber}`);
  }

  function markActive(versionId: string) {
    setTemplates((current) =>
      current.map((template) => {
        if (template.id !== selectedTemplate.id) return template;
        return {
          ...template,
          versions: template.versions.map((version) => ({
            ...version,
            status: version.id === versionId ? "Active" : "Archived",
          })),
        };
      }),
    );
  }

  const hasLocalChanges =
    draftText !== selectedVersion.body || draftNote !== selectedVersion.note;

  return (
    <div>
      <div className="grid gap-3 py-1.5 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div>
          <label className="block text-xs font-medium">Messaging prompt</label>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
            Pick the messaging or content prompt to tune for the demo.
          </p>
          <div className="mt-2 grid gap-1.5">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => selectTemplate(template.id)}
                className={`rounded-[8px] border px-2.5 py-2 text-left ${
                  selectedTemplate.id === template.id
                    ? "border-[var(--geist-foreground)]"
                    : "border-[var(--geist-border)]"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium">{template.name}</span>
                  <span className="font-mono text-[10px] text-[var(--geist-muted)]">
                    {template.stage}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px] leading-4 text-[var(--geist-muted)]">
                  {template.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[8px] border border-[var(--geist-border)] px-3 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium">{selectedTemplate.name}</h3>
              <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
                Editing v{selectedVersion.version} - {selectedVersion.status}
              </p>
            </div>
            <span className="rounded-full border border-[var(--geist-border)] px-2 py-0.5 font-mono text-[10px] text-[var(--geist-muted)]">
              {hasLocalChanges ? "Edited locally" : "No local edits"}
            </span>
          </div>

          <label className="mt-3 block text-xs font-medium">Prompt text</label>
          <textarea
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            rows={8}
            className="mt-1.5 w-full resize-y rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-background)] px-2.5 py-2 font-mono text-[11px] leading-5"
          />

          <label className="mt-3 block text-xs font-medium">Version note</label>
          <input
            value={draftNote}
            onChange={(event) => setDraftNote(event.target.value)}
            className="mt-1.5 w-full rounded-[8px] border border-[var(--geist-border)] bg-[var(--geist-background)] px-2.5 py-1.5 text-xs"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveDraftVersion}
              className="rounded-[8px] border border-[var(--geist-foreground)] bg-[var(--geist-foreground)] px-3 py-1.5 text-xs font-medium text-[var(--geist-background)]"
            >
              Save new version
            </button>
            <button
              type="button"
              onClick={() => markActive(selectedVersion.id)}
              className="rounded-[8px] border border-[var(--geist-border)] px-3 py-1.5 text-xs font-medium"
            >
              Mark active
            </button>
            <button
              type="button"
              onClick={() => selectVersion(selectedVersion.id)}
              className="rounded-[8px] border border-[var(--geist-border)] px-3 py-1.5 text-xs font-medium"
            >
              Restore selected
            </button>
          </div>
        </div>
      </div>

      <details className="mt-3 rounded-[8px] border border-[var(--geist-border)]">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3 py-2 marker:hidden">
          <span>
            <span className="block text-xs font-medium">Prompt performance</span>
            <span className="mt-0.5 block text-[11px] leading-4 text-[var(--geist-muted)]">
              Expand to compare version history and best-performing prompts.
            </span>
          </span>
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--geist-border)] font-mono text-xs text-[var(--geist-muted)]"
          >
            +
          </span>
        </summary>
        <div className="border-t border-[var(--geist-border)] px-3 py-3">
          <fieldset className="py-2">
            <legend className="text-xs font-medium">Version history</legend>
            <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
              Select a prior version, compare its metrics, then restore it or mark it active.
            </p>
            <div className="mt-2 grid gap-1.5">
              {selectedTemplate.versions
                .slice()
                .sort((a, b) => b.version - a.version)
                .map((version) => (
                  <button
                    key={version.id}
                    type="button"
                    onClick={() => selectVersion(version.id)}
                    className={`rounded-[8px] border px-2.5 py-2 text-left ${
                      selectedVersion.id === version.id
                        ? "border-[var(--geist-foreground)]"
                        : "border-[var(--geist-border)]"
                    }`}
                  >
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-medium">
                        v{version.version} - {version.status}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--geist-muted)]">
                        {version.updatedAt} by {version.editedBy}
                      </span>
                    </span>
                    <span className="mt-1 grid gap-1 font-mono text-[10px] text-[var(--geist-muted)] sm:grid-cols-4">
                      <span>Replies {formatPercent(version.replyRate)}</span>
                      <span>Meetings {formatPercent(version.meetingRate)}</span>
                      <span>Approval {version.approvalRate}%</span>
                      <span>{version.sampleSize} leads</span>
                    </span>
                    <span className="mt-1 block text-[11px] leading-4 text-[var(--geist-muted)]">
                      {version.note}
                    </span>
                  </button>
                ))}
            </div>
          </fieldset>

          <fieldset className="py-2">
            <legend className="text-xs font-medium">Best-performing prompts</legend>
            <p className="mt-0.5 text-[11px] leading-4 text-[var(--geist-muted)]">
              Messaging and content prompts ranked by meeting rate, using seeded
              demo outcomes.
            </p>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {bestPerformers.map(({ template, version }, index) => (
                <button
                  key={`${template.id}-${version.id}`}
                  type="button"
                  onClick={() => {
                    selectTemplate(template.id);
                    setSelectedVersionId(version.id);
                    setDraftText(version.body);
                    setDraftNote(version.note);
                  }}
                  className="rounded-[8px] border border-[var(--geist-border)] px-2.5 py-2 text-left"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-xs font-medium">
                        {index + 1}. {template.name} v{version.version}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-[var(--geist-muted)]">
                        {version.note}
                      </span>
                    </span>
                    <span className="font-mono text-xs">
                      {formatPercent(version.meetingRate)}
                    </span>
                  </span>
                  <span className="mt-1 grid gap-1 font-mono text-[10px] text-[var(--geist-muted)] sm:grid-cols-3">
                    <span>{formatPercent(version.replyRate)} replies</span>
                    <span>{version.approvalRate}% approved</span>
                    <span>{version.sampleSize} leads</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </details>
    </div>
  );
}
