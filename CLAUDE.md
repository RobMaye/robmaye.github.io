# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio site for Rob Maye, built with **Astro 5** + **Tailwind CSS 4**. Deployed to https://robmaye.github.io via GitHub Pages.

Minimal, text-forward, single-viewport landing page with a custom canvas-based halftone-flow generative art element.

## Build & Development Commands

```bash
# Local development server
npm run dev          # http://localhost:4321

# Production build
npm run build        # outputs to dist/

# Preview production build
npm run preview
```

## Deployment

- **Automatic**: Pushing to `master` triggers `.github/workflows/deploy.yml` which builds with `withastro/action@v3` and deploys to GitHub Pages.
- **Important**: GitHub Pages source must be set to "GitHub Actions" in repo Settings.

## Architecture

### Stack
- **Astro 5** with static output
- **Tailwind CSS 4** via `@tailwindcss/vite` plugin
- **TypeScript**
- Class-based dark mode with `@custom-variant dark (&:where(.dark, .dark *));`

### Content Model

| Path | Purpose |
|---|---|
| `src/pages/index.astro` | Landing page (custom layout, single viewport, art) |
| `src/pages/blog/` | Blog listing + dynamic post routes |
| `src/pages/projects.astro` | Projects page |
| `src/pages/cv.astro` | CV (renders from resume.json) |
| `src/content/blog/` | Markdown blog posts (Astro content collections) |
| `src/data/resume.json` | CV data in JSON Resume format |
| `src/data/site.ts` | Site constants (name, URL, social links) |

### Key Components

- `src/lib/art/halftone-flow.ts` — Main generative art renderer (halftone dots + flow field color bleed)
- `src/components/ThemeToggle.astro` — Dark mode toggle, dispatches `theme-change` CustomEvent
- `src/layouts/BaseLayout.astro` — Root layout with `hideFooter` prop
- `src/styles/global.css` — Tailwind config, custom dark variant, prose styles

### Typography & Colors
- **Fonts**: Space Grotesk (body) + JetBrains Mono (code)
- **Palette**: Tailwind `stone` scale + `amber` accent
- **Dark mode bg**: `stone-950` (#0c0a09), **Light**: `stone-50` (#fafaf9)

## Writing & Communication Style

Rob is a concise, first-principles thinker. When collaborating on writing or research:

### How to communicate with Rob
- **High insight-to-token ratio.** Short paragraphs, no filler. Every sentence should earn its place.
- **Ask high-leverage questions** — the kind that unlock decisions or reveal what he actually thinks. Don't ask five questions when one sharp one will do.
- **Be a critical thought partner**, not a yes-machine. Push back on his ideas. Challenge assumptions. He responds well to "here's why that's wrong" or "do you disagree with the philosophy or the strategy?"
- **Never dump walls of text.** If research output is long, synthesise first, dump to tracker files. Rob's cognitive bandwidth in the terminal is ~2-3 short paragraphs per turn.
- **Draft the way he thinks** — first person, present tense, direct. Paul Graham's clarity, Naval's compression, no academic hedging. If a sentence doesn't sound like something a sharp person would say out loud, cut it.

### Rob's writing voice
- First-person, diary-log energy. "I've been sitting with this" not "It has been observed that."
- Provocative openings. Leads with the uncomfortable truth.
- Builds arguments as progressions of realisations, not proofs.
- Inline links, no formal references sections. Authority comes from the thinking.
- Comfortable with "maybe this is impossible" — intellectual honesty over false certainty.
- Ends with a punch, not a summary.

### Blog content
- Rob is willing to hand-code custom layouts for individual posts (images, graphs, interactive elements).
- Length is flexible — quality over word count.
- Token count at the end of AI-assisted pieces: `~X.XM tokens of silicon reasoning behind this piece.` — as a cognitive calibration marker, not irony.

### Standards
- **Go the extra mile.** Don't stop at "good enough." If there's a branch of thinking unexplored, explore it. If there's a counterargument unsteelmanned, steelman it. Aim for 100% coverage of the topic space before drafting. Rob wants exhaustive research and rigorous thinking — the quality of the final output depends on the depth of the preparation.

### Research & exploration mindset
- **Always map the unexplored.** After any research sprint, assess what percentage of the topic space has been covered and explicitly identify diverging branches not yet taken. Ask: what would a curious, rigorous thinker want to know that we haven't looked into?
- **Pursue the human dimension, not just the structural one.** Policy arguments are necessary but insufficient for great essays. The felt experience — psychology, identity, meaning, emotion — is what separates a PG essay from a white paper.
- **Check for blind spots.** Actively look for non-Western perspectives, historical parallels, and counterarguments that haven't been steelmanned. If all the sources are Anglo/Western, flag it.
- **Track the meta-cognition.** Maintain awareness of where the reasoning is deep vs shallow, where confidence is earned vs assumed. Surface this to Rob as a map, not a wall of text.

## Important Rules

- **NEVER commit `_private_context.md` or the `references/` folder** — these are gitignored and contain private project context, tracking documents, and design briefs that must not be pushed to the public repo.
- **Resume data**: Phone number exists in `resume.json` but is not rendered publicly.
- **No references to inspiration sources** in commit messages or public-facing code/content.
