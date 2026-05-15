# Test Cases

## 1. Feature: Sign In

### TC-AUTH-001 Sign-In: Successful Login

### **Prerequisites**

- User already registered in backend.
- Valid email and password known.

### **Steps**

1. Navigate to the login screen.
  1. {baseURL/auth/login}
2. Enter valid email and password.
3. Click the **“Log In”** CTA.

### **Expected Result**

- User is authenticated successfully.
- User is redirected to the home page.
  - {baseURL}

### TC-AUTH-002 Sign-In: Invalid Credentials

### **Prerequisites**

- Valid account exists.

### **Steps**

1. Navigate to the login screen.
  1. {baseURL/auth/login}
2. Enter correct email but incorrect password.
3. Click the **“Log In”** CTA.

### **Expected Result**

- Authentication fails.
- Toast message displayed: **“Invalid email or password.”**
- No access granted.

### TC-AUTH-003 Forgot Password: Send Reset Link

### **Prerequisites**

Valid user email exists.

### **Steps**

1. Navigate to the login screen.
  1. {baseURL/login}
2. Click **“Forgot Password?”**
3. Enter registered email.
4. Click **“Reset Password”** button

### **Expected Result**

- System validates email format.
- Toast message displayed with text: “Reset link sent - Check your email for the password reset link.”
- Page displays message:
  - “Check Your Inbox"
  - **“We emailed you a special link to:** {Email}**”**
  - **“Click to verify your email address”**
  - **“Please check your inbox and follow the link to reset your password.”**
- And displays 2 buttons: Back to Login and Try Again

### TC-AUTH-004 Logout: Successful logout from account

### **Prerequisites**

- User is authenticated

### **Steps**

1. Click to Account icon in the upper right corner
  1. from any URL
2. Tap “Log Out” button

### **Expected Result**

- Token is removed;
- User is redirected to the Login page.
  - {baseURL}

## 2. Feature: Sign Up

### TC-REGISTR-001 Sign-Up: Successful Sign Up

### **Prerequisites**

- User  unregistered in backend.

### **Steps**

1. Navigate to the registration screen.
  1. {baseURL/auth/registration}
2. Please enter valid data in the following fields:

- First name
- Last name
- Email
- Password
- Confirm password

1. Check the checkbox I agree to the Terms & Conditions and Privacy Policy
2. Click the **“Create Account”** button.
3. Redirect to the Verify Your Email

- {baseURL/auth/verify-email}

1. Enter the verification code from the email
2. Click the **“Verify Email”** button. (step is triggered automatically after entering a valid code)
3. Redirect to the Preferences page

- {baseURL/preferences}

1. Click the **“Skip for now”** button.

### **Expected Result**

- User is authenticated successfully.
- User is redirected to the home page.
  - {baseURL}

### TC-REGISTR-002 Sign-Up: via Google SSO

### **Prerequisites**

- User  unregistered in backend.

### **Steps**

1. Navigate to the registration screen.
  1. {baseURL/auth/registration}
2. Click **“Continue with Google”** button.

### **Expected Result**

- User is authenticated successfully.
- User is redirected to the home page.
  - {baseURL}

### TC-REGISTR-003 Sign-Up: via Apple SSO

### **Prerequisites**

- User  unregistered in backend.

### **Steps**

1. Navigate to the registration screen.
  1. {baseURL/auth/registration}
2. Click **“Continue with Apple”** button.

### **Expected Result**

- User is authenticated successfully.
- User is redirected to the home page.
  - {baseURL}

## 3. Feature: Home Screen Load

### TC-HOME-001 Home Screen: Display of all home screen sections

### **Prerequisites**

- User is authenticated;
- API is available

### **Steps**

1. Wait for data to load
2. Scroll and make sure all sections are present.

### **Expected Result**

- User is redirected to the Home page.
  - {baseURL/?home=true}
- The following are displayed:
  - Live Events (if there is one at the moment)
  - On The Horizon
  - Discover most popular sports
  - Conferences
  - Featured Past Events
  - Featured Overnght Shows
  - All Overnght Shows
  - All Past Events

### TC-HOME-002 Home Screen: Left side bar

### **Prerequisites**

- User is authenticated;
- Home screen is loaded

### **Steps**

1. Click on the burger menu button
2. Select a sport in the list (e.g. “Basketball”)
3. Verify list updates

### **Expected Result**

- Redirect to specific sport page
  - {baseURL/sports/basketball}
- The following are displayed:
  - Background sport photo
  - Events related to this sport by category

### TC-HOME-003 Home Screen: Navigate to Event Video Player

### **Prerequisites**

- User has access to the event (subscription, region)

### **Steps**

1. Select an event from Live Events or Past Events
2. Verify events is open

### **Expected Result**

- Player Screen opens
  - {baseURL/event/id}
- playback starts
- the event data is correct
  - data
  - time
  - timezone
  - teams name

### TC-HOME-004 Home Screen: Navigate to VOD from Home

### **Prerequisites**

- Home screen is loaded

### **Steps**

1. Scroll down to Past Events section
2. Tap “See More” in Past Events or Shows section

### **Expected Result**

- Player Screen opens
  - {baseURL/event/id}
- playback starts
- the event data is correct
  - data
  - time
  - timezone
  - teams name

## 4. Feature: Video Player

### TC-PLAYER-001 Video Player: Live Event Playback

### **Prerequisites**

- User has subscription; event is live;
- region is allowed

### **Steps**

1. Select live event on Home or Sport Detail
2. Open Event

### **Expected Result**

- Video plays
  - {baseURL/event/id}
- LIVE badge is displayed
- “No rewind” indicator for live
- Correct data for event
  - data
  - time
  - timezone
  - teams name

### TC-PLAYER-002 Video Player: Playback of recording (VOD) with seek capability

### **Prerequisites**

- User has subscription;
- event has ended (VOD available)

### **Steps**

1. Select past event
2. Open Event
3. Use seek

### **Expected Result**

- Video plays
  - {baseURL/event/id}
- Progress Bar is displayed
- seek works

### TC-PLAYER-003 Video Player: Playback Controls (Play/Pause)

### **Prerequisites**

- User has subscription (for events without the "Free" label);
- Video is playing in Player

### **Steps**

1. Press Play/Pause
2. Verify pause
3. Press again to resume

### **Expected Result**

- Video pauses and resumes; state icon updates

### TC-PLAYER-004 Video Player: Controls Visibility

### **Prerequisites**

- Player is open;
- video is playing

### **Steps**

1. hover over the video player — controls appear
2. Wait without action — controls hide

### **Expected Result**

- Controls (ProgressBar, buttons) display on activity and hide after timeout

### TC-PLAYER-005 Video Player: Premium Required Modal

### **Prerequisites**

- User has no active subscription;
- premium content is selected

### **Steps**

1. Select event requiring subscription
2. Open Player

### **Expected Result**

- Not Premium Modal is displayed;
- playback does not start

### TC-PLAYER-006 Video Player: Geo Blocked

### **Prerequisites**

- User has no active subscription;
- premium content is selected

### **Steps**

1. Select event requiring subscription
2. Open Player

### **Expected Result**

- Not Premium Modal is displayed;
- playback does not start

### TC-PLAYER-007 Video Player: Stream Load Error Handling

### **Prerequisites**

- Invalid stream URL or network unavailable
- Use a non-existent eventId (e.g. 1111bb11-1d11-1111-1c11-1111111111aa) - getEvent will fail, ErrorOverlay will appear.
- Request an event from the backend with a deliberately invalid stream URL

### **Steps**

1. Open event with non-working stream

### **Expected Result**

- Error Overlay is displayed with error message;
- retry option is available

## 5. Feature: Video on Demand (VOD)

### TC-VOD-001 Video on Demand (VOD): Event Search

### **Prerequisites**

- User is on VOD screen

### **Steps**

1. Enter text in Search Bar
2. Wait for results

### **Expected Result**

- Events matching the search query are displayed

### TC-VOD-002 Video on Demand (VOD): Event Filtering

### **Prerequisites**

- User is on VOD (Search) screen

### **Steps**

1. Tap Filter Button
2. Select sport and/or event type (Live, Past, Shows)
3. Apply filters

### **Expected Result**

- Event list updates according to selected filters;
- active filter count is displayed

### TC-VOD-003 Video on Demand (VOD): Load next pages on scroll

### **Prerequisites**

- VOD is loaded;
- more events exist than on first page

### **Steps**

1. Scroll list to the bottom
2. Wait for load

### **Expected Result**

- Next events are loaded;
- loading indicator is displayed during load

### TC-VOD-004 Video on Demand (VOD): Access Check on Event Selection

### **Prerequisites**

- User is on VOD
- premium or geo-restricted content is selected

### **Steps**

1. Select event
2. Wait for load

### **Expected Result**

- If no access — NotPremiumModal or RegionRestrictedModal;
- if access — Player opens

### TC-VOD-005 Video on Demand (VOD): Sort by Newest/Oldest

### **Prerequisites**

- User is on Search screen
  - {baseURL/search}

### **Steps**

1. Click Filters button
2. Choose Newest or Oldest option (switches with Ascending/Descending button)
3. Click Apply button

### **Expected Result**

- Events will be displayed from newest to oldest or vice versa

### TC-VOD-006 Video on Demand (VOD): Sort by A-Z/Z-A

### **Prerequisites**

- User is on Search screen
  - {baseURL/search}

### **Steps**

1. Click Filters button
2. Choose A-Z/Z-A option (switches with Ascending/Descending button)
3. Click Apply button

### **Expected Result**

- Events will be displayed from A to Z or vice versa

### TC-VOD-007 Video on Demand (VOD): Sort by Grouped by sport

### **Prerequisites**

- User is on Search screen
  - {baseURL/search}

### **Steps**

1. Click Filters button
2. Choose Grouped by sport
3. Click Apply button

### **Expected Result**

- Events will be displayed Grouped by sport

### TC-VOD-008 Video on Demand (VOD): Filters by Date Range

### **Prerequisites**

- User is on Search screen
  - {baseURL/search}

### **Steps**

1. Click Filters button
2. Choose Newest or Oldest option (switches with Ascending/Descending button)
3. Click Apply button

### **Expected Result**

- Events will be displayed from newest to oldest or vice versa

## 6. Feature: User Account

### TC-ACCOUNT-001 User Account: Personal Information

### **Prerequisites**

- User is on Account screen
  - {baseURL/account}

### **Steps**

1. Change First Name
2. Change Last Name
3. Click Update Profile button

### **Expected Result**

- The first and last user names are displayed updated.

### TC-ACCOUNT-002 User Account: Change password

### **Prerequisites**

- User is on Account screen
  - {baseURL/account}

### **Steps**

1. Enter current password
2. Enter new password
3. Confirm new password
4. Click Update Password button

### **Expected Result**

- The user's password has been updated and they can log in using it.

### TC-ACCOUNT-003 User Account: Forgot password

### **Prerequisites**

- User is on Account screen
  - {baseURL/account}

### **Steps**

1. Click **“Forgot Password?”**
2. Enter registered email.
3. Click **“Reset Password”** button

### **Expected Result**

- System validates email format.
- Toast message displayed with text: “Reset link sent - Check your email for the password reset link.”
- Page displays message:
  - “Check Your Inbox"
  - **“We emailed you a special link to:** {Email}**”**
  - **“Click to verify your email address”**
  - **“Please check your inbox and follow the link to reset your password.”**
- And displays 2 buttons: Back to Login and Try Again

### TC-ACCOUNT-004 **Account settings: Timezone affects event date/time on Home and Search**

### **Prerequisites**

- User is signed in with permission to open **My Account**.
- User can open **Home** (`{baseURL}/`) and **Search** (`{baseURL}/search`).
- At least one event with a known start time is visible on Home and/or Search (live or scheduled) so date/time strings can be compared.

### **Steps**

1. Open **My Account** (`{baseURL}/account`).
2. Open the **Settings** block (card titled **Settings** — subtitle *Manage your account preferences*).
  - On narrow viewports, select the **Settings** tab in the toggle group.
3. Note the current value in the **Timezone** select (**Platform Default**, **Auto-detect**, or a specific region).
4. Pick a **different** IANA timezone from the grouped list (e.g. change from **Platform Default** to **Europe/London** or another zone clearly offset from the previous display).
5. Click **Save Settings** and wait for save to complete.
6. Go to **Home** (`{baseURL}/`) and find the same event(s) as before; note the displayed **date and/or time** (and timezone abbreviation if shown).
7. Go to **Search** (`{baseURL}/search`) and locate the same or comparable event listing; note the displayed **date and/or time** for events.
8. (Optional) Repeat step 4–7 selecting **Platform Default** or **Auto-detect** and confirm display returns to expected behavior.

### **Expected Result**

- After saving, the chosen timezone preference persists (reload **Account** → **Settings** shows saved value).
- Event date/time presentation on **Home** and on **Search** **reflects the selected timezone** (values differ appropriately when switching between distinct zones, consistent with product rules for “platform default” vs fixed IANA).

## 7. Feature: Subscriptions

### TC-SUBSCRIPTION-001 Subscriptions: Purchasing a subscription without a coupon

### **Prerequisites**

- User non-subscriber
- User has First and Last names in his account
- User is on Subscription screen
  - {baseURL/subscription}

### **Steps**

1. Click Subscribe Now button
2. Choose Monthly/Annual Plan
3. Enter Card Number (for testing use: 4242 4242 4242 4242)
4. Enter Expiry Date (any feature date)
5. Enter CVC (any 3 digits)
6. Click **submit subscription**

### **Expected Result**

- The purchased subscription is displayed in the user's account.

### TC-SUBSCRIPTION-002 Subscriptions: Purchasing a subscription with a coupon

### **Prerequisites**

- User non-subscriber
- User has First and Last names in his account
- User is on Subscription screen
  - {baseURL/subscription}

### **Steps**

1. Click **Subscribe Now** button
2. Choose Monthly/Annual Plan
3. Enter Coupon code (coupon MARIA2025: -10%)
4. Enter Card Number (for testing use: 4242 4242 4242 4242)
5. Enter Expiry Date (any feature date)
6. Enter CVC (any 3 digits)
7. Click **submit subscription**

### **Expected Result**

- The purchased subscription with -10% Discount is displayed in the user's account

### TC-SUBSCRIPTION-003 Subscriptions: Cancel subscription

### **Prerequisites**

- User subscriber
- User is on Subscription screen
  - {baseURL/subscription}

### **Steps**

1. Click **Cancel Subscription** button
2. Click **Yes, Cancel** button

### **Expected Result**

- The subscription page displays the Reactive Subscription button and the active label + the cancelled label and the subscription expiration date.

### TC-SUBSCRIPTION-004 Subscriptions: Reactive Subscription

### **Prerequisites**

- User subscriber
- User is on Subscription screen
  - {baseURL/subscription}

### **Steps**

1. Click **Cancel Reactive Subscription** button

### **Expected Result**

- The subscription page displays the Cancel Subscription button and the active label

### TC-SUBSCRIPTION-005 Subscriptions: Add new p**ayment method**

### **Prerequisites**

- User subscriber
- User has First and Last names in his account
- User is on Subscription screen
  - {baseURL/subscription}

### **Steps**

1. Click **Change Payment Method** button
2. Click **Add New Payment Method** button
3. Enter Card Number (for testing use: 4242 4242 4242 4242)
4. Enter Expiry Date (any feature date)
5. Enter CVC (any 3 digits)
6. Click **Add** **Payment Method**

### **Expected Result**

- The subscription page displays the all  payment methods user has

### TC-SUBSCRIPTION-006 Subscriptions: Purchasing a subscription without a personal info

### **Prerequisites**

- User non-subscriber
- User hasn’t First and Last names in his account
- User is on Subscription screen
  - {baseURL/subscription}

### **Steps**

1. Click **Subscribe Now** button
2. Choose Monthly/Annual Plan
3. Click **Update Your Profile** button
4. Enter First Name and Last Name
5. Click **Update Profile** button
6. Click **Subscribe Now** button
7. Enter Card Number (for testing use: 4242 4242 4242 4242)
8. Enter Expiry Date (any feature date)
9. Enter CVC (any 3 digits)
10. Click **submit subscription**

### **Expected Result**

- The purchased subscription is displayed in the user's account.

## 8. Feature: **Legalese**

### **TC-LEGAL-001 Legalese**: **Terms of Use page opens**

### **Prerequisites**

- footer is available (or user has direct URL).

### **Steps**

1. From any page with footer (e.g. Home), locate the **Terms of Use** link.
2. Click **Terms of Use**.

### **Expected Result**

- Browser navigates to `**{baseURL}/legalese/termsOfService`**.
- Page loads with Terms of Use content visible (no blank/error state).

### **TC-LEGAL-002 Legalese**: **Privacy Policy opens**

### **Prerequisites**

- Same as Terms (footer or direct URL).

### **Steps**

1. From the footer, click **Privacy Policy or** open `{baseURL}/legalese/termsOfService#privacy-policy` directly.

### **Expected Result**

- User lands on the legalese route with the **Privacy Policy** section in view or reachable on the same page (hash `#privacy-policy` as implemented).
- Privacy Policy content is displayed.

## 9. Feature: **FAQ**

### **TC-FAQ-001 — FAQ: Page `/faq` and all accordion items**

### **Prerequisites**

- Backend returns FAQ list for `**GET {API}/faqs`** (otherwise the page may show the “Can’t find what you’re looking for?” support block only — note for environment setup).

### **Steps**

1. Open `**{baseURL}/faq`**.
2. Confirm the page title shows **Frequently Asked Questions** (desktop) or **FAQ** (mobile header area).
3. For **each** FAQ row in the accordion list:
  - Click the question row (**AccordionTrigger**) to expand.
    - Verify the answer HTML content appears below.
    - Click again to collapse (optional, if `collapsible` behavior is in scope).
4. Repeat until **every** FAQ item has been expanded at least once.

### **Expected Result**

- All accordion sections open without error; answers match expectations and formatting is readable (**FAQ** content from CMS/API).
- No broken layout or console errors attributable to accordion behavior.

## 10. Feature: **Contact support**

### **TC-CONTACT-001 — Steps — A. Without observation**

### **Prerequisites**

- User may be signed in (email may be pre-filled and locked) or signed out (must enter email).
- Support email/API is available so **Submit Request** can succeed (or staging captures request — adjust **Expected Result** if backend mocked).

### **Steps**

1. Open `**{baseURL}/contact`**.
2. Confirm heading **Contact Support** and card **Support Request**.
3. Enter **Email** if required (when not pre-filled from session).
4. **Category:** choose **Subscription** (example).
5. **Issue:** choose **How do I resubscribe?** (example).
6. Leave **Add observation (optional)** **unchecked** (no **Observation** textarea visible).
7. Click **Submit Request** (shows **Sending Request** while pending).

### **Expected Result**

- Request completes successfully (success toast/feedback per product; no validation error).
- Payload omits required observation; form can submit with category + issue + email only.

### **TC-CONTACT-002 — Steps — B. With observation**

### **Prerequisites**

- User may be signed in (email may be pre-filled and locked) or signed out (must enter email).
- Support email/API is available so **Submit Request** can succeed (or staging captures request — adjust **Expected Result** if backend mocked).

### **Steps**

1. Open `**{baseURL}/contact`** (or reset form after A).
2. Fill **Email**, **Category**, and **Issue** (may use **Other** → **Other issue** to vary from A).
3. Check **Add observation (optional)**.
4. Verify **Observation** textarea appears (placeholder *Provide details about your issue...*, counter *x/500*).
5. Enter text in **Observation** (1–500 characters).
6. Click **Submit Request**.

### **Expected Result**

- Submit succeeds; observation is included in the support request.
- If **Add observation** is checked and **Observation** is empty, **Submit Request** stays **disabled** (and validation shows that observation is required when enabled).

### **TC-CONTACT-003 — Steps — C. Additional combinations (regression)**

### **Prerequisites**

- User may be signed in (email may be pre-filled and locked) or signed out (must enter email).
- Support email/API is available so **Submit Request** can succeed (or staging captures request — adjust **Expected Result** if backend mocked).

### **Steps**

1. Repeat **A** or **B** with other **Category** / **Issue** pairs (e.g. **Log in** → *I am not able to log in.*; **Content** → refund/incompatible/connection; **Other** → *Other issue*).
2. With observation **on**, try **Submit** with **Observation** empty — expect disabled submit or validation error.

### **Expected Result**

- All valid combinations submit when required fields are satisfied; observation only mandatory when checkbox is checked.

## 11. Feature: Platform API — events, search, streams, and test-event isolation

### TC-PLAT-001 Platform API: GET /platform/events — admin list includes rows with is_test = true

### **Prerequisites**

- Valid **admin** JWT available (e.g. automation: `ADMIN_TOKEN`).
- API base URL available (e.g. `{API}`; staging example: `https://api.stg.overnght.com`).
- At least one event exists in the environment with **is_test / isTest = true** (used as the canonical “test event” in other cases).

### **Steps**

1. Call `**GET {API}/platform/events`** with header `**Authorization: Bearer {adminToken}`** and query params e.g. `**page=1`**, `**limit=100`** (or `**1000**` if needed to reach the event).
2. Parse JSON response `**data[]**` and collect event `**id**` values.

### **Expected Result**

- HTTP **200**.
- Response `**data`** contains an event whose `**id`** matches the known test event (or `**isTest`** / `**is_test`** is **true** on at least one row, per product field naming).

### TC-PLAT-002 Platform API: GET /platform/events — regular user list never includes test events (all pages)

### **Prerequisites**

- Valid **regular** user JWT (e.g. `REGULAR_TOKEN`).
- Same `**{API}`** and test event `**id`** as in TC-PLAT-001.

### **Steps**

1. Call `**GET {API}/platform/events`** with `**Authorization: Bearer {regularToken}`** with pagination: start `**page=1`**, `**limit`** as allowed (e.g. **10**–**50**).
2. Repeat for **every** page until `**page` ≥ `pagination.totalPages`** (or `**data`** is empty on the last page, per API contract).
3. Collect all `**id`** values across pages.

### **Expected Result**

- Each page returns HTTP **200** (for allowed auth).
- No page’s `**data`** contains the test event `**id`**; no row has `**isTest` / `is_test` true** if those fields appear in regular responses.

### TC-PLAT-003 Platform API: GET /platform/events/{id} — admin 200 on test event; regular 404; regular 200 on prod event

### **Prerequisites**

- Admin and regular JWTs; `**{API}`**; one test event `**id`** and one **non-test** (prod) event `**id`**.

### **Steps**

1. `**GET {API}/platform/events/{testEventId}`** with **admin** bearer → note status and body.
2. `**GET {API}/platform/events/{testEventId}`** with **regular** bearer → note status.
3. `**GET {API}/platform/events/{prodEventId}`** with **regular** bearer → note status.

### **Expected Result**

- Step 1: **200** and event payload for the test ID.
- Step 2: **404** (hidden test content is not disclosed as “forbidden resource”; not **403** for this scenario).
- Step 3: **200** and valid event payload for the prod ID.

### TC-PLAT-004 Platform API: GET /platform/events?search= — admin finds test event by name; regular does not

### **Prerequisites**

- Known test event **name** (non-trivial length, trimming whitespace); admin and regular JWTs.

### **Steps**

1. `**GET {API}/platform/events`** with admin token and params `**search={exactOrTrimmedEventName}`**, `**limit=50`**, `**page=1**`.
2. Same request with regular token.

### **Expected Result**

- Admin response **200**; `**data`** `**id`** list **includes** the test event `**id`** when the search string matches backend rules.
- Regular response **200**; `**data`** **does not** include the test event `**id`**.

### TC-PLAT-005 Platform API: POST /search — unauthenticated response must not return test events

### **Prerequisites**

- Test event **name** and `**id`**; `**{API}`** supports `**POST /search**` with JSON body (no bearer), `**Content-Type: application/json**`.
- Typical body fields: `**search**`, `**page**`, `**limit**` (align with implementation).

### **Steps**

1. `**POST {API}/search`** with headers that **omit** `**Authorization`** (and any `**Cookie`** impersonation).
  ```json
        { "search": "<testEventName>", "page": 1, "limit": 50 }
        ```
  ```
2. Parse `**data.events**` (or equivalent path) for event `**id**` and `**isTest` / `is_test**`.

### **Expected Result**

- HTTP **200** (or documented success code).
- No event entry has `**id`** equal to the test event `**id`**; none have `**isTest` / `is_test` true** (anonymous search must not leak staging/test catalog entries).

### TC-PLAT-006 Platform API: GET /global-search — query must not surface the hidden test event

### **Prerequisites**

- Test event **name**; `**{API}`** exposes `**GET /global-search`** with e.g. `**q=`** and `**types=events`** (per implementation).

### **Steps**

1. `**GET {API}/global-search?q={encodedTestEventName}&types=events`** (unauthenticated unless product requires auth).

### **Expected Result**

- HTTP **200**.
- `**events.items`** (or equivalent **events** list): **no** item with `**id`** = test event `**id`**.

### TC-PLAT-007 Platform API: GET /platform/events/{id}/stream — admin allowed; regular receives 404 for test event ID

### **Prerequisites**

- Test event `**id`**; admin and regular JWTs.

### **Steps**

1. `**GET {API}/platform/events/{testEventId}/stream`** with **admin** bearer.
2. Same URL with **regular** bearer.

### **Expected Result**

- Step 1: **200** and **JSON** body with stream/session payload fields (structure per API).
- Step 2: **404** (stream URL must not leak for hidden test events to non-privileged callers).

### TC-PLAT-008 Platform API: GET /platform/events/{id}/moments — admin returns rows; regular gets empty moments or 404 for test event

### **Prerequisites**

- Test event `**id`**; admin and regular JWTs; pagination params `**page`**, `**limit**` if required.

### **Steps**

1. `**GET {API}/platform/events/{testEventId}/moments`** with **admin** bearer (e.g. `**page=1`**, `**limit=50`**).
2. Same with **regular** bearer.

### **Expected Result**

- Step 1: **200**; `**data`** may be empty or populated per content.
- Step 2: Either **404**, or **200** with `**data`** = **[]** (no moments returned for a hidden test event to regular users — no partial leak of moment records).

### TC-PLAT-009 Platform API: Pagination edge case — test event never appears on any “regular” page slice

### **Prerequisites**

- Regular JWT; small `**limit`** (e.g. **10**) to force many pages.

### **Steps**

1. Iterate `**GET {API}/platform/events`** with `**Authorization: Bearer {regularToken}`**, `**page=1..N`**, fixed `**limit**`, until the last page.
2. Union all `**id**` from `**data**`.

### **Expected Result**

- Test event `**id`** is **absent** from the union (same idea as TC-PLAT-002; validates no off-by-one or last-page leak).

### TC-PLAT-010 Platform API: Filters LIVE and UPCOMING/SCHEDULED — regular lists never include the test event ID

### **Prerequisites**

- Regular JWT; API supports `**status`** (or equivalent) query, e.g. `**LIVE`** and `**SCHEDULED`** (or `**UPCOMING`** — use the exact enum the backend exposes).

### **Steps**

1. For each supported status filter value (`**LIVE`**, `**SCHEDULED`** / `**UPCOMING**`), page through `**GET {API}/platform/events**` as in TC-PLAT-009 with that `**status**`.
2. Check `**id**` sets.

### **Expected Result**

- For **every** tested `**status`**, test event `**id`** never appears in `**data**` for the regular user.

### TC-PLAT-011 Platform API: Security — unauthenticated GET /platform/events must not list test events

### **Prerequisites**

- Known test event `**id`**; request uses only headers that omit bearer (e.g. `**Accept: application/json`** only — match automation “unauthenticated” set).

### **Steps**

1. Page through `**GET {API}/platform/events`** **without** `**Authorization`** (and without session cookie), same pagination as TC-PLAT-002.

### **Expected Result**

- Public/anonymous listings **never** contain the test event `**id`**.

### TC-PLAT-012 Platform API: Security — regular user direct GET test event ID returns 404 (not 403)

### **Prerequisites**

- Regular JWT; test event `**id`**.

### **Steps**

1. `**GET {API}/platform/events/{testEventId}`** with `**Authorization: Bearer {regularToken}`**.

### **Expected Result**

- HTTP **404** response (resource not found / not disclosed), **not** **403**, for this visibility pattern.

### TC-PLAT-013 Platform API: Security — unauthenticated GET /platform/events/{testEventId} returns 404

### **Prerequisites**

- Test event `**id`**.

### **Steps**

1. `**GET {API}/platform/events/{testEventId}`** without `**Authorization`** and without forging cookies.

### **Expected Result**

- HTTP **404** (same “not found” surface as forbidden visibility for anonymous callers).

### TC-PLAT-014 Platform API: Security — missing or malformed Authorization behaves as unauthorized (401 or 404 per contract)

### **Prerequisites**

- `**{API}`**; optional test `**GET`** path e.g. `**/platform/me**` or `**/platform/events**` for auth behavior.

### **Steps**

1. Call a protected `**GET`** with header `**Authorization: Bearer`** (token **empty** after space) or malformed value.
2. Call with `**Authorization: Bearer invalid.signature.here`** (clearly invalid JWT).
3. If applicable, call with **expired** JWT from a known test clock.

### **Expected Result**

- Responses follow product rules: typically **401 Unauthorized** / **403** with stable error payload for invalid token; listings and detail endpoints **never** broaden access when the token is bad (no leakage of privileged rows).

### TC-PLAT-015 Platform API: Security — client removes token mid-session — subsequent requests are unauthenticated

### **Prerequisites**

- Ability to simulate client: first request **with** valid bearer, later **without** (browser devtools clearing storage / API client removing header).

### **Steps**

1. Perform `**GET`** with valid `**Authorization: Bearer {regularToken}`** — confirm **200** where applicable.
2. Remove token (clear header / logout / wipe local/session storage).
3. Repeat `**GET {API}/platform/events`** **without** token.

### **Expected Result**

- Step 3 matches anonymous/unauthenticated behavior (same as TC-PLAT-011 for catalogue); no authenticated-only data appears after token removal.

## 12. Feature: Test event visibility — web (Home, event detail, direct URLs)

### TC-TEV-001 Web: Home — admin sees highlighted test-event card; regular user does not

### **Prerequisites**

- `**{baseURL}`** (e.g. staging **[https://stg.overnght.com/](https://stg.overnght.com/)**); valid sessions for **admin** and **regular** accounts (JWT/cookies per implementation).
- A **test event** visible to admins in `**GET {API}/platform/events`** exists and has a predictable **card title**/link `**/event/{id}`**.

### **Steps**

1. As **admin**, navigate to `**{baseURL}`** (`/` or `**{baseURL}/?home=true`** if routed that way).
2. Scroll/find the card or link whose `**href`** ends `**/event/{testEventId}`** (match by `**{testEventName}`** if needed).
3. As **regular** user, open `**{baseURL}`** in a **fresh** session (no admin cookies).
4. Inspect the page for navigation links to `**/event/{testEventId}`** (search DOM or “Find on page”).

### **Expected Result**

- Admin: The test event appears on Home; **TEST** styling is visible (**highlight**/ring/red accent per UI).
- Regular: **No** visible link to `**/event/{testEventId}`** on Home (test catalog entries are not surfaced).

### TC-TEV-002 Web: Event detail `/event/{testEventId}` — admin sees test banner, robots noindex/nofollow, and player shell

### **Prerequisites**

- Admin session; known `**{testEventId}`**; `**{baseURL}/event/{testEventId}`** route available.

### **Steps**

1. As **admin**, open `**{baseURL}/event/{testEventId}`** (wait for **DOMContentLoaded** / network idle per test plan).
2. Observe `**role=status`** or banner text containing **“test event”** (case-insensitive).
3. Read `**<meta name="robots">`** `**content`** attribute.
4. Confirm **video** / **Video.js** shell **or** entitlement gate (**“Watch with Subscription”**) **or** scheduling gate (**“Upcoming Event”** / **“Event Delayed”**) is present.

### **Expected Result**

- Test-event banner/notice is visible.
- `**robots`** meta includes `**noindex`** and `**nofollow`** for the test event page.
- Player area or documented gate (subscription / schedule) is visible within the allowed timeout (no blank error state).

### TC-TEV-003 Web: Event detail `/event/{testEventId}` — regular user sees “Page Not Found” (404 UX)

### **Prerequisites**

- Regular session; `**{testEventId}`** is a **test** event (hidden from non-admins).

### **Steps**

1. As **regular** user, navigate to `**{baseURL}/event/{testEventId}`**.

### **Expected Result**

- Page shows **Page Not Found** (or equivalent **404** heading/message); **no** full event detail with playback for the hidden test event.

### TC-TEV-004 Web: Direct URL — regular user on `/event/{testEventId}` and `/stream/{testEventId}` both land on 404 UX

### **Prerequisites**

- Regular session; `**{testEventId}`** is a test event.

### **Steps**

1. Open `**{baseURL}/event/{testEventId}`** — note headline.
2. Navigate to `**{baseURL}/stream/{testEventId}`** — note headline.

### **Expected Result**

- Both routes show **404** / **Page Not Found** experience for the regular user (no player shell with working stream for hidden test content).

### TC-TEV-005 Web: Test event isolation across surfaces — cross-check API vs UI

### **Prerequisites**

- Ability to call `**GET {API}/platform/events`** as **admin** (see TC-PLAT-001) and `**GET`** as **regular** (TC-PLAT-002); plus browser access to `**{baseURL}`** for the same `**{testEventId}`**.

### **Steps**

1. Call API as **admin** and confirm test event `**id`** is in the list (or detail **200**).
2. Call API as **regular** and confirm that `**id`** is **absent** from list and detail is **404**.
3. Open Home and Search (if used) in the **browser** as **regular** — confirm the test event does not appear in grids/search results that are backed by catalog API.
4. (Optional) Repeat after a **hard refresh** (Ctrl+F5) and with **empty cache** once to rule out stale SPA bundle only (not a substitute for CDN validation — see **TC-TEVX-002** below).

### **Expected Result**

- **Same** test event `**id`** is **included** for admin API and **hidden** for regular API and **not discoverable** on regular web surfaces under normal conditions.

## 13. Feature: Test events — admin flags, cache, and concurrency (manual / extended)

### TC-TEVX-001 CMS/Admin: Toggle event is_test from prod → test and back — API and web stay consistent

### **Prerequisites**

- Admin access to the **source of truth** that sets `**is_test` / `isTest`** (CMS, admin panel, or backend tool); a **non-production** event suitable for toggling; **admin** and **regular** sessions and tokens for API checks.

### **Steps**

1. Note current flag and event `**id`**; set event to **test** (**is_test = true**) and save/publish.
2. Call `**GET {API}/platform/events`** as **admin** vs **regular**; open `**{baseURL}`** / Search as **regular** — record whether the event appears.
3. Set event to **prod** (**is_test = false**); repeat API and UI checks after cache-friendly wait (see TC-TEVX-002).
4. If policy allows, toggle **test → prod → test** once more and repeat spot checks.

### **Expected Result**

- When **test**: behavior matches TC-PLAT-001 / TC-PLAT-002 and TC-TEV-* (admin sees, regular does not).
- When **prod**: regular user can see the event when product rules (subscription/region) allow; no stuck “test-only” masking after the flag is cleared.

### TC-TEVX-002 Cache / CDN: After is_test or catalog change, UI reflects rules without stale test leakage

### **Prerequisites**

- Same as TC-TEVX-001 **or** a deployment/cache purge workflow; `**{baseURL}`** behind CDN if applicable.

### **Steps**

1. Perform an allowed catalog change (toggle **is_test**, or reorder Home) **as documented** for staging.
2. Wait for CDN/cache TTL **or** execute an approved **purge**/invalidation if available.
3. Load `**{baseURL}`** as **regular** in a **private** window; repeat `**GET {API}/platform/events`** as **regular** with `**Cache-Control: no-cache`** client hint if using API tools.

### **Expected Result**

- Regular user **still** cannot see `**is_test = true`** events after purge/TTL (no indefinite listing of toggled-away test IDs).
- Document any **acceptable delay** (e.g. “up to N minutes”) per infrastructure; file bug if leakage persists beyond SLO.

### TC-TEVX-003 Concurrent requests: Duplicate rapid GET `/platform/events` as regular does not sporadically include test IDs

### **Prerequisites**

- Regular JWT; script or API client firing **parallel** `**GET`** (same `**page`/`limit`**) ≥ **5–10** times.

### **Steps**

1. Fire parallel `**GET {API}/platform/events`** requests (same auth) with identical query.
2. Union **all** returned `**id`** values across responses.

### **Expected Result**

- Test event `**id`** never appears in any parallel response (**no race** leaking hidden rows).

### TC-TEVX-004 Global Search UI (`{baseURL}/search` or omnibar): regular user query must align with `/global-search` isolation

### **Prerequisites**

- Regular session; `**{baseURL}`** search UI wired to `**GET /global-search`** or equivalent; known **test event** `**name`** and `**id`** (same as automation).

### **Steps**

1. As **regular**, open `**{baseURL}/search`** (or open search overlay per product).
2. Enter the exact **test event name** substring used for API `**q=`**.
3. Verify result cards **do not** link to `**/event/{testEventId}`**.
4. (Optional) Repeat after TC-TEVX-002 cache considerations.

### **Expected Result**

- UI search mirrors `**GET /global-search`** rules: hidden test `**id`** does **not** appear in results.

## 14. Feature: Home screen — hero / promotional banners (admin targets)

### TC-HOME-BAN-001 Home Screen: Banner CTA opens the configured event (`/event/{id}`)

### **Prerequisites**

- User is authenticated and can open **Home** (`{baseURL}` / `{baseURL}/?home=true`).
- In the **admin panel**, a **hero / promotional banner** is configured with **target type = Event** (or equivalent) and a known **event ID** `{bannerEventId}` (note the expected `**{baseURL}/event/{bannerEventId}`** path).
- Banner is **published** and visible in the current environment.

### **Steps**

1. Open **Home** and wait for content to load.
2. Locate the configured **banner** (carousel slide or hero block).
3. Click the **banner CTA** or the **primary clickable area** (image/title) that should route to the event.

### **Expected Result**

- Browser navigates to `**{baseURL}/event/{bannerEventId}`** (query strings allowed if product adds `?` params).
- Event page loads (title, sport/league context, player or entitlement state per access — not a blank error page due to wrong link).

### TC-HOME-BAN-002 Home Screen: Banner CTA opens the **custom URL** set by admin (not the default event route)

### **Prerequisites**

- User is authenticated; **Home** loads.
- Admin configured this banner’s **destination** to **Custom URL / external link** (or **internal non-event path**) with a known expected target, e.g. `**https://example.com/promo`**, `**{baseURL}/faq`**, or `**{baseURL}/subscription**` — record the exact value from admin.
- If the product opens **external** URLs in a **new tab**, note that for the Expected Result.

### **Steps**

1. Open **Home**; find the banner that uses **custom URL**.
2. Click the **CTA** / clickable banner area.
3. Observe whether navigation is **same tab** or **new tab** (per product).

### **Expected Result**

- User lands on the **same URL** the admin saved (path + host per configuration; no silent redirect to a wrong event unless explicitly configured).
- If **external**: correct origin opens; if **internal**: app shell loads without **404** for a valid configured route.

### TC-HOME-BAN-003 Home Screen: Multiple banners — each CTA matches its own admin target (event vs custom)

### **Prerequisites**

- At least **two** active banners on **Home**: one **event-linked** (`{bannerEventIdA}`) and one **custom URL** (`{customTargetB}`); admin settings documented for each.

### **Steps**

1. For **banner A**, click through and note final URL.
2. Return to **Home**; for **banner B**, click through and note final URL.

### **Expected Result**

- **Banner A** → `**{baseURL}/event/{bannerEventIdA}`** (or product’s canonical event route for that ID).
- **Banner B** → `**{customTargetB}`** (exact per admin; no cross-wiring between slides).

## 15. Feature: Event page — Highlights (**Jump To Highlight**)

### TC-EVENT-HL-001 Event page: Highlights — open via **Search**, then “Jump To Highlight” and click a moment

### **Prerequisites**

- User is signed in with rights to open the sample event **and** use **Search** (subscription/region rules satisfied for that event).
- Staging reference event with moments (example): `**{baseURL}/event/161a9cc1-f187-40e8-98b1-56eac40444e9`** (title e.g. **ZVK CREVENA ZVEZDA vs. SSV ESSLINGEN** — use an actual substring that returns this event in search).
- Event page shows **Jump To Highlight** / **moments available** (or equivalent) after load.

### **Steps**

1. Open `**{baseURL}/search`** (or global search entry point used on web).
2. Enter a query that finds the event (team name, tournament, or words from the title).
3. From results, open the card/row for `**/event/161a9cc1-f187-40e8-98b1-56eac40444e9`** (or matching event slug).
4. On the event page, scroll until **Jump To Highlight** (or **moments**) is visible; confirm a **non-zero** moments count if the UI shows it (e.g. “**8 moments available**”).
5. Click **one** row in the highlights/moments list (not the main poster only — the list item with label/time).

### **Expected Result**

- Navigation from Search lands on the correct **event URL** (`/event/...` matches the searched event).
- **Jump To Highlight** section is present and lists moment rows.
- After **click**, the player **seeks** to the corresponding segment (playback time / scrubber position updates toward the moment’s timestamp, or the active moment is visually selected) — **no** silent no-op click.

### TC-EVENT-HL-002 Event page: Highlights — **direct URL**, then immediate **click** on a highlight row

### **Prerequisites**

- Same event as TC-EVENT-HL-001; user may open `**{baseURL}/event/161a9cc1-f187-40e8-98b1-56eac40444e9`** directly (signed in per access rules).

### **Steps**

1. Open `**{baseURL}/event/161a9cc1-f187-40e8-98b1-56eac40444e9`** (wait for event shell and **Jump To Highlight** / moments list).
2. Without using Search, click **one** moment row in **Jump To Highlight** (first or any visible row).

### **Expected Result**

- Highlights list is visible on direct load (same as after Search navigation).
- Clicking a row **seeks** the player / activates that moment per product behavior (time alignment or selected state), consistent with TC-EVENT-HL-001.

### TC-EVENT-HL-003 Event page: Highlights — optional search-within-highlight (if UI exposes filter)

### **Prerequisites**

- Same event page as TC-EVENT-HL-001; **if** the player or sidebar exposes a **search/filter** control for moments (not the global `**/search`** page), note it.

### **Steps**

1. Open the event (**Search** path or **direct URL** per TC-EVENT-HL-001 / TC-EVENT-HL-002).
2. If a **moment search** / filter field exists, type a substring that matches **one** visible moment label.
3. Confirm the list narrows or the target row remains selectable; click the row.

### **Expected Result**

- Filtered results (if implemented) match the query; clicking still **seeks** as in TC-EVENT-HL-001.
- If **no** in-page moment search exists, mark this case **N/A** for the build (do not fail — global Search is covered by TC-EVENT-HL-001).

