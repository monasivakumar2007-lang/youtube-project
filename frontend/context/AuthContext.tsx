'use client';

// ============================================================
// context/AuthContext.tsx
// Global auth state — user, token, theme
// ============================================================

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  ReactNode,
} from 'react';
import {
  getToken,
  getSavedUser,
  saveToken,
  saveUser,
  removeToken,
  getMe,
} from '@/lib/auth';
import type { User, ThemePreference } from '@/types';

// ─── State ───────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

type AuthAction =
  | { type: 'SET_USER'; payload: { user: User; token: string } }
  | { type: 'CLEAR_USER' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_THEME'; payload: ThemePreference };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'CLEAR_USER':
      return { user: null, token: null, isAuthenticated: false, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'UPDATE_THEME':
      if (!state.user) return state;
      return { ...state, user: { ...state.user, themePreference: action.payload } };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  login: (user: User, token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Hydrate from localStorage on mount
  useEffect(() => {
    const token = getToken();
    const savedUser = getSavedUser();

    if (token && savedUser) {
      dispatch({ type: 'SET_USER', payload: { user: savedUser, token } });
    } else if (token) {
      // Token exists but no cached user — fetch from API
      getMe().then((res) => {
        if (res.success && res.user) {
          saveUser(res.user);
          dispatch({ type: 'SET_USER', payload: { user: res.user, token } });
        } else {
          removeToken();
          dispatch({ type: 'CLEAR_USER' });
        }
      });
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const login = useCallback((user: User, token: string) => {
    saveToken(token);
    saveUser(user);
    dispatch({ type: 'SET_USER', payload: { user, token } });
  }, []);

  const logout = useCallback(() => {
    removeToken();
    dispatch({ type: 'CLEAR_USER' });
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const res = await getMe();
    if (res.success && res.user) {
      saveUser(res.user);
      dispatch({ type: 'SET_USER', payload: { user: res.user, token } });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
