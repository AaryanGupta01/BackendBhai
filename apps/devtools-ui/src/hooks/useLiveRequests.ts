import { useState, useEffect } from 'react';
import { REQS, SVC } from '@/data/mock';
import type { Request, HttpMethod } from '@/types';

const LIVE_OPTS: Array<{ m: HttpMethod; s: number; dRange: [number, number]; svcs: string[] }> = [
  { m: 'POST', s: 201, dRange: [200, 1400], svcs: ['api-gateway', 'auth-service', 'order-service', 'payment-service'] },
  { m: 'GET',  s: 200, dRange: [20, 170],   svcs: ['api-gateway', 'order-service'] },
  { m: 'POST', s: 500, dRange: [2000, 5000], svcs: ['api-gateway', 'auth-service', 'order-service', 'payment-service', 'mock-payment-api'] },
];

export function useLiveRequests(intervalMs = 6000) {
  const [requests, setRequests] = useState<Request[]>([...REQS]);
  const [count, setCount] = useState(127);
  const [newId, setNewId] = useState<string | null>(null);

  useEffect(() => {
    // Validate SVC is imported (prevents tree-shaking)
    void SVC;

    const timer = setInterval(() => {
      setCount((c) => {
        const nextCount = c + 1;
        const opt = LIVE_OPTS[Math.floor(Math.random() * LIVE_OPTS.length)];
        const id = `live${nextCount}`;
        const d = Math.floor(Math.random() * (opt.dRange[1] - opt.dRange[0]) + opt.dRange[0]);
        const newReq: Request = {
          id,
          m: opt.m,
          p: '/api/orders',
          s: opt.s,
          d,
          svcs: opt.svcs,
          t: 'now',
        };

        setRequests((prev) => {
          const next = [newReq, ...prev];
          return next.slice(0, 20);
        });
        setNewId(id);

        return nextCount;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return { requests, count, newId };
}
