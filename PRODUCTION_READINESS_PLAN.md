# ManeCourse — Production Readiness Plan (Mobile Only)

**Status:** Planning only — no implementation tasks executed here.

## Locked scope (team decision)

| Item | Choice |
|------|--------|
| **Client** | **Mobile only** (Expo / React Native). No web client for v1. |
| **“Production” for this project** | **Demonstrable with real restaurants** — live Places (or equivalent) data, not mock lists. |
| **Multi-device** | Users on **different phones** must use the **same backend** and be able to **participate in the same groups**. |
| **Fair voting** | **Every member in a group must receive the same restaurant deck** for each swipe round (same places, same order). |

---

## 1. What “production” means here

Not necessarily App Store launch. Minimum bar:

- [ ] A **deployed API** reachable on the internet (HTTPS) so phones on different networks can connect.
- [ ] **Real restaurant discovery** via a server-side integration (e.g. Google Places Nearby Search + Place Details), keyed and cached on the server.
- [ ] **Accounts + groups** persisted in a database so membership is shared across devices.
- [ ] **Server-authoritative swipe deck** so all members see identical options (see §2.4).
- [ ] **Installable builds** for testers (e.g. TestFlight / Android internal track / EAS) — Expo Go is optional for dev only.

---

## 2. Backend & Data

### 2.1 Architecture

- [ ] **Single backend API** used only by the mobile app (extend/replace current Flask or migrate — team choice).
- [ ] **Database:** PostgreSQL (or managed equivalent): users, groups, memberships, voting sessions/rounds, **frozen deck rows**, votes, restaurant cache.
- [ ] **Migrations:** Versioned schema (Alembic, Prisma, etc.).
- [ ] **Environments:** `dev` / `staging` at minimum; separate DB and API URL per env.

### 2.2 Core domain models (illustrative)

- Users (id, auth identity, profile).
- Groups (id, name, host, settings: center location, radius, price range, cuisines).
- Memberships (group_id, user_id) — **invite by username** (no open join), as already in product rules.
- **Voting session** (per “decision”): `group_id`, status (`draft` | `active` | `waiting` | `resolved`), optional `location_snapshot` used for Places.
- **Round** (session_id, round_number): supports ties and re-swipes.
- **Deck** (round_id): ordered list of **restaurant ids** — created once on the server when the round starts.
- **Deck items** (round_id, position, place_id, snapshot fields for display) — **immutable** for that round once published.
- Votes (round_id, user_id, place_id, like/skip, timestamp).
- Cached **places** (place_id, name, geo, price, photo ref, etc.).

### 2.3 Business logic (server-side)

- [ ] **Deck size:** `restaurants_per_member × member_count` (or agreed formula) — **computed once** when the host starts the round; Places queries run **on the server** using group settings + location.
- [ ] **Consensus:** After all members finish the round, compute winner; **tie** → create **next round** with subset deck; **stale tie** → rule + user-visible copy (per existing spec).
- [ ] **Authorization:** Authenticated user on every call; verify **group membership** before returning deck or accepting votes.

### 2.4 Shared deck (non-negotiable for fairness)

The **server** is the only source of truth for “what to swipe.”

- [ ] **Do not** build the deck independently on each device (no random shuffle per client, no client-side Places search for the active round).
- [ ] When the host (or system) **starts a round**, the backend:
  1. Calls Places (or similar) with **one** consistent query (group radius, price, cuisines, lat/lng).
  2. **Deterministically** selects and orders N restaurants (e.g. sort by distance + tie-break on `place_id` so order is stable).
  3. **Persists** the ordered list as the round’s deck.
- [ ] Mobile clients **only** `GET /groups/:id/rounds/:id/deck` (or equivalent) and render **that** list in order.
- [ ] If a member joins **after** the deck is created, policy must be explicit: **either** they cannot join mid-round **or** they receive the **same** deck (recommended: no mid-round joins for v1).
- [ ] **Re-rounds after ties:** New round = **new server-side deck** = subset of tied `place_id`s only; again identical for all members.

---

## 3. Authentication & Accounts

- [ ] Real auth (email/password or OAuth) — no demo “any password” in production builds.
- [ ] **JWT** (or similar) + **Expo SecureStore** for tokens on device.
- [ ] Password reset / verification as needed for demos across days.
- [ ] Rate limiting on auth endpoints.

---

## 4. Mobile App (Expo)

- [ ] Replace mock `ManeCourseContext` with API-driven state (React Query / Zustand + API layer optional).
- [ ] **Base URL** from env (e.g. `EXPO_PUBLIC_API_URL`) pointing to deployed API.
- [ ] Loading / error / empty states; handle 401 / 403 / network errors.
- [ ] **EAS Build** for iOS/Android; **same build** hitting same API URL for all testers.
- [ ] Icons/splash/branding for demo builds.

---

## 5. External APIs (Real restaurants)

- [ ] **Google Places API** (or Yelp/other, one source of truth): Nearby Search + Details — **server-side only**; API keys in env on server, never in the app binary.
- [ ] **Caching:** Store normalized rows in DB to reduce quota and speed up deck display.
- [ ] **Maps in-app:** Map SDK or static map for pin/location; comply with provider terms and attribution.
- [ ] **Cost monitoring:** Alerts on Places/Maps usage.

---

## 6. Real-Time & Sync

- [ ] **Polling** is acceptable for MVP: clients poll “round status” and “waiting for others” if simple.
- [ ] Optional later: WebSockets/SSE for “everyone finished” to reduce latency.
- [ ] Push notifications optional for class scope — not required for “same deck + real restaurants.”

---

## 7. Security & Privacy

- [ ] HTTPS everywhere; secrets only in server environment.
- [ ] Validate all inputs (usernames, radii, group ids).
- [ ] No CORS requirement for pure mobile-only API (or lock CORS if you add a small web admin later).
- [ ] Short privacy note if you collect location or emails for the study.

---

## 8. Observability & Operations

- [ ] Server logging + optional **Sentry** on mobile and API.
- [ ] Health check endpoint; DB backups for demo data if needed.
- [ ] API quota / cost alerts.

---

## 9. Quality Assurance

- [ ] **Backend tests:** Voting/tie/stale-tie logic; **deck generation** determinism (same inputs → same ordered deck).
- [ ] **Manual multi-device:** Two phones, same user accounts, same group, **compare deck order** on both — must match.
- [ ] iOS + Android smoke tests.

---

## 10. Demo & HCI / Class Testing

- [ ] IRB/course approval if required for non-team participants.
- [ ] Distribution: TestFlight / Android internal testing / EAS link — **mobile installs only** (aligned with scope).
- [ ] Consent script if required.
- [ ] Feedback form (optional).

---

## 11. DevOps & Deployment

- [ ] Host API (Fly, Render, Railway, AWS, etc.) with public HTTPS URL documented for the team.
- [ ] CI: lint + tests on PR; optional deploy to staging.
- [ ] Document in README: Node version, `EXPO_PUBLIC_API_URL`, how to run backend + mobile against staging.

---

## 12. Suggested Phasing (aligned to mobile + real restaurants + shared deck)

| Phase | Focus |
|-------|--------|
| **A** | Deployed API + DB + auth; groups + memberships by username; no Places yet — **still** server-built deck from mock IDs to prove **one deck API** works on two devices. |
| **B** | Integrate **Places** on deck creation; cache places; maps/detail use real data. |
| **C** | End-to-end demo: host starts round → **identical deck** on all members’ phones → vote → resolve ties; **multi-device UAT**. |
| **D** | Polish, error tracking, stable build for class demonstration. |

---

## 13. Location strategy (easy to underestimate)

Real restaurant search needs a **lat/lng**. Decide explicitly:

- [ ] **Who provides location?** Options: host sets a **map pin** when creating the group; host uses **current GPS** once; or each session uses **host’s current location** (changes behavior if host moves).
- [ ] **OS permissions:** iOS/Android location prompts, “approximate vs precise” (Android), and **copy for users** (why you need it — e.g. “to find restaurants near your group”).
- [ ] **Snapshot at deck creation:** Store `lat`, `lng`, and maybe `geohash` or radius on the **voting session** so later disputes or debugging don’t depend on “what GPS said later.”
- [ ] **Privacy:** Whether you store raw coordinates long-term or round them; retention policy in line with your study.

Without this, two devices can accidentally query different areas if location drifts or is interpreted differently.

---

## 14. Places API & deck edge cases

- [ ] **Too few results:** If Places returns fewer than N restaurants, define behavior: reduce deck size, widen radius once (logged), or show a **blocking error** to the host (“Try larger radius or different cuisines”).
- [ ] **Duplicates / chains:** Deduplicate by `place_id`; optionally filter out non-food types if the API returns noisy results.
- [ ] **Pagination:** Nearby Search may be paginated — document how you fill the deck (first page only vs fetch until N).
- [ ] **Photos & attributions:** If you show Google Places photos, follow **Google’s attribution rules** (required text/links).
- [ ] **Price mapping:** Map provider price levels to your UI (`$` / `$$`) consistently in the **cached** snapshot so all devices show the same symbols.

---

## 15. Concurrency, idempotency, flaky networks

- [ ] **Vote submission:** `POST` votes should be **idempotent** (same user + round + restaurant + same choice = OK to retry) so double-taps or network retries don’t duplicate or corrupt counts.
- [ ] **Finish round:** Server should **atomically** check “all members voted” before computing winner (transaction or row lock) to avoid two requests computing different outcomes.
- [ ] **Start round:** Only **one** “start” should win if host double-taps (idempotency key or state machine).
- [ ] **Offline:** Define UX: read-only message (“You’re offline — votes will not count until connected”) vs queueing (complex). For demos, **fail clearly** is often enough.

---

## 16. API versioning & mobile compatibility

- [ ] **Version prefix:** e.g. `/v1/...` so you can change payloads without breaking older testers mid-study.
- [ ] **Minimum app version (optional):** If the API changes during the semester, return `426` or a flag so the app can show “Please update from TestFlight.”
- [ ] **Contract tests:** Lightweight checks that mobile and server agree on **deck JSON shape** (place_id, order index, display fields).

---

## 17. Accessibility & inclusive testing (HCI-relevant)

- [ ] **Touch targets** and font scaling (system font size) so evaluations aren’t biased against users with motor or vision needs.
- [ ] **Screen reader labels** on primary actions (like/dislike, start round).
- [ ] **Color-only status** (e.g. tie vs win): add icons/text, not red/green alone.

---

## 18. Evaluation metrics & ethics (for real-user studies)

- [ ] **What to log for analysis:** Task completion time, number of rounds, errors — **minimize PII**; align with consent.
- [ ] **What not to log** without disclosure: full location history, unnecessary contact data.
- [ ] **Export:** If the course needs datasets, define anonymized export format early.

---

## 19. Group & account lifecycle

- [ ] **Host leaves or deletes account:** Transfer host, disband group, or block deletion — pick one policy.
- [ ] **Remove member** vs **leave group** — permissions (host-only vs self).
- [ ] **Username uniqueness** and **invite flow:** What if invitee hasn’t registered yet? (Pending invites table vs simple “username must exist” for v1.)

---

## 20. Compliance & course context (short)

- [ ] **IRB / instructor rules** for non-participants (already in §10) — add **minors** if your population includes them (consent process).
- [ ] **School policies** on storing data on third-party hosts (FERPA usually not triggered for generic app data, but confirm if unsure).

---

## 21. How to improve this plan over time

- **Review weekly:** Move items from “plan” to “done” in your issue tracker; cut scope if the timeline slips.
- **Spike unknowns early:** One day to validate Places quota + deterministic deck from real API before building full UI.
- **Dogfood:** Team uses staging on real phones for a full meal decision before inviting outsiders.
- **Single source of truth:** Keep this doc linked from README; note **decisions** (e.g. location model) inline when you choose them so the group doesn’t re-debate.

---

**Priority:** Implement **§2.4 (shared deck)** and **deployed API** before optimizing real-time or notifications. Without a single server-built deck, multi-device fairness cannot be guaranteed. **§13 (location)** and **§14 (Places edge cases)** are the next most common sources of demo failure.
