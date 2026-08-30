import { useCallback, useEffect, useState } from 'react';
import { api, clearToken, setToken, token } from '../lib/api';
import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackToken = params.get('token');
    if (callbackToken) {
      setToken(callbackToken);
      window.history.replaceState({}, '', '/');
    }

    if (!token()) {
      setLoading(false);
      return;
    }

    api
      .me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(undefined);
  }, []);

  return { user, loading, logout };
}
