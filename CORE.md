# Dungeon Gatekeeper — Core Documentation

This document explains **what was built**, **why each piece exists**, and **how the routes connect to one another**. The goal is for you to read this and understand the entire flow without needing to open the code.

---

## 1. Overview

The project is a mock API of a "guild/dungeon" that serves as a playground to practice:

* Authentication with **JWT** (access token + refresh token)
* **RBAC** (Role-Based Access Control) — authorization by role/rank
* **Claim-based** authorization (data inside the token itself)
* **Step-up auth** (enhanced authentication for sensitive operations)
* **Token revocation** (banishing refresh tokens)
* **Rate limiting** (limiting login attempts)

Each concept features a themed "shell" (dungeon, guild, ancient key) just to make studying more fun — but underneath, it is exactly what any serious production API needs to solve.

---

## 2. Folder Structure

```
src/
├── auth/                     # Everything related to authentication/authorization
│   ├── auth.controller.ts    # /auth/* routes
│   ├── auth.service.ts       # Business logic: registering, logging in, issuing tokens
│   ├── strategies/
│   │   └── jwt.strategy.ts   # How Passport validates an incoming JWT
│   ├── guards/                # "Gatekeepers" that decide if the request passes
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   ├── level.guard.ts
│   │   ├── ancient-key.guard.ts
│   │   └── gate-throttler.guard.ts
│   ├── decorators/            # Metadata used by the guards above
│   │   ├── roles.decorator.ts
│   │   ├── required-level.decorator.ts
│   │   └── require-ancient-key.decorator.ts
│   └── dto/                   # Expected request body formats
│       ├── register.dto.ts
│       └── login.dto.ts
│
└── features/                 # Business domains (moved here)
    ├── users/                 # Guild "Roster" (in-memory users)
    ├── dungeon/                # Dungeon-themed routes
    └── guild/                  # Guild-themed routes (RBAC)

```

The separation exists by responsibility: `auth/` knows **how to verify identity and permission**; `features/` knows **what each business domain does** once permission has already been granted. The guards from `auth/` are reused by the controllers in `features/` — this reuse is what "connects" the two folders.

---

## 3. The Lifecycle of a Token

Every flow begins in one of these two places:

| Route | What it does |
| --- | --- |
| `POST /auth/join-guild` | Creates a new user (registration) |
| `POST /auth/enter-gate` | Logs in an existing user |

Both return the exact same format:

```json
{
  "accessToken": "...",
  "refreshToken": "..."
}

```

### What goes inside the `accessToken`

```json
{
  "sub": "user-id",
  "username": "conan",
  "role": "adventurer",
  "characterLevel": 1,
  "hasAncientKey": false,
  "iat": ...,
  "exp": ...
}

```

These fields (`role`, `characterLevel`, `hasAncientKey`) are **claims** — information about the user that travels *inside* the token. Each guard in the system reads a different claim to decide whether to grant access. This is why, whenever something changes on the character (leveled up, became an officer, proved the key), **a new token must be issued** — the old token does not know about the change because it is merely a "snapshot" of the state at the exact moment it was signed.

### What goes inside the `refreshToken`

```json
{
  "sub": "user-id",
  "jti": "unique-uuid-for-this-token",
  "iat": ...,
  "exp": ...
}

```

The `refreshToken` is much simpler — it only exists to allow requesting a new `accessToken` without having to type the password again. It lasts longer (7 days) because the risk of leakage is mitigated by the `jti`: if it gets compromised, you can revoke it specifically (see section 7).

---

## 4. Route Map and How They Connect

```
                     ┌─────────────────────┐
                     │   POST /auth/join-guild   │  (registration)
                     │   POST /auth/enter-gate   │  (login, rate limited)
                     └───────────┬──────────┘
                                 │ issues accessToken + refreshToken
                                 ▼
                    ┌─────────────────────────┐
                    │   accessToken in header   │
                    │   Authorization: Bearer ...│
                    └────────────┬─────────────┘
                                 │
        ┌────────────────────────┼─────────────────────────┐
        ▼                        ▼                         ▼
 GET /tavern              GET /training-grounds     GET /dungeon/:level
 (public, no guard)       (JwtAuthGuard only)        (JwtAuthGuard + LevelGuard)
                                                     requires characterLevel >= requested level
                                 │
                                 ▼
                    POST /auth/level-up
                    (JwtAuthGuard) → reissues token with characterLevel + 1
                                 │
                                 ▼
                    GET /forbidden-archive
                    (JwtAuthGuard + AncientKeyGuard)
                    blocks until hasAncientKey is true
                                 │
                                 ▼
                    POST /auth/prove-key
                    (JwtAuthGuard) → reissues token with hasAncientKey: true
                                 │
                                 ▼
                    GET /forbidden-archive again → now grants access

        ┌─────────────────────────────────────────────┐
        ▼                                             ▼
 GET /guild-hall                               GET /guild-hall/logs
 (JwtAuthGuard + RolesGuard)                    (JwtAuthGuard + RolesGuard)
 requires role officer or guildmaster          requires role guildmaster

                                 ▼
                    POST /guild-hall/promote
                    (JwtAuthGuard + RolesGuard, guildmaster only)
                    changes the role of another user

```

### How to read this map

1. **Everything originates from login/registration.** Without this, you can only access `/tavern`.
2. **The `accessToken` is the master key**, but each route has an additional guard that requires a specific claim inside it.
3. **Some actions "level up" the token** (`level-up`, `prove-key`, `promote`) — meaning that after calling them, you must swap the `accessToken` you are using for the new one, since the old one still contains the outdated claim.
4. **The `refreshToken` runs parallel to all of this.** It does not participate in the authorization of business routes — its sole purpose is to request a new `accessToken` at `POST /auth/refresh`, without requiring another login.

---

## 5. Breakdown of Each Guard (the "gatekeeper" for each rule)

| Guard | Question it answers | Where it is used |
| --- | --- | --- |
| `JwtAuthGuard` | "Is this token valid and not expired?" | On every authenticated route — the foundation of everything |
| `RolesGuard` | "Is the user's `role` on the allowed list?" | `/guild-hall`, `/guild-hall/logs`, `/guild-hall/promote` |
| `LevelGuard` | "Is the user's `characterLevel` high enough?" | `/dungeon/:level` |
| `AncientKeyGuard` | "Is the `hasAncientKey` claim `true`?" | `/forbidden-archive` |
| `GateThrottlerGuard` | "Has this IP attempted to log in too many times in the last minute?" | `POST /auth/enter-gate` |

Guards are stackable: `@UseGuards(JwtAuthGuard, RolesGuard)` first confirms that the token is valid, **then** verifies the role. If the token is invalid, the `RolesGuard` never even executes.

---

## 6. Claim-Based vs. Role-Based Authorization (RBAC)

It is worth highlighting the difference between two similar routes:

* **`/guild-hall` (RBAC)** — the question is "who you are" (your fixed rank: adventurer / officer / guildmaster).
* **`/dungeon/:level` (dynamic claims)** — the question is "is your progress sufficient for this specific resource" (character level compared to the requested dungeon level).

RBAC works well when permission is about **identity/rank**. Dynamic claims work better when permission depends on **a number or state that changes over time**, or is relative to the resource being accessed (e.g., `dungeon/5` requires more than `dungeon/2`).

---

## 7. Refresh Token Revocation (the "banishment")

```
POST /auth/banish { refreshTokenJti }
        │
        ▼
Adds this jti to a "banished" Set (in-memory)
        │
        ▼
POST /auth/refresh { refreshToken }
        │
        ▼
Decodes the token → grabs the jti → is it in the banished Set?
        │
   yes ─┴─ no
    │        │
    ▼        ▼
   403      issues a new pair of tokens

```

This addresses a classic JWT issue: it is **stateless** (the server stores nothing about it), so you cannot simply "delete" a token from the database. The solution is to store only the unique identifier (`jti`) of the revoked tokens and check this short list upon every refresh attempt — without needing to store (or verify against) the entire token.

> In this study project, the "banishment" list is stored in memory (`Set`), so it resets to zero every time the server restarts. In production, this would typically go into Redis with a TTL equal to the token's expiration time.

---

## 8. Step-Up Auth (Enhanced Authentication)

`POST /auth/prove-key` simulates a second verification layer (it could be TOTP, WebAuthn, SMS) that **does not replace the login**, but **complements** it to unlock a sensitive action.

Analogy: a standard `accessToken` is your building badge — it opens most rooms. Some rooms (the vault) require your badge **+** an extra passcode. This is exactly what `hasAncientKey` represents: a claim that only becomes `true` after an extra proof, and expires right along with the token (meaning this "privilege escalation" is also temporary).

This follows the exact same pattern used by banking apps that ask for your password again before completing a wire transfer, even if you are already logged in.

---

## 9. Rate Limiting on Login

```
5 attempts for POST /auth/enter-gate per IP, per 60 seconds
        │
        ▼
6th attempt within the window → 429 Too Many Requests

```

This does not prevent a legitimate user from mistyping their password a few times, but it makes a brute-force attack attempting thousands of passwords per minute against the same account completely unfeasible. Only `enter-gate` enforces this limit — registration and other routes are unaffected, as the risk of brute-forcing is specific to logging in.

---

## 10. Route Summary

| Method | Route | Guards | Required Authorization |
| --- | --- | --- | --- |
| GET | `/tavern` | — | None (public) |
| POST | `/auth/join-guild` | — | None (creates user) |
| POST | `/auth/enter-gate` | `GateThrottlerGuard` | None, but limited to 5/min per IP |
| POST | `/auth/refresh` | — | Valid and unbanished refreshToken |
| POST | `/auth/level-up` | `JwtAuthGuard` | Valid accessToken |
| POST | `/auth/prove-key` | `JwtAuthGuard` | Valid accessToken |
| POST | `/auth/banish` | `JwtAuthGuard` | Valid accessToken |
| GET | `/training-grounds` | `JwtAuthGuard` | Valid accessToken |
| GET | `/dungeon/:level` | `JwtAuthGuard`, `LevelGuard` | `characterLevel >= level` |
| GET | `/forbidden-archive` | `JwtAuthGuard`, `AncientKeyGuard` | `hasAncientKey === true` |
| GET | `/guild-hall` | `JwtAuthGuard`, `RolesGuard` | `role` in `[officer, guildmaster]` |
| GET | `/guild-hall/logs` | `JwtAuthGuard`, `RolesGuard` | `role === guildmaster` |
| POST | `/guild-hall/promote` | `JwtAuthGuard`, `RolesGuard` | `role === guildmaster` |

---

## 11. Core Takeaways for Any Real-World Project

1. **Authentication** answers "who are you" → handled by `JwtAuthGuard`.
2. **Authorization** answers "what can you do" → handled by the remaining guards, each verifying a different type of rule (fixed role, dynamic state, extra proof).
3. **Every claim inside the token is a snapshot of the past.** If the user's state changes, the token will only reflect that change after it is reissued.
4. **Revoking a JWT does not truly exist** — what exists is an exception list (banished `jti`s) that you consult before trusting the token.
5. **Not every sensitive action should accept the same trust level** as a trivial action — hence step-up auth.