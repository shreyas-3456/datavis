import axios, { AxiosRequestConfig } from "axios";
import { cookies } from "next/headers";

const internalClient = axios.create({
  baseURL: process.env.INTERNAL_API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

export async function serverRequest<T>(
  config: AxiosRequestConfig
): Promise<{ data: T | null; error: string | null; status: number; headers?: any }> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  const cookieHeader = [
    accessToken && `access_token=${accessToken}`,
    refreshToken && `refresh_token=${refreshToken}`,
  ]
    .filter(Boolean)
    .join("; ");

  try {
    const res = await internalClient.request<T>({
      ...config,
      headers: {
        ...config.headers,
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
    });

    return { data: res.data, error: null, status: res.status, headers: res.headers };
  } catch (err: any) {
    const status = err.response?.status ?? 500;
    const error = err.response?.data?.detail ?? err.message ?? "Request failed";
    return { data: null, error, status, headers: null };
  }
}