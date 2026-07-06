import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
const ROOMS = ["General", "Tech Support"];
const TYPING_TIMEOUT_MS = 1500;

export default function App() {
  const [username, setUsername] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(ROOMS[0]);
  const [joined, setJoined] = useState(false);

  const [room, setRoom] = useState(ROOMS[0]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);

  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  // note: in dev, StrictMode mounts this twice, which used to give me
  // two live sockets per tab until I added the disconnect on cleanup
  useEffect(() => {
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.on("joined", ({ room: newRoom }) => {
      setRoom(newRoom);
      setMessages([]);
      setTypingUsers([]);
    });

    socket.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, { type: "chat", ...msg }]);
    });

    socket.on("system_message", (text) => {
      setMessages((prev) => [
        ...prev,
        { type: "system", text, timestamp: new Date().toISOString() },
      ]);
    });

    socket.on("user_typing", ({ username: who }) => {
      setTypingUsers((prev) => (prev.includes(who) ? prev : [...prev, who]));
    });

    socket.on("user_stop_typing", ({ username: who }) => {
      setTypingUsers((prev) => prev.filter((u) => u !== who));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleJoin = (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    socketRef.current.emit("join", { username: trimmed, room: selectedRoom });
    setJoined(true);
  };

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    socketRef.current.emit("send_message", { text: trimmed });
    setDraft("");
    socketRef.current.emit("stop_typing");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleDraftChange = (value) => {
    setDraft(value);
    socketRef.current.emit("typing");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit("stop_typing");
    }, TYPING_TIMEOUT_MS);
  };

  const handleSwitchRoom = (newRoom) => {
    if (newRoom === room) return;
    socketRef.current.emit("switch_room", { room: newRoom });
  };

  if (!joined) {
    return (
      <div className="join-screen">
        <div className="join-card">
          <h1>Track B — Realtime Chat</h1>
          <p className="subtitle">Socket.io bidirectional messaging demo</p>
          <form onSubmit={handleJoin}>
            <label htmlFor="username">Your name</label>
            <input
              id="username"
              placeholder="e.g. Sadashiv"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />

            <label htmlFor="room">Room</label>
            <select
              id="room"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
            >
              {ROOMS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <button type="submit">Join chat</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-screen">
      <aside className="rooms-panel">
        <h2>Rooms</h2>
        <ul>
          {ROOMS.map((r) => (
            <li key={r}>
              <button
                className={r === room ? "room-btn active" : "room-btn"}
                onClick={() => handleSwitchRoom(r)}
              >
                {r}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="chat-panel">
        <header className="chat-header">
          <h2>{room}</h2>
          <span className="you-are">signed in as {username}</span>
        </header>

        <div className="messages">
          {messages.map((m, i) =>
            m.type === "system" ? (
              <div key={i} className="system-msg">
                {m.text}
              </div>
            ) : (
              <div key={i} className="chat-msg">
                <span className="chat-user">[{m.username}]:</span> {m.text}
              </div>
            )
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="typing-indicator">
          {typingUsers.length > 0 &&
            `${typingUsers.join(", ")} ${
              typingUsers.length > 1 ? "are" : "is"
            } typing...`}
        </div>

        <form className="composer" onSubmit={handleSend}>
          <input
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            placeholder={`Message ${room}...`}
          />
          <button type="submit">Send</button>
        </form>
      </main>
    </div>
  );
}
