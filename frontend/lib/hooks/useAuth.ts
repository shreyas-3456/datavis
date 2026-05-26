import { useAppDispatch, useAppSelector } from "@/store";
import { setUser, clearUser } from "@/store/slices/authSlice";
import { authApi, LoginPayload, SignupPayload } from "@/lib/api/auth";
import { useRouter } from "next/navigation";

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading } = useAppSelector((s) => s.auth);
  const router = useRouter();

  const login = async (data: LoginPayload) => {
    const res = await authApi.login(data);
    dispatch(setUser(res.data));
    router.push("/dashboard");
  };

  const signup = async (data: SignupPayload) => {
    const res = await authApi.signup(data);
    dispatch(setUser(res.data));
    router.push("/dashboard");
  };

  const logout = async () => {
    await authApi.logout();
    dispatch(clearUser());
    router.push("/auth/login");
  };

  const loginWithGoogle = () => {
    authApi.googleLogin();
  };

  return { user, isAuthenticated, isLoading, login, signup, logout, loginWithGoogle };
}