import apiClient from "./client";
import { User } from "@/store/slices/authSlice";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  email: string;
  password: string;
  full_name: string;
}

export const authApi = {
  login: (data: LoginPayload) =>
    apiClient.post<User>("/auth/login", data),

  signup: (data: SignupPayload) =>
    apiClient.post<User>("/auth/signup", data),

  logout: () =>
    apiClient.post("/auth/logout"),

  me: () =>
    apiClient.get<User>("/auth/me"),

  googleLogin: () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  },
};