# Membership site — product & build outline

Living doc for turning the workbench into a **pay-to-use** membership site.
Add ideas under the right section as they come up. Do not treat unchecked
items as committed scope until we schedule them.

**Product model:** pay to use the site (UI membership). Not an API/data-feed
product unless we decide that later.

---

## 1. Vision

- Users sign up, pick a subscription, and use charts / systems / scans for
  their own trading decisions.
- Core value is the **systems library** (20+ now, more later), plus services
  layered on top (favorites, alerts, stacks).
- This is a decision-support tool, not automated brokerage (unless added later).

### Notes / ideas

- 

---

## 2. Tiers (working model)

Gate mainly by **how many systems** a member can use, then by **services**.

| Tier | Systems (working numbers) | Services (direction) |
|------|---------------------------|----------------------|
| **Basic** | ~5 systems | Chart + opens/closes; scan lists limited or none |
| **Pro** | ~10–15 systems | Favorites + manage favorites; Top / Yesterday / Dow; email alerts (later) |
| **Enterprise** | **All** systems (incl. proprietary + future) | Everything in Pro + text alerts, stack builder, multi-user / priority, whatever comes next |

**Framing:** Enterprise = everything + advanced services — not “leftover”
obscure systems only.

### Open decisions

- [ ] Basic: **fixed starter pack** of 5 vs **pick any 5** from a Basic-eligible list
- [ ] Exact Basic five (once pack vs pick is chosen)
- [ ] Pro: hard cap (~12–15) vs “all published core” with Enterprise-only exclusives
- [ ] Where the **proprietary / own** system sits (Pro vs Enterprise exclusive)
- [ ] Free forever Basic vs **trial → paid** only
- [ ] Pricing (monthly / yearly)

### Notes / ideas

- 

---

## 3. Entitlements (how gating should work)

Keep this maintainable as systems are added — avoid hardcoding “system #7 is Pro.”

- Each system in the catalog (or DB) gets something like:
  - `min_tier`: `basic` | `pro` | `enterprise`
  - and/or **slot unlocks**: Basic gets N slots from Basic-eligible systems
- Backend enforces entitlements on APIs (not UI-only hiding).
- Roles already sketched in schema: `free` / `pro` / `enterprise` / `admin`
  (`sql_queries.sql`) — align naming with Basic/Pro/Enterprise when we wire auth.

### Notes / ideas

- 

---

## 4. Build phases

Rough order. Check off when done. Insert new phases or bullets as needed.

### Phase A — Accounts

- [ ] Sign up / login / logout
- [ ] Password hashing; session or JWT
- [ ] Email verification / reset (as needed)
- [ ] Protect `/api/*` for authenticated users
- [ ] Map user → role / subscription status

### Phase B — Billing

- [ ] Stripe Checkout (or equivalent)
- [ ] Customer portal (manage / cancel)
- [ ] Webhooks update subscription status in DB
- [ ] Trial handling (if we use trials)

### Phase C — System entitlements in the product

- [ ] Catalog / DB fields for `min_tier` (and/or slot picks)
- [ ] Systems tab respects plan (disabled vs hidden — decide UX)
- [ ] API rejects unauthorized system / scan routes
- [ ] Assign initial Basic pack or pick flow

### Phase D — Member workspace

- [ ] Real favorites (replace `UserDashboardTab` mocks)
- [ ] Manage favorites page
- [ ] Preferences tied to `user_preferences`

### Phase E — Alerts

- [ ] Email alerts (signals / watchlist)
- [ ] Text alerts
- [ ] Alert preferences per symbol / system
- [ ] Delivery logs / rate limits / quiet hours

### Phase F — Stacks (systems working together)

Idea: combine systems (e.g. trend-following filter + mean-reversion entry)
so members trade a **stack**, not only one indicator in isolation.

- [ ] Document suggested stacks (manual / educational)
- [ ] UI: stack builder (trend sleeve + mean-reversion sleeve, etc.)
- [ ] Rules engine: how sleeves AND/OR together
- [ ] Tier gate (likely Pro+ or Enterprise)

### Phase G — Ops & trust

- [ ] HTTPS hosting
- [ ] Rate limits / abuse controls
- [ ] Legal disclaimer (not investment advice)
- [ ] Data vendor ToS for displaying prices/signals
- [ ] Admin tools (users, plans, system tier assignment)
- [ ] Usage metering (optional: symbol loads per day on Basic)

### Notes / ideas

- 

---

## 5. Feature backlog (unsorted)

Park ideas here; promote into a phase when ready.

- [ ] More TA systems (see `remaining-systems-build-order.md`)
- [ ] Proprietary / in-house system packaging
- [ ] Yearly billing discount
- [ ] Team / multi-seat Enterprise
- [ ] Export trades / CSV
- [ ] Mobile-friendly alerts management
- [ ] 

---

## 6. Current codebase touchpoints

What already exists vs still mock/missing (update as we build).

| Area | Status (as of this doc) |
|------|-------------------------|
| Systems charts / scans | Built for several systems; more planned |
| `users` / `roles` / `user_preferences` schema | Present in `sql_queries.sql` |
| Auth (login API, sessions) | Not built |
| Stripe / billing | Not built |
| User dashboard favorites | Mock data in `UserDashboardTab.jsx` |
| Entitlement checks on APIs | Not built |

### Notes / ideas

- 

---

## 7. Decisions log

Record choices so we don’t re-litigate them.

| Date | Decision |
|------|----------|
| 2026-09-09 | Pay-to-use **site** (UI membership), not API-first |
| 2026-09-09 | Working tiers: Basic (~5) / Pro (~10–15) / Enterprise (all + services) |
| 2026-09-09 | Future services: email & text alerts, favorites, manage favorites, system stacks |

---

## 8. Scratchpad

Freeform. Move bullets into sections above when they solidify.

- 
