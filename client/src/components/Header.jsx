import { Wifi, WifiOff, TrendingUp } from "lucide-react"

function Header({ connected }) {
    return (
        <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
            <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <TrendingUp className="w-8 h-8 text-blue-500" />
                        <h1 className="text-2xl font-bold text-white">Crypto Crash</h1>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div
                            className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${connected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                }`}
                        >
                            {connected ? (
                                <>
                                    <Wifi className="w-4 h-4" />
                                    <span>Connected</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff className="w-4 h-4" />
                                    <span>Disconnected</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}

export default Header
