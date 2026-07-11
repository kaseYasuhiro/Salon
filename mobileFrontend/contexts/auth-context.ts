import axios from "@/api/axios";
import { setToken } from "@/services/auth-storage";
import { create } from "zustand";

interface User {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: string;
  created_at?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone_number: string;
  role: string;
}

interface UpdatePasswordData {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  
  // User methods
  getUser: () => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updatePassword: (id: number, data: UpdatePasswordData) => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,

  getUser: async () => {
    try {
      const { data } = await axios.get("/user");
      console.log("User data fetched:", data);
      set({ user: data });
    } catch (error) {
      console.log("Get user error:", error);
    }
  },

  login: async (data) => {
    try {
      const response = await axios.post("/login", data);
      await setToken(response.data.token);
      await get().getUser();
    } catch (error) {
      console.log("Login error:", error);
      throw error;
    }
  },

  register: async (data) => {
    try {
      const response = await axios.post("/register", data);
      await setToken(response.data.token);
      await get().getUser();
    } catch (error) {
      console.log("Register error:", error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await axios.post("/logout");
      await setToken(null);
      set({ user: null });
    } catch (error) {
      console.log("Logout error:", error);
    }
  },

  updatePassword: async (id: number, data: UpdatePasswordData) => {
    try {
      const response = await axios.post(`/user/${id}/password`, {
        current_password: data.current_password,
        new_password: data.new_password,
        new_password_confirmation: data.new_password_confirmation
      });
      console.log("Password updated successfully:", response.data);
      return response.data;
    } catch (error) {
      console.log("Error updating password:", error);
      throw error;
    }
  }
}));