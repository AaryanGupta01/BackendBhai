const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
const SENSITIVE_BODY_FIELDS = ['password', 'token', 'secret', 'credit_card', 'ssn'];

function redactRecursive(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => redactRecursive(item));
  } else if (obj !== null && typeof obj === 'object') {
    const redacted: any = {};
    for (const key of Object.keys(obj)) {
      if (SENSITIVE_BODY_FIELDS.some(f => key.toLowerCase().includes(f))) {
        redacted[key] = '***';
      } else {
        redacted[key] = redactRecursive(obj[key]);
      }
    }
    return redacted;
  }
  return obj;
}

export function redactSpanAttributes(attributes: Record<string, any>): Record<string, any> {
  if (!attributes) return {};
  const redacted = { ...attributes };
  for (const key of Object.keys(redacted)) {
    if (SENSITIVE_HEADERS.some(h => key.toLowerCase().includes(h))) {
      redacted[key] = '**REDACTED**';
    }
    if (key.includes('body') && typeof redacted[key] === 'string') {
      try {
        const parsed = JSON.parse(redacted[key]);
        redacted[key] = JSON.stringify(redactRecursive(parsed));
      } catch { /* not JSON, leave as-is */ }
    }
  }
  return redacted;
}

export function redactHeaders(headers: Record<string, any>): Record<string, any> {
  if (!headers) return {};
  const redacted = { ...headers };
  for (const key of Object.keys(redacted)) {
    if (SENSITIVE_HEADERS.some(h => key.toLowerCase().includes(h))) {
      redacted[key] = '**REDACTED**';
    }
  }
  return redacted;
}

export function redactBody(bodyStr: string | undefined | null): string | undefined | null {
  if (!bodyStr) return bodyStr;
  try {
    const body = JSON.parse(bodyStr);
    return JSON.stringify(redactRecursive(body));
  } catch {
    return bodyStr;
  }
}
