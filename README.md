# Cashu workshop frontend

Completed React 19 / Coco workshop demo on `workshop/done` in this frontend's Git repository. The wallet uses pinned `@cashu/coco-core`, `@cashu/coco-react`, and `@cashu/coco-indexeddb` 2.0.0, with the workshop's matching cashu-ts release. TypeScript is 5.9.3 to satisfy Coco's peer dependency. The supplied starter's existing UI is preserved.

## Workshop branches

Public repository: [Egge21M/cashu-402-workshop](https://github.com/Egge21M/cashu-402-workshop).

- **`workshop/starter`** (default): complete UI and Coco dependencies, with silent no-op payment actions. Start a workshop implementation here.
- **`workshop/done`**: completed wallet, funding, HTTP 402 image payment and withdrawal. Use this branch as the reference build.

## Run

Use Node 22.22.1 or a compatible supported release. To run this completed reference:

```sh
git clone --branch workshop/done https://github.com/Egge21M/cashu-402-workshop.git
cd cashu-402-workshop
npm ci
npm run dev
```

After cloning, stop Vite before switching with `git switch workshop/starter` or `git switch workshop/done`, then reinstall with `npm ci` and restart. Both branches use the same pinned dependencies and lockfiles.

Or keep the workshop's Bun workflow:

```sh
bun install --frozen-lockfile
bun run dev
```

Open [the frontend](http://localhost:5173). The Slidev presentation lives in the separate parent workshop workspace; this public repository contains the frontend only. Both npm and Bun lockfiles are retained.

The default resource is [the organizer's image API](https://btcplusplus-402-backend.fly.dev/image), reached directly using browser CORS. It advertises **1 net sat**, rather than the starter's placeholder 10. `.env.example` documents optional overrides; copy it to `.env.local` and restart Vite after changes. The backend permits GET/OPTIONS, accepts `X-Cashu`, and exposes its challenge header. An optional Vite proxy is available by setting `VITE_RESOURCE_URL=/api/workshop-image` and `VITE_RESOURCE_PROXY_TARGET` to the API URL. A static deployment using that fallback needs its own reverse proxy; Vite configuration is not bundled into static assets.

## Try the flow

1. **Add funds**, choose 100 sats, and create an invoice. Testnut's fake Lightning backend automatically pays/ issues simulated ecash. Do not pay these invoices with real bitcoin.
2. **Pay to unlock**, inspect the API's actual price and total including fees, then approve. The public 1-sat image was observed to cost 3 sats total. Fees depend on selected proofs and mint keysets; the UI calculates them for each purchase.
3. Display the actual returned protected image. The image stays in memory for the current page only. Reload retains the wallet but locks the image again; unlocking requires a new approved payment.
4. **Withdraw**, paste a fixed-amount test invoice, review amount and maximum fees, then approve. For a repeatable fake withdrawal, generate an invoice using `bun run invoice:test`. This invoice has no real Lightning recipient and is for Testnut only. Creating an outgoing invoice through the same mint's funding-quote API can produce an already-paid internal invoice and is not a reliable rehearsal method.

Invoice closing retains an unfinished funding operation; there is no Coco funding-cancellation API. Prepared purchases and withdrawals can be cancelled before execution. Duplicate clicks share one action guard. A Web Lock keeps a second tab from operating this wallet until the first closes. The provider owns the manager lifecycle, and operation hooks receive preloaded operation objects when resuming to avoid Coco React 2.0.0's Strict Mode ID-hydration race.

## Recovery and storage

Coco stores operations/proofs in IndexedDB. A separate IndexedDB context retains operation IDs, resource URL, local purchase ID, payment phase, reviewed quote, and delivery status. The image itself is never persisted. Outgoing tokens remain in Coco's operation storage and are never printed by the app. Prepared fee adjustment cancels each discarded reservation before making the next plan. Both swapped outputs and exact-match sends are checked for receiver input fees.

Previously cached images are removed from IndexedDB when the app loads. Only an HTTP image response unlocks content. A send reaching `pending` or `finalized` does not prove delivery. Lost or rejected paid responses keep their original operation and show **unresolved**. The public backend was observed to return HTTP 400 for the same already-spent token, so replay is disabled by default. **Recover original purchase** can release an unexecuted preparation; resubmission of an existing token requires an API with a verified idempotent replay contract and `VITE_RESOURCE_REPLAY_SAFE=true`. This opt-in contract expects `X-Cashu-Purchase-Id` alongside the same `X-Cashu` token and resource URL. That purchase-ID header is application-specific, not part of NUT-24; it is omitted when replay is disabled. No recovery action creates replacement ecash.

This is a disposable workshop wallet: the BIP39 mnemonic is plaintext in localStorage, and IndexedDB contains sensitive wallet data. Use a fresh browser profile for a new test identity. Never import a personal seed, or independently clear the seed/database to repair an unresolved payment. Production key management and backup/restore remain outside this workshop.

## Verify

```sh
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:public
```

`test:e2e` uses a test-only local organizer API, a separate Coco merchant wallet, and the real public Testnut mint. It covers both creq encodings, fee coverage, cancellation, duplicate clicks, reload, fake withdrawal, invalid policies, insufficient funds, lost paid responses, and tab ownership. Its replay-aware test API is not the public backend. `test:public` separately runs the actual organizer endpoint flow and probes already-spent-token behavior. Neither proves real Bitcoin Lightning receipt. Tests require network access; `PLAYWRIGHT_CHROMIUM_PATH` optionally selects an installed Chromium binary.

See [the integration report](INTEGRATION.md) for implementation steps, observed results, and slide alignment. The original planning documents retain historical checks; the report records this completed integration run.
