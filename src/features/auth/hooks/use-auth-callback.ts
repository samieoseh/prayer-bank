import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import {
  AuthCallbackError,
  completeAuthCallback,
} from '@/features/auth/services/auth-callback-service';

type CallbackState =
  | { status: 'processing' }
  | { status: 'error'; message: string };

export function useAuthCallback() {
  const incomingUrl = Linking.useURL();
  const processedUrl = useRef<string | null>(null);
  const [state, setState] = useState<CallbackState>({ status: 'processing' });

  useEffect(() => {
    let isActive = true;

    console.log('[auth] Callback effect started.', {
      hasIncomingUrl: Boolean(incomingUrl),
      hasProcessedUrl: Boolean(processedUrl.current),
    });

    async function processCallback() {
      const callbackUrl = incomingUrl ?? (await Linking.getInitialURL());

      console.log('[auth] Callback URL resolved.', {
        source: incomingUrl ? 'link-event' : 'initial-url',
        hasCallbackUrl: Boolean(callbackUrl),
        isActive,
        wasAlreadyProcessed: Boolean(callbackUrl && processedUrl.current === callbackUrl),
      });

      if (!isActive || !callbackUrl || processedUrl.current === callbackUrl) {
        console.log('[auth] Callback processing skipped.', {
          isActive,
          hasCallbackUrl: Boolean(callbackUrl),
          wasAlreadyProcessed: Boolean(callbackUrl && processedUrl.current === callbackUrl),
        });
        return;
      }

      processedUrl.current = callbackUrl;
      console.log('[auth] Callback processing started.');

      try {
        await completeAuthCallback(callbackUrl);
        console.log('[auth] Callback session exchange completed.', { isActive });
        if (isActive) {
          console.log('[auth] Navigating away from the callback screen.');
          router.replace('/');
        }
      } catch (error) {
        console.log('[auth] Callback processing failed.', {
          isActive,
          errorType: error instanceof Error ? error.name : typeof error,
        });
        if (!isActive) return;
        setState({
          status: 'error',
          message:
            error instanceof AuthCallbackError
              ? error.message
              : 'We could not complete sign-in. Request a new link and try again.',
        });
      }
    }

    void processCallback();
    return () => {
      isActive = false;
      console.log('[auth] Callback effect cleaned up.');
    };
  }, [incomingUrl]);

  return state;
}
