import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Dialog, IconButton, Portal } from 'react-native-paper';

import {
  formatAnsweredOn,
  formatLocalDateInput,
  parseLocalDateInput,
} from '@/features/prayers/utils/prayer-answer';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type AnswerDatePickerProps = {
  disabled?: boolean;
  error?: boolean;
  onChange: (value: string) => void;
  value: string;
};

export function AnswerDatePicker({ disabled, error, onChange, value }: AnswerDatePickerProps) {
  const selectedDate = parseLocalDateInput(value) ?? new Date();
  const [visible, setVisible] = useState(false);
  const [displayedMonth, setDisplayedMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const firstWeekday = displayedMonth.getDay();
  const daysInMonth = new Date(
    displayedMonth.getFullYear(),
    displayedMonth.getMonth() + 1,
    0,
  ).getDate();
  const calendarDays = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  function open() {
    setDisplayedMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    setVisible(true);
  }

  function chooseDay(day: number) {
    const chosen = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), day);
    onChange(formatLocalDateInput(chosen));
    setVisible(false);
  }

  function changeMonth(offset: number) {
    setDisplayedMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  return (
    <>
      <Button
        accessibilityLabel={`Answered on, ${formatAnsweredOn(value)}. Open date picker`}
        className={error ? 'border-[#9a594e]' : ''}
        contentStyle={{ minHeight: 50, justifyContent: 'space-between' }}
        disabled={disabled}
        icon="calendar-month-outline"
        mode="outlined"
        onPress={open}>
        {formatAnsweredOn(value)}
      </Button>

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)}>
          <Dialog.Title>Select answer date</Dialog.Title>
          <Dialog.Content>
            <View className="mb-4 flex-row items-center justify-between">
              <IconButton
                accessibilityLabel="Previous month"
                icon="chevron-left"
                onPress={() => changeMonth(-1)}
              />
              <Text className="text-base font-bold text-[#282923] dark:text-[#f4efe4]">
                {displayedMonth.toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <IconButton
                accessibilityLabel="Next month"
                icon="chevron-right"
                onPress={() => changeMonth(1)}
              />
            </View>

            <View className="flex-row flex-wrap">
              {WEEKDAYS.map((weekday) => (
                <Text
                  className="w-[14.285%] py-2 text-center text-xs font-bold text-[#747468] dark:text-[#c7c2b8]"
                  key={weekday}>
                  {weekday}
                </Text>
              ))}
              {calendarDays.map((day, index) => {
                const selected =
                  day !== null &&
                  selectedDate.getFullYear() === displayedMonth.getFullYear() &&
                  selectedDate.getMonth() === displayedMonth.getMonth() &&
                  selectedDate.getDate() === day;
                const date = day
                  ? new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), day)
                  : null;

                return (
                  <View className="w-[14.285%] items-center py-1" key={`${day ?? 'blank'}-${index}`}>
                    {day && date ? (
                      <Pressable
                        accessibilityLabel={date.toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        className={`h-10 w-10 items-center justify-center rounded-full active:opacity-70 ${
                          selected ? 'bg-[#6f7653] dark:bg-[#bbc49a]' : ''
                        }`}
                        onPress={() => chooseDay(day)}>
                        <Text
                          className={
                            selected
                              ? 'font-bold text-[#fffaf0] dark:text-[#282923]'
                              : 'text-[#282923] dark:text-[#f4efe4]'
                          }>
                          {day}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}
