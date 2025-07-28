import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const gameAPI = {
  getHistory: () => api.get("/game/history"),
  getCurrentRound: () => api.get("/game/current"),
  placeBet: (data) => api.post("/game/bet", data),
  verifyRound: (data) => api.post("/game/verify", data),
};

export const walletAPI = {
  getWallet: (playerId) => api.get(`/wallet/${playerId}`),
  getTransactions: (playerId) => api.get(`/wallet/${playerId}/transactions`),
  deposit: (playerId, amount) =>
    api.post(`/wallet/${playerId}/deposit`, { amount }),
};

export default api;
