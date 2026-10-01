import axios from "../api/axios";
import { setToken, getToken } from "../services/auth-storage";
import { create } from "zustand";

export const useAuth = create((set, get) => ({
  user: null,
  isHydrated: false,

  getUser: async () => {
    try {
      const { data } = await axios.get("/user");
      set({ user: data, isHydrated: true });
    } catch (error) {
      console.log("getUser failed:", error?.message || error);
      set({ user: null, isHydrated: true });
    }
  },

  // Called once on app boot to rehydrate user from stored token
  hydrate: async () => {
    try {
      const token = await getToken();
      if (!token) {
        set({ user: null, isHydrated: true });
        return;
      }
      await get().getUser();
    } catch (error) {
      console.log("hydrate failed:", error?.message || error);
      set({ user: null, isHydrated: true });
    }
  },

  login: async (data) => {
    try {
      const response = await axios.post("/login", data);
      await setToken(response.data.token);
      await get().getUser();
    } catch (error) {
      console.log(error);
    }
  },

  register: async (data) => {
    try {
      const response = await axios.post("/register", data);
      await setToken(response.data.token);
      await get().getUser();
    } catch (error) {
      console.log(error);
    }
  },

  logout: async () => {
    try {
      await axios.post("/logout");
    } catch (error) {
      console.log(error);
    }
    await setToken(null);
    set({ user: null, isHydrated: true });
  },
}));