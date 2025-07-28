import { useGame } from "../context/GameContext"
import { Wallet, TrendingUp, TrendingDown } from "lucide-react"

function PlayerStats() {
    const { balance, prices, selectedCurrency } = useGame()

    const cryptoBalance = {
        BTC: balance * 0.0001, // Mock crypto balance
        ETH: balance * 0.001,
    }

    return (
        <div className="card">
            <h3 className="text-xl font-semibold mb-6 flex items-center">
                <Wallet className="w-5 h-5 mr-2 text-blue-400" />
                Your Wallet
            </h3>

            {/* USD Balance */}
            <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                    <span className="text-gray-300">USD Balance</span>
                    <span className="text-2xl font-bold text-white">${balance.toFixed(2)}</span>
                </div>
            </div>

            {/* Crypto Balances */}
            <div className="space-y-4">
                <div className="p-4 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-300 flex items-center">
                            <span className="w-2 h-2 bg-orange-400 rounded-full mr-2"></span>
                            Bitcoin (BTC)
                        </span>
                        <div className="text-right">
                            <p className="text-white font-semibold">{cryptoBalance.BTC.toFixed(8)} BTC</p>
                            <p className="text-sm text-gray-400">≈ ${(cryptoBalance.BTC * prices.BTC).toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="flex items-center text-xs">
                        <TrendingUp className="w-3 h-3 text-green-400 mr-1" />
                        <span className="text-green-400">+2.5%</span>
                        <span className="text-gray-500 ml-2">${prices.BTC?.toLocaleString()}</span>
                    </div>
                </div>

                <div className="p-4 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-300 flex items-center">
                            <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                            Ethereum (ETH)
                        </span>
                        <div className="text-right">
                            <p className="text-white font-semibold">{cryptoBalance.ETH.toFixed(6)} ETH</p>
                            <p className="text-sm text-gray-400">≈ ${(cryptoBalance.ETH * prices.ETH).toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="flex items-center text-xs">
                        <TrendingDown className="w-3 h-3 text-red-400 mr-1" />
                        <span className="text-red-400">-1.2%</span>
                        <span className="text-gray-500 ml-2">${prices.ETH?.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 pt-4 border-t border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold text-green-400">12</p>
                        <p className="text-xs text-gray-400">Wins</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-red-400">8</p>
                        <p className="text-xs text-gray-400">Losses</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PlayerStats
