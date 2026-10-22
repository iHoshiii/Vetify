export const OUT_OF_SCOPE_REPLY =
  "I'm sorry, but I can only help with pet and animal health or care questions. Please ask me about your pet.";

const ANIMAL_TERMS =
  /\b(?:animal\w*|pet\w*|dog\w*|pupp\w*|canine\w*|cat\w*|kitten\w*|feline\w*|bird\w*|parrot\w*|rabbit\w*|hamster\w*|guinea\s+pig\w*|fish\w*|turtle\w*|reptile\w*|horse\w*|livestock)\b/i;

const CARE_TERMS =
  /\b(?:health\w*|care\w*|symptom\w*|sick\w*|ill\w*|injur\w*|wound\w*|pain\w*|itch\w*|scratch\w*|rash\w*|skin\w*|fur\w*|coat\w*|groom\w*|bath\w*|shampoo\w*|feed\w*|food\w*|eat\w*|diet\w*|nutrition\w*|weight\w*|vomit\w*|diarrh\w*|poison\w*|toxic\w*|medic\w*|dose\w*|vaccin\w*|flea\w*|tick\w*|worm\w*|parasite\w*|behavio\w*|train\w*|anxiety\w*|breed\w*|spay\w*|neuter\w*|pregnan\w*|litter\w*|dental\w*|teeth\w*|ear\w*|eye\w*|limp\w*|seizure\w*|breath\w*|cough\w*|okay|ok|normal|worr\w*)\b/i;

const VETERINARY_TERMS =
  /\b(?:vet\b|veterinar\w*|parvo\w*|rabies|flea\w*|tick\w*|worm\w*|parasite\w*)\b/i;

const OFF_TOPIC_TERMS =
  /\b(?:law|legal|lawyer|court|crime|politic|president|government|election|history|geography|capital|program(?:ming)?|code|software|website|math|algebra|homework|essay|poem|song|movie|recipe|restaurant|stock|crypto|investment)\b/i;

export function isVeterinaryQuestion(message: string): boolean {
  if (OFF_TOPIC_TERMS.test(message)) return false;
  if (ANIMAL_TERMS.test(message) && CARE_TERMS.test(message)) return true;
  return VETERINARY_TERMS.test(message);
}
