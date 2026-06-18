// --- Domain Types ---

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  weight?: number;
  ownerId: string;
}

export interface VetClinic {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface NutritionPlan {
  petId: string;
  meals: Meal[];
  generatedAt: string;
}

export interface Meal {
  day: string;
  morning: string;
  evening: string;
  notes?: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
