
import React from "react"

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        console.error("Error caught by boundary:", error, errorInfo)
        this.setState({
            error: error,
            errorInfo: errorInfo,
        })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="card">
                    <div className="text-center py-8">
                        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-4">
                            <h3 className="text-red-400 font-semibold mb-2">Something went wrong</h3>
                            <p className="text-red-300 text-sm mb-4">{this.state.error && this.state.error.toString()}</p>
                            <button
                                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                                className="btn btn-primary"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
