const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
const SENSITIVE_BODY_FIELDS = ['password', 'token', 'secret', 'credit_card', 'ssn'];

export function redactSpanAttributes(attributes: Record<string, any>): Record<string, any> {
  if (!attributes) return {};
  const redacted = { ...attributes };
  for (const key of Object.keys(redacted)) {
    if (SENSITIVE_HEADERS.some(h => key.toLowerCase().includes(h))) {
      redacted[key] = '**REDACTED**';
    }
    if (key.includes('body') && typeof redacted[key] === 'string') {
      try {
        const body = JSON.parse(redacted[key]);
        let modified = false;
        for (const field of SENSITIVE_BODY_FIELDS) {
          if (body[field]) {
            body[field] = '***';
            modified = true;
          }
        }
        if (modified) {
          redacted[key] = JSON.stringify(body);
        }
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
    let modified = false;
    for (const field of SENSITIVE_BODY_FIELDS) {
      if (body[field]) {
        body[field] = '***';
        modified = true;
      }
    }
    return modified ? JSON.stringify(body) : bodyStr;
  } catch {
    return bodyStr;
  }
}
