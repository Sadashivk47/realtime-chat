# Track B — Realtime Chat (Socket.io)

Fullstack sprint submission covering all 3 phases:
- **Phase 1:** base WebSocket connection + broadcast
- **Phase 2:** username identity + typing indicators
- **Phase 3:** room segregation (`General`, `Tech Support`)

## Structure

```
track-b-realtime-chat/
├── server/      # Express + Socket.io backend
├── client/      # React (Vite) frontend
└── Prompts.md   # AI usage disclosure (required for submission)
```

## Run locally

**Terminal 1 — server**
```bash
cd server
npm install
cp .env.example .env
npm run dev        # or: npm start
```
Server runs on `http://localhost:4000`.

**Terminal 2 — client**
```bash
cd client
npm install
cp .env.example .env
npm run dev
```
Client runs on `http://localhost:5173`.

## QA demo (matches the 3-min fullstack requirement)

1. Open two browser windows at `http://localhost:5173`.
2. Join both with different names, same room (e.g. `General`).
3. Type in one window — the other shows the typing indicator, then the message on send.
4. Switch one window to `Tech Support` and send a message — confirm the other window (still in `General`) does not receive it.

## Deployment

- **Server:** deploy to Render (or similar). Set `CLIENT_URL` env var to your deployed client's origin so the Socket.io CORS check passes.
- **Client:** deploy to Vercel/Render static site. Set `VITE_SERVER_URL` to your deployed server's URL, then rebuild.

## Key implementation notes

- Socket.io CORS is configured separately from Express's `cors()` middleware — see `server/index.js`.
- The client's `useEffect` cleanup calls `socket.disconnect()` to avoid duplicate connections caused by React 18 StrictMode double-invoking effects in dev.
- Room state lives on `socket.data` per connection; switching rooms (`switch_room`) calls `socket.leave()` / `socket.join()` without dropping the underlying WebSocket connection.

