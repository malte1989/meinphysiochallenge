import { useQuery } from '@tanstack/react-query';

export function App() {
  const health = useQuery({ queryKey: ['health'], queryFn: () => fetch('/api/health').then((r) => r.json()) });
  return <main><h1>Der Ausfall</h1><p>API: {health.data?.ok ? 'ok' : '…'}</p></main>;
}
