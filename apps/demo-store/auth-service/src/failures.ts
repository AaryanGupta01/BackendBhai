function isWellFormed(token: string): boolean {
  if (!token) return false;
  const t = token.replace(/^Bearer\s+/i, '').trim();
  if (t === 'invalid' || t === 'expired' || t === 'malformed') {
    return false;
  }
  return t.length >= 3;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * S-08: Injects a 5-second timeout and throws error when token is invalid.
 * Generates a visible 5s auth span ending in an error.
 * Also honors the shared global simulation header x-simulate-invalid-auth, which
 * the gateway sets when the Failure Simulator selects that mode.
 */
export async function maybeInjectAuthTimeout(
  token: string,
  simulationHeaders: Record<string, string | undefined> = {}
): Promise<void> {
  if (simulationHeaders['x-simulate-invalid-auth'] === 'true') {
    console.warn('[FailureInjection:AuthService] Global simulation requested invalid auth (x-simulate-invalid-auth). Sleeping 5s before timing out...');
    await sleep(5000);
    throw new Error('Auth service timeout');
  }

  const cleanToken = token ? token.replace(/^Bearer\s+/i, '').trim() : '';
  if (cleanToken === 'invalid' || !isWellFormed(cleanToken)) {
    console.warn(`[FailureInjection:AuthService] Invalid auth token detected ('${cleanToken}'). Sleeping 5s before timing out...`);
    await sleep(5000);
    throw new Error('Auth service timeout');
  }
}
