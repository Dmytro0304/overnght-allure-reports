# Manual test cases — Account Settings (timezone), Legalese, FAQ, Contact

Use `{baseURL}` as the environment root (e.g. `https://stg.overnght.com`).  
UI labels match the web app (`web/`).

### Catalog numbering reference (existing examples)

The project tracker uses IDs such as:

| Test Case ID | Feature area (catalog) |
|--------------|-------------------------|
| TC-VOD-005 | Search screen — Sort by Newest/Oldest |
| TC-VOD-006 | Search screen — Sort by A-Z/Z-A |
| TC-VOD-007 | Search screen — Sort by Grouped by sport |
| TC-VOD-008 | Search screen — Filters by Date Range |
| TC-ACCOUNT-001 | User Account — Personal Information |
| TC-ACCOUNT-002 | User Account — Change password |
| TC-ACCOUNT-003 | User Account — Forgot password |
| TC-SUBSCRIPTION-001 | Subscriptions — Purchase without coupon |
| TC-SUBSCRIPTION-002 | Subscriptions — Purchase with coupon |

The scenarios **below** use **new** ids so they do not reuse or replace the rows above. Add these ids to the same tracker sheet when you adopt the cases.

| New Test Case ID | Title (this document) |
|------------------|-------------------------|
| TC-ACCOUNT-004 | Account settings — Timezone affects Home & Search event times |
| TC-LEGAL-001 | Legalese — Terms of Use opens |
| TC-LEGAL-002 | Legalese — Privacy Policy opens |
| TC-FAQ-001 | FAQ — `/faq` accordion (all items) |
| TC-CONTACT-001 | Contact — submit without observation |
| TC-CONTACT-002 | Contact — submit with observation |
| TC-CONTACT-003 | Contact — category/issue combinations & validation |

---

### TC-ACCOUNT-004 — Account settings: Timezone affects event date/time on Home and Search

### **Prerequisites**

- User is signed in with permission to open **My Account**.
- User can open **Home** (`{baseURL}/`) and **Search** (`{baseURL}/search`).
- At least one event with a known start time is visible on Home and/or Search (live or scheduled) so date/time strings can be compared.
- **Desktop (lg+):** **Settings** appears in the right column on the account page.  
- **Mobile:** User is on **My Account** (`{baseURL}/account`) and can switch the tab to **Settings**.

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

---

### TC-LEGAL-001 — Legalese: Terms of Use page opens

### **Prerequisites**

- App footer is available (or user has direct URL).

### **Steps**

1. From any page with footer (e.g. Home), locate the **Terms of Use** link.
2. Click **Terms of Use**.

### **Expected Result**

- Browser navigates to **`{baseURL}/legalese/termsOfService`**.
- Page loads with Terms of Use content visible (no blank/error state).

---

### TC-LEGAL-002 — Legalese: Privacy Policy opens

### **Prerequisites**

- Same as Terms (footer or direct URL).

### **Steps**

1. From the footer, click **Privacy Policy**  
   **or** open `{baseURL}/legalese/termsOfService#privacy-policy` directly.

### **Expected Result**

- User lands on the legalese route with the **Privacy Policy** section in view or reachable on the same page (hash `#privacy-policy` as implemented).
- Privacy Policy content is displayed.

---

### TC-FAQ-001 — FAQ: Page `/faq` and all accordion items

### **Prerequisites**

- Backend returns FAQ list for **`GET {API}/faqs`** (otherwise the page may show the “Can’t find what you’re looking for?” support block only — note for environment setup).

### **Steps**

1. Open **`{baseURL}/faq`**.
2. Confirm the page title shows **Frequently Asked Questions** (desktop) or **FAQ** (mobile header area).
3. For **each** FAQ row in the accordion list:
   - Click the question row (**AccordionTrigger**) to expand.
   - Verify the answer HTML content appears below.
   - Click again to collapse (optional, if `collapsible` behavior is in scope).
4. Repeat until **every** FAQ item has been expanded at least once.

### **Expected Result**

- All accordion sections open without error; answers match expectations and formatting is readable (**FAQ** content from CMS/API).
- No broken layout or console errors attributable to accordion behavior.

---

### Contact support: `/contact` — submit with and without observation

Sub-scenarios are tracked as **TC-CONTACT-001** (without observation), **TC-CONTACT-002** (with observation), **TC-CONTACT-003** (combinations / negative paths).

### **Prerequisites**

- User may be signed in (email may be pre-filled and locked) or signed out (must enter email).
- Support email/API is available so **Submit Request** can succeed (or staging captures request — adjust **Expected Result** if backend mocked).

### **TC-CONTACT-001 — Steps — A. Without observation**

1. Open **`{baseURL}/contact`**.
2. Confirm heading **Contact Support** and card **Support Request**.
3. Enter **Email** if required (when not pre-filled from session).
4. **Category:** choose **Subscription** (example).
5. **Issue:** choose **How do I resubscribe?** (example).
6. Leave **Add observation (optional)** **unchecked** (no **Observation** textarea visible).
7. Click **Submit Request** (shows **Sending Request** while pending).

### **TC-CONTACT-001 — Expected Result — A**

- Request completes successfully (success toast/feedback per product; no validation error).
- Payload omits required observation; form can submit with category + issue + email only.

### **TC-CONTACT-002 — Steps — B. With observation**

1. Open **`{baseURL}/contact`** (or reset form after A).
2. Fill **Email**, **Category**, and **Issue** (may use **Other** → **Other issue** to vary from A).
3. Check **Add observation (optional)**.
4. Verify **Observation** textarea appears (placeholder *Provide details about your issue...*, counter *x/500*).
5. Enter text in **Observation** (1–500 characters).
6. Click **Submit Request**.

### **TC-CONTACT-002 — Expected Result — B**

- Submit succeeds; observation is included in the support request.
- If **Add observation** is checked and **Observation** is empty, **Submit Request** stays **disabled** (and validation shows that observation is required when enabled).

### **TC-CONTACT-003 — Steps — C. Additional combinations (regression)**

1. Repeat **A** or **B** with other **Category** / **Issue** pairs (e.g. **Log in** → *I am not able to log in.*; **Content** → refund/incompatible/connection; **Other** → *Other issue*).
2. With observation **on**, try **Submit** with **Observation** empty — expect disabled submit or validation error.

### **TC-CONTACT-003 — Expected Result — C**

- All valid combinations submit when required fields are satisfied; observation only mandatory when checkbox is checked.
