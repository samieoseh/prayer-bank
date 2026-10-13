import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { AuthContext, type AuthState } from '@/features/auth/auth-context';
import {
  getPersistedSupabaseSession,
  getSupabaseClient,
  SupabaseConfigurationError,
} from '@/lib/supabase';

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let isActive = true;
    let receivedAuthEvent = false;
    let cachedSession: Awaited<ReturnType<typeof getPersistedSupabaseSession>> = null;
    let cleanup: (() => void) | undefined;

    console.log('[auth] Auth provider initialization started.', {
      platform: Platform.OS,
      appState: AppState.currentState,
    });

    async function initialize() {
      try {
        cachedSession = await getPersistedSupabaseSession();
        if (!isActive) return;

        if (cachedSession) {
          setState({
            status: 'authenticated',
            session: cachedSession,
            userId: cachedSession.user.id,
          });
        }

        const supabase = getSupabaseClient();
        const appStateSubscription =
          Platform.OS === 'web'
            ? undefined
            : AppState.addEventListener('change', (nextState) => {
                console.log('[auth] App state changed.', { nextState });
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
        } = supabase.auth.onAuthStateChange((event, session) => {
          receivedAuthEvent = true;
          console.log('[auth] Auth state event received.', {
            event,
            hasSession: Boolean(session),
            isActive,
          });
          if (!isActive) return;

          if (session) {
            cachedSession = session;
            setState({ status: 'authenticated', session, userId: session.user.id });
          } else if (event !== 'INITIAL_SESSION' || !cachedSession) {
            cachedSession = null;
            setState({ status: 'unauthenticated' });
          }
        });

        void supabase.auth
          .getSession()
          .then(({ data, error }) => {
            console.log('[auth] Persisted session lookup completed.', {
              hasSession: Boolean(data.session),
              hasError: Boolean(error),
              receivedAuthEvent,
              isActive,
            });
            if (!isActive || receivedAuthEvent) return;

            if (!error && data.session) {
              cachedSession = data.session;
              setState({
                status: 'authenticated',
                session: data.session,
                userId: data.session.user.id,
              });
            } else if (!cachedSession) {
              setState({ status: 'unauthenticated' });
            }
          })
          .catch((error: unknown) => {
            console.log('[auth] Persisted session lookup rejected.', {
              errorType: error instanceof Error ? error.name : typeof error,
              isActive,
            });
            if (isActive && !cachedSession) setState({ status: 'unauthenticated' });
          });

        return () => {
          isActive = false;
          console.log('[auth] Auth provider cleaned up.');
          appStateSubscription?.remove();
          if (Platform.OS !== 'web') supabase.auth.stopAutoRefresh();
          subscription.unsubscribe();
        };
      } catch (error) {
        console.log('[auth] Auth provider initialization failed.', {
          errorType: error instanceof Error ? error.name : typeof error,
        });
        setState({
          status: 'unauthenticated',
          configurationError:
            error instanceof SupabaseConfigurationError
              ? error.message
              : 'Authentication could not be initialized.',
        });

        return () => {
          isActive = false;
          console.log('[auth] Auth provider cleaned up after initialization failure.');
        };
      }
    }

    void initialize().then((dispose) => {
      if (!isActive) dispose?.();
      else cleanup = dispose;
    });

    return () => {
      isActive = false;
      cleanup?.();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
