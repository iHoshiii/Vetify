# Main Vetify user and deployment flows

Updated 14 October 2026. Diagrams describe main responsibilities; external-app
web SSO and main-only extraction remain pending implementation.

## Signup, login and linking

```mermaid
flowchart TD
    Entry[Main account screen] --> Choice{Signup or login?}
    Choice -->|Signup| Fields[Name, email, password, confirmation]
    Fields --> Existing{Identity already registered?}
    Existing -->|Yes| Duplicate[Account already exist. Please login]
    Existing -->|No| Send[Send six-digit code]
    Send --> Verify[Verify within five minutes]
    Verify --> Verified[Verified main account]
    Send --> Resend[Resend after sixty seconds]
    Resend --> Replace[Invalidate old code and send replacement]
    Replace --> Verify
    Choice -->|Login| Method[Password or registered social provider]
    Method --> Known{Known account and linked method?}
    Known -->|Unknown account| Missing[Create an account first to use the app.]
    Known -->|Unlinked method| Original[Authenticate with existing method]
    Original --> Link[Settings: prove ownership and link method]
    Known -->|Valid credentials| Verified
    Verified --> Main[Main app]
```

Failed code/credential/delivery checks remain on a visible retry/error state.
Unverified, blocked, revoked or deactivated accounts cannot bypass access checks.

## Main consultations and external launches

```mermaid
flowchart TD
    Home[Main website] --> Guidance[AI Vet Assistant]
    Home --> Directory[Clinic map and professional discovery]
    Directory --> Booking[Virtual or onsite appointment]
    Booking --> Decision[Professional confirmation or decline]
    Decision --> Confirmed[Confirmed appointment]
    Confirmed --> Reminders[Durable reminder and delivery jobs]
    Confirmed --> Messages[Participant-only messages]
    Confirmed --> Room[Authorized call window]
    Room --> Signals[WebSocket signalling]
    Signals --> Media[WebRTC media with TURN when needed]
    Confirmed --> Completion[Completion and review]
    Home --> External{External feature available?}
    External -->|No| Unavailable[Clear unavailable state]
    External -->|Yes, integration verified| Launch[Open independent app]
    Launch --> Auth[Main identity flow and app-specific session]
```

Cancelled/declined appointments follow their allowed transitions and do not gain
call access. External sites own their feature workflows and data.
See [architecture](architecture.md) and [central auth](main-deployment/shared-auth.md).
