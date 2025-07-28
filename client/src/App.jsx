
import { useState, useEffect } from "react"
import { io } from "socket.io-client"
import GameBoard from "./components/GameBoard"
import BettingPanel from "./components/BettingPanel"
import PlayerStats from "./components/PlayerStats"
import GameHistory from "./components/GameHistory"
import Header from "./components/Header"
import ErrorBoundary from "./components/ErrorBoundary"
import { GameProvider } from "./context/GameContext"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"

function App() {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    console.log("Connecting to backend:", BACKEND_URL)
    const newSocket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      timeout: 20000,
    })

    newSocket.on("connect", () => {
      console.log("Connected to server")
      setConnected(true)
    })

    newSocket.on("disconnect", (reason) => {
      console.log("Disconnected from server:", reason)
      setConnected(false)
    })

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error)
      setConnected(false)
    })

    setSocket(newSocket)

    return () => {
      console.log("Cleaning up socket connection")
      newSocket.close()
    }
  }, [])

  return (
    <ErrorBoundary>
      <GameProvider socket={socket}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
          <Header connected={connected} />

          <main className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Game Board - Takes up 2 columns on large screens */}
              <div className="lg:col-span-2">
                <ErrorBoundary>
                  <GameBoard />
                </ErrorBoundary>
              </div>

              {/* Side Panel */}
              <div className="space-y-6">
                <ErrorBoundary>
                  <BettingPanel />
                </ErrorBoundary>
                <ErrorBoundary>
                  <PlayerStats />
                </ErrorBoundary>
              </div>
            </div>

            {/* Game History - Full width at bottom */}
            <div className="mt-8">
              <ErrorBoundary>
                <GameHistory />
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </GameProvider>
    </ErrorBoundary>
  )
}

export default App
