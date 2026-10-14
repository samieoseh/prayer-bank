import { Button, HelperText, TextInput, useTheme } from 'react-native-paper';

import { usePasswordSignIn } from '@/features/auth/hooks/use-password-sign-in';

type SignInFormProps = {
  configurationError?: string;
  initializationError?: string;
};

export function SignInForm({
  configurationError,
  initializationError,
}: SignInFormProps) {
  const theme = useTheme();
  const request = usePasswordSignIn(Boolean(configurationError));
  const feedback = configurationError
    ? configurationError
    : initializationError
      ? initializationError
      : request.state.status === 'error' || request.state.status === 'success'
        ? request.state.message
        : undefined;
  const hasError =
    Boolean(configurationError) ||
    Boolean(initializationError) ||
    request.state.status === 'error';

  return (
    <>
      <TextInput
        activeOutlineColor={theme.colors.primary}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        contentStyle={{ minHeight: 52 }}
        editable={!request.isPending}
        inputMode="email"
        keyboardType="email-address"
        label="Email address"
        mode="outlined"
        onChangeText={request.setEmail}
        onSubmitEditing={() => undefined}
        outlineColor={theme.colors.outlineVariant}
        outlineStyle={{ borderRadius: 16 }}
        placeholder="you@example.com"
        placeholderTextColor={theme.colors.onSurfaceVariant}
        returnKeyType="next"
        style={{ backgroundColor: theme.colors.surface }}
        textContentType="emailAddress"
        textColor={theme.colors.onSurface}
        value={request.email}
      />

      <TextInput
        activeOutlineColor={theme.colors.primary}
        autoCapitalize="none"
        autoComplete="current-password"
        contentStyle={{ minHeight: 52 }}
        editable={!request.isPending}
        label="Password"
        mode="outlined"
        onChangeText={request.setPassword}
        onSubmitEditing={() => void request.submit()}
        outlineColor={theme.colors.outlineVariant}
        outlineStyle={{ borderRadius: 16 }}
        placeholder="Enter your password"
        placeholderTextColor={theme.colors.onSurfaceVariant}
        returnKeyType="done"
        secureTextEntry
        style={{ backgroundColor: theme.colors.surface }}
        textContentType="password"
        textColor={theme.colors.onSurface}
        value={request.password}
      />

      {feedback ? (
        <HelperText
          accessibilityLiveRegion="polite"
          style={{
            color: hasError ? theme.colors.error : theme.colors.primary,
            fontSize: 14,
            fontWeight: '600',
            lineHeight: 20,
          }}
          type={hasError ? 'error' : 'info'}
          visible>
          {feedback}
        </HelperText>
      ) : null}

      <Button
        contentStyle={{ minHeight: 50 }}
        disabled={Boolean(configurationError) || request.isPending}
        labelStyle={{ fontSize: 16, fontWeight: '700' }}
        loading={request.pendingAction === 'sign-in'}
        mode="contained"
        onPress={() => void request.submit()}
        style={{ marginTop: 14, borderRadius: 999 }}>
        Sign in
      </Button>

      <Button
        contentStyle={{ minHeight: 50 }}
        disabled={Boolean(configurationError) || request.isPending}
        labelStyle={{ fontSize: 16, fontWeight: '700' }}
        loading={request.pendingAction === 'sign-up'}
        mode="outlined"
        onPress={() => void request.signUp()}
        style={{ marginTop: 10, borderRadius: 999, borderColor: theme.colors.outline }}>
        Create account
      </Button>
    </>
  );
}
