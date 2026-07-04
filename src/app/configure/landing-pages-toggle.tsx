"use client";

import { useCallback, useEffect, useState } from "react";

import type { PipelineConfig } from "../../../agent/lib/types";

/**
 * The one live control on this page: toggles per-email personalized landing
 * pages in the real pipeline config used by the agent.
 */
export function LandingPagesToggle() {
  const [config, setConfig] = useState<PipelineConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pipeline-config", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { config: PipelineConfig }) => {
        if (!cancelled) setConfig(data.config);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(async () => {
    if (!config || saving) return;
    const next = { ...config, landingPages: !config.landingPages };
    setConfig(next);
    setSaving(true);
    try {
      const response = await fetch("/api/pipeline-config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error("Failed to save");
      const data = (await response.json()) as { config: PipelineConfig };
      setConfig(data.config);
    } catch {
      setConfig(config);
    } finally {
      setSaving(false);
    }
  }, [config, saving]);

  return (
    <label className="flex items-start justify-between gap-4 py-2">
      <span>
        <span className="flex items-center gap-2 text-sm">
          Personalized landing pages
          <span className="rounded-full bg-[var(--geist-accent-soft)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--geist-success)]">
            Live
          </span>
        </span>
        <span className="block text-xs text-[var(--geist-muted)]">
          Generate a unique Vercel × prospect page per email and link it in the
          outreach. Saved to the pipeline config immediately.
        </span>
      </span>
      <input
        type="checkbox"
        checked={config?.landingPages ?? true}
        disabled={!config || saving}
        onChange={toggle}
        className="mt-1"
      />
    </label>
  );
}
