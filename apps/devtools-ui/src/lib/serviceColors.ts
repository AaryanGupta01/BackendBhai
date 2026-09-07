// Shared service color palette — single source of truth for the UI.
// Previously lived in data/mock.ts (deleted as part of dead-code cleanup).

export const SVC: Record<string, string> = {
  'api-gateway': '#6366f1',
  'auth-service': '#22c55e',
  'order-service': '#38bdf8',
  'payment-service': '#ec4899',
  postgres: '#a855f7',
  redis: '#f97316',
  'mock-payment-api': '#ef4444',
};

export function getServiceColor(svc: string | undefined | null): string {
  if (!svc) return '#6b7280';
  return SVC[svc] || '#6b7280';
}
