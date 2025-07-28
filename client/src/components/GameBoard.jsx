
import { useEffect, useState } from "react"
import { useGame } from "../context/GameContext"
import { TrendingUp, Zap } from "lucide-react"

function GameBoard() {
    const { gameState, multiplier, crashPoint, playerBet, cashOut } = useGame()
    const [displayMultiplier, setDisplayMultiplier] = useState(1.0)

    useEffect(() => {
        setDisplayMultiplier(multiplier)
    }, [multiplier])

    const getMultiplierColor = () => {
        if (gameState === "crashed") return "text-red-500"
        if (multiplier >= 10) return "text-yellow-400"
        if (multiplier >= 5) return "text-orange-400"
        if (multiplier >= 2) return "text-green-400"
        return "text-blue-400"
    }

    const getGameStateText = () => {
        switch (gameState) {
            case "waiting":
                return "Waiting for next round..."
            case "active":
                return "Game in progress"
            case "crashed":
                return `Crashed at ${crashPoint}x`
            default:
                return "Loading..."
        }
    }

    return (
        <div className="card relative overflow-hidden">
            {/* Background Animation */}
            <div className="absolute inset-0 opacity-10">
                <div
                    className={`w-full h-full bg-gradient-to-br ${gameState === "active"
                            ? "from-blue-500 to-green-500"
                            : gameState === "crashed"
                                ? "from-red-500 to-orange-500"
                                : "from-gray-500 to-gray-600"
                        } animate-pulse`}
                />
            </div>

            <div className="relative z-10">
                {/* Game Status */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center space-x-2 mb-4">
                        <TrendingUp className="w-6 h-6 text-blue-400" />
                        <h2 className="text-xl font-semibold text-gray-300">{getGameStateText()}</h2>
                    </div>
                </div>

                {/* Multiplier Display */}
                <div className="text-center mb-8">
                    <div
                        className={`multiplier-display text-8xl font-bold mb-4 ${getMultiplierColor()} ${gameState === "crashed" ? "crash-animation" : ""
                            } ${gameState === "active" ? "pulse-glow" : ""}`}
                    >
                        {displayMultiplier.toFixed(2)}x
                    </div>

                    {gameState === "active" && (
                        <div className="flex items-center justify-center space-x-2 text-yellow-400">
                            <Zap className="w-5 h-5 animate-pulse" />
                            <span className="text-lg font-medium">Rising...</span>
                            <Zap className="w-5 h-5 animate-pulse" />
                        </div>
                    )}
                </div>

                {/* Player Actions */}
                {playerBet && gameState === "active" && !playerBet.cashedOut && (
                    <div className="text-center mb-6">
                        <button onClick={cashOut} className="btn btn-success text-xl px-8 py-4 glow animate-pulse-fast">
                            Cash Out ${(playerBet.usdAmount * multiplier).toFixed(2)}
                        </button>
                        <p className="text-gray-400 mt-2">
                            Your bet: ${playerBet.usdAmount} ({playerBet.currency})
                        </p>
                    </div>
                )}

                {playerBet && playerBet.cashedOut && (
                    <div className="text-center mb-6">
                        <div className="bg-green-500/20 border border-green-500 rounded-lg p-4">
                            <p className="text-green-400 font-semibold">Cashed out at {multiplier.toFixed(2)}x!</p>
                            <p className="text-gray-300">Won: ${(playerBet.usdAmount * multiplier).toFixed(2)}</p>
                        </div>
                    </div>
                )}

                {/* Game Chart Placeholder */}
                <div className="bg-gray-900/50 rounded-lg p-6 h-64 flex items-center justify-center">
                    <div className="text-center">
                        <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500">Multiplier Chart</p>
                        <p className="text-sm text-gray-600">Visual representation would go here</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default GameBoard
