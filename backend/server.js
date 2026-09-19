const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");

require("dotenv").config();
const doubtRoutes = require("./routes/doubtRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    console.log("Socket.IO authentication failed: No token");
    return next(new Error("Authentication token required"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = decoded;

    next();
  } catch (error) {
    console.log("Socket.IO JWT verification failed:", error.message);
    next(new Error("Invalid authentication token"));
  }
});

io.on("connection", (socket) => {
  const { id, role } = socket.user;

  socket.join(`user:${id}`);
  socket.join(`role:${role}`);

  console.log(
    `Socket.IO client connected: ${socket.id} | User: ${id} | Role: ${role}`,
  );

  socket.on("disconnect", () => {
    console.log(
      `Socket.IO client disconnected: ${socket.id} | User: ${id} | Role: ${role}`,
    );
  });
});

app.use(cors());
app.use(express.json());
app.use("/api/doubts", doubtRoutes(io));
const notificationRoutes = require("./routes/notificationRoutes");

app.use("/api/notifications", notificationRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("PeerHelp backend is running");
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
