export function getAuthQueryMessage(url: URL) {
  const errorMessages: Record<string, string> = {
    'configuration-required':
      'Administrator authentication is not configured for this environment.',
    'session-required': 'Sign in with an administrator account to continue.',
    'not-authorized':
      'This account is authenticated but does not have administrator access.',
  };
  const statusMessages: Record<string, string> = {
    'signed-out': 'You have been signed out securely.',
    'password-updated':
      'Your password was updated. Sign in again with the new password.',
  };

  const error = url.searchParams.get('error');
  const status = url.searchParams.get('message');

  return {
    error: error ? errorMessages[error] : undefined,
    status: status ? statusMessages[status] : undefined,
  };
}

export function getFriendlySignInError(code?: string) {
  const messages: Record<string, string> = {
    invalid_credentials: 'The email address or password was not recognized.',
    email_not_confirmed:
      'This account’s email address has not been confirmed yet.',
    over_request_rate_limit:
      'Too many sign-in attempts were made. Please wait and try again.',
    request_timeout: 'Authentication took too long. Please try again.',
  };

  return code
    ? messages[code] ??
        'Sign-in could not be completed. Check your details and try again.'
    : 'Sign-in could not be completed. Check your details and try again.';
}

export function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
