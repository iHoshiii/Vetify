// --- Domain Types ---

export type User = {
  id: string;
  email: string;
  name?: string;
};

export type Pet = {
  id: string;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  weight?: number;
  ownerId: string;
};

export type VetClinic = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
};

export type NutritionPlan = {
  petId: string;
  meals: Meal[];
  generatedAt: string;
};

export type Meal = {
  day: string;
  morning: string;
  evening: string;
  notes?: string;
};

// --- API Response Wrappers ---
export type ApiResponse<T> = {
  data: T;
  success: boolean;
  message?: string;
};
