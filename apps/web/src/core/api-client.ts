const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API error ${res.status}: ${error}`);
  }

  return res.json() as Promise<T>;
}

// --- Triage ---
export const triageApi = {
  chat: (message: string) =>
    apiFetch<{ reply: string }>("/triage/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};

// --- Locator ---
export const locatorApi = {
  findNearby: (lat: number, lng: number, radius = 5000) =>
    apiFetch<{ clinics: unknown[] }>(
      `/locator/nearby?lat=${lat}&lng=${lng}&radius=${radius}`
    ),
};

// --- Nutrition ---
export const nutritionApi = {
  generatePlan: (petId: string) =>
    apiFetch<{ plan: unknown }>("/nutrition/plan", {
      method: "POST",
      body: JSON.stringify({ petId }),
    }),
};
export { apiGet } from "../../../src/core/api-client";
