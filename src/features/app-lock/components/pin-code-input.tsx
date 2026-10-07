import {
  Pressable,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSubmitEditingEventData,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useRef, type RefObject } from 'react';

import { APP_LOCK_PIN_LENGTH } from '@/features/app-lock/app-lock-types';

export type PinCodeInputRef = { focus: () => void };

type PinCodeInputProps = {
  accessibilityLabel: string;
  autoFocus?: boolean;
  disabled?: boolean;
  inputRef: RefObject<PinCodeInputRef | null>;
  label: string;
  onChangeText: (value: string) => void;
  onSubmitEditing?: (
    event: NativeSyntheticEvent<TextInputSubmitEditingEventData>,
  ) => void;
  returnKeyType?: 'done' | 'next';
  value: string;
};

export function PinCodeInput({
  accessibilityLabel,
  autoFocus,
  disabled,
  inputRef,
  label,
  onChangeText,
  onSubmitEditing,
  returnKeyType = 'done',
  value,
}: PinCodeInputProps) {
  const internalRef = useRef<TextInput | null>(null);

  const setRef = (input: TextInput | null) => {
    internalRef.current = input;
    inputRef.current = input;
  };

  return (
    <View>
      <Text className="mb-2 text-sm font-bold text-[#282923] dark:text-[#f6f0df]">
        {label}
      </Text>
      <Pressable
        accessibilityRole="none"
        className={disabled ? 'opacity-50' : ''}
        disabled={disabled}
        onPress={() => internalRef.current?.focus()}>
        <View className="flex-row justify-between gap-3">
          {Array.from({ length: APP_LOCK_PIN_LENGTH }, (_, index) => (
            <View
              className={`h-14 flex-1 items-center justify-center rounded-xl border bg-[#fffaf0] dark:bg-[#24251d] ${
                index === value.length && !disabled
                  ? 'border-[#6f7653] dark:border-[#bbc49a]'
                  : 'border-[#ddd6c8] dark:border-[#535548]'
              }`}
              key={index}>
              <Text className="text-2xl text-[#282923] dark:text-[#f6f0df]">
                {value[index] ? '•' : ''}
              </Text>
            </View>
          ))}
        </View>
        <TextInput
          ref={setRef}
          accessibilityLabel={accessibilityLabel}
          autoComplete="off"
          autoFocus={autoFocus}
          className="absolute inset-0 opacity-0"
          editable={!disabled}
          keyboardType="number-pad"
          maxLength={APP_LOCK_PIN_LENGTH}
          onChangeText={(nextValue) =>
            onChangeText(nextValue.replace(/\D/g, '').slice(0, APP_LOCK_PIN_LENGTH))
          }
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          secureTextEntry
          value={value}
        />
      </Pressable>
    </View>
  );
}
