const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Normalize line endings
c = c.replace(/\r\n/g, '\n');

// Add new imports after lucide import
c = c.replace(
  /import \{[\s\S]*?\} from 'lucide-react';/,
  `import {\n  Server, Search, Filter, AlertCircle, CheckCircle2,\n  Activity, RefreshCw, X, TerminalSquare,\n  Database, Shield, CreditCard, Box, Globe, Loader2\n} from 'lucide-react';\n\nimport { useRequests } from '@/hooks/useRequests';\nimport { useTraceDetail } from '@/hooks/useTraceDetail';\nimport { SVC } from '@/data/mock';\n\nconst SERVICE_COLORS: Record<string, string> = SVC;\nfunction getServiceColor(svc: string): string { return SERVICE_COLORS[svc] || '#6b7280'; }`
);

// Remove mock data arrays
c = c.replace(/const MOCK_APIS = \[[\s\S]*?\];\n/g, '// Mock data removed\n');
c = c.replace(/const GRAPH_NODES = \[[\s\S]*?\];\n/g, '');
c = c.replace(/const GRAPH_EDGES = \[[\s\S]*?\];\n/g, '');

// Replace MOCK_APIS references with useRequests hook
c = c.replace(
  /const selectedApi = MOCK_APIS\.find\(api => api\.id === selectedApiId\);/,
  `const { requests, count, loading, error: apiError } = useRequests(5000);\n  const { detail, loading: detailLoading, error: detailError } = useTraceDetail(selectedApiId);\n  const selectedApi = requests.find(r => r.id === selectedApiId);`
);

// Replace MOCK_APIS.filter with requests.filter
c = c.replace(
  /return MOCK_APIS\.filter\(api => \{[\s\S]*?\}\);/,
  `return requests.filter(r => {\n      if (filters.error && !r.errorCulprit) return false;\n      if (filters.get && r.m !== 'GET') return false;\n      if (filters.post && r.m !== 'POST') return false;\n      return true;\n    });`
);

// Write back
fs.writeFileSync('src/App.tsx', c);
console.log('Transformed. Lines:', c.split('\n').length);
console.log('Has useRequests:', c.includes('useRequests'));
console.log('Has MOCK_APIS:', c.includes('MOCK_APIS'));
