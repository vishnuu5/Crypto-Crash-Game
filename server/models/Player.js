const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema(
  {
    playerId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    wallets: {
      BTC: {
        balance: { type: Number, default: 0 },
        usdValue: { type: Number, default: 0 },
      },
      ETH: {
        balance: { type: Number, default: 0 },
        usdValue: { type: Number, default: 0 },
      },
    },
    totalUsdBalance: {
      type: Number,
      default: 1000, // Starting balance
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Player", playerSchema);
