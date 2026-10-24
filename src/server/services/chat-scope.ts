export const OUT_OF_SCOPE_REPLY =
  "I'm sorry, but I can only help with pet and animal health or care questions. Please ask me about your pet.";

const ANIMAL_TERMS =
  /\b(?:animal\w*|pet\w*|dog\w*|pupp\w*|canine\w*|cat\w*|kitten\w*|feline\w*|bird\w*|parrot\w*|rabbit\w*|hamster\w*|guinea\s+pig\w*|fish\w*|turtle\w*|reptile\w*|horse\w*|livestock)\b/i;

const VETERINARY_TERMS =
  /\b(?:vet\b|veterinar\w*|parvo\w*|rabies|flea\w*|tick\w*|worm\w*|parasite\w*)\b/i;

const OFF_TOPIC_TERMS =
  /\b(?:law|legal|lawyer|court|crime|politic|president|government|election|history|geography|capital|program(?:ming)?|code|software|website|math|algebra|homework|essay|poem|song|movie|recipe|restaurant|stock|crypto|investment)\b/i;

export function mightBeVeterinaryQuestion(message: string): boolean {
  if (OFF_TOPIC_TERMS.test(message)) return false;
  // Let the topic classifier decide whether an animal question concerns care.
  // A symptom keyword list misses valid concerns such as "my dog have fever".
  return ANIMAL_TERMS.test(message) || VETERINARY_TERMS.test(message);
}
