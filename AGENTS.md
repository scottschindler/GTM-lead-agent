<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Style Guide: Vercel + Geist Aesthetic

Restyle and extend this app with the minimalist, modern Vercel aesthetic using
the Geist design system. Prioritize developer-focused UX, clean typography, and
semantic color theming.

These rules apply to every new UI feature, route, component, and state. Before
adding or editing UI, check this guide and preserve the token system instead of
introducing one-off visual styles.

## Typography And Layout

- Use Geist Sans as the primary interface font throughout the app.
- Use Geist Mono for code, metrics, IDs, timestamps, and compact technical text.
- Maximize readability with generous whitespace, high-contrast text, and clear
  hierarchy.
- Use `line-height: 1.5` for body text and `line-height: 1.2` for headings.
- Use a centered responsive container for main content: `max-w-4xl mx-auto`.
- Add or preserve a sticky header with clear branding.

## Geist Color Tokens

Support full light and dark mode. Replace hardcoded UI colors with semantic CSS
variables and reference them with `var(--geist-...)`.

```css
:root {
  --geist-background: #ffffff;
  --geist-foreground: #000000;
  --geist-success: #0070f3;
  --geist-cyan: #79ffe1;
  --geist-muted: #666666;
  --geist-border: #eaeaea;
}

@media (prefers-color-scheme: dark) {
  :root {
    --geist-background: #000000;
    --geist-foreground: #ffffff;
    --geist-muted: #888888;
    --geist-border: #333333;
  }
}
```

## Layout Guidelines

- Use consistent spacing based on 16px, 24px, and 32px increments.
- Keep corners rounded at `8px` unless an existing component requires otherwise.
- Use soft, subtle shadows only where depth improves scanability.
- Preserve strong contrast between foreground, background, muted text, and
  borders.
- Avoid one-off hardcoded colors in components; add or reuse semantic tokens
  instead.

## Implementation Rules

- New feature work must use the existing `--geist-*` variables in
  `src/app/globals.css`.
- Do not add hardcoded Tailwind palette colors such as `slate-*`, `gray-*`,
  `zinc-*`, `emerald-*`, `white`, or `black` in app UI. If a new semantic color
  is required, add a `--geist-*` token first.
- New main content areas should use `max-w-4xl mx-auto` unless the feature
  genuinely requires a different canvas.
- Keep the sticky branded header pattern for primary app routes.
- Verify light and dark mode behavior whenever component colors or borders
  change.
