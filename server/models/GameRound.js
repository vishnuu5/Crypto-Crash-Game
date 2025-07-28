const mongoose = require("mongoose");

const betSchema = new mongoose.Schema({
  playerId: String,
  playerName: String,
  usdAmount: Number,
  cryptoAmount: Number,
  currency: String,
  priceAtTime: Number,
  cashedOut: { type: Boolean, default: false },
  cashoutMultiplier: Number,
  payout: {
    crypto: Number,
    usd: Number,
  },
});

const gameRoundSchema = new mongoose.Schema(
  {
    roundId: {
      type: String,
      required: true,
      unique: true,
    },
    seed: {
      type: String,
      required: true,
    },
    hash: {
      type: String,
      required: true,
    },
    crashPoint: {
      type: Number,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: Date,
    bets: [betSchema],
    status: {
      type: String,
      enum: ["waiting", "active", "crashed", "completed"],
      default: "waiting",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("GameRound", gameRoundSchema);
