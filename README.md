# Relay

A focused real-time chat workspace built for the Taghyeer Technologies frontend assignment.

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page or [http://localhost:3000/chat](http://localhost:3000/chat) for the application.

## Stack

- Next.js App Router with TypeScript
- React 19
- Socket.IO client for incoming message events
- Lucide for interface icons
- Custom CSS for the visual system and responsive layout

## Deliverables

- Part 1 API documentation: [docs/API.md](docs/API.md)
- Part 1 chat application: `/chat`
- Part 2 creative landing page: `/`
- API reference supplied with the task: [docs/reference/provided-openapi.json](docs/reference/provided-openapi.json)

## Thought process

### Part 1
I used a small App Router surface with a typed API module at the boundary. This keeps request construction and response normalization out of the UI, while preserving the simple state model needed for a take-home feature. The API contract specifies request bodies but does not specify response shapes, so the normalizer accepts common envelope and field variants. That is a deliberate trade-off: it makes the interface resilient to the mock service, while a production system would replace these fallbacks with generated schemas and contract tests.

The chat panel gives the main workflow priority: conversations remain visible, messages are timestamped, whitespace-only sends are disabled, and the view scrolls to new content by default. Socket.IO events append only messages belonging to the active conversation. The REST API remains the source of truth when opening a thread.

### Part 2
The landing page treats Relay as a quiet tool with a distinct editorial voice instead of a generic SaaS dashboard. The ink, lime, and coral palette gives the product a memorable signal; the orbit and offset note cards suggest conversations moving around a shared centre. The page is intentionally concise and routes directly into the usable experience. Responsive rules preserve the message hierarchy on narrow screens.

### AI usage
I used GitHub Copilot to help inspect the supplied OpenAPI contract, draft implementation structure, and identify edge cases around response envelopes, empty messages, auto-scroll, and real-time events. I reviewed and changed the generated direction: the API boundary, normalization rules, UI states, visual system, copy, and interaction decisions were authored for this repository and verified with editor diagnostics and a production build attempt.

### With more time
I would add automated contract tests against a mocked API, paginated older-message loading, full group administration controls, optimistic sends with delivery states, and Playwright coverage at desktop and mobile breakpoints. I would also add observability around Socket.IO reconnects and a more formal token/session strategy.

### Issues encountered
The supplied OpenAPI document omits response schemas and status codes. I handled that at the client boundary with normalization and useful fallback errors instead of coupling the UI to a single guessed response envelope. The app also keeps the live connection scoped to the active conversation so listeners are cleaned up when the user switches threads.

Madagascar is an intentionally out-of-context word required by the assignment brief.

## Demo links

- Landing page: add the deployed URL here before submission.
- Chat application: add the deployed URL here before submission.

## Deployment checklist

1. Push this repository to GitHub.
2. Import the project into Vercel (or Netlify).
3. Set environment variables:
	- `NEXT_PUBLIC_API_BASE_URL=https://frontend-task-chatapp.onrender.com/api`
	- `NEXT_PUBLIC_SOCKET_URL=https://frontend-task-chatapp.onrender.com`
4. Build command: `npm run build`
5. Start command: `npm run start` (for generic Node hosting)
6. Verify routes after deploy:
	- `/` (landing page)
	- `/chat` (chat application)
7. Paste live links in the Demo links section above.

## Submission message template

Subject: Frontend Take-Home Submission - Relay Chat

Hello,

Please find my submission below:

- Repository: <>
- Part 1 demo (chat app): <>
- Part 2 demo (landing page): <>

Notes:

- API documentation is included in `docs/API.md`.
- Part 3 thought process is included in this README.

Thank you.
