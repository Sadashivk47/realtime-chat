# Prompts.md — AI Prompt Engineering Strategy

This document records how AI assistance was used to build this Track B (Fullstack) submission, per the sprint's AI-disclosure requirement.

## Approach

I used Claude to scaffold the Socket.io server and React client end-to-end in one pass, then reviewed and adjusted the generated code against the sprint spec (Phases 1–3) and the sprint FAQ before testing locally.

## Prompt used

> "Build a complete Track B fullstack submission: a Node.js/Express + Socket.io backend and a React (Vite) client. Requirements:
> - Phase 1: base MVP — client connects via socket.io-client, sends a message, server broadcasts it back to all clients.
> - Phase 2: user picks a username before connecting; messages render as `[username]: text`; typing events emit from client to server and server broadcasts a 'X is typing...' indicator to other clients in real time.
> - Phase 3: replace global broadcast with room-based routing — at least two rooms ('General', 'Tech Support'); messages in a room only reach clients subscribed to that room; users can switch rooms without a full reconnect.
> - Handle the known FAQ issues: Socket.io CORS must be configured separately from Express CORS; guard against React 18 StrictMode double-invoking the socket connection effect (disconnect on cleanup); use `socket.broadcast.emit`/`socket.to(room).emit` where the sender shouldn't receive their own event, and `io.emit`/`io.to(room).emit` where they should.
> - Structure it as a real deployable project (separate server/ and client/ folders, package.json for each, .env.example files) not a single throwaway file."

## What I changed after generation

- Added a `switch_room` server event so a user can move between rooms without disconnecting/reconnecting the socket (the initial draft only supported picking a room at join time).
- Tightened the typing indicator to auto-clear after 1.5s of inactivity via a debounced `stop_typing` emit, instead of only clearing on message send.
- Confirmed `socket.data` (per-connection state for username/room) is used instead of a global in-memory map, since Socket.io v4 supports this natively and it avoids manual cleanup on disconnect.
- Verified the `useEffect` cleanup (`socket.disconnect()`) actually prevents duplicate connections under React 18 StrictMode in dev, per FAQ item 8.

## What I did not change

- Kept the CORS configuration pattern from the FAQ (explicit `cors` object passed to `new Server(...)`) rather than a wildcard origin, so it's clear the two CORS layers (Express HTTP vs Socket.io) are handled deliberately, not accidentally left permissive.
