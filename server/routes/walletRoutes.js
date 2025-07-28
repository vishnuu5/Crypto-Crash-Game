const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Player = require("../models/Player");
const Transaction = require("../models/Transaction");
const CryptoService = require("../services/CryptoService");

// Get player wallet with crypto and USD equivalent balances
router.get("/:playerId", async (req, res) => {
  try {
    const { playerId } = req.params;
    const player = await Player.findOne({ playerId });

    if (!player) {
      return res
        .status(404)
        .json({ success: false, error: "Player not found" });
    }

    // Get current crypto prices for USD equivalent calculation
    const prices = await CryptoService.getPrices(["BTC", "ETH"]);

    // Calculate USD values for crypto balances
    const walletData = {
      BTC: {
        balance: player.wallets.BTC.balance,
        usdValue: player.wallets.BTC.balance * prices.BTC,
        currentPrice: prices.BTC,
      },
      ETH: {
        balance: player.wallets.ETH.balance,
        usdValue: player.wallets.ETH.balance * prices.ETH,
        currentPrice: prices.ETH,
      },
    };

    // Calculate total portfolio value
    const totalCryptoValue = walletData.BTC.usdValue + walletData.ETH.usdValue;
    const totalPortfolioValue = player.totalUsdBalance + totalCryptoValue;

    res.json({
      success: true,
      data: {
        playerId: player.playerId,
        name: player.name,
        totalUsdBalance: player.totalUsdBalance,
        wallets: walletData,
        portfolio: {
          totalCryptoValue,
          totalPortfolioValue,
          usdPercentage: (
            (player.totalUsdBalance / totalPortfolioValue) *
            100
          ).toFixed(2),
          cryptoPercentage: (
            (totalCryptoValue / totalPortfolioValue) *
            100
          ).toFixed(2),
        },
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get transaction history with detailed information
router.get("/:playerId/transactions", async (req, res) => {
  try {
    const { playerId } = req.params;
    const { limit = 100, page = 1, type } = req.query;

    // Build query
    const query = { playerId };
    if (type && ["bet", "cashout", "deposit"].includes(type)) {
      query.transactionType = type;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(Number.parseInt(limit))
      .skip((Number.parseInt(page) - 1) * Number.parseInt(limit));

    // Get current prices for USD equivalent display
    const prices = await CryptoService.getPrices(["BTC", "ETH"]);

    const formattedTransactions = transactions.map((tx) => ({
      transactionHash: tx.transactionHash,
      roundId: tx.roundId,
      type: tx.transactionType,
      usdAmount: tx.usdAmount,
      cryptoAmount: tx.cryptoAmount,
      currency: tx.currency,
      priceAtTime: tx.priceAtTime,
      currentPrice: prices[tx.currency],
      multiplier: tx.multiplier,
      timestamp: tx.createdAt,
      // Calculate profit/loss for display
      profitLoss:
        tx.transactionType === "cashout"
          ? tx.usdAmount - (tx.cryptoAmount / tx.multiplier) * tx.priceAtTime
          : null,
    }));

    // Calculate summary statistics
    const summary = {
      totalTransactions: transactions.length,
      totalBets: transactions.filter((tx) => tx.transactionType === "bet")
        .length,
      totalCashouts: transactions.filter(
        (tx) => tx.transactionType === "cashout"
      ).length,
      totalBetAmount: transactions
        .filter((tx) => tx.transactionType === "bet")
        .reduce((sum, tx) => sum + tx.usdAmount, 0),
      totalWinnings: transactions
        .filter((tx) => tx.transactionType === "cashout")
        .reduce((sum, tx) => sum + tx.usdAmount, 0),
    };

    summary.netProfit = summary.totalWinnings - summary.totalBetAmount;

    res.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        summary,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: await Transaction.countDocuments(query),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add funds to wallet (for testing purposes)
router.post("/:playerId/deposit", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { playerId } = req.params;
    const { amount, currency = "USD" } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: "Invalid amount" });
    }

    const player = await Player.findOne({ playerId }).session(session);
    if (!player) {
      return res
        .status(404)
        .json({ success: false, error: "Player not found" });
    }

    // Generate mock transaction hash
    const crypto = require("crypto");
    const transactionHash = "0x" + crypto.randomBytes(32).toString("hex");

    if (currency === "USD") {
      // Add USD to balance
      player.totalUsdBalance += amount;

      // Create transaction record
      const transaction = new Transaction({
        playerId,
        usdAmount: amount,
        cryptoAmount: 0,
        currency: "USD",
        transactionType: "deposit",
        transactionHash,
        priceAtTime: 1,
        timestamp: new Date(),
      });
      await transaction.save({ session });
    } else {
      // Add cryptocurrency directly
      if (!["BTC", "ETH"].includes(currency)) {
        throw new Error("Unsupported currency");
      }

      const currentPrice = await CryptoService.getPrice(currency);
      const usdValue = amount * currentPrice;

      player.wallets[currency].balance += amount;
      player.wallets[currency].usdValue =
        player.wallets[currency].balance * currentPrice;

      // Create transaction record
      const transaction = new Transaction({
        playerId,
        usdAmount: usdValue,
        cryptoAmount: amount,
        currency,
        transactionType: "deposit",
        transactionHash,
        priceAtTime: currentPrice,
        timestamp: new Date(),
      });
      await transaction.save({ session });
    }

    await player.save({ session });
    await session.commitTransaction();

    res.json({
      success: true,
      message: "Deposit successful",
      data: {
        transactionHash,
        newBalance:
          currency === "USD"
            ? player.totalUsdBalance
            : player.wallets[currency].balance,
        currency,
        amount,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, error: error.message });
  } finally {
    session.endSession();
  }
});

// Process cashout winnings (add crypto to balance, return USD equivalent)
router.post("/:playerId/process-cashout", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { playerId } = req.params;
    const { cryptoAmount, currency, multiplier, originalBetUsd } = req.body;

    const player = await Player.findOne({ playerId }).session(session);
    if (!player) {
      return res
        .status(404)
        .json({ success: false, error: "Player not found" });
    }

    // Get current price for USD equivalent
    const currentPrice = await CryptoService.getPrice(currency);
    const usdEquivalent = cryptoAmount * currentPrice;

    // Add crypto to wallet
    player.wallets[currency].balance += cryptoAmount;
    player.wallets[currency].usdValue =
      player.wallets[currency].balance * currentPrice;

    // Add USD equivalent to balance
    player.totalUsdBalance += usdEquivalent;

    await player.save({ session });

    // Create transaction record
    const crypto = require("crypto");
    const transaction = new Transaction({
      playerId,
      usdAmount: usdEquivalent,
      cryptoAmount,
      currency,
      transactionType: "cashout",
      transactionHash: "0x" + crypto.randomBytes(32).toString("hex"),
      priceAtTime: currentPrice,
      multiplier,
      timestamp: new Date(),
    });
    await transaction.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Cashout processed successfully",
      data: {
        cryptoAmount,
        usdEquivalent,
        currency,
        multiplier,
        transactionHash: transaction.transactionHash,
        newBalance: {
          usd: player.totalUsdBalance,
          crypto: player.wallets[currency].balance,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, error: error.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;
