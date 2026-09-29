import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, IconButton } from 'react-native-paper';

import { SignInForm } from '@/features/auth/components/sign-in-form';
import { useAuth } from '@/features/auth/hooks/use-auth';

export default function SignInScreen() {
  const auth = useAuth();
  const configurationError =
    auth.status === 'unauthenticated' ? auth.configurationError : undefined;

  return (
    <SafeAreaView className="flex-1 bg-[#f8f3e8] dark:bg-[#171812]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <View className="flex-1 justify-center px-[26px] py-[35px]">
          <IconButton
            accessibilityLabel="Continue without signing in"
            className="absolute left-3 top-3"
            icon="close"
            onPress={() => router.replace('/')}
          />
          <View className="mb-12">
            <View
              accessibilityElementsHidden
              className="mb-[26px] h-14 w-14 items-center justify-center rounded-full bg-[#6f7653] dark:bg-[#bbc49a]">
              <Text className="font-serif text-[26px] text-[#fffaf0] dark:text-[#202315]">P</Text>
            </View>
            <Text className="mb-2.5 text-xs font-bold uppercase tracking-[1.4px] text-[#59603f] dark:text-[#bbc49a]">
              Prayer Bank
            </Text>
            <Text className="font-serif text-[38px] font-medium leading-[44px] text-[#282923] dark:text-[#f4efe4]">
              Keep what matters before you.
            </Text>
            <Text className="mt-3.5 max-w-[330px] text-base leading-[23px] text-[#747468] dark:text-[#c7c2b8]">
              A quiet place to prepare, remember, and record answered prayer.
            </Text>
          </View>

          <View className="gap-2.5">
            <SignInForm configurationError={configurationError} />
            <Button mode="text" onPress={() => router.replace('/')}>
              Continue without signing in
            </Button>
          </View>

          <Text className="mt-[26px] max-w-[300px] self-center text-center text-sm leading-[23px] text-[#747468] dark:text-[#c7c2b8]">
            Your prayer matters remain private and available offline on this device.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
