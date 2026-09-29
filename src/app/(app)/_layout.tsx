import { Stack } from 'expo-router';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { Component, Suspense, useCallback, useState, type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';

import { DatabaseErrorScreen } from '@/features/prayers/components/database-error-screen';
import { migratePrayerDatabase } from '@/features/prayers/data/schema';

export default function AppLayout() {
  const theme = useTheme();
  const [databaseKey, setDatabaseKey] = useState(0);

  const initialize = useCallback(async (database: SQLiteDatabase) => {
    await migratePrayerDatabase(database);
  }, []);

  return (
    <DatabaseErrorBoundary
      key={databaseKey}
      onRetry={() => setDatabaseKey((key) => key + 1)}>
      <Suspense fallback={<DatabaseLoadingScreen />}>
        <SQLiteProvider databaseName="prayer-bank.db" onInit={initialize} useSuspense>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: theme.colors.background },
              headerShown: false,
            }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="requests" />
          </Stack>
        </SQLiteProvider>
      </Suspense>
    </DatabaseErrorBoundary>
  );
}

type DatabaseErrorBoundaryProps = PropsWithChildren<{ onRetry: () => void }>;

class DatabaseErrorBoundary extends Component<
  DatabaseErrorBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <DatabaseErrorScreen onRetry={this.props.onRetry} />;
    }

    return this.props.children;
  }
}

function DatabaseLoadingScreen() {
  return (
    <View
      accessibilityLabel="Opening Prayer Bank"
      className="flex-1 items-center justify-center bg-[#f8f3e8] dark:bg-[#171812]">
      <ActivityIndicator color="#6f7653" size="small" />
    </View>
  );
}
