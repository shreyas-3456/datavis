"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverRequest } from "@/lib/api/server";
import { User } from "@/store/slices/authSlice";

export interface ActionState {
  error: string | null;
  success: boolean;
  message?: string;
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

async function persistAuthCookies(headers: any) {
  const cookieStore = await cookies();
  const raw: string | string[] | undefined = headers?.["set-cookie"];
  const setCookieHeader: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  for (const cookie of setCookieHeader) {
    const [nameVal] = cookie.split(";");
    const eqIdx = nameVal.indexOf("=");
    const name = nameVal.slice(0, eqIdx).trim();
    const value = nameVal.slice(eqIdx + 1).trim();
    const maxAge = name === "access_token" ? 60 * 30 : 60 * 60 * 24 * 7;
    cookieStore.set(name, value, { ...COOKIE_OPTS, maxAge });
  }
}

// ── Login ──────────────────────────────────────────────────────────────────────
export async function loginAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email    = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required", success: false };
  }

  const { data, error, headers } = await serverRequest<User>({
    method: "POST",
    url: "/auth/login",
    data: { email, password },
  });

  if (error || !data) return { error, success: false };

  await persistAuthCookies(headers);
  redirect("/dashboard");
}

// ── Signup ─────────────────────────────────────────────────────────────────────
export async function signupAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email            = formData.get("email") as string;
  const password         = formData.get("password") as string;
  const confirm_password = formData.get("confirm_password") as string;
  const full_name        = formData.get("full_name") as string;

  if (!email || !password || !full_name || !confirm_password) {
    return { error: "All fields are required", success: false };
  }

  if (password !== confirm_password) {
    return { error: "Passwords do not match", success: false };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters", success: false };
  }

  const { data, error, headers } = await serverRequest<User>({
    method: "POST",
    url: "/auth/signup",
    data: { email, password, full_name },
  });

  if (error || !data) return { error, success: false };

  await persistAuthCookies(headers);
  redirect("/dashboard");
}

// ── Logout ─────────────────────────────────────────────────────────────────────
export async function logoutAction() {
  const cookieStore = await cookies();
  await serverRequest({ method: "POST", url: "/auth/logout" });
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
  redirect("/auth/login");
}

// ── Forgot Password ────────────────────────────────────────────────────────────
export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = formData.get("email") as string;

  if (!email) return { error: "Email is required", success: false };

  const { error } = await serverRequest({
    method: "POST",
    url: "/auth/forgot-password",
    data: { email },
  });

  if (error) return { error, success: false };

  return {
    success: true,
    error: null,
    message: "If that email exists, a reset link has been sent. Check your inbox.",
  };
}

// ── Reset Password ─────────────────────────────────────────────────────────────
export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const token            = formData.get("token") as string;
  const password         = formData.get("password") as string;
  const confirm_password = formData.get("confirm_password") as string;

  if (!password || !confirm_password) {
    return { error: "All fields are required", success: false };
  }

  if (password !== confirm_password) {
    return { error: "Passwords do not match", success: false };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters", success: false };
  }

  const { error } = await serverRequest({
    method: "POST",
    url: "/auth/reset-password",
    data: { token, password },
  });

  if (error) return { error, success: false };

  return { success: true, error: null, message: "Password reset successful. You can now log in." };
}

// ── Get current user ───────────────────────────────────────────────────────────
export async function getMe(): Promise<User | null> {
  const { data } = await serverRequest<User>({ method: "GET", url: "/auth/me" });
  return data;
}