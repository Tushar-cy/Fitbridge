import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { user, token, role, isAuthenticated, isLoading, setAuth, logout, setRole, setLoading } =
    useAuthStore();



  return {
    user,
    token,
    role,
    isAuthenticated,
    isLoading,
    setAuth,
    logout,
    setRole,
    setLoading,
  };
};
