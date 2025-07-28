
import { useState } from "react"
import { useGame } from "../context/GameContext"
import { DollarSign, Bitcoin, Coins } from "lucide-react"

function BettingPanel() {
    const { gameState, playerBet, balance, selectedCurrency, prices, placeBet, dispatch } = useGame()

    const [betAmount, setBetAmount] = useState("")
    const [error, setError] = useState("")

    const quickBets = [10, 25, 50, 100]

    const handleBet = () => {
        const amount = Number.parseFloat(betAmount)

        if (!amount || amount <= 0) {
            setError("Please enter a valid bet amount")
            return
        }

        if (amount > balance) {
            setError("Insufficient balance")
            return
        }

        if (gameState !== "waiting") {
            setError("Cannot place bet at this time")
            return
        }

        if (placeBet(amount)) {
            setBetAmount("")
            setError("")
        } else {
            setError("Failed to place bet")
        }
    }

    const getCryptoAmount = () => {
        const amount = Number.parseFloat(betAmount)
        if (!amount || !prices[selectedCurrency]) return "0"
        return (amount / prices[selectedCurrency]).toFixed(8)
    }

    const canBet = gameState === "waiting" && !playerBet

    return (
        <div className="card">
            <h3 className="text-xl font-semibold mb-6 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-blue-400" />
                Place Your Bet
            </h3>

            {/* Currency Selection */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Currency</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => dispatch({ type: "SET_CURRENCY", payload: "BTC" })}
                        className={`flex items-center justify-center space-x-2 p-3 rounded-lg border transition-all ${selectedCurrency === "BTC"
                                ? "border-blue-500 bg-blue-500/20 text-blue-400"
                                : "border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500"
                            }`}
                    >
                        <Bitcoin className="w-4 h-4" />
                        <span>BTC</span>
                    </button>
                    <button
                        onClick={() => dispatch({ type: "SET_CURRENCY", payload: "ETH" })}
                        className={`flex items-center justify-center space-x-2 p-3 rounded-lg border transition-all ${selectedCurrency === "ETH"
                                ? "border-blue-500 bg-blue-500/20 text-blue-400"
                                : "border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500"
                            }`}
                    >
                        <Coins className="w-4 h-4" />
                        <span>ETH</span>
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    {selectedCurrency} Price: ${prices[selectedCurrency]?.toLocaleString()}
                </p>
            </div>

            {/* Bet Amount Input */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Bet Amount (USD)</label>
                <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="input"
                    disabled={!canBet}
                    min="1"
                    max={balance}
                />
                {betAmount && (
                    <p className="text-xs text-gray-500 mt-1">
                        ≈ {getCryptoAmount()} {selectedCurrency}
                    </p>
                )}
            </div>

            {/* Quick Bet Buttons */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Quick Bets</label>
                <div className="grid grid-cols-4 gap-2">
                    {quickBets.map((amount) => (
                        <button
                            key={amount}
                            onClick={() => setBetAmount(amount.toString())}
                            disabled={!canBet || amount > balance}
                            className="btn btn-secondary text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ${amount}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {/* Bet Button */}
            <button
                onClick={handleBet}
                disabled={!canBet || !betAmount}
                className="btn btn-primary w-full py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {gameState === "waiting"
                    ? playerBet
                        ? "Bet Placed"
                        : "Place Bet"
                    : gameState === "active"
                        ? "Game in Progress"
                        : "Waiting for Next Round"}
            </button>

            {/* Current Bet Display */}
            {playerBet && (
                <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500 rounded-lg">
                    <p className="text-blue-400 font-medium">Current Bet</p>
                    <p className="text-white">
                        ${playerBet.usdAmount} ({playerBet.currency})
                    </p>
                    {playerBet.cashedOut && <p className="text-green-400 text-sm">✓ Cashed out successfully</p>}
                </div>
            )}
        </div>
    )
}

export default BettingPanel
