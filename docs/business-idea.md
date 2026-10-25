# Main Vetify business scope

Reviewed 25 October 2026. This document describes main Vetify, not the detailed
business models of the separate Meal Planner, Books, Anatomy or Blog apps.

## Purpose and customers

Main Vetify brings veterinary guidance, professional discovery and consultation
coordination into one account-based website for Philippine pet owners.
Verified professionals use it to present clinic/profile information, receive
appointments and communicate with their clients.
Administrators manage professional eligibility, account safety and main operations.

| Customer     | Main need                                                 | Main value                                                   |
| ------------ | --------------------------------------------------------- | ------------------------------------------------------------ |
| Pet owner    | Understand concerns and reach an appropriate professional | General AI guidance, clinic discovery and appointments       |
| Professional | Be discoverable and manage consultations                  | Verified profile, booking, messaging and video-call workflow |
| Operator     | Maintain trustworthy account/professional access          | Approval, audit, status controls and monitoring              |

## Main offering

- Central signup, verification, password/social login and explicit provider linking.
- Verified professional onboarding and profiles with private eligibility proof.
- Clinic map and contact discovery with clear source/verification distinctions.
- Virtual/onsite booking, appointment notifications, completion and review flows.
- Participant-scoped messages and scheduled video consultations.
- Kupa's pet/veterinary guidance, brief greetings, urgent escalation, and handled provider failures.
- Settings, privacy, account administration and central identity for separate apps.

Separate apps can extend the user's experience through main launch links.
Their collections, documents, editorial queues and educational assets are not
main's operating responsibility after extraction.

## Trust and safety requirements

An approved professional identity is distinct from a normal public account.
Login/signup must preserve that identity and its approval.
AI guidance cannot establish a definitive veterinary diagnosis or replace a
professional consultation. Review escalation wording and public content.
Protect credentials and professional documents, restrict communications to
participants and record sensitive administrative actions.

## Revenue and entitlement assumptions

Subscriptions, clinic packages, payment processing and consultation commissions
are business decisions requiring explicit pricing, policy and implementation.
Main has subscription authority/contracts, but those alone do not establish a
working paid checkout or complete entitlement enforcement across every app.
Do not carry historical feature pricing into the main launch as a live offer.
Educational-document commissions and their economics belong to Books docs.

## Operating assumptions

Main infrastructure uses S3/CloudFront, HTTP/WebSocket API Gateway, Lambda, and
Bedrock. MongoDB Atlas, mail, and TURN have their own limits and costs.
AWS credits are a temporary budget, not a permanent operating-cost estimate.
Verify the actual balance, usage and expiry before launch.

The release boundary is main only. Feature extraction, private professional
uploads, and durable main background jobs are implemented. Optional Anatomy/Books
web sign-in and Books worker capabilities need joint production acceptance.
Planner's version 2 contract and Blog sign-in remain coordinated integration work.

Measure verified professional availability, completed consultations, reminder
delivery, support issues, account recovery, service failures and cost per active
user. Use observed pilot data before committing to revenue/scale assumptions.

See [PRD](PRD.md), [delivery plan](masterplan.md),
[integration plan](../MIGRATION_PLAN.md) and [AWS guide](main-deployment/README.md).
