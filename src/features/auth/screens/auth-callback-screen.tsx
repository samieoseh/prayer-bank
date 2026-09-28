import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { ActivityIndicator, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthCallback } from '@/features/auth/hooks/use-auth-callback';

export default function AuthCallbackScreen() {
  const state = useAuthCallback();

  return (
    <SafeAreaView className="flex-1 bg-[#f8f3e8]">
      <View className="flex-1 items-center justify-center px-[26px]">
        {state.status === 'processing' ? (
          <>
            <ActivityIndicator color="#6f7653" />
            <Text className="mt-3.5 text-center text-base text-[#747468]">
              Signing you in securely…
            </Text>
          </>
        ) : (
          <View className="w-full max-w-[360px] items-center">
            <Text className="font-serif text-[26px] font-medium text-[#282923]">
              Link unavailable
            </Text>
            <Text
              accessibilityLiveRegion="polite"
              role="alert"
              className="mt-3.5 text-center text-base leading-[23px] text-[#9a594e]">
              {state.message}
            </Text>
            <Button
              buttonColor="#6f7653"
              contentStyle={{ minHeight: 50 }}
              mode="contained"
              onPress={() => router.replace('/sign-in')}
              style={{ width: '100%', marginTop: 26, borderRadius: 999 }}
              textColor="#fffaf0">
              Request a new link
            </Button>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
