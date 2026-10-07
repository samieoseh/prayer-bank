import {
  AccessibilityInfo,
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Button,
  HelperText,
  Text,
} from 'react-native-paper';

import {
  APP_LOCK_PIN_LENGTH,
  type AppLockActionFailure,
} from '@/features/app-lock/app-lock-types';
import {
  PinCodeInput,
  type PinCodeInputRef,
} from '@/features/app-lock/components/pin-code-input';
import { useAppLock } from '@/features/app-lock/hooks/use-app-lock';

type FocusableInput = PinCodeInputRef;

function failureMessage(result: AppLockActionFailure) {
  switch (result.reason) {
    case 'authentication-failed':
      return 'Device authentication was not completed. Enter your app PIN.';
    case 'biometric-unavailable':
      return 'Fingerprint or face unlock is unavailable. Enter your app PIN.';
    case 'blocked':
      return 'Too many incorrect attempts. Wait before trying again.';
    case 'invalid-pin':
      return 'That PIN is incorrect. Try again.';
    case 'invalid-pin-format':
      return `Enter your ${APP_LOCK_PIN_LENGTH}-digit PIN.`;
    case 'recovery-not-authorized':
      return 'Confirm your identity again before choosing a new PIN.';
    case 'busy':
      return 'Please wait for the current security check to finish.';
    default:
      return 'Prayer Bank could not verify the app lock. Try again.';
  }
}

export function AppLockScreen() {
  const {
    authorizePinRecovery,
    cancelPinRecovery,
    isBusy,
    lockEventId,
    recoverPin,
    retry,
    state,
    unlockWithBiometrics,
    verifyPin,
  } = useAppLock();
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'new' | 'confirm'>('new');
  const [nowMs, setNowMs] = useState(Date.now());
  const [appIsActive, setAppIsActive] = useState(
    Platform.OS === 'web' || AppState.currentState === 'active',
  );
  const promptedLockEventRef = useRef<number | null>(null);
  const pinRef = useRef<FocusableInput | null>(null);
  const newPinRef = useRef<FocusableInput | null>(null);
  const confirmationRef = useRef<FocusableInput | null>(null);

  const announceMessage = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
    if (nextMessage) {
      AccessibilityInfo.announceForAccessibility(nextMessage);
    }
  }, []);

  const blockedUntilMs =
    state.status === 'blocked' ? state.blockedUntilMs : null;
  const secondsRemaining = useMemo(
    () =>
      blockedUntilMs === null
        ? 0
        : Math.max(0, Math.ceil((blockedUntilMs - nowMs) / 1000)),
    [blockedUntilMs, nowMs],
  );
  const isBlocked = secondsRemaining > 0;

  useEffect(() => {
    if (blockedUntilMs === null) return;

    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(timer);
  }, [blockedUntilMs]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppIsActive(nextState === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const canPrompt =
      (state.status === 'locked' || state.status === 'blocked') &&
      state.biometricEnabled;
    if (
      !appIsActive ||
      !canPrompt ||
      promptedLockEventRef.current === lockEventId
    ) {
      return;
    }

    promptedLockEventRef.current = lockEventId;
    let active = true;
    void unlockWithBiometrics().then((result) => {
      if (!active || result.ok) return;
      announceMessage(failureMessage(result));
    });

    return () => {
      active = false;
    };
  }, [
    announceMessage,
    appIsActive,
    lockEventId,
    state,
    unlockWithBiometrics,
  ]);

  const clearMessage = useCallback(() => setMessage(''), []);

  const submitPin = useCallback(async () => {
    clearMessage();
    if (pin.length !== APP_LOCK_PIN_LENGTH) {
      announceMessage(`Enter your ${APP_LOCK_PIN_LENGTH}-digit PIN.`);
      pinRef.current?.focus();
      return;
    }

    const result = await verifyPin(pin);
    if (!result.ok) {
      announceMessage(failureMessage(result));
      setPin('');
      pinRef.current?.focus();
    }
  }, [announceMessage, clearMessage, pin, verifyPin]);

  const beginRecovery = useCallback(async () => {
    clearMessage();
    const result = await authorizePinRecovery();
    if (!result.ok) {
      announceMessage(failureMessage(result));
      return;
    }

    setPin('');
    setNewPin('');
    setConfirmation('');
    setRecoveryStep('new');
    setRecoveryMode(true);
    setTimeout(() => newPinRef.current?.focus(), 0);
  }, [announceMessage, authorizePinRecovery, clearMessage]);

  const submitRecovery = useCallback(async () => {
    clearMessage();

    if (recoveryStep === 'new') {
      if (newPin.length !== APP_LOCK_PIN_LENGTH) {
        announceMessage(`Choose a ${APP_LOCK_PIN_LENGTH}-digit PIN.`);
        newPinRef.current?.focus();
        return;
      }
      setConfirmation('');
      setRecoveryStep('confirm');
      setTimeout(() => confirmationRef.current?.focus(), 0);
      return;
    }

    if (confirmation.length !== APP_LOCK_PIN_LENGTH || confirmation !== newPin) {
      announceMessage(
        confirmation.length !== APP_LOCK_PIN_LENGTH
          ? `Enter all ${APP_LOCK_PIN_LENGTH} digits again.`
          : 'The PIN confirmation does not match.',
      );
      setConfirmation('');
      confirmationRef.current?.focus();
      return;
    }

    const result = await recoverPin(newPin);
    if (!result.ok) {
      announceMessage(failureMessage(result));
      if (result.reason === 'recovery-not-authorized') {
        setRecoveryMode(false);
      }
    }
  }, [
    announceMessage,
    clearMessage,
    confirmation,
    newPin,
    recoverPin,
    recoveryStep,
  ]);

  const leaveRecovery = useCallback(() => {
    cancelPinRecovery();
    setNewPin('');
    setConfirmation('');
    setRecoveryStep('new');
    setRecoveryMode(false);
    clearMessage();
    setTimeout(() => pinRef.current?.focus(), 0);
  }, [cancelPinRecovery, clearMessage]);

  if (state.status === 'storage-error' && !recoveryMode) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f8f3e8] px-6 dark:bg-[#171812]">
        <View className="w-full max-w-md rounded-3xl bg-white p-6 dark:bg-[#24251d]">
          <Text variant="headlineSmall" className="text-center text-[#252719] dark:text-[#f6f0df]">
            Prayer Bank is locked
          </Text>
          <Text className="mt-3 text-center text-[#666a55] dark:text-[#c9c9b8]">
            Your lock settings could not be read. Retry before opening your prayers.
          </Text>
          <Button
            className="mt-6"
            disabled={isBusy}
            loading={isBusy}
            mode="contained"
            onPress={() => void retry()}>
            Retry
          </Button>
          <Button
            className="mt-2"
            disabled={isBusy}
            mode="text"
            onPress={() => void beginRecovery()}>
            Recover with device security
          </Button>
        </View>
      </View>
    );
  }

  if (
    state.status !== 'locked' &&
    state.status !== 'blocked' &&
    !(state.status === 'storage-error' && recoveryMode)
  ) {
    return null;
  }

  const biometricEnabled =
    state.status === 'locked' || state.status === 'blocked'
      ? state.biometricEnabled
      : false;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-[#f8f3e8] dark:bg-[#171812]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-center px-6 py-10"
        keyboardShouldPersistTaps="handled">
        <View className="mx-auto w-full max-w-md rounded-3xl bg-white p-6 dark:bg-[#24251d]">
          <View className="mb-6 items-center">
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-[#e7ead7] dark:bg-[#3a3d2d]">
              {isBusy ? (
                <ActivityIndicator color="#6f7653" size="small" />
              ) : (
                <Text accessibilityElementsHidden variant="headlineMedium">
                  🔒
                </Text>
              )}
            </View>
            <Text variant="headlineSmall" className="text-center text-[#252719] dark:text-[#f6f0df]">
              {recoveryMode
                ? recoveryStep === 'new'
                  ? 'Choose a new PIN'
                  : 'Confirm your new PIN'
                : 'Prayer Bank is locked'}
            </Text>
            <Text className="mt-2 text-center text-[#666a55] dark:text-[#c9c9b8]">
              {recoveryMode
                ? recoveryStep === 'new'
                  ? 'Create a new PIN after confirming your device identity.'
                  : 'Enter the same four digits again.'
                : 'Unlock to keep your private prayers protected.'}
            </Text>
          </View>

          {recoveryMode ? (
            <View className="gap-3">
              {recoveryStep === 'new' ? (
                <PinCodeInput
                  accessibilityLabel="New four-digit app PIN"
                  inputRef={newPinRef}
                  label="New PIN"
                  onChangeText={(value) => {
                    setNewPin(value);
                    clearMessage();
                  }}
                  onSubmitEditing={() => void submitRecovery()}
                  value={newPin}
                />
              ) : (
                <PinCodeInput
                  accessibilityLabel="Confirm new four-digit app PIN"
                  autoFocus
                  inputRef={confirmationRef}
                  label="Confirm new PIN"
                  onChangeText={(value) => {
                    setConfirmation(value);
                    clearMessage();
                  }}
                  onSubmitEditing={() => void submitRecovery()}
                  value={confirmation}
                />
              )}
              <Button
                className="mt-2"
                disabled={isBusy}
                loading={isBusy}
                mode="contained"
                onPress={() => void submitRecovery()}>
                {recoveryStep === 'new' ? 'Continue' : 'Save new PIN'}
              </Button>
              <Button disabled={isBusy} mode="text" onPress={leaveRecovery}>
                Back to unlock
              </Button>
            </View>
          ) : (
            <View className="gap-3">
              <PinCodeInput
                accessibilityLabel="Four-digit app PIN"
                autoFocus={!biometricEnabled}
                disabled={isBlocked}
                inputRef={pinRef}
                label="App PIN"
                onChangeText={(value) => {
                  setPin(value);
                  clearMessage();
                }}
                onSubmitEditing={() => void submitPin()}
                value={pin}
              />
              {isBlocked ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="text-center text-[#8a522a] dark:text-[#efbd93]">
                  Try again in {secondsRemaining} second{secondsRemaining === 1 ? '' : 's'}.
                </Text>
              ) : null}
              <Button
                className="mt-1"
                disabled={isBusy || isBlocked}
                loading={isBusy}
                mode="contained"
                onPress={() => void submitPin()}>
                Unlock
              </Button>
              <Button
                disabled={isBusy}
                mode="text"
                onPress={() => void beginRecovery()}>
                Forgot PIN?
              </Button>
            </View>
          )}

          <HelperText
            accessibilityLiveRegion="assertive"
            className="mt-2 text-center"
            type="error"
            visible={Boolean(message)}>
            {message}
          </HelperText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
