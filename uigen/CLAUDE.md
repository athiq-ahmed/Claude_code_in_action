# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users chat with an AI to describe components they want, and the AI creates them using tools that manipulate a virtual file system.

## Commands

```bash
npm run dev          # Start dev server with turbopack (http://localhost:3000)
npm run dev:daemon    # Dev server with output logged to logs.txt
npm run build         # Production build
npm run start         # Start production server
npm run lint          # Run ESLint
npm run test          # Run Vitest tests
npm run test -- path  # Run a single test file
npm run setup         # Install deps, generate Prisma client, run migrations
npm run db:reset      # Reset database (force reset migrations)
```

## Architecture

### AI Integration
- Uses Vercel AI SDK with Anthropic Claude for streaming responses
- **Provider selection** (`src/lib/provider.ts`): If `ANTHROPIC_API_KEY` is set, uses real Anthropic. Otherwise, uses `MockLanguageModel` which generates static demo components.
- **Tools**: Two AI tools - `str_replace_editor` (create/edit files) and `file_manager` (rename/delete)
- **MaxSteps**: 40 for real API, 4 for mock (to prevent repetition)

### Virtual File System
All generated code lives in a virtual file system (`src/lib/file-system.ts`) - **nothing is written to disk**. The `VirtualFileSystem` class provides:
- `create`, `str_replace`, `view`, `insert` operations on files
- Serialization/deserialization for passing state to the AI
- Two contexts use it: `FileSystemContext` (client state) and direct manipulation in API route

### Data Flow
1. User sends message via `ChatInterface` (client component)
2. `ChatProvider` wraps the UI and calls `/api/chat`
3. API route reconstructs a `VirtualFileSystem` from serialized data
4. AI responds with tool calls, which are handled by `str_replace_editor.ts` and `file-manager.ts`
5. On finish, if `projectId` exists and user is authenticated, state is saved to Prisma

### Persistence
- **Database**: Prisma + SQLite (`prisma/dev.db`)
- **Models**: `User` (email, password) and `Project` (name, messages JSON, data JSON)
- **Auth**: JWT sessions stored in cookies via `jose` library
- Anonymous users can use the app but their work is tracked in localStorage (`anon-work-tracker.ts`)

### Key Contexts
- `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`): Client-side VFS state
- `ChatContext` (`src/lib/contexts/chat-context.tsx`): AI chat state, passes VFS to AI

### UI Layout
Three-panel layout in `main-content.tsx`:
- **Left**: Chat interface
- **Right**: Preview (live rendered component) or Code (file tree + Monaco editor)
- Resizable panels using `react-resizable-panels`

## Tech Stack
- Next.js 15 App Router (server/client component separation)
- React 19 with server actions
- Tailwind CSS v4 with custom UI components (Radix UI primitives)
- Prisma ORM with SQLite
- Vercel AI SDK + Anthropic Claude
- Monaco Editor for code editing
- Babel standalone for client-side JSX transformation

## Key Files
- `src/app/api/chat/route.ts` - Main AI interaction endpoint
- `src/lib/tools/str-replace.ts` - Tool for creating/editing files
- `src/lib/prompts/generation.tsx` - System prompt for the AI
- `src/app/main-content.tsx` - Main UI layout
- `src/components/chat/ChatInterface.tsx` - Chat UI component
- `src/components/preview/PreviewFrame.tsx` - Live component preview
