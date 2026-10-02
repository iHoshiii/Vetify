# Vetify Product Requirements Document (PRD)

Updated: 2 October 2026. This is the current Markdown PRD, aligned with the [business idea](business-idea.md), PSC XI concept note, and later user decisions. Older Word exports are historical snapshots. Design and verification are in the [TDD](TDD.md).

## 1. Product purpose and scope

Vetify connects Philippine pet owners, verified veterinary professionals, and veterinary students through discovery, appointments, consultations, feeding tools, learning resources, and general AI guidance. Keep professional care, AI information, educational material, and financial records distinct.

The concept note is a proposal, not evidence of deployment. Planned requirements do not authorize immediate charging, service migration, or new access restrictions.

| Capability                                         | Current state                           | Remaining work                                          |
| -------------------------------------------------- | --------------------------------------- | ------------------------------------------------------- |
| Accounts and professional verification             | Implemented                             | Launch credential procedure and lifecycle review        |
| Directory/map                                      | Implemented                             | Pilot coverage and external-listing provenance          |
| Appointments, messages, notifications, video calls | Implemented                             | Paid settlement and production connectivity             |
| Veterinary AI chat                                 | Prompt-scoped Gemini implementation     | Evaluated emergency actions and paid entitlements       |
| Multiple pets and feeding planner                  | Implemented                             | Usability and feeding-domain validation                 |
| Library and automatic relevance screening          | Implemented                             | Labelled evaluation, rights/takedown, storage migration |
| Affiliate credits and graphs                       | Implemented                             | Funding, abuse controls, actual payouts                 |
| Anatomy                                            | Authenticated 2D illustrations/hotspots | Licensed 3D assets and viewer                           |
| Blogs and administrative moderation                | Implemented                             | Content maintenance                                     |
| Paid plans and clinic subscription                 | Planned                                 | Provider, entitlements, prices, lifecycle               |
| Support tickets and book citations                 | Planned; details unresolved             | Separate workflows and specifications                   |
| Feature apps and installed planner                 | Planned migration                       | Shared access, data migration, deployment validation    |

Code existence does not establish production readiness or clinical effectiveness. There is no current paid subscription, withdrawal service, separately trained veterinary model, or 3D viewer.

## 2. Actors and permissions

| Actor                            | Capabilities and boundaries                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| Visitor                          | Public discovery and supported anonymous chat; login for protected features                  |
| Public user                      | Own pets/feeding records, appointments, learning access, approved downloads                  |
| Veterinary student               | Public-user persona; no separate role currently                                              |
| Professional                     | Console, appointments, communication, calls, own uploads/statuses, own Affiliate records     |
| Verified veterinary professional | Can upload veterinary PDFs; role alone is insufficient                                       |
| Admin                            | Account/professional verification and existing moderation; no book upload or approval bypass |

Sensitive operations require an active account and server-side authorization. A dashboard role does not grant ownership of another user's pet, conversation, appointment, file, or financial records. Credential verification is separate from resource relevance approval.

## 3. Functional requirements

### FR-01: Accounts and professional eligibility

Authenticate existing user/professional/admin roles and enforce current account restrictions. Require verification before a professional is offered for booking or can upload books. Users, unverified professionals, and admins cannot upload books. Maintain accountable administrative credential verification and agree required evidence before launch.

Acceptance: direct requests cannot bypass role, status, verification, or ownership; changed privileges affect subsequent requests; responses exclude credentials and unrelated private records.

### FR-02: Discovery and map

Provide directory/map discovery, relevant details, contact and booking actions. Distinguish verified professional records from external clinic listings. Handle unavailable/refused location, empty results, and missing contacts. Do not claim opening hours or emergency capacity without evidence.

Acceptance: clear provenance and usable fallbacks; assess pilot coverage before advertising geographic reach.

### FR-03: Appointments, communication, and calls

Support virtual/onsite requests, confirmation, decline, completion, cancellation, and reviews. Protect threads, notifications, and call rooms by participant identity. Present permission/network failures clearly. A request does not confirm a slot or payment.

Acceptance: unrelated accounts cannot read threads/join calls; invalid transitions are refused; both parties see appropriate status. Verify production connectivity/reconnection separately.

### FR-04: Veterinary AI guidance and escalation

Answer general animal care, health, nutrition, and behavior questions; decline unrelated requests and avoid definitive diagnosis/treatment claims. Urgent symptoms require prompt veterinary referral. Planned structured escalation should offer reliable contact/directions and a fallback when clinic data is unavailable. Prompt instructions alone do not establish dependable emergency detection or nearest-open-clinic lookup; evaluate these actions before advertising them.

Current anonymous chat allows five queries per 24 hours with additional rate limiting. Signed-in chat does not enforce Free/Pro quotas. Protect keys, disclose AI processing/configured tracing, and define content retention and consent before broad production logging.

Acceptance: reviewed common, unrelated, urgent, ambiguous, and provider-failure cases show appropriate guidance/referral. Include severe bleeding, breathing difficulty, seizures, unconsciousness, trauma, and toxic ingestion in the reviewed emergency corpus. Mocked API tests alone do not establish clinical safety.

### FR-05: Pets and feeding

Users manage their own multiple pets and feeding records. Record exact food, amounts, extras, meal times, and label calories. Eligible healthy adult dogs/cats can receive a starting portion estimate; other pets can schedule an owner-provided amount. Require review before saving; actual meals, weight, and body condition remain separate from schedules.

Do not promise AI therapeutic recipes, automatic allergy exclusion, or suitability for every species/condition. Recommend professional input when estimation is inappropriate.

Acceptance: ownership, invalid/missing calorie/weight values, units, and dates are handled; scheduled meals do not count as eaten without intake records.

### FR-06: Library and automatic approval

- Only active verified veterinary professionals upload PDFs with title, description, topic, and sharing-permission confirmation; maximum 10 MB.
- Original books, articles, guides, research, and case studies qualify. ISBN, publisher, English, and minimum page count are not required.
- Apply the [versioned screening standard](veterinary-library-screening.md): readable, substantive content primarily about veterinary education, research, animal health, welfare, or practice. Check actual whole-document content, including scans, rather than title/keywords alone.
- Keep `pending`, `checking`, `rejected`, and `unverified` private. Active authenticated accounts list/download approved resources only.
- Fail closed for unsupported verdicts, incomplete evidence, unreadable content, or provider failure. Invalid PDFs, scripts, embedded files, and unrelated content must not publish.
- Show owners concise status/reasons. Owner rechecks use cooldown/submission limits and preserve document identity and earning history.
- Content hashes and a unique constraint reject exact duplicate files; this is not complete plagiarism or edited-copy detection.
- No admin approval bypass. Legacy resources without status remain private and enter automatic review.

Acceptance: private states stay inaccessible through listing/download/retry/legacy paths; concurrent uploads and worker restarts preserve identity and valid review ownership. Approval does not certify medical accuracy or copyright.

### FR-07: Unlimited downloads and bounded credits

Downloads remain unlimited, including repeats. Credit **200 centavos (₱2)** to the uploader for the first **three** eligible requests per `(downloader, book, calendar month)`. Fourth/later requests still serve the PDF and add zero. Different users/books have independent counters; self-downloads, failed authorization, and missing/unapproved books earn nothing.

Use the current `Asia/Singapore` month (UTC+8), resetting at the next month's first local midnight, not a rolling 30-day wait. Concurrency cannot exceed three paid credits per tuple. Credits follow authorized server requests, not proof of completed browser saves.

Acceptance: three requests yield ₱6; fourth succeeds without increase; self yields ₱0; simultaneous requests stay within ₱6; user/book/professional/month isolation holds.

### FR-08: Professional Affiliate dashboard

Provide an **Affiliate** tab showing lifetime/current-month credits, credited downloads, and book breakdowns. Graph real latest-30-local-day credited activity with zero days and all-time top-five books. Totals/charts are independent of table pagination; empty accounts show honest zero states.

Restrict records to the owner. Metrics represent credits, not platform revenue or completed payouts. Keep mobile tabs/cards/graphs within the viewport.

Acceptance: totals reconcile to events; fourth repeats/self-downloads leave earnings unchanged; pagination preserves aggregate scope; another professional cannot obtain records.

### FR-09: Anatomy and publishing

Keep anatomy authenticated and dog/cat/bird illustration hotspots accessible. 3D needs future licensed assets, viewer, and subject review. Preserve blog/admin moderation separately from automatic book screening.

Acceptance: correct species content and keyboard interaction; illustration UI does not claim implemented 3D anatomy.

### FR-10: Billing and entitlements (planned)

- Proposed public Pro: **₱99/month**, including unlimited AI, 3D anatomy, meal planner, and books; confirm entitlements and disclosed fair-use terms before sale.
- Proposed clinic physical-booking subscription: **₱149/month**; decide clinic-versus-account ownership first.
- Proposed consultation fee: **10% first hour, 5% subsequent hours**; define partial hours, cancellations, no-shows, refunds, rounding, and provider charges.
- Verify signed provider events server-side and persist idempotent changes. Browser redirects cannot grant access.
- Main system owns future identity/subscription authority. Feature APIs/installed apps enforce entitlements server-side.
- Define renewal, failed payment, expiry, cancellation, and refunds. Keep Pro, clinic plans, consultation settlement, and affiliate credits separate.
- A future Pro paywall is not a three-download cap; introducing one requires an explicit existing-user migration decision and communication.

Acceptance before release: event replay does not duplicate charges/events; expired access is enforced across apps; refunds reconcile; two complete hours at ₱500/hour yield ₱75 platform commission before adjustments.

### FR-11: Administrative support (planned)

Answer account/booking/payment questions and create contextual tickets when unresolved. Animal health questions require veterinary assistance rather than ordinary administrative tickets. Minimize sensitive context.

Acceptance before release: questions follow the appropriate support/care path; tickets have authorization, deduplication, owner, and resolution lifecycle.

### FR-12: Citations and rights (planned)

Agree author/title/year/source metadata, optional DOI/ISBN, citation format, page references, attribution, reporting/takedown, and corrections. Original work need not have external identifiers. Separate bibliographic authorship from uploader identity; current book `author` identifies the uploader.

Acceptance before release: use supplied metadata faithfully; never invent authors, sources, dates, identifiers, or ownership evidence.

## 4. User experience

Keep the library compact: short heading, clear cards/actions, concise empty states, collapsed upload form. Do not restore monthly-download banners or the text "3 downloads per book / month." Explain screening/financial policy where professionals need it without filling the library with operational instructions.

Provide clear loading/success/error/retry feedback, responsive navigation, and honest graphs. Controls need labels, visible focus, keyboard access, contrast, and touch targets. WCAG 2.1 AA is a validation target, not completed certification.

## 5. Security, reliability, and privacy

Validate inputs and enforce status, ownership, size/content restrictions, and rate limits server-side. Keep files, keys, tokens, and internal review details private; avoid public caching of private downloads or financial responses.

Persist review work with leases/retries; AI outage cannot publish files or erase earnings. Store money as integer centavos; protect concurrency now and payment idempotency before billing. Treat document text and embedded instructions as untrusted input.

Production needs TLS, storage protection, monitoring, restore procedures, and retention controls with deployment evidence. Future separation preserves authoritative shared access and isolates feature outages; clients must never receive signing secrets.

## 6. Release sequence and gates

1. **Feature pilot:** verify permissions, discovery, appointments/calls, feeding records, private screening states, credits, mobile UI, and honest descriptions. Evaluate AI/classification on reviewed datasets.
2. **Monetization:** finalize rules/rights, integrate provider/entitlements, reconciliation, funded affiliate operations, and payouts. No withdrawal promise beforehand.
3. **Education/expansion:** validate 3D, citations, administrative support, and wider partnerships independently.
4. **Migration:** follow the [migration plan](../MIGRATION_PLAN.md) after contracts stabilize. Existing books require file/status/credit backfill. This PRD supersedes its old greenfield and admin-upload assumptions.

Gates combine appropriate automated checks with manual coverage, call, accessibility, education, and failure assessment. These are desired checks, not claims of enforced CI or deployment.

## 7. Pilot measures and decisions

| Area           | Measure                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| Care access    | Discovery/contact and booking completion; professional response time    |
| Operations     | Confirmation, cancellation, completion, call failures                   |
| Feeding        | Reviewed plans, actual intake, repeat use                               |
| Library        | Labelled approval/error rates, processing age, reader activity, reports |
| Affiliate      | Reconciliation, exclusions, suspected abuse, funded payable exposure    |
| Commercial     | Conversion, renewal/churn, revenue, provider/affiliate costs            |
| Safety/quality | Reviewed referral behavior and task completion                          |

Agree geography, sample sizes, thresholds, and performance budgets before claiming results. Market figures are research inputs, not validated KPIs.

Open decisions: credentials; launch entitlements/prices; billing/refunds; clinic ownership; payment provider; affiliate funding/payout/abuse policy; rights/citation format; AI retention/safety criteria; pilot region; 3D assets; hosting. Unlimited downloads, current earning eligibility, and automated relevance approval are already decided.
