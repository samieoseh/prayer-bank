import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SignInForm } from '@/features/auth/components/sign-in-form';
import { useAuth } from '@/features/auth/hooks/use-auth';

export default function SignInScreen() {
  const auth = useAuth();
  const configurationError =
    auth.status === 'unauthenticated' ? auth.configurationError : undefined;

  return (
    <SafeAreaView className="flex-1 bg-[#f8f3e8]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <View className="flex-1 justify-center px-[26px] py-[35px]">
          <View className="mb-12">
            <View
              accessibilityElementsHidden
              className="mb-[26px] h-14 w-14 items-center justify-center rounded-full bg-[#6f7653]">
              <Text className="font-serif text-[26px] text-[#fffaf0]">P</Text>
            </View>
            <Text className="mb-2.5 text-xs font-bold uppercase tracking-[1.4px] text-[#59603f]">
              Prayer Bank
            </Text>
            <Text className="font-serif text-[38px] font-medium leading-[44px] text-[#282923]">
              Return to what matters.
            </Text>
            <Text className="mt-3.5 max-w-[330px] text-base leading-[23px] text-[#747468]">
              Review your prayer burdens before prayer, then put the phone away.
            </Text>
          </View>

          <View className="gap-2.5">
            <SignInForm configurationError={configurationError} />
          </View>

          <Text className="mt-[26px] max-w-[300px] self-center text-center text-sm leading-[23px] text-[#747468]">
            Prayer Bank is private. Your requests are available only after you sign in.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
