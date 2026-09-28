const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailValidationResult =
  | { valid: true; email: string }
  | { valid: false; message: string };

export function validateEmail(value: string): EmailValidationResult {
  const email = value.trim();

  if (!email) return { valid: false, message: 'Enter your email address.' };
  if (!EMAIL_PATTERN.test(email)) {
    return { valid: false, message: 'Enter a valid email address.' };
  }

  return { valid: true, email };
}
