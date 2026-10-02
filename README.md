# Cashu workshop starter

This branch has the complete workshop UI and pinned Coco dependencies, with no payment integration. All ten `WorkshopActions` return resolved promises without changing state. Funding, withdrawal and purchase dialogs, inputs and theme controls work; payment buttons never create an invoice, quote, wallet, token or request. The wallet remains **Not connected**, the image stays locked and the trace stays idle. No fake success or fixture picker is present.

## Branches in this nested frontend repository

- **`workshop/starter`**: start the workshop agent here. Coco is installed but not wired into React or the UI.
- **`workshop/done`**: completed and tested integration as saved before preparing this starter. Use it as the labelled fallback/reference. `feat/coco-workshop-integration` retains the same completed history.

Run commands from `demo/frontend`, not the parent presentation repository:

```sh
git switch workshop/starter
npm ci
npm run dev
```

Or use `bun install --frozen-lockfile` and `bun run dev`. Use Node 22.22.1 or a compatible supported release. Both branches retain matching Coco core/React/IndexedDB 2.0.0, cashu-ts 5.0.0-rc.4, BIP39 2.4.0 and TypeScript 5.9.3, plus npm and Bun lockfiles.

To show the finished project, stop Vite, run `git switch workshop/done`, then `npm ci && npm run dev`. The done branch has real wallet storage and Testnut calls; use a disposable browser profile for workshop rehearsal. Return to `workshop/starter` for a new agent run. Commit your agent's changes on a separate rehearsal branch rather than replacing these two references.

## Agent handoff

`src/workshop/contracts.ts` defines the prepared views/actions. `src/workshop/integration.ts` is the silent no-op seam. `src/main.tsx` mounts the UI with only its theme provider; no Coco provider, manager, repository or wallet identity is initialized. `src/workshop/config.ts` and `.env.example` supply the service configuration without contacting it.

Implement in workshop order:

1. **Initialize**: persistent identity, IndexedDB, one provider-owned manager, explicit mint trust, readiness and balances. Gate payment controls on successful setup. Preload retained operation objects before mounting published 2.0.0 hooks to avoid the observed Strict Mode ID-hydration race.
2. **Fund**: create a BOLT11 quote and tracked mint operation, display the invoice, and observe issuance. Closing a pending invoice retains its operation.
3. **Inspect**: GET the supplied resource, parse the real 402 challenge (creqA/creqB), and enforce approved mint / explicit sat / amount cap / no locks.
4. **Pay and retrieve**: calculate actual receiver/sender fees, review the total, cancel prepared reservations when declined, persist purchase/operation metadata, execute once, encode cashuB with DLEQ, and display the returned image only after delivery. Keep the image in memory; refresh locks it again. Never create a replacement spend after an uncertain response.
5. **Withdraw**: quote, prepare, review, execute or cancel, and observe/reconcile the original melt operation. Use a fresh synthetic Testnut invoice for rehearsal.

The supplied public endpoint is `https://btcplusplus-402-backend.fly.dev/image`; the approved mint is `https://testnut.cashu.space`. Testnut uses simulated value. Browser CORS was checked during integration. The public endpoint rejects spent-token replay and has no verified status/receipt or safe-replay contract, so keep response-loss outcomes unresolved. The starter includes configuration, not implementations of fee, persistence, HTTP or recovery helpers.

## Check the starter

```sh
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

The starter browser check clicks funding, withdrawal and resource actions, reloads, and confirms no external requests, wallet IndexedDB or seed storage, fake settlement or unlocked image. `PLAYWRIGHT_CHROMIUM_PATH` can select an installed Chromium. The done branch has its separate controlled and public payment suites; starter checks establish the inactive baseline only.
