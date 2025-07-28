const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    playerId: {
      type: String,
      required: true,
    },
    roundId: String,
    usdAmount: {
      type: Number,
      required: true,
    },
    cryptoAmount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      enum: ["BTC", "ETH"],
    },
    transactionType: {
      type: String,
      required: true,
      enum: ["bet", "cashout", "deposit"],
    },
    transactionHash: {
      type: String,
      required: true,
    },
    priceAtTime: {
      type: Number,
      required: true,
    },
    multiplier: Number,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);
