const Joi = require("joi");

// Validation schema for placing bets
const betSchema = Joi.object({
  playerId: Joi.string().required().min(1).max(50),
  usdAmount: Joi.number().min(1).max(10000).required(),
  currency: Joi.string().valid("BTC", "ETH").required(),
});

// Validation schema for cashout requests
const cashoutSchema = Joi.object({
  playerId: Joi.string().required().min(1).max(50),
});

// Validation schema for wallet deposits
const depositSchema = Joi.object({
  amount: Joi.number().min(0.01).max(100000).required(),
  currency: Joi.string().valid("USD", "BTC", "ETH").default("USD"),
});

const validateBet = (req, res, next) => {
  const { error } = betSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: "Validation Error",
      details: error.details[0].message,
    });
  }
  next();
};

const validateCashout = (req, res, next) => {
  const { error } = cashoutSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: "Validation Error",
      details: error.details[0].message,
    });
  }
  next();
};

const validateDeposit = (req, res, next) => {
  const { error } = depositSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: "Validation Error",
      details: error.details[0].message,
    });
  }
  next();
};

module.exports = {
  validateBet,
  validateCashout,
  validateDeposit,
};
