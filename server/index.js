const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);

// socket.io needs its own cors config, separate from the express one above,
// otherwise you get blocked even though the http routes work fine
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const ROOMS = ["General", "Tech Support"];

app.get("/", (req, res) => {
  res.send("chat server is up");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", rooms: ROOMS, connections: io.engine.clientsCount });
});

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  socket.data.username = null;
  socket.data.room = null;

  socket.on("join", ({ username, room }) => {
    if (!username || !ROOMS.includes(room)) return;

    socket.data.username = username;
    socket.data.room = room;
    socket.join(room);

    socket.to(room).emit("system_message", `${username} has joined ${room}`);
    socket.emit("joined", { room, rooms: ROOMS });
  });

  socket.on("send_message", ({ text }) => {
    const { username, room } = socket.data;
    if (!username || !room || !text || !text.trim()) return;

    io.to(room).emit("receive_message", {
      username,
      text: text.trim(),
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("typing", () => {
    const { username, room } = socket.data;
    if (!username || !room) return;
    socket.to(room).emit("user_typing", { username });
  });

  socket.on("stop_typing", () => {
    const { username, room } = socket.data;
    if (!username || !room) return;
    socket.to(room).emit("user_stop_typing", { username });
  });

  // lets a user hop between rooms without dropping the socket connection
  socket.on("switch_room", ({ room }) => {
    const { username, room: oldRoom } = socket.data;
    if (!ROOMS.includes(room) || room === oldRoom) return;

    socket.leave(oldRoom);
    socket.to(oldRoom).emit("system_message", `${username} has left ${oldRoom}`);

    socket.join(room);
    socket.data.room = room;
    socket.to(room).emit("system_message", `${username} has joined ${room}`);

    socket.emit("joined", { room, rooms: ROOMS });
  });

  socket.on("disconnect", () => {
    const { username, room } = socket.data;
    if (username && room) {
      socket.to(room).emit("system_message", `${username} has disconnected`);
    }
    console.log("disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
