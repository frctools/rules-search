# FRCTools Rules Search

Search and browse FRC and FTC rule manuals quickly. 

## What you can do

- Search rules by keyword or rule number
- Switch between seasons and FRC/FTC manuals
- Narrow results by section
- Share direct links to a rule page

## How to use it

1. Pick the season from the top nav.
2. Type a keyword like "batteries" or a rule like "R101".
3. Use the section filter to narrow results if you get too many hits.
4. Open a result to see related rules.

Tip: If results feel off, toggle semantic search to compare with classic search.

## Local development (optional)

If you want to run the site locally:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Maintainers: Updating rules

Rules are indexed from the official manual HTML. To update a season:

```bash
MEILI_WRITE_KEY=... GEMINI_KEY=... YEAR_SPECIFIC=2026 npm run rules:update
```

This is run in CI automatically every day during the build season.

More details and kickoff notes live in [importing-a-new-year.md](importing-a-new-year.md).

## Optional services

The [imagen](imagen) folder contains a Cloudflare Worker used to generate rule screenshots. It is deployed separately from the Nuxt app.
