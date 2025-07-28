const express = require("express");
const router = express.Router();
const GameRound = require("../models/GameRound");
const Player = require("../models/Player");
const Transaction = require("../models/Transaction");
const CryptoService = require("../services/CryptoService");
const GameEngine = require("../services/GameEngine");
const { validateBet, validateCashout } = require("../middleware/validation");

// Get game history with detailed information
router.get("/history", async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;

    const rounds = await GameRound.find({ status: "crashed" })
      .sort({ createdAt: -1 })
      .limit(Number.parseInt(limit))
      .skip((Number.parseInt(page) - 1) * Number.parseInt(limit));

    const formattedRounds = rounds.map((round) => ({
      roundId: round.roundId,
      crashPoint: round.crashPoint,
      startTime: round.startTime,
      endTime: round.endTime,
      totalBets: round.bets.length,
      totalBetAmount: round.bets.reduce((sum, bet) => sum + bet.usdAmount, 0),
      totalPayouts: round.bets
        .filter((bet) => bet.cashedOut)
        .reduce((sum, bet) => sum + (bet.payout?.usd || 0), 0),
      hash: round.hash, // For provably fair verification
    }));

    res.json({
      success: true,
      data: formattedRounds,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: await GameRound.countDocuments({ status: "crashed" }),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Place a bet in USD, converting to cryptocurrency
router.post("/bet", validateBet, async (req, res) => {
  try {
    const { playerId, usdAmount, currency } = req.body;

    // Get the game engine instance (this would be passed from server.js)
    const gameEngine = req.app.get("gameEngine");

    if (!gameEngine) {
      return res
        .status(500)
        .json({ success: false, error: "Game engine not available" });
    }

    const result = await gameEngine.handleBet(playerId, usdAmount, currency);

    res.json({
      success: true,
      message: "Bet placed successfully",
      data: {
        roundId: gameEngine.currentRound?.roundId,
        bet: result.bet,
        transactionHash: result.transactionHash,
        remainingBalance: result.bet.playerBalance,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Cash out during a round (also available via WebSocket)
router.post("/cashout", validateCashout, async (req, res) => {
  try {
    const { playerId } = req.body;

    const gameEngine = req.app.get("gameEngine");

    if (!gameEngine) {
      return res
        .status(500)
        .json({ success: false, error: "Game engine not available" });
    }

    const result = await gameEngine.handleCashout(playerId);

    res.json({
      success: true,
      message: "Cashed out successfully",
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get current round information
router.get("/current", async (req, res) => {
  try {
    const gameEngine = req.app.get("gameEngine");

    if (!gameEngine) {
      return res
        .status(500)
        .json({ success: false, error: "Game engine not available" });
    }

    const currentState = gameEngine.getCurrentState();

    res.json({
      success: true,
      data: {
        ...currentState,
        currentPrices: await CryptoService.getPrices(["BTC", "ETH"]),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify crash point for provably fair gaming
router.post("/verify", async (req, res) => {
  try {
    const { roundId, seed } = req.body;

    if (!roundId || !seed) {
      return res.status(400).json({
        success: false,
        error: "Round ID and seed are required",
      });
    }

    const round = await GameRound.findOne({ roundId });
    if (!round) {
      return res.status(404).json({ success: false, error: "Round not found" });
    }

    // Extract round number from roundId
    const roundNumber = roundId.split("_")[1];

    // Verify the crash point
    const isValid = GameEngine.verifyCrashPoint(
      seed,
      roundNumber,
      round.crashPoint
    );

    // Also verify the hash
    const crypto = require("crypto");
    const calculatedHash = crypto
      .createHash("sha256")
      .update(seed + roundNumber)
      .digest("hex");
    const hashMatches = calculatedHash === round.hash;

    res.json({
      success: true,
      data: {
        roundId,
        valid: isValid && hashMatches,
        providedSeed: seed,
        storedHash: round.hash,
        calculatedHash,
        crashPoint: round.crashPoint,
        hashMatches,
        crashPointValid: isValid,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get detailed round information
router.get("/round/:roundId", async (req, res) => {
  try {
    const { roundId } = req.params;

    const round = await GameRound.findOne({ roundId });
    if (!round) {
      return res.status(404).json({ success: false, error: "Round not found" });
    }

    // Get transaction details for this round
    const transactions = await Transaction.find({ roundId }).sort({
      createdAt: 1,
    });

    res.json({
      success: true,
      data: {
        round,
        transactions,
        summary: {
          totalBets: round.bets.length,
          totalBetAmount: round.bets.reduce(
            (sum, bet) => sum + bet.usdAmount,
            0
          ),
          totalPayouts: round.bets
            .filter((bet) => bet.cashedOut)
            .reduce((sum, bet) => sum + (bet.payout?.usd || 0), 0),
          playersWon: round.bets.filter((bet) => bet.cashedOut).length,
          playersLost: round.bets.filter((bet) => !bet.cashedOut).length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
