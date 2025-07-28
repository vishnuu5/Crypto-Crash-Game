
import { createContext, useContext, useReducer, useEffect } from "react"

const GameContext = createContext()

const initialState = {
    gameState: "waiting",
    multiplier: 1.0,
    roundId: null,
    crashPoint: null,
    activeBets: [],
    playerBet: null,
    balance: 1000,
    history: [], // Ensure this is always an array
    prices: { BTC: 45000, ETH: 3000 },
    selectedCurrency: "BTC",
}

function gameReducer(state, action) {
    switch (action.type) {
        case "SET_GAME_STATE":
            return {
                ...state,
                ...action.payload,
                // Ensure arrays are always arrays
                activeBets: Array.isArray(action.payload.activeBets) ? action.payload.activeBets : [],
                history: Array.isArray(state.history) ? state.history : [],
            }

        case "UPDATE_MULTIPLIER":
            return { ...state, multiplier: action.payload }

        case "NEW_ROUND":
            return {
                ...state,
                gameState: "waiting",
                roundId: action.payload.roundId,
                multiplier: 1.0,
                crashPoint: null,
                activeBets: [],
                playerBet: null,
            }

        case "GAME_STARTED":
            return { ...state, gameState: "active" }

        case "GAME_CRASHED":
            return {
                ...state,
                gameState: "crashed",
                crashPoint: action.payload.crashPoint,
            }

        case "PLACE_BET":
            return {
                ...state,
                playerBet: action.payload,
                balance: state.balance - action.payload.usdAmount,
            }

        case "CASHOUT_SUCCESS":
            return {
                ...state,
                playerBet: { ...state.playerBet, cashedOut: true },
                balance: state.balance + action.payload.payout.usd,
            }

        case "NEW_BET":
            return {
                ...state,
                activeBets: Array.isArray(state.activeBets) ? [...state.activeBets, action.payload] : [action.payload],
            }

        case "PLAYER_CASHED_OUT":
            return {
                ...state,
                activeBets: Array.isArray(state.activeBets)
                    ? state.activeBets.map((bet) =>
                        bet.playerId === action.payload.playerId
                            ? { ...bet, cashedOut: true, multiplier: action.payload.multiplier }
                            : bet,
                    )
                    : [],
            }

        case "UPDATE_HISTORY":
            const currentHistory = Array.isArray(state.history) ? state.history : []
            return {
                ...state,
                history: [action.payload, ...currentHistory.slice(0, 49)],
            }

        case "UPDATE_PRICES":
            return {
                ...state,
                prices: action.payload || { BTC: 45000, ETH: 3000 },
            }

        case "SET_CURRENCY":
            return { ...state, selectedCurrency: action.payload }

        default:
            return state
    }
}

export function GameProvider({ children, socket }) {
    const [state, dispatch] = useReducer(gameReducer, initialState)

    useEffect(() => {
        if (!socket) return

        socket.on("gameState", (gameState) => {
            console.log("Received game state:", gameState)
            dispatch({ type: "SET_GAME_STATE", payload: gameState })
        })

        socket.on("newRound", (data) => {
            console.log("New round:", data)
            dispatch({ type: "NEW_ROUND", payload: data })
        })

        socket.on("gameStarted", () => {
            console.log("Game started")
            dispatch({ type: "GAME_STARTED" })
        })

        socket.on("multiplierUpdate", (data) => {
            dispatch({ type: "UPDATE_MULTIPLIER", payload: data.multiplier })
        })

        socket.on("gameCrashed", (data) => {
            console.log("Game crashed:", data)
            dispatch({ type: "GAME_CRASHED", payload: data })
            dispatch({
                type: "UPDATE_HISTORY",
                payload: {
                    roundId: data.roundId,
                    crashPoint: data.crashPoint,
                    timestamp: new Date(),
                },
            })
        })

        socket.on("newBet", (data) => {
            console.log("New bet:", data)
            dispatch({ type: "NEW_BET", payload: data })
        })

        socket.on("playerCashedOut", (data) => {
            console.log("Player cashed out:", data)
            dispatch({ type: "PLAYER_CASHED_OUT", payload: data })
        })

        socket.on("cashoutResult", (data) => {
            console.log("Cashout result:", data)
            if (data.success) {
                dispatch({ type: "CASHOUT_SUCCESS", payload: data })
            }
        })

        socket.on("error", (error) => {
            console.error("Socket error:", error)
        })

        return () => {
            socket.off("gameState")
            socket.off("newRound")
            socket.off("gameStarted")
            socket.off("multiplierUpdate")
            socket.off("gameCrashed")
            socket.off("newBet")
            socket.off("playerCashedOut")
            socket.off("cashoutResult")
            socket.off("error")
        }
    }, [socket])

    const placeBet = (usdAmount) => {
        if (state.gameState !== "waiting" || state.playerBet) return false

        const bet = {
            playerId: "player1", // In a real app, this would come from authentication
            usdAmount,
            currency: state.selectedCurrency,
            timestamp: new Date(),
        }

        dispatch({ type: "PLACE_BET", payload: bet })
        return true
    }

    const cashOut = () => {
        if (state.gameState !== "active" || !state.playerBet || state.playerBet.cashedOut) {
            return false
        }

        socket.emit("cashout", { playerId: "player1" })
        return true
    }

    const value = {
        ...state,
        placeBet,
        cashOut,
        dispatch,
    }

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
    const context = useContext(GameContext)
    if (!context) {
        throw new Error("useGame must be used within a GameProvider")
    }
    return context
}
