# Coco integration and workshop alignment

Integration run: **1 October 2026**. Working branch: **`feat/coco-workshop-integration`**, in the independent Git repository at `demo/frontend`. The supplied UI starter contained existing uncommitted changes; those were preserved while completing its integration. The workspace root's Git metadata is unavailable in this environment, so this is a frontend branch, not a branch in the root checkout. The completed starter and integration are saved in a local commit on that branch; no remote push or pull request was requested.

## Result

The app connects directly to `https://btcplusplus-402-backend.fly.dev/image` and the approved `https://testnut.cashu.space` mint. The public API advertises 1 net sat. The observed purchase debited 3 sats: 2 sats of outgoing proof value, covering the 1-sat net price and 1-sat receiver input fee, plus a 1-sat sender swap fee. This is an observed example, not a fixed fee schedule.

The public Chromium check completed funding → price/fee approval → Cashu token submission → protected image → reload → fake Lightning withdrawal. The actual returned image loaded with a nonzero natural width; no bundled sample image substitutes for the paid resource. Image persistence was subsequently removed at the user’s request: reload restores the wallet balance and locks the image again. Another unlock requires an explicitly approved new payment. Legacy cached images are removed during context loading.

Testnut ecash and Lightning settlement are simulated. No real Bitcoin was spent, and an external Lightning receipt remains a separate presenter rehearsal.

## Steps performed in slide order

| Workshop step | Implemented work | Source |
|---|---|---|
| Initialize | Pinned Coco core/React/IndexedDB 2.0.0 and matching cashu-ts; TypeScript 5.9.3; persistent BIP39 identity; provider-owned manager; explicit mint trust; balance readiness; Web Lock ownership; preloaded operation bindings | `src/main.tsx`, `src/workshop/wallet-provider.tsx`, `wallet.ts`, `config.ts` |
| Fund | Create BOLT11 quote, prepare/bind mint operation, retain its ID, display invoice/QR/expiry, observe issuance and balance, reopen the same unfinished invoice | `src/workshop/integration.ts`, `components/workshop/funding-dialog.tsx` |
| Inspect | Real resource GET, require HTTP 402, parse both creqA/creqB through `paymentRequests.parse`, enforce explicit sat/approved mint/positive capped amount/no locking condition/in-band transport | `src/workshop/resource.ts`, `integration.ts` |
| Pay and retrieve | Calculate receiver fees from actual planned outputs or exact-match inputs; cancel discarded preparations; review complete fee-inclusive total; persist purchase before execution/submission; execute once; encode cashuB with DLEQ; retry the same resource; validate image response; display returned Blob in memory only | `src/workshop/resource.ts`, `storage.ts`, `integration.ts` |
| Withdraw | Create melt quote, prepare/bind operation, review reserve plus swap fees, cancel or execute, show persisted terminal/pending/unresolved state, reconcile original operation, retain across reload | `src/workshop/integration.ts`, `components/workshop/withdrawal-dialog.tsx` |

Handlers use the existing typed views/actions. Extra recovery actions were added to those contracts. Hook action success is never interpreted as payment settlement, and a send's finalization is never interpreted as image delivery. A shared action guard prevents duplicate execution; storage failures and orphan operations block new spends.

## Verification

TypeScript (including browser tests and configuration), ESLint, and the production build pass. Vite reports a roughly 1.15 MB JS chunk (322 kB gzip), mainly the wallet/cryptography stack; code splitting was left outside this integration.

The retained browser suites use the published packages and real public Testnut mint:

- **`npm run test:public`**: direct browser CORS access to the organizer endpoint; actual 402 price; fake funding; protected image payment/delivery; image decode; reload identity/balance; fresh fake withdrawal. Passed before image persistence was removed. Its reload assertion now expects the image to be locked again; that updated public check has not been rerun.
- **`npm run test:e2e`**: a separate test-only Coco merchant API; creqA and creqB; net receiver credit; approval/cancellation; double clicks; prepared-purchase reload; settled-withdrawal reload; wrong mint/unit/conditions/amount; malformed/missing challenges; unexpected free response; insufficient funds; fee-limit rollback; lost paid response and recovery; invalid paid content; second-tab ownership. **14 passed** in the original full run (1.9 minutes). After removing image persistence, the creqA/creqB purchase flows and lost-response recovery passed again; a separate migration check verifies legacy cached images are removed without clearing the wallet.

The test API's idempotent response cache is a controlled fixture, not a claim about the public backend. Paid-response loss is simulated by a gateway 504 after token redemption; a raw dropped GET connection can be transparently retried by Chromium. Both cases require backend duplicate-token behavior to be understood.

## Alignment with the workshop flow

**The five-step order and conceptual boundaries are aligned.** The deck correctly separates Coco's wallet operations from application-owned policy, fee calculation, purchase persistence, HTTP delivery, and recovery. Funding uses quote → tracked operation → issued proofs; withdrawal uses quote → review → execute → observed settlement. The fee-aware preparation and image delivery helpers shown in the slides now have concrete implementations.

The following preparation details should be added to the presenter brief or notes before the live run:

1. **Pin the toolchain before handing off to the agent.** The supplied starter had TypeScript 6; Coco 2.0.0 declares `typescript:^5`. The checked integration uses 5.9.3. Keep matching core/React/adapter/cashu-ts versions and both lockfiles together.
2. **Rehearse Strict Mode reloads, not just first startup.** The deck shows resuming hooks from IDs (e.g. slide code at `slides.md:442`). In the published 2.0.0 hooks, Strict Mode can start duplicate hydration actions, clear the binding after an "already in progress" error, and leave `execute()` without an operation. The app loads the operation objects before mounting hooks and passes object bindings, which avoids that path. Provider initialization/disposal remains owned by `CocoCashuProvider`.
3. **A funding invoice cannot be cancelled by this API.** The starter's Cancel funding control became Close invoice. Closing retains unfinished funding, and reopening shows its original invoice. Purchase/melt cancellation remains valid only while prepared.
4. **Use the challenge's price.** The starter's 10-sat label was illustrative; the public API advertises 1 sat. Price and total are supplied by the integration. Examples about a 10-sat token yielding 9 sats are historical fee illustrations.
5. **Provide browser access ahead of time.** Initially this API had no CORS headers and rejected OPTIONS. The user deployed GET/OPTIONS allowance, `X-Cashu` acceptance and exposure while integration was underway. The final default calls the backend directly. An optional fixed-target Vite proxy remains available for rehearsal fallback.
6. **Do not promise safe replay on this service.** Repeating the exact spent token for the same resource returned HTTP 400. There is no verified status/receipt/replay route. The client retains an unresolved purchase after response loss and never prepares another payment. Safe recovery is demonstrated only against the test API's explicit replay contract. A reliable public response-loss recovery flow requires a backend receipt/status or idempotent replay contract.
7. **Use a fresh synthetic invoice for Testnut withdrawal.** In this run, invoices created through Testnut's own funding-quote API could be rejected as already paid. `bun run invoice:test` generates a fresh signed invoice for FakeWallet, with no actual Lightning recipient. The fake melt then completes. Real-value presentation still needs a separate wallet and external receipt.
8. **Prepare storage/recovery UI as part of the starter.** The app implements a separate durable context, guards pending operations and unexpected orphan reservations, tracks completed delivery without retaining the image, and gives unresolved operations a recovery control. These helpers are substantial application work even though the focused Coco calls are short.

The agent run involved dependency alignment, browser bugs, service contract inspection, and repeated payment tests; it should not be treated as proof that the live task will reliably finish within the talk's 32-minute agent window. Keep the checked reference build and a labelled recording available, as the workshop already recommends. The slides themselves were not rewritten in this task; their original planning-status comments and ID-based resume excerpt should be updated before presenting this completed build.

## Run and testing notes

From `demo/frontend`, run `npm ci && npm run dev` or the documented Bun commands. Default configuration needs no `.env.local`. Test automation uses an isolated browser wallet and fake value. `npx playwright install chromium` installs the browser; `PLAYWRIGHT_CHROMIUM_PATH` can select an existing binary.

The seed is plaintext in localStorage; Coco proofs/operations and purchase metadata are in IndexedDB. These are disposable demo storage choices. Backups, encryption, production wallet security, arbitrary-mint support, mobile browser coverage and real Lightning receipt are not verified by these tests. A fresh profile is the safe way to create a separate rehearsal identity.

The test-only `bolt11` encoder has three low-severity npm advisories through `secp256k1`/`elliptic`; it signs fresh random disposable test keys, is not imported by the app, and is excluded from the production bundle. `npm audit --omit=dev` reports **0 vulnerabilities**. Do not apply npm's suggested major downgrade without checking invoice generation compatibility.

Protocol/source references: [NUT-24](https://cashubtc.github.io/nuts/24/), [NUT-18 input fees](https://cashubtc.github.io/nuts/18/#input-fees), [Coco repository](https://github.com/cashubtc/coco). Published package types and browser behavior were checked directly; repository source snapshots contain APIs not necessarily present in the published 2.0.0 package (for example `forceSwap` was not available in this release), so the integration uses the installed package interfaces.
