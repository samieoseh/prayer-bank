import { Button, HelperText, TextInput } from 'react-native-paper';

import { usePasswordSignIn } from '@/features/auth/hooks/use-password-sign-in';

type SignInFormProps = {
  configurationError?: string;
};

export function SignInForm({ configurationError }: SignInFormProps) {
  const request = usePasswordSignIn(Boolean(configurationError));
  const feedback = configurationError
    ? configurationError
    : request.state.status === 'error' || request.state.status === 'success'
      ? request.state.message
      : undefined;
  const hasError = Boolean(configurationError) || request.state.status === 'error';

  return (
    <>
      <TextInput
        activeOutlineColor="#6f7653"
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
        outlineColor="#ddd6c8"
        outlineStyle={{ borderRadius: 16 }}
        placeholder="you@example.com"
        placeholderTextColor="#9b9a8d"
        returnKeyType="next"
        style={{ backgroundColor: '#fffaf0' }}
        textContentType="emailAddress"
        textColor="#282923"
        value={request.email}
      />

      <TextInput
        activeOutlineColor="#6f7653"
        autoCapitalize="none"
        autoComplete="current-password"
        contentStyle={{ minHeight: 52 }}
        editable={!request.isPending}
        label="Password"
        mode="outlined"
        onChangeText={request.setPassword}
        onSubmitEditing={() => void request.submit()}
        outlineColor="#ddd6c8"
        outlineStyle={{ borderRadius: 16 }}
        placeholder="Enter your password"
        placeholderTextColor="#9b9a8d"
        returnKeyType="done"
        secureTextEntry
        style={{ marginTop: 10, backgroundColor: '#fffaf0' }}
        textContentType="password"
        textColor="#282923"
        value={request.password}
      />

      {feedback ? (
        <HelperText
          accessibilityLiveRegion="polite"
          style={{
            color: hasError ? '#9a594e' : '#2f6b5f',
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
        buttonColor={request.isPending ? '#59603f' : '#6f7653'}
        contentStyle={{ minHeight: 50 }}
        disabled={Boolean(configurationError) || request.isPending}
        labelStyle={{ fontSize: 16, fontWeight: '700' }}
        loading={request.pendingAction === 'sign-in'}
        mode="contained"
        onPress={() => void request.submit()}
        rippleColor="#59603f"
        style={{ marginTop: 14, borderRadius: 999 }}
        textColor="#fffaf0">
        Sign in
      </Button>

      <Button
        contentStyle={{ minHeight: 50 }}
        disabled={Boolean(configurationError) || request.isPending}
        labelStyle={{ fontSize: 16, fontWeight: '700' }}
        loading={request.pendingAction === 'sign-up'}
        mode="outlined"
        onPress={() => void request.signUp()}
        rippleColor="#eee7d8"
        style={{ marginTop: 10, borderRadius: 999, borderColor: '#6f7653' }}
        textColor="#59603f">
        Create account
      </Button>
    </>
  );
}
