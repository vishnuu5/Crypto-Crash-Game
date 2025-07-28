# Crypto Crash Game

A real-time multiplayer crash game with cryptocurrency integration, built with Node.js, Express, MongoDB, Socket.IO, React, and Vite.

## 🎮 Game Overview

Crypto Crash is an exciting multiplayer betting game where players:

- Place bets in USD, converted to cryptocurrency (BTC/ETH) using real-time prices
- Watch a multiplier increase exponentially in real-time
- Cash out before the game "crashes" to win their bet multiplied by the current multiplier
- Experience provably fair gameplay with transparent crash point generation

## 🏗️ Architecture

### Backend

- **Node.js + Express.js**: RESTful API and WebSocket server
- **MongoDB**: NoSQL database for game data, player wallets, and transactions
- **Socket.IO**: Real-time bidirectional communication
- **CoinGecko API**: Real-time cryptocurrency price fetching

### Frontend

- **React + Vite**: Modern frontend framework with fast development
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Socket.IO Client**: Real-time game updates

## 🚀 Features

### Game Logic

- ✅ Provably fair crash algorithm using cryptographic hashing
- ✅ Real-time multiplier progression (updates every 100ms)
- ✅ 10-second rounds with 5-second betting phase
- ✅ Automatic game state management
- ✅ Complete game history tracking

### Cryptocurrency Integration

- ✅ Real-time BTC/ETH price fetching from CoinGecko API
- ✅ USD to cryptocurrency conversion for bets
- ✅ Simulated blockchain transactions with mock hashes
- ✅ Atomic balance updates with database transactions
- ✅ Price caching to handle API rate limits
- ✅ Graceful fallback for API failures

### WebSocket Features

- ✅ Real-time multiplayer game updates
- ✅ Live multiplier progression
- ✅ Instant cashout processing
- ✅ Player bet notifications
- ✅ Game state synchronization

### Security & Validation

- ✅ Input validation for all API endpoints
- ✅ Rate limiting to prevent abuse
- ✅ Secure crash point generation
- ✅ WebSocket message validation
- ✅ Error handling and logging

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/vishnuu5/Crypto-Crash-Game.git
cd crypto-crash-game
```

### 2. Backend Setup

```bash
cd backend
npm install

# Create environment file

cp .env.example .env

# Edit .env with your configuration:

# NODE_ENV=development

# PORT=3000

# MONGODB_URI=

# FRONTEND_URL=http://localhost:5173

```

### 3. Frontend Setup

```bash
cd ../frontend
npm install

# Create environment file

cp .env.example .env

# Edit .env with your configuration:

# VITE_BACKEND_URL=http://localhost:3000

```

### 4. Database Setup

```bash

# Start MongoDB (if running locally)

mongod

# Seed the database with sample data

cd backend
npm run seed
```

### 5. Start the Application

```bash

# Terminal 1: Start backend

cd backend
npm run dev

# Terminal 2: Start frontend

cd frontend
npm run dev
```

The application will be available at:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health

## 🎯 API Endpoints

### Game Endpoints

- \`GET /api/game/history\` - Get game round history
- \`GET /api/game/current\` - Get current round information
- \`POST /api/game/bet\` - Place a bet (validation only, actual betting via WebSocket)
- \`POST /api/game/verify\` - Verify crash point (provably fair)

### Wallet Endpoints

- \`GET /api/wallet/:playerId\` - Get player wallet information
- \`GET /api/wallet/:playerId/transactions\` - Get transaction history
- \`POST /api/wallet/:playerId/deposit\` - Add funds to wallet (testing)

### Request/Response Examples

#### Place Bet

```bash
curl -X POST http://localhost:3000/api/game/bet \\
-H "Content-Type: application/json" \\
-d '{
"playerId": "player1",
"usdAmount": 50,
"currency": "BTC"
}'
```

#### Get Wallet

```bash
curl http://localhost:3000/api/wallet/player1
```

## 🔌 WebSocket Events

### Client → Server

- \`cashout\` - Request to cash out current bet

```bash
socket.emit('cashout', { playerId: 'player1' });
```

### Server → Client

- \`gameState\` - Initial game state on connection
- \`newRound\` - New round started
- \`gameStarted\` - Betting phase ended, multiplier starting
- \`multiplierUpdate\` - Real-time multiplier updates
- \`gameCrashed\` - Game crashed with final multiplier
- \`newBet\` - Player placed a bet
- \`playerCashedOut\` - Player successfully cashed out
- \`cashoutResult\` - Result of cashout request

## 🎲 Provably Fair Algorithm

The game uses a cryptographically secure method to generate crash points:

### Algorithm Steps

1. **Seed Generation**: Generate a random 32-byte seed using \`crypto.randomBytes()\`
2. **Hash Creation**: Create SHA-256 hash of the seed
3. **Crash Point Calculation**: Convert hash to crash multiplier using exponential distribution
4. **Verification**: Players can verify results using the provided seed and hash

### Implementation

```bash
function generateCrashPoint(hash) {
const hashInt = parseInt(hash.substring(0, 8), 16);
const random = hashInt / 0xFFFFFFFF;
const crashPoint = Math.max(1.01, Math.min(100, 1 / (1 - random _ 0.99)));
return Math.round(crashPoint _ 100) / 100;
}
```

### Verification

Players can verify any round by:

1. Taking the provided seed
2. Generating SHA-256 hash
3. Comparing with stored hash
4. Recalculating crash point

## 💰 USD-to-Crypto Conversion

### Price Fetching

- **Source**: CoinGecko API (free tier)
- **Caching**: 10-second cache to respect rate limits
- **Fallback**: Default prices if API fails
- **Supported**: BTC, ETH

### Conversion Logic

```bash
// Bet Conversion
const cryptoAmount = usdAmount / currentPrice;

// Payout Conversion
const usdPayout = cryptoAmount _ multiplier _ priceAtBetTime;
```

### Transaction Atomicity

All balance updates use MongoDB transactions to ensure consistency:

```bash
const session = await mongoose.startSession();
session.startTransaction();
try {
// Update player balance
// Create transaction record
// Update game round
await session.commitTransaction();
} catch (error) {
await session.abortTransaction();
throw error;
}
```

## 🧪 Testing

### Sample Data

The database comes pre-seeded with:

- 5 sample players with different balances
- 10 historical game rounds
- Sample transaction history

### Postman Collection

Import the provided Postman collection for API testing:

```bash
{
"info": { "name": "Crypto Crash API" },
"item": [
{
"name": "Get Game History",
"request": {
"method": "GET",
"url": "{{baseUrl}}/api/game/history"
}
},
{
"name": "Place Bet",
"request": {
"method": "POST",
"url": "{{baseUrl}}/api/game/bet",
"body": {
"mode": "raw",
"raw": "{\\"playerId\\": \\"player1\\", \\"usdAmount\\": 50, \\"currency\\": \\"BTC\\"}"
}
}
}
],
"variable": [
{ "key": "baseUrl", "value": "http://localhost:3000" }
]
}
```

### cURL Commands

```bash

# Health check

curl http://localhost:3000/health

# Get game history

curl http://localhost:3000/api/game/history

# Get player wallet

curl http://localhost:3000/api/wallet/player1

# Place bet

curl -X POST http://localhost:3000/api/game/bet
-H "Content-Type: application/json"
-d '{"playerId": "player1", "usdAmount": 25, "currency": "ETH"}'

# Verify round

curl -X POST http://localhost:3000/api/game/verify
-H "Content-Type: application/json"
-d '{"roundId": "round_123", "seed": "abc123..."}'
```

## 🚀 Deployment

### Backend (Render)

1. Create new Web Service on Render
2. Connect your GitHub repository
3. Set build command: \`cd backend && npm install\`
4. Set start command: \`cd backend && npm start\`
5. Add environment variables:
   - \`MONGODB_URI\`: Your MongoDB connection string
   - \`FRONTEND_URL\`: Your frontend URL
   - \`NODE_ENV\`: production

### Frontend (Vercel)

1. Install Vercel CLI: \`npm i -g vercel\`
2. In frontend directory: \`vercel\`
3. Set environment variables:
   - \`VITE_BACKEND_URL\`: Your backend URL
4. Deploy: \`vercel --prod\`

### Environment Variables

```bash

# Backend (.env)

NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crypto-crash
FRONTEND_URL=https://your-frontend.vercel.app

# Frontend (.env)

VITE_BACKEND_URL=https://your-backend.render.com
```

### Code Quality

- ESLint configuration for consistent code style
- Error handling middleware for graceful failures
- Input validation using Joi
- Rate limiting for API protection
- Comprehensive logging

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**

   - Ensure MongoDB is running
   - Check connection string in .env
   - Verify network access for cloud MongoDB

2. **WebSocket Connection Issues**

   - Check CORS configuration
   - Verify frontend URL in backend .env
   - Ensure ports are not blocked

3. **API Rate Limits**

   - CoinGecko has rate limits
   - Price caching helps reduce requests
   - Fallback prices prevent failures

4. **Build Errors**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify all environment variables

### Performance Optimization

- MongoDB indexing on frequently queried fields
- WebSocket connection pooling
- Price caching to reduce API calls
- Efficient multiplier update intervals

## 📈 Future Enhancements

- [ ] User authentication and registration
- [ ] Multiple cryptocurrency support
- [ ] Advanced betting strategies
- [ ] Mobile responsive design
- [ ] Real-time chat system
- [ ] Tournament mode
- [ ] Leaderboards
- [ ] Push notifications

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Note**: This is a simulation game for educational purposes. No real cryptocurrency transactions are performed.
