const mongoose = require("mongoose");
const Player = require("../models/Player");
const GameRound = require("../models/GameRound");
require("dotenv").config();

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/crypto-crash"
    );
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    // Clear existing data
    await Player.deleteMany({});
    await GameRound.deleteMany({});

    // Create sample players
    const players = [
      {
        playerId: "player1",
        name: "Alice",
        totalUsdBalance: 1000,
        wallets: {
          BTC: { balance: 0.01, usdValue: 450 },
          ETH: { balance: 0.5, usdValue: 1500 },
        },
      },
      {
        playerId: "player2",
        name: "Bob",
        totalUsdBalance: 750,
        wallets: {
          BTC: { balance: 0.005, usdValue: 225 },
          ETH: { balance: 0.3, usdValue: 900 },
        },
      },
      {
        playerId: "player3",
        name: "Charlie",
        totalUsdBalance: 1200,
        wallets: {
          BTC: { balance: 0.02, usdValue: 900 },
          ETH: { balance: 0.8, usdValue: 2400 },
        },
      },
      {
        playerId: "player4",
        name: "Diana",
        totalUsdBalance: 500,
        wallets: {
          BTC: { balance: 0.003, usdValue: 135 },
          ETH: { balance: 0.2, usdValue: 600 },
        },
      },
      {
        playerId: "player5",
        name: "Eve",
        totalUsdBalance: 2000,
        wallets: {
          BTC: { balance: 0.03, usdValue: 1350 },
          ETH: { balance: 1.0, usdValue: 3000 },
        },
      },
    ];

    await Player.insertMany(players);
    console.log("Sample players created");

    // Create sample game rounds
    const crypto = require("crypto");
    const rounds = [];

    for (let i = 0; i < 10; i++) {
      const seed = crypto.randomBytes(32).toString("hex");
      const hash = crypto.createHash("sha256").update(seed).digest("hex");
      const hashInt = Number.parseInt(hash.substring(0, 8), 16);
      const random = hashInt / 0xffffffff;
      const crashPoint = Math.max(1.01, Math.min(100, 1 / (1 - random * 0.99)));

      rounds.push({
        roundId: `round_${Date.now() - i * 60000}`,
        seed,
        hash,
        crashPoint: Math.round(crashPoint * 100) / 100,
        startTime: new Date(Date.now() - i * 60000),
        endTime: new Date(Date.now() - i * 60000 + 30000),
        status: "crashed",
        bets: [
          {
            playerId: "player1",
            playerName: "Alice",
            usdAmount: 50,
            cryptoAmount: 0.001,
            currency: "BTC",
            priceAtTime: 45000,
            cashedOut: crashPoint > 2,
            cashoutMultiplier: crashPoint > 2 ? 2.0 : null,
            payout:
              crashPoint > 2
                ? { crypto: 0.002, usd: 100 }
                : { crypto: 0, usd: 0 },
          },
        ],
      });
    }

    await GameRound.insertMany(rounds);
    console.log("Sample game rounds created");

    console.log("Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

connectDB().then(() => seedData());
