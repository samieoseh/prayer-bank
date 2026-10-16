import {
  Pressable,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSubmitEditingEventData,
} from 'react-native';
import { HelperText, Text } from 'react-native-paper';
import { useRef, useState, type RefObject } from 'react';

import { APP_LOCK_PIN_LENGTH } from '@/features/app-lock/app-lock-types';

export type PinCodeInputRef = { focus: () => void };

type PinCodeInputProps = {
  accessibilityLabel: string;
  autoFocus?: boolean;
  disabled?: boolean;
  errorMessage?: string;
  inputRef: RefObject<PinCodeInputRef | null>;
  invalid?: boolean;
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
  errorMessage,
  inputRef,
  invalid = false,
  label,
  onChangeText,
  onSubmitEditing,
  returnKeyType = 'done',
  value,
}: PinCodeInputProps) {
  const internalRef = useRef<TextInput | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const activeIndex = Math.min(value.length, APP_LOCK_PIN_LENGTH - 1);

  const setRef = (input: TextInput | null) => {
    internalRef.current = input;
    inputRef.current = input;
  };

  return (
    <View className="w-full max-w-sm self-center">
      <Text
        className={`mb-2 text-sm font-bold ${
          invalid
            ? 'text-[#9a594e] dark:text-[#efb2a8]'
            : 'text-[#282923] dark:text-[#f6f0df]'
        }`}>
        {label}
      </Text>
      <Pressable
        accessible={false}
        className={disabled ? 'opacity-50' : ''}
        disabled={disabled}
        onPress={() => internalRef.current?.focus()}>
        <View
          className={`flex-row gap-3 rounded-2xl ${
            isFocused && !invalid ? 'bg-[#e4e5d5]/60 dark:bg-[#34362b]' : ''
          }`}>
          {Array.from({ length: APP_LOCK_PIN_LENGTH }, (_, index) => {
            const isFilled = Boolean(value[index]);
            const isActive = isFocused && index === activeIndex && !disabled;
            const borderClass = invalid
              ? isActive
                ? 'border-2 border-[#9a594e] dark:border-[#efb2a8]'
                : 'border border-[#c9877c] dark:border-[#bd766c]'
              : isActive
                ? 'border-2 border-[#59603f] dark:border-[#cbd3a4]'
                : isFilled
                  ? 'border border-[#9ca37d] dark:border-[#8e966f]'
                  : 'border border-[#ddd6c8] dark:border-[#535548]';
            const surfaceClass = isFilled
              ? 'bg-[#f1ebde] dark:bg-[#303126]'
              : 'bg-[#fffaf0] dark:bg-[#24251d]';

            return (
              <View
                accessible={false}
                className={`h-[62px] min-w-0 flex-1 items-center justify-center rounded-2xl ${borderClass} ${surfaceClass}`}
                key={index}>
                <Text className="text-2xl font-bold text-[#59603f] dark:text-[#e4e5d5]">
                  {isFilled ? '•' : ''}
                </Text>
              </View>
            );
          })}
        </View>
        <TextInput
          ref={setRef}
          accessibilityHint={`${APP_LOCK_PIN_LENGTH} digits. ${value.length} entered.`}
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ disabled: Boolean(disabled) }}
          aria-invalid={invalid}
          autoComplete="off"
          autoFocus={autoFocus}
          className="absolute inset-0 opacity-0"
          editable={!disabled}
          keyboardType="number-pad"
          maxLength={APP_LOCK_PIN_LENGTH}
          onBlur={() => setIsFocused(false)}
          onChangeText={(nextValue) =>
            onChangeText(nextValue.replace(/\D/g, '').slice(0, APP_LOCK_PIN_LENGTH))
          }
          onFocus={() => setIsFocused(true)}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          secureTextEntry
          value={value}
        />
      </Pressable>
      {errorMessage ? (
        <HelperText className="px-0" type="error" visible={invalid}>
          {errorMessage}
        </HelperText>
      ) : null}
    </View>
  );
}
