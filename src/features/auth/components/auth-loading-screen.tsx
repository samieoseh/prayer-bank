import { View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

export function AuthLoadingScreen() {
  return (
    <View
      accessibilityLabel="Restoring your session"
      className="flex-1 items-center justify-center bg-[#f8f3e8]">
      <ActivityIndicator color="#6f7653" />
    </View>
  );
}
