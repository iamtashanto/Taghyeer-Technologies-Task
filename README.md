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

## Key Features Implemented

- **Component-Based Architecture**: Structured the chat interface into modular, focused components (`Sidebar`, `ChatHeader`, `MessageList`, `ChatInput`, `ProfileModal`) to ensure the codebase remains maintainable and scalable.
- **Smart Conversation Sorting**: Implemented dynamic sorting so that conversations with the most recent messages automatically move to the top of the list.
- **Responsive Mobile Layout**: Designed the mobile UI to feel like a native application, utilizing full-width screens, conditional sidebar rendering, and intuitive back navigation.
- **Professional Date Formatting**: Formatted dates and times dynamically (e.g., "1:07 PM" for today, "Aug 22, 1:07 PM" for older messages) to provide clear, user-friendly context instead of raw military time.
- **URL State Persistence**: Synced the active chat state with the URL (`?chat=ID`) using `window.history.replaceState`. This allows users to refresh the page or share links without losing their current chat context.
- **Real-Time Synchronization**: Fully integrated `Socket.IO` to listen for new messages and conversation updates, automatically fetching data and updating the UI in real-time.
- **Enhanced Group UX**: Added the ability to seamlessly start a direct message with any participant straight from the group's member list.
- **Polished User Experience (UX)**: Focused on the small details by adding a custom favicon, clean skeleton loading states, smart scroll-to-bottom mechanics, and removing unsupported UI elements to keep the interface strictly functional and professional.

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
I authored the core application logic and architecture manually. Given the time constraints of a take-home assignment, I utilized AI primarily to gather UI design inspiration, explore layout structures, and act as a pair-programming assistant to review my code for potential edge cases. I reviewed all AI suggestions carefully and selectively integrated them to ensure they met the project's standards. The API boundary, normalization rules, state management, and core interaction decisions were entirely my own work, verified with editor diagnostics and a production build.

### With more time
I would add automated contract tests against a mocked API, paginated older-message loading, full group administration controls, optimistic sends with delivery states, and Playwright coverage at desktop and mobile breakpoints. I would also add observability around Socket.IO reconnects and a more formal token/session strategy.

### Issues encountered
The supplied OpenAPI document omits response schemas and status codes. I handled that at the client boundary with normalization and useful fallback errors instead of coupling the UI to a single guessed response envelope. The app also keeps the live connection scoped to the active conversation so listeners are cleaned up when the user switches threads.

Madagascar is an intentionally out-of-context word required by the assignment brief.

## Demo links

- Landing page: [https://taghyeer-technologies-task.vercel.app/](https://taghyeer-technologies-task.vercel.app/)
- Chat application: [https://taghyeer-technologies-task.vercel.app/chat](https://taghyeer-technologies-task.vercel.app/chat)

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

## Submission

- Repository: https://github.com/iamtashanto/Taghyeer-Technologies-Task
- Part 1 demo (chat app): https://taghyeer-technologies-task.vercel.app/chat
- Part 2 demo (landing page): https://taghyeer-technologies-task.vercel.app/

Thank you.
