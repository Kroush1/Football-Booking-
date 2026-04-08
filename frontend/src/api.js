import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export const publicApi = axios.create({
  baseURL: API_BASE,
});

export const adminApi = axios.create({
  baseURL: `${API_BASE}/admin`,
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_basic_auth");
  if (token) {
    config.headers.Authorization = `Basic ${token}`;
  }
  return config;
});
