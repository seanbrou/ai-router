# AI Sorter

Standalone Stremio add-on workspace for a Gemini-powered stream ranking service.

## What This Repo Is

This folder is intentionally independent from the parent `C:\Oat` repo. It contains only the new Stremio add-on app:

- Next.js app router UI for `/`, `/configure`, and `/install/[profileToken]`
- Vercel-compatible API routes for Stremio manifest and stream responses
- Convex backend for anonymous profiles, provider entries, install tokens, secrets, and ranking logs
- Local environment contract for Vercel, Convex, and Gemini

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example env file and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

3. Start Convex for this repo:

   ```bash
   npx convex dev
   ```

   Keep this running while you use the app locally. It generates `convex/_generated`, serves the local backend, and powers profile storage.

4. Start the web app:

   ```bash
   npm run dev
   ```

## Vercel Deploy Flow

1. Create a new Vercel project rooted at this repo.
2. Add the variables from `.env.example` in the Vercel dashboard.
3. Deploy and note the live project URL.
4. Update `NEXT_PUBLIC_APP_URL` and `CONVEX_SITE_URL` to match the live domain.

## Stremio Install Flow

The intended public add-on endpoints are:

- `/api/stremio/[profileToken]/manifest.json`
- `/api/stremio/[profileToken]/stream/[type]/[id].json`

Users configure a profile at `/configure`, add compatible provider manifest URLs such as Torrentio or Debridio, then install the generated manifest URL into Stremio on any supported device.

## Current Status

- Anonymous profile creation and editing are implemented through Convex.
- Provider aggregation works against user-supplied compatible Stremio manifest URLs.
- The stream route normalizes candidates, applies deterministic preference scoring, and optionally reranks with Gemini if the user provides an API key.
- A public Vercel deployment is still blocked until valid Vercel credentials and a non-local Convex deployment are configured.
