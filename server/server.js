const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const connectDB = require("./config/database");
const gameRoutes = require("./routes/gameRoutes");
const walletRoutes = require("./routes/walletRoutes");
const GameEngine = require("./services/GameEngine");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

connectDB();

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.coingecko.com"],
      },
    },
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting - more restrictive for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 1000, // More restrictive in production
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Specific rate limiting for betting endpoints
const bettingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 bets per minute per IP
  message: {
    success: false,
    error: "Too many betting requests, please slow down.",
  },
});

// Initialize Game Engine
const gameEngine = new GameEngine(io);
app.set("gameEngine", gameEngine); // Make game engine available to routes

app.use("/api/game", gameRoutes);
app.use("/api/wallet", walletRoutes);

// Apply betting rate limit to bet endpoint
app.use("/api/game/bet", bettingLimiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API documentation endpoint
app.get("/api/docs", (req, res) => {
  res.json({
    success: true,
    documentation: {
      endpoints: {
        "GET /health": "Health check",
        "GET /api/game/history": "Get game round history",
        "GET /api/game/current": "Get current game state",
        "POST /api/game/bet": "Place a bet (playerId, usdAmount, currency)",
        "POST /api/game/cashout": "Cash out current bet (playerId)",
        "POST /api/game/verify": "Verify crash point (roundId, seed)",
        "GET /api/game/round/:roundId": "Get detailed round information",
        "GET /api/wallet/:playerId": "Get player wallet information",
        "GET /api/wallet/:playerId/transactions": "Get transaction history",
        "POST /api/wallet/:playerId/deposit":
          "Add funds to wallet (amount, currency)",
      },
      websocketEvents: {
        client_to_server: {
          cashout: "Request cashout (playerId)",
        },
        server_to_client: {
          newRound: "New round started (roundId, hash)",
          gameStarted: "Game phase started (roundId, startTime)",
          multiplierUpdate: "Real-time multiplier update (multiplier, elapsed)",
          gameCrashed: "Game crashed (crashPoint, roundId)",
          newBet:
            "Player placed bet (playerId, playerName, usdAmount, currency)",
          playerCashedOut: "Player cashed out (playerId, multiplier, payout)",
          gameState: "Current game state (sent on connection)",
        },
      },
    },
  });
});

// Socket.IO connection handling with enhanced security
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id} from ${socket.handshake.address}`);

  // Send current game state to new connection
  socket.emit("gameState", gameEngine.getCurrentState());

  // Handle cashout requests with validation
  socket.on("cashout", async (data) => {
    try {
      // Validate cashout data
      if (!data || !data.playerId) {
        socket.emit("error", { message: "Invalid cashout request" });
        return;
      }

      // Additional security: rate limiting per socket
      const now = Date.now();
      if (!socket.lastCashoutAttempt) {
        socket.lastCashoutAttempt = now;
      } else if (now - socket.lastCashoutAttempt < 1000) {
        // 1 second cooldown
        socket.emit("error", {
          message: "Please wait before attempting another cashout",
        });
        return;
      }
      socket.lastCashoutAttempt = now;

      const result = await gameEngine.handleCashout(data.playerId, socket.id);
      socket.emit("cashoutResult", result);
    } catch (error) {
      console.error(`Cashout error for socket ${socket.id}:`, error.message);
      socket.emit("error", { message: error.message });
    }
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
  });

  // Handle connection errors
  socket.on("error", (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// Start game engine after server setup
gameEngine.start();

// Global error handling
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
    process.exit(0);
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Crypto Crash Game Server running on port ${PORT}`);
  // console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  // console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  // console.log(`📖 API docs: http://localhost:${PORT}/api/docs`);
});
