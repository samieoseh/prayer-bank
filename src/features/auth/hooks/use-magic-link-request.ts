import { useState } from 'react';

import { sendMagicLink } from '@/features/auth/services/magic-link-service';
import { getAuthErrorMessage } from '@/features/auth/utils/auth-error-message';
import { validateEmail } from '@/features/auth/utils/email-validation';

type RequestState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success' }
  | { status: 'error'; message: string };

export function useMagicLinkRequest(blocked = false) {
  const [email, setEmailValue] = useState('');
  const [state, setState] = useState<RequestState>({ status: 'idle' });
  const isPending = state.status === 'pending';

  function setEmail(value: string) {
    setEmailValue(value);
    if (state.status !== 'idle') setState({ status: 'idle' });
  }

  async function submit() {
    if (blocked || isPending) return;

    const result = validateEmail(email);
    if (!result.valid) {
      setState({ status: 'error', message: result.message });
      return;
    }

    setState({ status: 'pending' });

    try {
      await sendMagicLink(result.email);
      setState({ status: 'success' });
    } catch (error) {
      setState({ status: 'error', message: getAuthErrorMessage(error) });
    }
  }

  return {
    email,
    setEmail,
    submit,
    state,
    isPending,
    isDisabled: blocked || isPending,
  };
}
