import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { router } from 'expo-router';
import { AccessibilityInfo, Pressable, ScrollView, useColorScheme, View } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  HelperText,
  IconButton,
  Switch,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  APP_LOCK_PIN_LENGTH,
  type AppLockActionFailure,
  type BiometricCapability,
} from '@/features/app-lock/app-lock-types';
import {
  PinCodeInput,
  type PinCodeInputRef,
} from '@/features/app-lock/components/pin-code-input';
import { useAppLock } from '@/features/app-lock/hooks/use-app-lock';

type ScreenMode =
  | 'create'
  | 'confirm-create'
  | 'manage'
  | 'change-current'
  | 'change-new'
  | 'confirm-change'
  | 'biometric'
  | 'disable'
  | 'recovery-new'
  | 'recovery-confirm';

function failureMessage(result: AppLockActionFailure) {
  switch (result.reason) {
    case 'invalid-pin':
      return 'That current PIN is incorrect.';
    case 'invalid-pin-format':
      return `Enter a ${APP_LOCK_PIN_LENGTH}-digit PIN.`;
    case 'blocked':
      return 'Too many incorrect attempts. Unlock the app again after the wait.';
    case 'biometric-unavailable':
      return 'Fingerprint unlock is not available on this device.';
    case 'authentication-failed':
      return 'Device authentication was not completed. No setting was changed.';
    case 'busy':
      return 'Please wait for the current security check to finish.';
    case 'recovery-not-authorized':
      return 'Confirm your device identity again before choosing a new PIN.';
    case 'already-enabled':
      return 'App lock is already enabled.';
    case 'not-enabled':
      return 'App lock is not enabled on this device.';
    default:
      return 'Prayer Bank could not update the app lock. Try again.';
  }
}

export default function AppLockSettingsScreen() {
  const {
    authorizePinRecovery,
    cancelPinRecovery,
    changePin,
    disable,
    enable,
    getBiometricCapability,
    isBusy,
    recoverPin,
    setBiometricEnabled,
    state,
  } = useAppLock();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const lockEnabled = state.status === 'enabled-unlocked';
  const biometricEnabled = lockEnabled && state.biometricEnabled;
  const [mode, setMode] = useState<ScreenMode>(lockEnabled ? 'manage' : 'create');
  const [currentPin, setCurrentPin] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [biometricTarget, setBiometricTarget] = useState(false);
  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  const [capabilityLoading, setCapabilityLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const pinRef = useRef<PinCodeInputRef | null>(null);

  const announce = useCallback((nextMessage: string, isError: boolean) => {
    setMessage(nextMessage);
    setMessageIsError(isError);
    if (nextMessage) AccessibilityInfo.announceForAccessibility(nextMessage);
  }, []);

  const clearMessage = useCallback(() => {
    setMessage('');
    setMessageIsError(false);
  }, []);

  const clearPins = useCallback(() => {
    setCurrentPin('');
    setNextPin('');
    setConfirmation('');
  }, []);

  const openMode = useCallback(
    (nextMode: ScreenMode) => {
      if (mode === 'recovery-new' || mode === 'recovery-confirm') {
        cancelPinRecovery();
      }
      clearPins();
      clearMessage();
      setMode(nextMode);
      setTimeout(() => pinRef.current?.focus(), 0);
    },
    [cancelPinRecovery, clearMessage, clearPins, mode],
  );

  useEffect(() => {
    if (!lockEnabled) {
      setCapability(null);
      setCapabilityLoading(false);
      return;
    }

    let active = true;
    setCapabilityLoading(true);
    void getBiometricCapability()
      .then((nextCapability) => {
        if (active) setCapability(nextCapability);
      })
      .catch(() => {
        if (active) setCapability({ available: false, kinds: [] });
      })
      .finally(() => {
        if (active) setCapabilityLoading(false);
      });

    return () => {
      active = false;
    };
  }, [getBiometricCapability, lockEnabled]);

  const biometricName = 'Fingerprint unlock';

  const announcePinError = useCallback(
    (nextMessage: string) => {
      announce(nextMessage, true);
      setTimeout(() => pinRef.current?.focus(), 0);
    },
    [announce],
  );

  const validatePin = useCallback(
    (value: string, label: string) => {
      if (value.length === APP_LOCK_PIN_LENGTH) return true;
      announcePinError(`${label} must be exactly ${APP_LOCK_PIN_LENGTH} digits.`);
      return false;
    },
    [announcePinError],
  );

  const finishAtManagement = useCallback(
    (successMessage: string) => {
      clearPins();
      setMode('manage');
      announce(successMessage, false);
    },
    [announce, clearPins],
  );

  const continuePinFlow = useCallback(async () => {
    clearMessage();

    if (mode === 'create') {
      if (!validatePin(nextPin, 'PIN')) return;
      setConfirmation('');
      setMode('confirm-create');
      setTimeout(() => pinRef.current?.focus(), 0);
      return;
    }

    if (mode === 'confirm-create') {
      if (!validatePin(confirmation, 'PIN confirmation')) return;
      if (confirmation !== nextPin) {
        announcePinError('The PIN confirmation does not match. Try again.');
        setConfirmation('');
        return;
      }
      const result = await enable(nextPin);
      if (result.ok) finishAtManagement('App lock is now on.');
      else announcePinError(failureMessage(result));
      return;
    }

    if (mode === 'change-current') {
      if (!validatePin(currentPin, 'Current PIN')) return;
      setNextPin('');
      setMode('change-new');
      setTimeout(() => pinRef.current?.focus(), 0);
      return;
    }

    if (mode === 'change-new') {
      if (!validatePin(nextPin, 'New PIN')) return;
      setConfirmation('');
      setMode('confirm-change');
      setTimeout(() => pinRef.current?.focus(), 0);
      return;
    }

    if (mode === 'confirm-change') {
      if (!validatePin(confirmation, 'PIN confirmation')) return;
      if (confirmation !== nextPin) {
        announcePinError('The PIN confirmation does not match. Try again.');
        setConfirmation('');
        return;
      }
      const result = await changePin(currentPin, nextPin);
      if (result.ok) finishAtManagement('Your app PIN was changed.');
      else announcePinError(failureMessage(result));
      return;
    }

    if (mode === 'biometric') {
      if (!validatePin(currentPin, 'Current PIN')) return;
      const result = await setBiometricEnabled(biometricTarget, currentPin);
      if (result.ok) {
        finishAtManagement(
          biometricTarget
            ? `${biometricName} is now on.`
            : 'Biometric unlock is now off.',
        );
      } else announcePinError(failureMessage(result));
      return;
    }

    if (mode === 'disable') {
      if (!validatePin(currentPin, 'Current PIN')) return;
      const result = await disable(currentPin);
      if (result.ok) {
        AccessibilityInfo.announceForAccessibility('App lock is now off.');
        router.back();
      } else announcePinError(failureMessage(result));
      return;
    }

    if (mode === 'recovery-new') {
      if (!validatePin(nextPin, 'New PIN')) return;
      setConfirmation('');
      setMode('recovery-confirm');
      setTimeout(() => pinRef.current?.focus(), 0);
      return;
    }

    if (mode === 'recovery-confirm') {
      if (!validatePin(confirmation, 'PIN confirmation')) return;
      if (confirmation !== nextPin) {
        announcePinError('The PIN confirmation does not match. Try again.');
        setConfirmation('');
        return;
      }
      const result = await recoverPin(nextPin);
      if (result.ok) finishAtManagement('Your app PIN was reset.');
      else {
        announcePinError(failureMessage(result));
        if (result.reason === 'recovery-not-authorized') setMode('manage');
      }
    }
  }, [
    announce,
    announcePinError,
    biometricName,
    biometricTarget,
    changePin,
    clearMessage,
    confirmation,
    currentPin,
    disable,
    enable,
    finishAtManagement,
    mode,
    nextPin,
    recoverPin,
    setBiometricEnabled,
    validatePin,
  ]);

  const beginRecovery = useCallback(async () => {
    clearPins();
    clearMessage();
    const result = await authorizePinRecovery();
    if (!result.ok) {
      announce(failureMessage(result), true);
      return;
    }
    setMode('recovery-new');
    setTimeout(() => pinRef.current?.focus(), 0);
  }, [announce, authorizePinRecovery, clearMessage, clearPins]);

  const requestBiometricChange = useCallback(
    (enabled: boolean) => {
      setBiometricTarget(enabled);
      openMode('biometric');
    },
    [openMode],
  );

  const goBack = useCallback(() => {
    if (mode === 'manage' || mode === 'create') {
      router.back();
      return;
    }
    openMode(lockEnabled ? 'manage' : 'create');
  }, [lockEnabled, mode, openMode]);

  if (state.status !== 'disabled' && state.status !== 'enabled-unlocked') {
    return null;
  }

  const pinStep = mode === 'manage' ? null : getPinStep(mode, biometricTarget);
  const pinValue =
    mode === 'create' || mode === 'change-new' || mode === 'recovery-new'
      ? nextPin
      : mode === 'confirm-create' ||
          mode === 'confirm-change' ||
          mode === 'recovery-confirm'
        ? confirmation
        : currentPin;
  const setPinValue =
    mode === 'create' || mode === 'change-new' || mode === 'recovery-new'
      ? setNextPin
      : mode === 'confirm-create' ||
          mode === 'confirm-change' ||
          mode === 'recovery-confirm'
        ? setConfirmation
        : setCurrentPin;

  return (
    <SafeAreaView className="flex-1 bg-[#f8f3e8] dark:bg-[#171812]">
      <View className="relative h-14 flex-row items-center justify-center px-3">
        <IconButton
          accessibilityLabel="Back"
          className="absolute left-1"
          disabled={isBusy}
          icon="chevron-left"
          iconColor={dark ? '#cbd3a4' : '#59603f'}
          onPress={goBack}
          size={30}
        />
        <Text
          accessibilityRole="header"
          className="text-2xl font-bold text-[#111827] dark:text-[#f4efe4]">
          App lock
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="mx-auto min-h-full w-full max-w-2xl px-[26px] pb-[35px] pt-5"
        keyboardShouldPersistTaps="handled">
        {mode === 'manage' ? (
          <>
            <View className="flex-row items-center gap-4 rounded-3xl bg-[#e4e5d5] p-5 dark:bg-[#303226]">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-[#d4d8bd] dark:bg-[#3a3d2d]">
                <MaterialDesignIcons
                  color={dark ? '#cbd3a4' : '#59603f'}
                  name="lock"
                  size={28}
                />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="font-bold text-[#111827] dark:text-[#f6f0df]" variant="titleLarge">
                  App lock is on
                </Text>
                <Text className="mt-1 text-sm leading-5 text-[#676b7b] dark:text-[#c9c9b8]">
                  Prayer Bank asks for your PIN when you return to the app.
                </Text>
              </View>
            </View>

            {message ? (
              <View
                accessibilityLiveRegion={messageIsError ? 'assertive' : 'polite'}
                className={`mt-3 flex-row items-center gap-3 rounded-2xl px-4 py-3 ${
                  messageIsError
                    ? 'bg-[#f6e0dc] dark:bg-[#492d2a]'
                    : 'bg-[#e4e5d5] dark:bg-[#303226]'
                }`}>
                <MaterialDesignIcons
                  color={messageIsError ? (dark ? '#efb2a8' : '#9a594e') : dark ? '#cbd3a4' : '#59603f'}
                  name={messageIsError ? 'alert-circle-outline' : 'check-circle'}
                  size={22}
                />
                <Text
                  className={`min-w-0 flex-1 font-medium ${
                    messageIsError
                      ? 'text-[#8e493f] dark:text-[#efb2a8]'
                      : 'text-[#4f5637] dark:text-[#dce4b7]'
                  }`}>
                  {message}
                </Text>
              </View>
            ) : null}

            <Text className="mb-3 mt-8 text-xl font-bold text-[#111827] dark:text-[#f6f0df]">
              Unlock method
            </Text>
            <View className="rounded-2xl border border-[#ddd6c8] bg-[#fffaf0] dark:border-[#45463a] dark:bg-[#24251d]">
              <View className="min-h-[76px] flex-row items-center gap-4 px-4 py-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-[#e4e5d5] dark:bg-[#3a3d2d]">
                  <MaterialDesignIcons
                    color={dark ? '#cbd3a4' : '#59603f'}
                    name="fingerprint"
                    size={24}
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="font-bold text-[#282923] dark:text-[#f6f0df]">
                    {biometricName}
                  </Text>
                  <Text className="mt-1 text-sm leading-5 text-[#747468] dark:text-[#c9c9b8]">
                    {capabilityLoading
                      ? 'Checking this device…'
                      : capability?.available
                        ? 'Use fingerprint unlock with your PIN as fallback.'
                        : biometricEnabled
                          ? 'Fingerprint unlock is on, but availability could not be confirmed.'
                          : 'No enrolled fingerprint was found on this device.'}
                  </Text>
                </View>
                {capabilityLoading ? (
                  <ActivityIndicator color="#6f7653" size="small" />
                ) : capability?.available || biometricEnabled ? (
                  <Switch
                    accessibilityLabel={`${biometricName}, ${biometricEnabled ? 'on' : 'off'}`}
                    disabled={isBusy || (!biometricEnabled && !capability?.available)}
                    onValueChange={requestBiometricChange}
                    value={biometricEnabled}
                  />
                ) : null}
              </View>

            </View>

            <Text className="mb-3 mt-8 text-xl font-bold text-[#111827] dark:text-[#f6f0df]">
              PIN security
            </Text>
            <View className="overflow-hidden rounded-2xl border border-[#ddd6c8] bg-[#fffaf0] dark:border-[#45463a] dark:bg-[#24251d]">
              <ActionRow
                description="Choose a new four-digit PIN."
                disabled={isBusy}
                icon="dialpad"
                onPress={() => openMode('change-current')}
                title="Change PIN"
              />
              <View className="mx-4 h-px bg-[#ddd6c8] dark:bg-[#45463a]" />
              <ActionRow
                description="Confirm with device security, then choose a new PIN."
                disabled={isBusy}
                icon="lock-reset"
                onPress={() => void beginRecovery()}
                title="Reset PIN"
              />
            </View>

            <Button
              className="mt-6 min-h-12 justify-center"
              disabled={isBusy}
              icon="delete-outline"
              mode="outlined"
              textColor="#9a594e"
              onPress={() => openMode('disable')}>
              Turn off app lock
            </Button>
          </>
        ) : (
          <View className="w-full max-w-md">
            <View className="pt-6">
              <Text className="text-xs font-bold uppercase tracking-[1.5px] text-[#59603f] dark:text-[#cbd3a4]">
                {pinStep!.progressLabel}
              </Text>
              <Text className="mt-3 text-[#111827] dark:text-[#f6f0df]" variant="headlineMedium">
                {pinStep!.title}
              </Text>
              <Text className="mt-2 max-w-sm text-base leading-6 text-[#676b7b] dark:text-[#c9c9b8]">
                {pinStep!.description}
              </Text>
            </View>

            {mode === 'disable' ? (
              <View className="mt-6 rounded-2xl bg-[#f5ead2] px-4 py-4 dark:bg-[#403929]">
                <Text className="leading-6 text-[#394150] dark:text-[#eee5cf]">
                  Your saved prayers stay protected by your account. You can turn app lock on again anytime.
                </Text>
              </View>
            ) : null}

            <View className="mt-8 max-w-sm">
              <PinCodeInput
                accessibilityLabel={pinStep!.accessibilityLabel}
                autoFocus
                disabled={isBusy}
                errorMessage={messageIsError ? message : undefined}
                inputRef={pinRef}
                invalid={messageIsError}
                label={pinStep!.label}
                onChangeText={(value) => {
                  setPinValue(value);
                  clearMessage();
                }}
                onSubmitEditing={() => void continuePinFlow()}
                value={pinValue}
              />
            </View>

            {!messageIsError && message ? (
              <HelperText accessibilityLiveRegion="polite" className="mt-3 px-0" type="info" visible>
                {message}
              </HelperText>
            ) : null}

            {mode === 'disable' ? (
              <Button
                className="mt-4 min-h-12 justify-center"
                disabled={isBusy}
                mode="outlined"
                onPress={goBack}>
                Keep app lock
              </Button>
            ) : null}

            <Button
              buttonColor={mode === 'disable' ? '#a63d3d' : undefined}
              className={`${mode === 'disable' ? 'mt-3' : 'mt-4'} min-h-12 justify-center`}
              disabled={isBusy}
              loading={isBusy}
              mode="contained"
              onPress={() => void continuePinFlow()}>
              {isBusy ? pinStep!.busyLabel : pinStep!.buttonLabel}
            </Button>

            {mode === 'create' ? (
              <Text className="mt-6 max-w-sm text-xs leading-5 text-[#676b7b] dark:text-[#c9c9b8]">
                This PIN is separate from your Prayer Bank account password.
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionRow({
  description,
  disabled,
  icon,
  onPress,
  title,
}: {
  description: string;
  disabled?: boolean;
  icon: 'dialpad' | 'lock-reset';
  onPress: () => void;
  title: string;
}) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      className={`min-h-[76px] flex-row items-center gap-4 px-4 py-3 active:bg-[#f1ebde] dark:active:bg-[#303226] ${
        disabled ? 'opacity-50' : ''
      }`}
      disabled={disabled}
      onPress={onPress}>
      <View className="h-10 w-10 items-center justify-center rounded-full bg-[#e4e5d5] dark:bg-[#3a3d2d]">
        <MaterialDesignIcons
          color={dark ? '#cbd3a4' : '#59603f'}
          name={icon}
          size={22}
        />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-bold text-[#282923] dark:text-[#f6f0df]">{title}</Text>
        <Text className="mt-1 text-sm leading-5 text-[#747468] dark:text-[#c9c9b8]">
          {description}
        </Text>
      </View>
      <MaterialDesignIcons
        color={dark ? '#8f907f' : '#747468'}
        name="chevron-right"
        size={24}
      />
    </Pressable>
  );
}

function getPinStep(
  mode: Exclude<ScreenMode, 'manage'>,
  biometricTarget: boolean,
) {
  switch (mode) {
    case 'create':
      return {
        accessibilityLabel: 'New four-digit app PIN',
        busyLabel: 'Please wait…',
        buttonLabel: 'Continue',
        description: 'Enter four digits to protect Prayer Bank on this device.',
        label: 'New PIN',
        progressLabel: 'Step 1 of 2',
        title: 'Create your PIN',
      };
    case 'confirm-create':
      return {
        accessibilityLabel: 'Confirm four-digit app PIN',
        busyLabel: 'Turning on…',
        buttonLabel: 'Turn on app lock',
        description: 'Enter the same four digits again.',
        label: 'Confirm PIN',
        progressLabel: 'Step 2 of 2',
        title: 'Confirm your PIN',
      };
    case 'change-current':
      return {
        accessibilityLabel: 'Current four-digit app PIN',
        busyLabel: 'Please wait…',
        buttonLabel: 'Continue',
        description: 'Confirm your current PIN before choosing a new one.',
        label: 'Current PIN',
        progressLabel: 'Step 1 of 3',
        title: 'Enter your current PIN',
      };
    case 'change-new':
      return {
        accessibilityLabel: 'New four-digit app PIN',
        busyLabel: 'Please wait…',
        buttonLabel: 'Continue',
        description: 'Use four digits you can remember but others cannot guess.',
        label: 'New PIN',
        progressLabel: 'Step 2 of 3',
        title: 'Choose a new PIN',
      };
    case 'confirm-change':
      return {
        accessibilityLabel: 'Confirm new four-digit app PIN',
        busyLabel: 'Saving…',
        buttonLabel: 'Save new PIN',
        description: 'Enter the same four digits again.',
        label: 'Confirm PIN',
        progressLabel: 'Step 3 of 3',
        title: 'Confirm your new PIN',
      };
    case 'biometric':
      return {
        accessibilityLabel: 'Current four-digit app PIN',
        busyLabel: 'Updating…',
        buttonLabel: biometricTarget ? 'Continue' : 'Turn off',
        description: biometricTarget
          ? 'Enter your current PIN. Next, confirm with fingerprint unlock.'
          : 'Enter your current PIN to turn off fingerprint unlock.',
        label: 'Current PIN',
        progressLabel: 'Security check',
        title: 'Confirm your PIN',
      };
    case 'disable':
      return {
        accessibilityLabel: 'Current four-digit app PIN',
        busyLabel: 'Turning off…',
        buttonLabel: 'Turn off app lock',
        description: 'Enter your PIN to stop requiring app lock on this device.',
        label: 'Current PIN',
        progressLabel: 'Security check',
        title: 'Turn off app lock?',
      };
    case 'recovery-new':
      return {
        accessibilityLabel: 'New four-digit app PIN',
        busyLabel: 'Please wait…',
        buttonLabel: 'Continue',
        description: 'Create four new digits for app lock.',
        label: 'New PIN',
        progressLabel: 'Identity confirmed',
        title: 'Choose a new PIN',
      };
    case 'recovery-confirm':
      return {
        accessibilityLabel: 'Confirm replacement four-digit app PIN',
        busyLabel: 'Saving…',
        buttonLabel: 'Save new PIN',
        description: 'Enter the same four digits again.',
        label: 'Confirm PIN',
        progressLabel: 'Step 2 of 2',
        title: 'Confirm your new PIN',
      };
  }
}
