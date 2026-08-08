export type Service = {
  id: string;
  name: string;
  // add additional fields as required
};

export async function fetchServices(): Promise<Service[]> {
  const res = await fetch('/api/services');
  if (!res.ok) throw new Error('Failed to fetch services');
  return res.json();
}
