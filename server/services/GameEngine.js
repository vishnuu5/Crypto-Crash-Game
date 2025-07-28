const crypto = require("crypto");
const mongoose = require("mongoose");
const GameRound = require("../models/GameRound");
const Player = require("../models/Player");
const Transaction = require("../models/Transaction");
const CryptoService = require("./CryptoService");

class GameEngine {
  constructor(io) {
    this.io = io;
    this.currentRound = null;
    this.gameState = "waiting"; // waiting, active, crashed
    this.multiplier = 1.0;
    this.startTime = null;
    this.crashPoint = null;
    this.gameInterval = null;
    this.roundInterval = null;
    this.activeBets = new Map();
    this.growthFactor = 0.1; // Multiplier growth rate
  }

  start() {
    console.log("Game Engine started");
    this.startNewRound();
  }

  async startNewRound() {
    try {
      // Wait 10 seconds between rounds
      if (this.gameState !== "waiting") {
        setTimeout(() => this.startNewRound(), 10000);
        return;
      }

      // Generate provably fair crash point
      const seed = crypto.randomBytes(32).toString("hex");
      const roundNumber = Date.now();
      const hash = crypto
        .createHash("sha256")
        .update(seed + roundNumber)
        .digest("hex");
      const crashPoint = this.generateProvablyFairCrashPoint(hash);

      // Create new round
      this.currentRound = new GameRound({
        roundId: `round_${roundNumber}`,
        seed,
        hash,
        crashPoint,
        startTime: new Date(),
        status: "waiting",
      });

      await this.currentRound.save();

      // Reset game state
      this.multiplier = 1.0;
      this.gameState = "waiting";
      this.activeBets.clear();

      // Notify clients of new round
      this.io.emit("newRound", {
        roundId: this.currentRound.roundId,
        hash: this.currentRound.hash,
        status: "waiting",
      });

      console.log(
        `New round started: ${this.currentRound.roundId}, Crash point: ${crashPoint}x`
      );

      // Start betting phase (5 seconds)
      setTimeout(() => this.startGame(), 5000);
    } catch (error) {
      console.error("Error starting new round:", error);
      setTimeout(() => this.startNewRound(), 5000);
    }
  }

  generateProvablyFairCrashPoint(hash) {
    // Convert hash to number and generate crash point between 1.01x and 120x
    const hashInt = Number.parseInt(hash.substring(0, 8), 16);
    const random = hashInt / 0xffffffff;

    // Use exponential distribution for realistic crash points
    const maxCrash = 120;
    const minCrash = 1.01;

    // Exponential distribution to make lower multipliers more common
    const crashPoint = Math.max(
      minCrash,
      Math.min(maxCrash, minCrash + -Math.log(1 - random * 0.99) * 2)
    );

    return Math.round(crashPoint * 100) / 100;
  }

  async startGame() {
    try {
      this.gameState = "active";
      this.startTime = Date.now();
      this.currentRound.status = "active";
      await this.currentRound.save();

      // Notify clients of game start
      this.io.emit("gameStarted", {
        roundId: this.currentRound.roundId,
        startTime: this.startTime,
        status: "active",
      });

      console.log(`Game started: ${this.currentRound.roundId}`);

      // Start multiplier updates
      this.gameInterval = setInterval(() => {
        this.updateMultiplier();
      }, 100); // Update every 100ms
    } catch (error) {
      console.error("Error starting game:", error);
    }
  }

  updateMultiplier() {
    if (this.gameState !== "active") return;

    const elapsed = (Date.now() - this.startTime) / 1000;
    this.multiplier = 1 + elapsed * this.growthFactor;

    // Check if game should crash
    if (this.multiplier >= this.currentRound.crashPoint) {
      this.crashGame();
      return;
    }

    // Broadcast multiplier update
    this.io.emit("multiplierUpdate", {
      multiplier: Math.round(this.multiplier * 100) / 100,
      elapsed,
      roundId: this.currentRound.roundId,
    });
  }

  async crashGame() {
    try {
      clearInterval(this.gameInterval);
      this.gameState = "crashed";
      this.currentRound.status = "crashed";
      this.currentRound.endTime = new Date();

      // Set final multiplier to crash point
      this.multiplier = this.currentRound.crashPoint;

      await this.currentRound.save();

      // Notify clients of crash
      this.io.emit("gameCrashed", {
        crashPoint: this.currentRound.crashPoint,
        roundId: this.currentRound.roundId,
        finalMultiplier: this.multiplier,
      });

      console.log(`Game crashed at ${this.currentRound.crashPoint}x`);

      // Process remaining bets as losses
      await this.processRemainingBets();

      // Start new round after delay
      setTimeout(() => {
        this.gameState = "waiting";
        this.startNewRound();
      }, 3000);
    } catch (error) {
      console.error("Error crashing game:", error);
    }
  }

  async handleBet(playerId, usdAmount, currency) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (this.gameState !== "waiting") {
        throw new Error("Betting is not allowed at this time");
      }

      // Validate bet amount
      if (usdAmount <= 0) {
        throw new Error("Invalid bet amount");
      }

      // Get player with session for atomicity
      const player = await Player.findOne({ playerId }).session(session);
      if (!player) {
        throw new Error("Player not found");
      }

      // Check balance
      if (player.totalUsdBalance < usdAmount) {
        throw new Error("Insufficient balance");
      }

      // Get current crypto price at time of bet
      const priceAtTime = await CryptoService.getPrice(currency);
      const cryptoAmount = usdAmount / priceAtTime;

      // Create bet object
      const bet = {
        playerId,
        playerName: player.name,
        usdAmount,
        cryptoAmount,
        currency,
        priceAtTime,
        cashedOut: false,
        timestamp: new Date(),
      };

      // Add bet to current round
      this.currentRound.bets.push(bet);
      await this.currentRound.save({ session });

      // Update player balance atomically
      player.totalUsdBalance -= usdAmount;
      player.wallets[currency].balance += cryptoAmount;
      await player.save({ session });

      // Create transaction record with mock blockchain hash
      const transaction = new Transaction({
        playerId,
        roundId: this.currentRound.roundId,
        usdAmount,
        cryptoAmount,
        currency,
        transactionType: "bet",
        transactionHash: this.generateMockTransactionHash(),
        priceAtTime,
        timestamp: new Date(),
      });
      await transaction.save({ session });

      // Commit transaction
      await session.commitTransaction();

      // Add to active bets
      this.activeBets.set(playerId, bet);

      // Notify all clients of new bet
      this.io.emit("newBet", {
        playerId,
        playerName: player.name,
        usdAmount,
        currency,
        cryptoAmount,
        roundId: this.currentRound.roundId,
      });

      console.log(
        `Bet placed: ${playerId} bet $${usdAmount} (${cryptoAmount} ${currency})`
      );

      return {
        success: true,
        bet,
        transactionHash: transaction.transactionHash,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async handleCashout(playerId, socketId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (this.gameState !== "active") {
        throw new Error("Cannot cash out at this time");
      }

      const bet = this.activeBets.get(playerId);
      if (!bet) {
        throw new Error("No active bet found");
      }

      if (bet.cashedOut) {
        throw new Error("Already cashed out");
      }

      // Calculate payout using current multiplier
      const currentMultiplier = Math.round(this.multiplier * 100) / 100;
      const cryptoPayout = bet.cryptoAmount * currentMultiplier;

      // Convert back to USD using price at time of bet for consistency
      const usdPayout = cryptoPayout * bet.priceAtTime;

      // Update bet status
      bet.cashedOut = true;
      bet.cashoutMultiplier = currentMultiplier;
      bet.payout = {
        crypto: cryptoPayout,
        usd: usdPayout,
      };

      // Update player balance atomically
      const player = await Player.findOne({ playerId }).session(session);
      player.totalUsdBalance += usdPayout;
      player.wallets[bet.currency].balance += cryptoPayout - bet.cryptoAmount; // Add profit
      await player.save({ session });

      // Update round with cashout info
      const betIndex = this.currentRound.bets.findIndex(
        (b) => b.playerId === playerId
      );
      if (betIndex !== -1) {
        this.currentRound.bets[betIndex] = bet;
        await this.currentRound.save({ session });
      }

      // Create cashout transaction with mock blockchain hash
      const transaction = new Transaction({
        playerId,
        roundId: this.currentRound.roundId,
        usdAmount: usdPayout,
        cryptoAmount: cryptoPayout,
        currency: bet.currency,
        transactionType: "cashout",
        transactionHash: this.generateMockTransactionHash(),
        priceAtTime: bet.priceAtTime,
        multiplier: currentMultiplier,
        timestamp: new Date(),
      });
      await transaction.save({ session });

      // Commit transaction
      await session.commitTransaction();

      // Remove from active bets
      this.activeBets.delete(playerId);

      // Notify all clients of cashout
      this.io.emit("playerCashedOut", {
        playerId,
        playerName: bet.playerName,
        multiplier: currentMultiplier,
        cryptoPayout,
        usdPayout,
        currency: bet.currency,
        roundId: this.currentRound.roundId,
      });

      console.log(
        `Cashout: ${playerId} cashed out at ${currentMultiplier}x for $${usdPayout.toFixed(
          2
        )}`
      );

      return {
        success: true,
        multiplier: currentMultiplier,
        payout: {
          crypto: cryptoPayout,
          usd: usdPayout,
        },
        transactionHash: transaction.transactionHash,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async processRemainingBets() {
    // Process all bets that didn't cash out as losses
    for (const [playerId, bet] of this.activeBets) {
      if (!bet.cashedOut) {
        console.log(
          `Player ${playerId} lost bet of $${bet.usdAmount} (${bet.cryptoAmount} ${bet.currency})`
        );

        // Update bet in database as lost
        const betIndex = this.currentRound.bets.findIndex(
          (b) => b.playerId === playerId
        );
        if (betIndex !== -1) {
          this.currentRound.bets[betIndex].lost = true;
          this.currentRound.bets[betIndex].lossAmount = bet.usdAmount;
        }
      }
    }

    // Save final round state
    await this.currentRound.save();
    this.activeBets.clear();
  }

  // Generate mock blockchain transaction hash
  generateMockTransactionHash() {
    return "0x" + crypto.randomBytes(32).toString("hex");
  }

  getCurrentState() {
    return {
      gameState: this.gameState,
      multiplier: Math.round(this.multiplier * 100) / 100,
      roundId: this.currentRound?.roundId,
      crashPoint:
        this.gameState === "crashed" ? this.currentRound?.crashPoint : null,
      activeBets: Array.from(this.activeBets.values()),
      timeElapsed: this.startTime ? (Date.now() - this.startTime) / 1000 : 0,
    };
  }

  // Verify crash point for provably fair gaming
  static verifyCrashPoint(seed, roundNumber, expectedCrashPoint) {
    const hash = crypto
      .createHash("sha256")
      .update(seed + roundNumber)
      .digest("hex");
    const hashInt = Number.parseInt(hash.substring(0, 8), 16);
    const random = hashInt / 0xffffffff;

    const maxCrash = 120;
    const minCrash = 1.01;
    const calculatedCrashPoint = Math.max(
      minCrash,
      Math.min(maxCrash, minCrash + -Math.log(1 - random * 0.99) * 2)
    );

    return (
      Math.abs(
        Math.round(calculatedCrashPoint * 100) / 100 - expectedCrashPoint
      ) < 0.01
    );
  }
}

module.exports = GameEngine;
