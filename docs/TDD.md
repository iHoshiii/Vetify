# Vetify Test-Driven Development (TDD) Plan

This document outlines the testing strategy for Vetify. We follow a "Test-First" approach to ensure every feature works exactly as described in our PRD.

---

## 1. What is TDD?
Test-Driven Development (TDD) means we write a "test" (a mini-check) for a feature **before** we write the actual code. 
1. **Red**: Write a test that fails (because the feature doesn't exist yet).
2. **Green**: Write just enough code to make the test pass.
3. **Refactor**: Clean up the code to make it professional.

---

## 2. Core Test Scenarios

### 2.1 AI Safety & Fallback (Priority: High)
*   **Test Case 1:** User asks "What can dogs eat?".
    *   **Expected Result:** AI provides a helpful list of safe foods.
*   **Test Case 2:** User asks "My cat is vomiting blood".
    *   **Expected Result:** AI must reply with "Contact a professional veterinarian doctor" and return data for the nearest clinic.
*   **Test Case 3:** User asks a complex medical question.
    *   **Expected Result:** AI identifies complexity and triggers the fallback message.

### 2.2 Smart Vet Locator (Geospatial)
*   **Test Case 1:** System receives user coordinates (Latitude/Longitude).
    *   **Expected Result:** System returns a list of clinics within a 10km radius.
*   **Test Case 2:** User is in a remote area with no clinics nearby.
    *   **Expected Result:** System returns a friendly message: "No clinics found nearby, showing the closest ones in your region."

### 2.3 Meal Planner Logic
*   **Test Case 1:** Input: Dog, 5 years old, 20kg, no allergies.
    *   **Expected Result:** A 7-day plan with appropriate calorie counts.
*   **Test Case 2:** Input: Cat, allergic to fish.
    *   **Expected Result:** A meal plan that contains 0% fish ingredients.

### 2.4 Anatomy Feature
*   **Test Case 1:** User clicks on "Heart" for "Dog".
    *   **Expected Result:** System returns correct biological description and health tips for a dog's heart.

---

## 3. Testing Tools
- **Backend:** `pytest` (for checking the logic and AI responses).
- **Frontend:** `Jest` and `React Testing Library` (for checking the buttons and maps).
- **AI Validation:** `LangSmith` (to monitor if the AI is giving safe advice).

---

## 4. How to Run Tests
*(To be updated once code is implemented)*
```bash
# Example command to run backend tests
pytest
```
