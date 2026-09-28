import { useState } from 'react';

import {
  signInWithPassword,
  signUpWithPassword,
} from '@/features/auth/services/password-sign-in-service';
import { getAuthErrorMessage } from '@/features/auth/utils/auth-error-message';
import { validateEmail } from '@/features/auth/utils/email-validation';

type SignInState =
  | { status: 'idle' }
  | { status: 'pending'; action: 'sign-in' | 'sign-up' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

export function usePasswordSignIn(blocked = false) {
  const [email, setEmailValue] = useState('');
  const [password, setPasswordValue] = useState('');
  const [state, setState] = useState<SignInState>({ status: 'idle' });
  const isPending = state.status === 'pending';
  const pendingAction = state.status === 'pending' ? state.action : undefined;

  function clearError() {
    if (state.status === 'error' || state.status === 'success') setState({ status: 'idle' });
  }

  function setEmail(value: string) {
    setEmailValue(value);
    clearError();
  }

  function setPassword(value: string) {
    setPasswordValue(value);
    clearError();
  }

  async function submit() {
    if (blocked || isPending) return;

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      setState({ status: 'error', message: emailResult.message });
      return;
    }

    if (!password) {
      setState({ status: 'error', message: 'Enter your password.' });
      return;
    }

    setState({ status: 'pending', action: 'sign-in' });

    try {
      await signInWithPassword(emailResult.email, password);
    } catch (error) {
      setState({ status: 'error', message: getAuthErrorMessage(error) });
    }
  }

  async function signUp() {
    if (blocked || isPending) return;

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      setState({ status: 'error', message: emailResult.message });
      return;
    }

    if (!password) {
      setState({ status: 'error', message: 'Enter a password.' });
      return;
    }

    setState({ status: 'pending', action: 'sign-up' });

    try {
      const result = await signUpWithPassword(emailResult.email, password);

      if (result.requiresEmailConfirmation) {
        setState({
          status: 'success',
          message: 'Check your email to confirm your account, then return here to sign in.',
        });
      }
    } catch (error) {
      setState({ status: 'error', message: getAuthErrorMessage(error) });
    }
  }

  return {
    email,
    password,
    setEmail,
    setPassword,
    submit,
    signUp,
    state,
    isPending,
    pendingAction,
  };
}
