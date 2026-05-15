# Requirements Traceability Matrix — Overnght

| Requirement ID | Description | Feature | Test Case ID(s) | Priority | Comments |
|----------------|-------------|---------|-----------------|----------|----------|
| RQ-001 | User can sign in with valid email and password | Sign In > Login | TC-AUTH-001 | High | |
| RQ-002 | Invalid credentials are rejected with appropriate feedback | Sign In > Login | TC-AUTH-002 | High | |
| RQ-003 | User can request password reset link from sign-in flow | Sign In > Password | TC-AUTH-003 | Medium | |
| RQ-004 | User can log out successfully from account | Sign In > Session | TC-AUTH-004 | High | |
| RQ-005 | User can complete email/password sign-up successfully | Sign Up > Registration | TC-REGISTR-001 | High | |
| RQ-006 | Sign-up via Google SSO | Sign Up > SSO | TC-REGISTR-002 | Low | Out of scope (manual catalog); no automated coverage |
| RQ-007 | Sign-up via Apple SSO | Sign Up > SSO | TC-REGISTR-003 | Low | Out of scope (manual catalog); no automated coverage |
| RQ-008 | Home screen displays all primary sections | Home Screen > Layout | TC-HOME-001 | High | |
| RQ-009 | Left sidebar is shown and navigation works | Home Screen > Sidebar | TC-HOME-002 | High | |
| RQ-010 | User can open live event video player from home | Home Screen > Navigation | TC-HOME-003 | High | |
| RQ-011 | User can navigate to VOD from home | Home Screen > Navigation | TC-HOME-004 | High | |
| RQ-012 | Live event plays back in video player | Video Player > Live | TC-PLAYER-001 | High | QA blocked (skip for now); see tracker / Slack ref |
| RQ-013 | Recorded (VOD) content plays with seek support | Video Player > VOD | TC-PLAYER-002 | High | |
| RQ-014 | Play/Pause controls work in video player | Video Player > Controls | TC-PLAYER-003 | High | |
| RQ-015 | Player control visibility behaves as specified | Video Player > Controls | TC-PLAYER-004 | Medium | |
| RQ-016 | Premium-required modal appears when applicable | Video Player > Paywall | TC-PLAYER-005 | High | |
| RQ-017 | Geo-blocked state is communicated to user | Video Player > Geo | TC-PLAYER-006 | Medium | |
| RQ-018 | Stream load errors are handled with appropriate UX | Video Player > Errors | TC-PLAYER-007 | Medium | |
| RQ-019 | User can search events in VOD experience | VOD > Search | TC-VOD-001 | High | |
| RQ-020 | User can filter VOD events | VOD > Filters | TC-VOD-002 | High | |
| RQ-021 | Additional VOD results load on scroll (pagination/infinite) | VOD > Listing | TC-VOD-003 | Medium | |
| RQ-022 | Access rules enforced when user selects an event | VOD > Access | TC-VOD-004 | High | |
| RQ-023 | Search / VOD list: sort by Newest/Oldest | Search > Sort | TC-VOD-005 | Medium | |
| RQ-024 | Search / VOD list: sort by A–Z / Z–A | Search > Sort | TC-VOD-006 | Medium | |
| RQ-025 | Search / VOD list: group or sort by sport | Search > Sort | TC-VOD-007 | Medium | |
| RQ-026 | Search / VOD list: filter by date range | Search > Filters | TC-VOD-008 | Medium | |
| RQ-027 | User can view and manage personal information | Account > Profile | TC-ACCOUNT-001 | High | |
| RQ-028 | User can change password while authenticated | Account > Security | TC-ACCOUNT-002 | High | |
| RQ-029 | User can use forgot-password flow | Account > Security | TC-ACCOUNT-003 | Medium | |
| RQ-030 | User can purchase subscription without coupon | Subscriptions > Purchase | TC-SUBSCRIPTION-001 | High | |
| RQ-031 | User can purchase subscription with coupon | Subscriptions > Purchase | TC-SUBSCRIPTION-002 | High | |
| RQ-032 | User can cancel subscription | Subscriptions > Lifecycle | TC-SUBSCRIPTION-003 | High | |
| RQ-033 | User can reactivate subscription | Subscriptions > Lifecycle | TC-SUBSCRIPTION-004 | High | |
| RQ-034 | User can add new payment method | Subscriptions > Payment | TC-SUBSCRIPTION-005 | High | |
| RQ-035 | User can purchase subscription with minimal / without extended personal info path | Subscriptions > Purchase | TC-SUBSCRIPTION-006 | Medium | Wording per test catalog |
| RQ-036 | User-selected timezone is saved and event date/time on Home and Search reflects preference | Account > Settings | TC-ACCOUNT-004 | High | Manual: `docs/manual-test-cases-account-settings-legalese-faq-contact.md` |
| RQ-037 | Terms of Use page opens and displays content | Info > Legalese | TC-LEGAL-001 | Medium | Same |
| RQ-038 | Privacy Policy section opens (`#privacy-policy` or footer) | Info > Legalese | TC-LEGAL-002 | Medium | Same |
| RQ-039 | FAQ page loads; every accordion item expands and shows answer | Info > FAQ | TC-FAQ-001 | Medium | Requires `/faqs` API; same doc |
| RQ-040 | Contact support: submit request without observation field | Info > Contact | TC-CONTACT-001 | Medium | Same |
| RQ-041 | Contact support: submit request with observation when optional block enabled | Info > Contact | TC-CONTACT-002 | Medium | Same |
| RQ-042 | Contact support: multiple category/issue paths and validation when observation required | Info > Contact | TC-CONTACT-003 | Medium | Same |

---

**Notes**

- **Requirement ID** uses the same **RQ-NNN** pattern as your sample (sequential for Overnght).
- **Test Case ID(s)** for **RQ-001 … RQ-035** match the catalog in `docs/Automation_Plan.md` §3.1.
- **RQ-036 … RQ-042** map to **TC-ACCOUNT-004**, **TC-LEGAL-001/002**, **TC-FAQ-001**, **TC-CONTACT-001 … TC-CONTACT-003** — detailed steps in `docs/manual-test-cases-account-settings-legalese-faq-contact.md`. Add these ids to the shared test tracker when adopted.
- **Terms of Service footer banner** (accept/checkbox flows) remains in Playwright (`terms-of-service.spec.ts`); give a dedicated **TC-LEGAL-003** (or **TC-BANNER-***) in the tracker if you want RTM coverage for that UX separately from static Terms/Privacy pages.
- Update this matrix when requirements or test ids change.
