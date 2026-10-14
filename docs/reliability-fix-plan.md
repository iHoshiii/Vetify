# Reliability fixes

Branch: `fix/account-booking-launch-reliability`, created from `dev`.

## Checklist

- [x] Finished app starts with its normal command. Check the document reader too.
- [x] Checks are set to run for changes to `dev` and for proposed changes. Browser checks use predictable replies.
- [x] Suspended, banned, and deactivated accounts lose chat and call access, including existing connections.
- [x] Confirming, cancelling, completing, and moving a booking cannot overwrite a newer decision.
- [x] Sign-in renewal works across tabs, while old or cancelled sign-ins stay unusable.
- [x] Saved bookings stay successful when a notice fails. Notices retry and repeated requests reuse the saved booking.
- [x] Forgotten-password recovery has a temporary, single-use link. Old sign-ins end after a password reset.
- [x] Existing failed checks are repaired and the full checks are run.
- [x] Review this checklist again, inspect the final changes, and commit each completed part separately on the branch.

## Work order

Startup and checks, sign-in and recovery, and bookings can be worked on separately. Account access rules and final checks connect those parts. Check failures after a save, simultaneous actions, existing calls, and returning tabs, not just ordinary clicks.

## Scope

Fix the seven agreed problems. Do not add payments, account verification, pet removal, 3D anatomy, or unrelated cleanup. Do not change deployment settings, send real emails, or modify the live database.

## Results

- Both app builds passed. The finished server started with temporary data, and the document reader accepted a valid document and refused an invalid one.
- The full run checked 1,241 cases. 1,239 passed. Two new call checks needed their pretend call setup corrected. After that correction, all 17 affected checks passed, including an extra check for restored accounts. Two further checks passed for restoring suspended and deactivated accounts while older sign-ins were being closed.
- This gives 1,244 distinct passing checks across 133 files. The affected checks were rerun after the correction, rather than repeating the whole run.
- All 18 browser checks passed in both tested browsers. The remaining code checks passed too.
- Reviewed this checklist against the finished changes. Startup, accounts, bookings, and the extra account checks were committed separately.

Checks used temporary data and pretend email replies. Before launch, check a real password-recovery email with the existing email service.
