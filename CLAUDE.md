# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal academic portfolio site built with the **al-folio** Jekyll theme. It belongs to Rob Maye and is deployed to https://robmaye.github.io via GitHub Pages.

## Build & Development Commands

```bash
# Local development server (requires Ruby + Bundler)
bundle exec jekyll serve --lsi

# Production build
JEKYLL_ENV=production bundle exec jekyll build --lsi

# Docker development (alternative to local Ruby setup)
docker compose up

# Purge unused CSS (run after build for production)
purgecss -c purgecss.config.js

# Install dependencies
bundle install
```

## Deployment

- **Automatic**: Pushing to `master` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`) which builds and deploys to GitHub Pages.
- **Manual**: `bin/deploy` builds locally and force-pushes to the `gh-pages` branch.

The CI pipeline: checkout → Ruby 3.2.2 setup → install Jupyter → `jekyll build --lsi` → PurgeCSS → deploy to GitHub Pages.

## Architecture

### Content Model

| Directory | Purpose |
|---|---|
| `_pages/` | Main site pages (about, blog, cv, publications) |
| `_posts/` | Blog posts (blog name: "ruminations") |
| `_projects/` | Portfolio project entries |
| `_news/` | Homepage announcements |
| `_bibliography/papers.bib` | BibTeX publications database (processed by jekyll-scholar) |
| `_data/cv.yml` | CV content in YAML format |
| `assets/json/resume.json` | CV in JSON Resume format (loaded via jekyll-get-json) |

### Templating

- **Layouts** (`_layouts/`): Liquid templates — `default.liquid` is the base; `about.liquid`, `cv.liquid`, `post.liquid`, `distill.liquid` extend it.
- **Includes** (`_includes/`): Reusable partials for header, footer, social links, scripts, CV sections, and resume components.
- **Styles** (`_sass/`): `_base.scss` is the main stylesheet (~1120 lines); `_themes.scss` defines light/dark mode colors; `_variables.scss` has color palette definitions.

### Key Configuration

All site-wide settings live in `_config.yml`:
- **Jekyll Scholar**: APA style, groups by year descending, source is `/_bibliography/papers.bib`
- **Collections**: `news` and `projects` are custom Jekyll collections
- **Responsive images**: ImageMagick generates WebP variants at 480/800/1400px widths
- **14 Jekyll plugins** including scholar, archives, feed, imagemagick, jupyter-notebook, minifier, pagination

### Custom Plugins

Seven Ruby plugins in `_plugins/` handle cache-busting, file existence checks, Google Scholar citations, BibTeX filtering, and more.

### Feature Flags in `_config.yml`

Dark mode, MathJax, masonry layout, medium zoom, progress bar, and project categories are all toggled via `enable_*` booleans in `_config.yml`.
