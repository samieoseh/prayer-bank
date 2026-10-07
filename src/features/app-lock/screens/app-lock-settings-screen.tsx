import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { router } from 'expo-router';
import { AccessibilityInfo, Pressable, ScrollView, useColorScheme, View } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Button, HelperText, Switch, Text } from 'react-native-paper';
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
      return 'Fingerprint or face unlock is not available on this device.';
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

  const biometricName = useMemo(() => {
    if (!capability?.kinds.length) return 'Biometric unlock';
    const labels = capability.kinds.map((kind) => {
      if (kind === 'face') return 'Face unlock';
      if (kind === 'iris') return 'Iris unlock';
      return 'Fingerprint unlock';
    });
    return labels.join(' or ');
  }, [capability]);

  const validatePin = useCallback(
    (value: string, label: string) => {
      if (value.length === APP_LOCK_PIN_LENGTH) return true;
      announce(`${label} must be exactly ${APP_LOCK_PIN_LENGTH} digits.`, true);
      pinRef.current?.focus();
      return false;
    },
    [announce],
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
        announce('The PIN confirmation does not match.', true);
        setConfirmation('');
        pinRef.current?.focus();
        return;
      }
      const result = await enable(nextPin);
      if (result.ok) finishAtManagement('App lock is now on.');
      else announce(failureMessage(result), true);
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
        announce('The PIN confirmation does not match.', true);
        setConfirmation('');
        pinRef.current?.focus();
        return;
      }
      const result = await changePin(currentPin, nextPin);
      if (result.ok) finishAtManagement('Your app PIN was changed.');
      else announce(failureMessage(result), true);
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
      } else announce(failureMessage(result), true);
      return;
    }

    if (mode === 'disable') {
      if (!validatePin(currentPin, 'Current PIN')) return;
      const result = await disable(currentPin);
      if (result.ok) {
        AccessibilityInfo.announceForAccessibility('App lock is now off.');
        router.back();
      } else announce(failureMessage(result), true);
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
        announce('The PIN confirmation does not match.', true);
        setConfirmation('');
        pinRef.current?.focus();
        return;
      }
      const result = await recoverPin(nextPin);
      if (result.ok) finishAtManagement('Your app PIN was reset.');
      else {
        announce(failureMessage(result), true);
        if (result.reason === 'recovery-not-authorized') setMode('manage');
      }
    }
  }, [
    announce,
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

  const pinStep =
    mode === 'manage' ? null : getPinStep(mode, biometricName, biometricTarget);
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
      <View className="flex-row items-center justify-between px-[18px] py-3">
        <Button mode="text" onPress={goBack}>
          Back
        </Button>
        <Text
          accessibilityRole="header"
          className="text-xl font-bold text-[#282923] dark:text-[#f4efe4]">
          App lock
        </Text>
        <View className="w-[68px]" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="mx-auto min-h-full w-full max-w-2xl px-[26px] pb-[35px] pt-5"
        keyboardShouldPersistTaps="handled">
        {mode === 'manage' ? (
          <>
            <View className="rounded-3xl bg-[#e4e5d5] p-5 dark:bg-[#303226]">
              <Text className="text-xs font-bold uppercase tracking-[1.5px] text-[#59603f] dark:text-[#cbd3a4]">
                Security
              </Text>
              <Text className="mt-2 text-[#282923] dark:text-[#f6f0df]" variant="headlineSmall">
                App lock is on
              </Text>
              <Text className="mt-2 text-sm leading-5 text-[#747468] dark:text-[#c9c9b8]">
                Prayer Bank asks for your PIN when you return to the app.
              </Text>
            </View>

            <Text className="mb-2 mt-8 px-1 text-xs font-bold uppercase tracking-[1.5px] text-[#59603f] dark:text-[#cbd3a4]">
              Unlock options
            </Text>
            <View className="overflow-hidden rounded-2xl border border-[#ddd6c8] bg-[#fffaf0] dark:border-[#45463a] dark:bg-[#24251d]">
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
                        ? 'Use biometrics with your PIN as fallback.'
                        : 'No supported, enrolled biometrics were found.'}
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

              <View className="mx-4 h-px bg-[#ddd6c8] dark:bg-[#45463a]" />
              <ActionRow
                description="Choose a new four-digit PIN."
                icon="dialpad"
                onPress={() => openMode('change-current')}
                title="Change PIN"
              />
              <View className="mx-4 h-px bg-[#ddd6c8] dark:bg-[#45463a]" />
              <ActionRow
                description="Reset your PIN after confirming your device identity."
                icon="lock-reset"
                onPress={() => void beginRecovery()}
                title="Forgot PIN?"
              />
            </View>

            <Button
              className="mt-6 min-h-12 justify-center"
              mode="outlined"
              textColor="#9a594e"
              onPress={() => openMode('disable')}>
              Turn off app lock
            </Button>
          </>
        ) : (
          <View className="flex-1">
            <View className="items-center pt-6">
              <Text className="text-xs font-bold uppercase tracking-[1.5px] text-[#59603f] dark:text-[#cbd3a4]">
                Security
              </Text>
              <Text className="mt-3 text-center text-[#282923] dark:text-[#f6f0df]" variant="headlineSmall">
                {pinStep!.title}
              </Text>
              <Text className="mt-2 max-w-sm text-center text-base leading-6 text-[#747468] dark:text-[#c9c9b8]">
                {pinStep!.description}
              </Text>
            </View>

            <View className="mt-8">
              <PinCodeInput
                accessibilityLabel={pinStep!.accessibilityLabel}
                autoFocus
                inputRef={pinRef}
                label={pinStep!.label}
                onChangeText={(value) => {
                  setPinValue(value);
                  clearMessage();
                }}
                onSubmitEditing={() => void continuePinFlow()}
                value={pinValue}
              />
            </View>

            <HelperText
              accessibilityLiveRegion={messageIsError ? 'assertive' : 'polite'}
              className="mt-3 text-center"
              type={messageIsError ? 'error' : 'info'}
              visible={Boolean(message)}>
              {message}
            </HelperText>

            <Button
              className="mt-4 min-h-12 justify-center"
              disabled={isBusy}
              loading={isBusy}
              mode={mode === 'disable' ? 'outlined' : 'contained'}
              textColor={mode === 'disable' ? '#9a594e' : undefined}
              onPress={() => void continuePinFlow()}>
              {pinStep!.buttonLabel}
            </Button>

            {mode === 'create' ? (
              <Text className="mx-auto mt-6 max-w-sm text-center text-xs leading-5 text-[#747468] dark:text-[#c9c9b8]">
                This PIN is separate from your Prayer Bank account password.
              </Text>
            ) : null}
          </View>
        )}

        {mode === 'manage' && message ? (
          <HelperText
            accessibilityLiveRegion={messageIsError ? 'assertive' : 'polite'}
            className="mt-3 text-center"
            type={messageIsError ? 'error' : 'info'}
            visible>
            {message}
          </HelperText>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionRow({
  description,
  icon,
  onPress,
  title,
}: {
  description: string;
  icon: 'dialpad' | 'lock-reset';
  onPress: () => void;
  title: string;
}) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-[76px] flex-row items-center gap-4 px-4 py-3 active:bg-[#f1ebde] dark:active:bg-[#303226]"
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
      <Text className="text-2xl text-[#9b9a8d] dark:text-[#8f907f]">›</Text>
    </Pressable>
  );
}

function getPinStep(
  mode: Exclude<ScreenMode, 'manage'>,
  biometricName: string,
  biometricTarget: boolean,
) {
  switch (mode) {
    case 'create':
      return {
        accessibilityLabel: 'New four-digit app PIN',
        buttonLabel: 'Continue',
        description: 'Enter four digits to protect Prayer Bank on this device.',
        label: 'New PIN',
        title: 'Create your PIN',
      };
    case 'confirm-create':
      return {
        accessibilityLabel: 'Confirm four-digit app PIN',
        buttonLabel: 'Turn on app lock',
        description: 'Enter the same four digits again.',
        label: 'Confirm PIN',
        title: 'Confirm your PIN',
      };
    case 'change-current':
      return {
        accessibilityLabel: 'Current four-digit app PIN',
        buttonLabel: 'Continue',
        description: 'Confirm your current PIN before choosing a new one.',
        label: 'Current PIN',
        title: 'Enter your current PIN',
      };
    case 'change-new':
      return {
        accessibilityLabel: 'New four-digit app PIN',
        buttonLabel: 'Continue',
        description: 'Choose four new digits for App Lock.',
        label: 'New PIN',
        title: 'Choose a new PIN',
      };
    case 'confirm-change':
      return {
        accessibilityLabel: 'Confirm new four-digit app PIN',
        buttonLabel: 'Save new PIN',
        description: 'Enter the same four digits again.',
        label: 'Confirm PIN',
        title: 'Confirm your new PIN',
      };
    case 'biometric':
      return {
        accessibilityLabel: 'Current four-digit app PIN',
        buttonLabel: biometricTarget ? 'Continue' : 'Turn off',
        description: biometricTarget
          ? `Enter your PIN, then complete the ${biometricName.toLowerCase()} prompt.`
          : 'Enter your PIN to turn off biometric unlock.',
        label: 'Current PIN',
        title: biometricTarget ? `Turn on ${biometricName}` : 'Turn off biometric unlock',
      };
    case 'disable':
      return {
        accessibilityLabel: 'Current four-digit app PIN',
        buttonLabel: 'Turn off app lock',
        description: 'Enter your PIN to remove App Lock from this device.',
        label: 'Current PIN',
        title: 'Turn off app lock',
      };
    case 'recovery-new':
      return {
        accessibilityLabel: 'New four-digit app PIN',
        buttonLabel: 'Continue',
        description: 'Your device identity was confirmed. Choose a replacement PIN.',
        label: 'New PIN',
        title: 'Choose a new PIN',
      };
    case 'recovery-confirm':
      return {
        accessibilityLabel: 'Confirm replacement four-digit app PIN',
        buttonLabel: 'Save new PIN',
        description: 'Enter the same four digits again.',
        label: 'Confirm PIN',
        title: 'Confirm your new PIN',
      };
  }
}
