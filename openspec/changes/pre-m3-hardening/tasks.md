# Tasks: pre-m3-hardening

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 80-140 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR delta on PR #2: edit existing hardening migration + existing hardening pgTAP file |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Base and scope constraints

- Base branch for apply: `fix/m2-organization-hardening` at/after PR #2 commit `aad3029`; do not apply on `main` or `feat/m3-document-ingest`.
- Edit only the PR #2 files for implementation:
  - `supabase/migrations/202608280002_m2_organization_hardening.sql`
  - `supabase/tests/database/m2_organization_hardening.test.sql`
- `supabase/tests/database/m2_rls.test.sql` is immutable; its 35 assertions remain the regression line.
- Keep the 9 assertions already introduced by PR #2 semantically intact. If any breaks, fix the implementation or new fixtures; do not weaken those assertions.
- Do not create a second corrective migration: `202608280002` has not run against `recia-dev`, so the PR migration is edited before merge.
- Preserve PR #2 behavior that is already correct: advisory lock by `new.user_id`, early return when `old.role = 'owner' and old.status = 'active'`, `member.organization_id <> new.organization_id` in the ownership count, and deferred `set constraints ... immediate` placement at the final test phase.
- Do not touch `src/`, do not create M3 resources, do not change the limit of 10, and do not change roles or the permission matrix.

## Test runner contract

Every apply/verify task uses pgTAP as the TDD evidence runner:

```bash
npm run db:reset && npm run db:test
```

`npm run verify` is a final no-regression check only. It is not RED/GREEN evidence for PostgreSQL trigger behavior.

## Scenario-to-assertion coverage map

| Spec scenario / delta | Assertion source | Expected pre-fix behavior on PR #2 migration |
|---|---|---|
| Transfer to a user at the limit is rejected | Existing PR #2 assertion in `m2_organization_hardening.test.sql` | Already covered; preserve |
| Transfer rejection is atomic | Existing PR #2 assertions in `m2_organization_hardening.test.sql` | Already covered; preserve |
| Transfer below the limit succeeds | Existing PR #2 assertion plus new exact 9-to-10 count assertion | Existing broad case passes; exact-limit assertion missing |
| Creation at the exact limit remains allowed | New assertion: user owning 9 organizations creates the 10th through `create_organization` and ends at 10 | Missing; must pass after test is added because it guards `>= 10` vs `> 10` |
| Creation above the limit is rejected | Existing PR #2 assertion and existing `m2_rls.test.sql` assertion `an eleventh active organization is blocked` | Already covered; preserve |
| Non-owner memberships do not consume the limit | New assertions for `admin`, `operator`, and `viewer` memberships for a user already owning 10 | Missing; should pass if trigger is correctly conditioned |
| Privileged insert without owner is rejected | Existing PR #2 assertion | Already covered; preserve |
| Privileged insert with exactly one owner is accepted | New assertion: direct privileged org insert plus one `owner` / `active` membership lives | Missing |
| `create_organization` leaves exactly one owner | New assertion checks owner count after RPC creation | Missing |
| Removing the only owner is rejected | New assertion: privileged delete or status change of the only owner followed by final deferred constraint evaluation throws `23514` and leaves owner intact | Missing; must fail before Delta 1/2 implementation if it exercises an `organizations` update revalidation path |
| Organization row revalidation rejects two owners | New assertion for Delta 1: temporarily create an invalid organization state with two active owners and force `organizations_require_owner` via an `organizations` update | Missing; must fail before changing `not exists` to `count <> 1` |
| Updating an otherwise valid organization revalidates successfully | New assertion for Delta 2: update a healthy organization row and force constraints immediate | Missing; must pass after trigger covers `UPDATE` |
| Existing M2 regression suite remains green | Existing `m2_rls.test.sql` plan(35) | Covered; do not edit |

## Implementation tasks

### Preflight on the correct PR branch

- [ ] Verify the working branch is `fix/m2-organization-hardening` and the implementation files exist at PR #2 state: `supabase/migrations/202608280002_m2_organization_hardening.sql` and `supabase/tests/database/m2_organization_hardening.test.sql`. Stop if the branch is `main`, `feat/m3-document-ingest`, or if `202608280002` has already been applied to a remote environment. <!-- sdd-owner: implementation -->
- [ ] Inspect the current PR #2 migration/test files and confirm the existing good pieces remain present: advisory lock, owner-active early return, `member.organization_id <> new.organization_id`, and final `set constraints organizations_require_owner immediate` test placement. <!-- sdd-owner: implementation -->

### RED: add only missing delta assertions first

- [ ] Extend `supabase/tests/database/m2_organization_hardening.test.sql` without editing the 9 existing assertions: update `plan(9)` to the final count and add assertions for exact-limit RPC creation from 9 to 10 and transfer from 9 to 10. Run `npm run db:reset && npm run db:test` and record RED/pass detail for these new assertions. <!-- sdd-owner: implementation -->
- [ ] Add assertions proving non-owner memberships (`admin`, `operator`, `viewer`) do not consume the limit for a user already owning 10 organizations. Run `npm run db:reset && npm run db:test` and record RED/pass detail; failures indicate an over-broad owner-limit trigger. <!-- sdd-owner: implementation -->
- [ ] Add assertions for privileged insert with exactly one owner and for `create_organization` leaving exactly one active owner. Run `npm run db:reset && npm run db:test` and record RED/pass detail. <!-- sdd-owner: implementation -->
- [ ] Add Delta 1/2 assertions that must fail against the current PR #2 migration before code changes: an invalid state with two active owners is rejected by `enforce_organization_has_owner`, and removing the only owner through a path that revalidates the organization row throws `23514` atomically. If either assertion passes before implementation for the wrong reason, rewrite the assertion until it proves the stated invariant. Run `npm run db:reset && npm run db:test` and record RED. <!-- sdd-owner: implementation -->

### GREEN: edit the existing PR #2 migration

- [ ] In `supabase/migrations/202608280002_m2_organization_hardening.sql`, change `app_private.enforce_organization_has_owner()` from `not exists` to a count of active owner memberships and reject `active_owners <> 1` with `23514: An organization must have exactly one active owner`; keep the early return for organizations that no longer exist. Run `npm run db:reset && npm run db:test` and record GREEN or remaining failures. <!-- sdd-owner: implementation -->
- [ ] Change the `organizations_require_owner` constraint trigger from `after insert` to `after insert or update`, preserving `deferrable initially deferred`. Run `npm run db:reset && npm run db:test` and record GREEN or remaining failures. <!-- sdd-owner: implementation -->
- [ ] Add a final migration `DO` block that raises instead of mutating data when any existing organization has an active-owner count different from 1, including offending organization IDs in the error detail/message where practical. Run `npm run db:reset && npm run db:test` and record GREEN. <!-- sdd-owner: implementation -->

### TRIANGULATE: prove no over-blocking or regression

- [ ] Confirm pgTAP covers the non-owner membership scenario, valid exact-limit creation, valid exact-limit transfer, privileged insert with one owner, and valid organization update. Run `npm run db:reset && npm run db:test` and record TRIANGULATE evidence. <!-- sdd-owner: implementation -->
- [ ] Confirm the original PR #2 9 assertions and `supabase/tests/database/m2_rls.test.sql` 35 assertions remain green and unweakened. Run `npm run db:reset && npm run db:test` and record assertion totals. <!-- sdd-owner: implementation -->

### REFACTOR and final no-regression checks

- [ ] Refactor only for readability and fixture clarity inside the two allowed files, preserving behavior and all already-good PR #2 mechanics. Re-run `npm run db:reset && npm run db:test` and record REFACTOR evidence. <!-- sdd-owner: implementation -->
- [ ] Run `npm run verify` once pgTAP is green and record it only as application no-regression evidence. <!-- sdd-owner: implementation -->
- [ ] Leave the remote read-only check documented as pending for Facu if credentials are unavailable; if available, query the linked remote without applying migrations or creating resources and record the destination environment plus any existing owner-count violations. <!-- sdd-owner: implementation -->
- [ ] Update `openspec/changes/pre-m3-hardening/apply-progress.md` with branch, commit/base evidence, RED/GREEN/TRIANGULATE/REFACTOR command outputs, allowed-file diff summary, and explicit confirmation that `m2_rls.test.sql`, `src/`, roles, limit value, and M3 resources were untouched. <!-- sdd-owner: implementation -->

## Parent/review boundary

- [ ] After `/sdd-verify`, stop before `/sdd-sync` or `/sdd-archive`; the PR #2 delta must go through review before merge. <!-- sdd-owner: parent -->
