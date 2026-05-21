# Human Second Brain

An AI-powered personal memory system — capture thoughts, notes, ideas, and learnings, then search and chat with them using Gemini AI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at /api)
- `pnpm --filter @workspace/second-brain run dev` — run the frontend (Vite dev server)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `GEMINI_API_KEY`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4 + shadcn/ui + wouter routing
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: Clerk (via `@clerk/react` + `@clerk/express`)
- AI: Google Gemini 2.5 Flash via `@google/genai` (direct, using GEMINI_API_KEY)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/` — generated React Query hooks + Zod schemas
- `lib/db/src/schema/` — Drizzle ORM schema (memories, uploaded_files, conversations, messages)
- `artifacts/api-server/src/routes/` — Express route handlers (memories, files, chat, search, stats)
- `artifacts/second-brain/src/pages/` — React pages
- `artifacts/second-brain/src/components/` — UI components (shadcn/ui in ui/)

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed hooks in frontend. Never write manual fetch calls except for streaming (SSE) and file upload (FormData).
- Gemini AI used for two purposes: (1) SSE streaming chat with RAG from user memories, (2) semantic search ranking
- Clerk auth with proxy URL wiring: `publishableKeyFromHost` + `proxyUrl` for both dev and prod compatibility
- Tailwind v4 dark mode: uses `color-scheme: dark` on `<html>` globally rather than `.dark` class utility (which doesn't exist in v4)
- File uploads use multer, stored to `artifacts/api-server/uploads/`, extracted text stored as a memory

## Product

- **Memories**: Store typed (thought/note/learning/idea/journal/task) memories with categories, tags, pin
- **Chat**: Conversational AI with full RAG over all user memories, streaming responses
- **Search**: Semantic AI search using Gemini to rank relevance
- **Files**: Upload PDF/TXT/DOCX → auto-indexed as memories
- **Dashboard**: Stats, activity feed, category breakdown

## User preferences

- Uses own Gemini API key (GEMINI_API_KEY), not Replit AI proxy
- Dark SaaS UI, deep navy + indigo/violet + amber accents

## Gotchas

- In Tailwind v4, `dark` is not a utility class — use `color-scheme: dark` on html element instead
- SSE chat streaming: use raw `fetch` + `ReadableStream`, NOT the generated `useSendMessage` hook
- File uploads: use raw `fetch` + `FormData`, NOT the generated `useUploadFile` hook  
- `parseInt(req.params["id"] as string)` cast needed due to Express 5 params typing (`string | string[]`)
- Run `pnpm run typecheck:libs` before `pnpm --filter @workspace/api-server run typecheck` to rebuild DB lib declarations

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
