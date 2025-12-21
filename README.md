# MarryQuest

Production-ready Next.js baseline for the MarryQuest invitation experience.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Lint

```bash
npm run lint
```

## Environment variables

No environment variables are required for the baseline build.

## Project notes

- Pages Router only (`/pages`), no `/app` directory.
- React 18 + TypeScript + TailwindCSS + shadcn/ui components.
- Security headers are applied via `next.config.js` for every route.
- Theme templates are driven by the invitation `templateKey` in `components/theme`.
- API routes are protected with a lightweight in-memory rate limiter (replace with a shared store for production scale).
