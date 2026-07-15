'use client';

import { useServices } from '@/hooks/useServices';

export default function ServicesList() {
  const { data, isLoading, error } = useServices();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;

  return (
    <ul>
      {data?.map((s) => (
        <li key={s.id}>{s.name}</li>
      ))}
    </ul>
  );
}
