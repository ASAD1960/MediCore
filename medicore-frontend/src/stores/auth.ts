import { create } from 'zustand';
import { api } from '@/lib/api';

export interface Me {
  id: string;
  name: string;
  email: string;
  organization: {
    id: string;
    name: string;
    timezone: string;
  } | null;
  permissions: string[];
}

interface AuthState {
  me: Me | null;
  loading: boolean;
  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (perm: string) => boolean;
}

// Share the initial session request across StrictMode effect re-runs.
let fetchMePromise: Promise<void> | null = null;

export const useAuth = create<AuthState>((set, get) => ({
  me: null,
  loading: true,

  fetchMe: async () => {
    if (fetchMePromise) {
      return fetchMePromise;
    }

    fetchMePromise = (async () => {
      set({ loading: true });

      try {
        const response = await api.get('/auth/me');
        set({
          me: response.data.data as Me,
        });
      } catch {
        set({ me: null });
      } finally {
        set({ loading: false });
      }
    })();

    try {
      await fetchMePromise;
    } finally {
      fetchMePromise = null;
    }
  },

  login: async (email, password) => {
    set({ loading: true });

    try {
      await api.post('/auth/login', { email, password });

      // Unlike initial session restoration, login must surface
      // a failed session verification to the login form.
      const response = await api.get('/auth/me');

      set({
        me: response.data.data as Me,
        loading: false,
      });
    } catch (error) {
      set({
        me: null,
        loading: false,
      });

      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Clear local authentication even if the server request fails.
    } finally {
      set({
        me: null,
        loading: false,
      });
    }
  },

  // UI hint only. The backend enforces real permissions.
  can: (perm) => !!get().me?.permissions.includes(perm),
}));

window.addEventListener('medicore:unauthorized', () => {
  useAuth.setState({
    me: null,
    loading: false,
  });
});