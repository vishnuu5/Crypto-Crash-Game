
import React, { useState, useEffect } from "react"
import { useGame } from "../context/GameContext"
import { History, TrendingUp, TrendingDown } from "lucide-react"
import axios from "axios"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"

function GameHistory() {
    const { history } = useGame()
    const [gameHistory, setGameHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchGameHistory()
    }, [])

    const fetchGameHistory = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await axios.get(`${BACKEND_URL}/api/game/history`)

            // Ensure we have a valid response with data array
            if (response.data && response.data.success && Array.isArray(response.data.data)) {
                setGameHistory(response.data.data)
            } else if (Array.isArray(response.data)) {
                // Handle case where response.data is directly an array
                setGameHistory(response.data)
            } else {
                console.warn("Invalid game history response format:", response.data)
                setGameHistory([])
            }
        } catch (error) {
            console.error("Error fetching game history:", error)
            setError(error.message)
            setGameHistory([]) // Set empty array on error
        } finally {
            setLoading(false)
        }
    }

    const getCrashColor = (crashPoint) => {
        if (crashPoint >= 10) return "text-yellow-400"
        if (crashPoint >= 5) return "text-orange-400"
        if (crashPoint >= 2) return "text-green-400"
        return "text-blue-400"
    }

    const getCrashIcon = (crashPoint) => {
        return crashPoint >= 2 ? TrendingUp : TrendingDown
    }

    // Ensure history is an array
    const safeHistory = Array.isArray(history) ? history : []
    const safeGameHistory = Array.isArray(gameHistory) ? gameHistory : []

    if (loading) {
        return (
            <div className="card">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-700 rounded mb-4"></div>
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-12 bg-gray-700 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="card">
                <h3 className="text-xl font-semibold mb-6 flex items-center">
                    <History className="w-5 h-5 mr-2 text-blue-400" />
                    Game History
                </h3>
                <div className="text-center py-8">
                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-4">
                        <p className="text-red-400">Error loading game history: {error}</p>
                    </div>
                    <button onClick={fetchGameHistory} className="btn btn-primary">
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="card">
            <h3 className="text-xl font-semibold mb-6 flex items-center">
                <History className="w-5 h-5 mr-2 text-blue-400" />
                Game History
            </h3>

            {/* Recent Results Bar */}
            <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Recent Results</h4>
                <div className="flex space-x-2 overflow-x-auto pb-2">
                    {[...safeHistory, ...safeGameHistory.slice(0, Math.max(0, 20 - safeHistory.length))].map((round, index) => {
                        // Handle different data structures
                        const crashPoint = round?.crashPoint || round?.crash_point || 1.0
                        const roundId = round?.roundId || round?.round_id || `round_${index}`

                        const Icon = getCrashIcon(crashPoint)
                        return (
                            <div
                                key={roundId}
                                className={`flex-shrink-0 px-3 py-2 rounded-lg border ${crashPoint >= 2 ? "border-green-500 bg-green-500/20" : "border-red-500 bg-red-500/20"
                                    }`}
                            >
                                <div className="flex items-center space-x-1">
                                    <Icon className={`w-3 h-3 ${getCrashColor(crashPoint)}`} />
                                    <span className={`text-sm font-medium ${getCrashColor(crashPoint)}`}>{crashPoint.toFixed(2)}x</span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {safeHistory.length === 0 && safeGameHistory.length === 0 && (
                    <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">No recent results available</p>
                    </div>
                )}
            </div>

            {/* Detailed History Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-700">
                            <th className="text-left py-3 px-2 text-gray-300">Round</th>
                            <th className="text-left py-3 px-2 text-gray-300">Crash Point</th>
                            <th className="text-left py-3 px-2 text-gray-300">Players</th>
                            <th className="text-left py-3 px-2 text-gray-300">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {safeGameHistory.slice(0, 10).map((round) => {
                            // Handle different data structures
                            const crashPoint = round?.crashPoint || round?.crash_point || 1.0
                            const roundId = round?.roundId || round?.round_id || "unknown"
                            const totalBets = round?.totalBets || round?.bets?.length || 0
                            const createdAt = round?.createdAt || round?.startTime || new Date()

                            return (
                                <tr key={roundId} className="border-b border-gray-800 hover:bg-gray-700/30">
                                    <td className="py-3 px-2">
                                        <span className="font-mono text-xs text-gray-400">{roundId.toString().slice(-8)}</span>
                                    </td>
                                    <td className="py-3 px-2">
                                        <div className="flex items-center space-x-2">
                                            {React.createElement(getCrashIcon(crashPoint), {
                                                className: `w-4 h-4 ${getCrashColor(crashPoint)}`,
                                            })}
                                            <span className={`font-semibold ${getCrashColor(crashPoint)}`}>{crashPoint.toFixed(2)}x</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-2 text-gray-300">{totalBets}</td>
                                    <td className="py-3 px-2 text-gray-400">{new Date(createdAt).toLocaleTimeString()}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {safeGameHistory.length === 0 && (
                <div className="text-center py-8">
                    <History className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500">No game history available</p>
                    <button onClick={fetchGameHistory} className="btn btn-secondary mt-4">
                        Refresh
                    </button>
                </div>
            )}
        </div>
    )
}

export default GameHistory
