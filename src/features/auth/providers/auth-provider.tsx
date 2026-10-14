import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { AuthContext, type AuthState } from '@/features/auth/auth-context';
import { getSupabaseClient, SupabaseConfigurationError } from '@/lib/supabase';

const AUTH_INITIALIZATION_FALLBACK_MS = 3_000;
const AUTH_INITIALIZATION_ERROR =
  'Authentication is temporarily unavailable. You can continue offline or try signing in again.';

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let isActive = true;
    let receivedAuthEvent = false;
    let cleanup = () => {};

    async function initialize() {
      let supabase: ReturnType<typeof getSupabaseClient>;

      try {
        supabase = getSupabaseClient();
      } catch (error) {
        if (!isActive) return;

        setState({
          status: 'unauthenticated',
          ...(error instanceof SupabaseConfigurationError
            ? { configurationError: error.message }
            : { initializationError: AUTH_INITIALIZATION_ERROR }),
        });
        return;
      }

      const appStateSubscription =
        Platform.OS === 'web'
          ? undefined
          : AppState.addEventListener('change', (nextState) => {
              if (nextState === 'active') {
                supabase.auth.startAutoRefresh();
              } else {
                supabase.auth.stopAutoRefresh();
              }
            });

      if (Platform.OS !== 'web' && AppState.currentState === 'active') {
        supabase.auth.startAutoRefresh();
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        receivedAuthEvent = true;
        if (!isActive) return;

        if (session) {
          setState({ status: 'authenticated', session, userId: session.user.id });
        } else {
          setState({ status: 'unauthenticated' });
        }
      });
      const loadingFallback = setTimeout(() => {
        if (isActive && !receivedAuthEvent) {
          setState({ status: 'unauthenticated' });
        }
      }, AUTH_INITIALIZATION_FALLBACK_MS);

      cleanup = () => {
        clearTimeout(loadingFallback);
        appStateSubscription?.remove();
        if (Platform.OS !== 'web') supabase.auth.stopAutoRefresh();
        subscription.unsubscribe();
      };

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!isActive || receivedAuthEvent) return;

        if (data.session) {
          setState({
            status: 'authenticated',
            session: data.session,
            userId: data.session.user.id,
          });
        } else {
          setState({ status: 'unauthenticated' });
        }
      } catch {
        if (!isActive || receivedAuthEvent) return;
        setState({
          status: 'unauthenticated',
          initializationError: AUTH_INITIALIZATION_ERROR,
        });
      } finally {
        clearTimeout(loadingFallback);
      }
    }

    void initialize();

    return () => {
      isActive = false;
      cleanup();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
