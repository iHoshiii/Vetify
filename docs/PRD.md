# Vetify Product Requirements Document (PRD)

## 1. Introduction

**Vetify** is a friendly, easy-to-use app for pet owners. Its goal is to make pet care simpler by providing quick health advice through AI, helping you find the nearest vet when you need one, and teaching you about your pet's health and nutrition.

---

## 2. Who is this for?

- **Pet Owners:** People who want quick answers about their pet's health or need to find a doctor nearby.
- **New Pet Parents:** People who need help planning meals or learning about animal anatomy.
- **Veterinary Professionals:** Licensed doctors looking to connect with pet owners.

---

## 3. Key Features (What the app does)

### 3.1 Smart Vet Locator (The Map)

- **Goal:** Help you find a vet instantly.
- **How it works:** Open the map, and it shows all the veterinary clinics around your current location.
- **Why it matters:** In an emergency, every second counts. You shouldn't have to search—the app should just show you.

### 3.2 Vetify AI Assistant (The Chat)

- **Goal:** Give you instant answers to basic pet health questions.
- **How it works:** You type a question (e.g., "Is chocolate bad for dogs?"), and the AI answers.
- **Safety First:** If you ask about something serious (like "My dog is bleeding"), the AI will say: **"Contact a professional veterinarian doctor."** It will then automatically show you the nearest open clinic or available doctor.

### 3.3 "Contact a Professional" Tab

- **Goal:** Connect you with real, licensed doctors.
- **How it works:** A simple list or "marketplace" where you can see a doctor's profile, their experience, and hire them for professional help.

### 3.4 Interactive Anatomy

- **Goal:** Help you understand your pet's body.
- **How it works:** You can see basic diagrams of dogs, cats, and birds. You can click on different parts (like the heart or bones) to learn what they do and how to keep them healthy.

### 3.5 Personalized Meal Planner

- **Goal:** Make sure your pet eats the right food.
- **How it works:** You tell the app your pet's age, weight, and any allergies. The app then creates a 7-day meal plan just for them.

### 3.6 Veterinary Blogs

- **Goal:** Keep you informed.
- **How it works:** A section with articles about local clinics, health tips, and stories about animal care.

### 3.7 Smart Care Reminders (Daily Nudges)

**Goal:** Help you remember the little things that keep your pet happy and healthy.

## **How it works:** The app occasionally shows friendly pop-up notifications with quick, helpful tips or reminders. For example, it might say "Don't forget to refill the water bowl!", "Time for a quick walk?", or "Make sure to give your pet a treat today!"

## 4. User Experience (How it should feel)

- **Simple & Clear:** No confusing medical jargon.
- **Fast:** Information should load quickly, especially the map and the AI chat.
- **Trustworthy:** Every doctor on the platform is verified and licensed.

---

## 5. Success Criteria (How we know it's working)

- Pet owners can find a vet within 2 clicks.
- The AI correctly identifies when a situation is an emergency.
- Users find the meal plans helpful and easy to follow.

---

## 6. MVP Scope & Launch Criteria

- **MVP Goal:** Provide a lightweight, trustworthy experience that delivers immediate AI advice for common pet questions, a searchable vet locator, and a basic personalized meal planner.
- **Included in MVP:**
  - AI chat capable of answering common pet health, nutrition, and behavior questions with clear escalation rules.
  - Vet locator (map + list) with clinic details and contact info.
  - Signup/login, basic user profile (pet type, age, weight), and meal plan generator for a single pet.
  - Basic analytics and instrumentation to capture usage and key events.
- **Launch Criteria:**
  - Chat accuracy and safety checks in place for top 50 common queries.
  - Vet locator returns relevant nearby clinics in >80% of manual spot checks.
  - Core user flows (signup, chat question, find vet, generate meal plan) completed end-to-end without critical errors.

## 7. AI Safety & Escalation

- **Scope limits:** AI replies are restricted to pet-related health, nutrition, behavior, and care. Any out-of-scope requests should be declined with a short explanation and a suggestion to contact an appropriate professional.
- **Emergency escalation:** If the user describes symptoms that match our emergency criteria (severe bleeding, breathing issues, seizures, unconsciousness, severe trauma, ingestion of known toxins), the assistant must:
  - Immediately present an empathetic short message advising urgent veterinary care.
  - Prominently surface local emergency clinics (if available) and a “Call now” or directions action.
  - Avoid offering a definitive diagnosis or definitive medical instructions beyond first-aid basics.
- **Audit & Moderation:** Log all chat exchanges for moderation and quality reviews. Use guardrails (input sanitization, rate limits, allowed model list) and human-in-the-loop review for edge cases.

## 8. Roadmap (Priority Phases)

- **Phase 1 (MVP):** Chat assistant (safety rules), vet locator, meal planner, signup/login, analytics.
- **Phase 2:** Verified professionals marketplace, appointment booking, clinic hours & live availability.
- **Phase 3:** Advanced personalization (multiple pets, dietary history), telemedicine integrations, paid tiers.
- **Phase 4:** Offline support, richer imaging (upload photo for triage hints), expanded species support.

## 9. Success Metrics (KPIs)

- **Core retention:** 1-week retention for new users ≥ 30% for MVP features.
- **Task completion:** % of users who successfully find a vet or receive a usable AI answer > 75%.
- **Escalation accuracy:** Proportion of emergency captures where the assistant recommended escalation and manual review confirms necessity ≥ 95%.
- **Performance:** Average chat response time < 1.5s (API latency target) and map load within 2s on mobile over 4G.

## 10. Non-functional Requirements

- **Privacy & Compliance:** Store minimum personal data. PII encryption at rest, TLS in transit. Provide clear privacy notice for AI logs and opt-out for data used in model improvements.
- **Security:** Rate-limit chat endpoints, input validation (use Zod schemas), and robust auth for all write operations.
- **Accessibility:** Meet WCAG 2.1 AA for core flows (signup, chat, find vet).
- **Reliability & Monitoring:** 99.5% uptime for public endpoints; instrument errors and key business events.

## 11. Open Questions

- Do we want to support images in chat on launch or wait for Phase 3?
- What markets/regions are in initial geographic scope for vet data (country, city-level coverage)?
- What is the minimum verification standard for professionals in the marketplace?

---

If you'd like, I can (pick one):

- tighten the MVP to a single core flow and trim scope, or
- expand the AI safety section with concrete emergency detection rules and example prompts.
