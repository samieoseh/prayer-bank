import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import {
  AccessibilityInfo,
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
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
      return 'Fingerprint unlock is unavailable. Enter your app PIN.';
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
  const [messageIsPinError, setMessageIsPinError] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'new' | 'confirm'>('new');
  const [nowMs, setNowMs] = useState(Date.now());
  const [appIsActive, setAppIsActive] = useState(
    Platform.OS === 'web' || AppState.currentState === 'active',
  );
  const promptedLockEventRef = useRef<number | null>(null);
  const announcedBlockEventRef = useRef<number | null>(null);
  const wasBlockedRef = useRef(false);
  const pinRef = useRef<FocusableInput | null>(null);
  const newPinRef = useRef<FocusableInput | null>(null);
  const confirmationRef = useRef<FocusableInput | null>(null);

  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  const announceMessage = useCallback(
    (nextMessage: string, isPinError = false) => {
      setMessage(nextMessage);
      setMessageIsPinError(isPinError);
      if (nextMessage) {
        AccessibilityInfo.announceForAccessibility(nextMessage);
      }
    },
    [],
  );

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
    if (isBlocked) {
      wasBlockedRef.current = true;
      if (announcedBlockEventRef.current !== lockEventId) {
        announcedBlockEventRef.current = lockEventId;
        AccessibilityInfo.announceForAccessibility(
          `Too many incorrect attempts. Try again in ${secondsRemaining} seconds.`,
        );
      }
      return;
    }

    if (wasBlockedRef.current) {
      wasBlockedRef.current = false;
      announceMessage('You can try your PIN again now.');
      setTimeout(() => pinRef.current?.focus(), 0);
    }
  }, [announceMessage, isBlocked, lockEventId, secondsRemaining]);

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
      setTimeout(() => pinRef.current?.focus(), 0);
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

  const clearMessage = useCallback(() => {
    setMessage('');
    setMessageIsPinError(false);
  }, []);

  const submitPin = useCallback(async () => {
    clearMessage();
    if (pin.length !== APP_LOCK_PIN_LENGTH) {
      announceMessage(`Enter your ${APP_LOCK_PIN_LENGTH}-digit PIN.`, true);
      pinRef.current?.focus();
      return;
    }

    const result = await verifyPin(pin);
    if (!result.ok) {
      if (result.reason === 'blocked') {
        setMessage(failureMessage(result));
        setMessageIsPinError(true);
      } else {
        announceMessage(failureMessage(result), true);
      }
      setPin('');
      pinRef.current?.focus();
    }
  }, [announceMessage, clearMessage, pin, verifyPin]);

  const retryBiometrics = useCallback(async () => {
    clearMessage();
    const result = await unlockWithBiometrics();
    if (!result.ok) {
      announceMessage(failureMessage(result));
      setTimeout(() => pinRef.current?.focus(), 0);
    }
  }, [announceMessage, clearMessage, unlockWithBiometrics]);

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
        announceMessage(`Choose a ${APP_LOCK_PIN_LENGTH}-digit PIN.`, true);
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
        true,
      );
      setConfirmation('');
      confirmationRef.current?.focus();
      return;
    }

    const result = await recoverPin(newPin);
    if (!result.ok) {
      if (result.reason === 'recovery-not-authorized') {
        announceMessage(failureMessage(result));
        setRecoveryMode(false);
        setTimeout(() => pinRef.current?.focus(), 0);
      } else {
        announceMessage(failureMessage(result), true);
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
        <View className="w-full max-w-md rounded-3xl border border-[#ddd6c8] bg-[#fffaf0] p-6 dark:border-[#45463a] dark:bg-[#24251d]">
          <View className="mb-5 h-14 w-14 items-center justify-center rounded-full bg-[#f5ead2] dark:bg-[#403929]">
            <MaterialDesignIcons
              color={dark ? '#efbd93' : '#8a522a'}
              name="shield-alert-outline"
              size={28}
            />
          </View>
          <Text variant="headlineSmall" className="text-[#111827] dark:text-[#f6f0df]">
            Prayer Bank is locked
          </Text>
          <Text className="mt-3 leading-6 text-[#676b7b] dark:text-[#c9c9b8]">
            Your lock settings could not be read. Retry before opening your prayers.
          </Text>
          {message ? (
            <HelperText accessibilityLiveRegion="assertive" className="mt-3 px-0" type="error" visible>
              {message}
            </HelperText>
          ) : null}
          <Button
            className="mt-6 min-h-12 justify-center"
            disabled={isBusy}
            loading={isBusy}
            mode="contained"
            onPress={() => void retry()}>
            {isBusy ? 'Retrying…' : 'Retry'}
          </Button>
          <Button
            className="mt-2 min-h-12 justify-center"
            disabled={isBusy}
            mode="outlined"
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
        contentContainerClassName="flex-grow justify-center px-[26px] py-8"
        keyboardShouldPersistTaps="handled">
        <View className="mx-auto w-full max-w-md">
          <View className="mb-8 items-center">
            <View className="mb-5 h-16 w-16 items-center justify-center rounded-full bg-[#e4e5d5] dark:bg-[#3a3d2d]">
              {isBusy ? (
                <ActivityIndicator color="#6f7653" size="small" />
              ) : (
                <MaterialDesignIcons
                  color={dark ? '#cbd3a4' : '#59603f'}
                  name={recoveryMode ? 'lock-reset' : isBlocked ? 'timer-lock-outline' : 'lock'}
                  size={32}
                />
              )}
            </View>
            <Text variant="headlineMedium" className="text-center text-[#111827] dark:text-[#f6f0df]">
              {recoveryMode
                ? recoveryStep === 'new'
                  ? 'Choose a new PIN'
                  : 'Confirm your new PIN'
                : isBlocked
                  ? 'Too many attempts'
                  : 'Prayer Bank is locked'}
            </Text>
            <Text className="mt-2 max-w-sm text-center text-base leading-6 text-[#676b7b] dark:text-[#c9c9b8]">
              {recoveryMode
                ? recoveryStep === 'new'
                  ? 'Your identity is confirmed. Create four new digits for app lock.'
                  : 'Enter the same four digits again.'
                : isBlocked
                  ? biometricEnabled
                    ? 'Your PIN is temporarily paused. Fingerprint unlock remains available.'
                    : 'Your PIN is temporarily paused. Wait for the timer before trying again.'
                  : 'Enter your PIN to return to your private prayers.'}
            </Text>
          </View>

          {recoveryMode ? (
            <View>
              {recoveryStep === 'new' ? (
                <PinCodeInput
                  accessibilityLabel="New four-digit app PIN"
                  disabled={isBusy}
                  errorMessage={messageIsPinError ? message : undefined}
                  inputRef={newPinRef}
                  invalid={messageIsPinError}
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
                  disabled={isBusy}
                  errorMessage={messageIsPinError ? message : undefined}
                  inputRef={confirmationRef}
                  invalid={messageIsPinError}
                  label="Confirm new PIN"
                  onChangeText={(value) => {
                    setConfirmation(value);
                    clearMessage();
                  }}
                  onSubmitEditing={() => void submitRecovery()}
                  value={confirmation}
                />
              )}
              {!messageIsPinError && message ? (
                <HelperText accessibilityLiveRegion="assertive" className="mt-2 px-0" type="error" visible>
                  {message}
                </HelperText>
              ) : null}
              <Button
                className="mt-4 min-h-12 justify-center"
                disabled={isBusy}
                loading={isBusy}
                mode="contained"
                onPress={() => void submitRecovery()}>
                {isBusy
                  ? recoveryStep === 'new'
                    ? 'Please wait…'
                    : 'Saving…'
                  : recoveryStep === 'new'
                    ? 'Continue'
                    : 'Save new PIN'}
              </Button>
              <Button className="mt-2 min-h-12 justify-center" disabled={isBusy} mode="text" onPress={leaveRecovery}>
                Back to unlock
              </Button>
            </View>
          ) : (
            <View>
              <PinCodeInput
                accessibilityLabel="Four-digit app PIN"
                autoFocus={!biometricEnabled}
                disabled={isBlocked || isBusy}
                errorMessage={messageIsPinError ? message : undefined}
                inputRef={pinRef}
                invalid={messageIsPinError}
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
                  accessibilityLiveRegion="none"
                  className="mt-3 text-center font-medium text-[#8a522a] dark:text-[#efbd93]">
                  Try again in {secondsRemaining} second{secondsRemaining === 1 ? '' : 's'}.
                </Text>
              ) : null}
              {!messageIsPinError && message ? (
                <HelperText accessibilityLiveRegion="assertive" className="mt-2 px-0" type="error" visible>
                  {message}
                </HelperText>
              ) : null}
              <Button
                className="mt-4 min-h-12 justify-center"
                disabled={isBusy || isBlocked}
                loading={isBusy}
                mode="contained"
                onPress={() => void submitPin()}>
                {isBusy ? 'Unlocking…' : 'Unlock'}
              </Button>
              {biometricEnabled ? (
                <Button
                  className="mt-3 min-h-12 justify-center"
                  disabled={isBusy}
                  icon="fingerprint"
                  mode="outlined"
                  onPress={() => void retryBiometrics()}>
                  Use fingerprint unlock
                </Button>
              ) : null}
              <Button
                className="mt-2 min-h-12 justify-center"
                disabled={isBusy}
                mode="text"
                onPress={() => void beginRecovery()}>
                Forgot PIN?
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
