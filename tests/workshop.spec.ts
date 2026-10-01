import { fakeInvoice } from "./fake-invoice.ts"
import { test, expect, type Page } from "@playwright/test"
import { createServer, type Server } from "node:http"
import { randomBytes, createHash } from "node:crypto"
import {
  initializeCoco,
  MemoryRepositories,
  type Manager,
} from "@cashu/coco-core"
import { PaymentRequest } from "@cashu/cashu-ts"

// Test-only organizer API. Payments use the real Testnut mint and a separate Coco merchant wallet.
const mintUrl = "https://testnut.cashu.space"
const image =
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#18181b"/><text x="100" y="250" fill="#59d78b" font-size="40">Paid Berlin test resource</text></svg>'
let merchant: Manager
let server: Server
let mode = "creqA"
let receipts = new Map<string, { tokenHash: string }>()
let redemptions = 0
let paidRequests = 0
let merchantCredit = 0
let rejected = 0
let responseLost = false
const pageErrors: string[] = []

test.beforeAll(async () => {
  const merchantSeed = randomBytes(64)
  merchant = await initializeCoco({
    repo: new MemoryRepositories(),
    seedGetter: async () => merchantSeed,
  })
  await merchant.mint.addMint(mintUrl, { trusted: true })
  server = createServer((request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5178")
    response.setHeader(
      "Access-Control-Allow-Headers",
      "X-Cashu, X-Cashu-Purchase-Id"
    )
    response.setHeader("Access-Control-Expose-Headers", "X-Cashu")
    if (request.method === "OPTIONS") {
      response.writeHead(204).end()
      return
    }
    void (async () => {
      if (mode === "free") {
        response.setHeader("Content-Type", "image/svg+xml")
        response.end(image)
        return
      }
      const token = request.headers["x-cashu"]
      if (!token) {
        const challenge = new PaymentRequest(
          undefined,
          undefined,
          mode === "overlimit" ? 101 : mode === "feelimit" ? 100 : 10,
          mode === "unit" ? "usd" : "sat",
          [mode === "wrongmint" ? "https://example.invalid" : mintUrl],
          undefined,
          false,
          mode === "condition"
            ? { kind: "P2PK", data: "02" + "11".repeat(32), tags: [] }
            : undefined
        )
        if (mode !== "missing")
          response.setHeader(
            "X-Cashu",
            mode === "malformed"
              ? "creqAnot-valid"
              : mode === "creqB"
                ? challenge.toEncodedCreqB()
                : challenge.toEncodedCreqA()
          )
        response.writeHead(402).end()
        return
      }
      paidRequests++
      const id = request.headers["x-cashu-purchase-id"]
      if (typeof token !== "string" || typeof id !== "string") {
        rejected++
        response.writeHead(400).end()
        return
      }
      const tokenHash = createHash("sha256").update(token).digest("hex")
      const receipt = receipts.get(id)
      if (receipt) {
        if (receipt.tokenHash !== tokenHash) {
          rejected++
          response.writeHead(400).end()
          return
        }
      } else {
        const decoded = await merchant.wallet.decodeToken(token, mintUrl)
        if (decoded.mint !== mintUrl || decoded.unit !== "sat")
          throw new Error("Invalid payment")
        const before = Number(
          (
            await merchant.wallet.balances.total({ units: ["sat"] })
          ).spendable.toString()
        )
        await merchant.wallet.receive(decoded)
        const after = Number(
          (
            await merchant.wallet.balances.total({ units: ["sat"] })
          ).spendable.toString()
        )
        merchantCredit = after - before
        if (merchantCredit < 10) throw new Error("Net payment too small")
        redemptions++
        receipts.set(id, { tokenHash })
      }
      if (mode === "lost" && !responseLost) {
        responseLost = true
        response.writeHead(504).end()
        return
      }
      response.setHeader(
        "Content-Type",
        mode === "badcontent" ? "text/html" : "image/svg+xml"
      )
      response.end(image)
    })().catch(() => {
      rejected++
      response.writeHead(400).end()
    })
  })
  await new Promise<void>((resolve) =>
    server.listen(5189, "127.0.0.1", resolve)
  )
})
test.afterAll(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()))
  await merchant?.dispose()
})
test.beforeEach(async ({ page }) => {
  mode = "creqA"
  receipts = new Map()
  redemptions = 0
  paidRequests = 0
  merchantCredit = 0
  rejected = 0
  responseLost = false
  pageErrors.length = 0
  page.on("pageerror", () => pageErrors.push("Unhandled browser error"))
  await page.goto("/")
  await expect(page.getByRole("button", { name: "Add funds" })).toBeEnabled()
})
test.afterEach(() => expect(pageErrors).toEqual([]))

async function fund(page: Page) {
  await page.getByRole("button", { name: "Add funds" }).click()
  await page.getByLabel("Amount", { exact: true }).fill("100")
  await page.getByRole("button", { name: "Create Lightning invoice" }).click()
  await expect(page.getByText("Funds received", { exact: true })).toBeVisible({
    timeout: 60000,
  })
  await page.getByRole("button", { name: "Back to the demo" }).click()
}
async function requestImage(page: Page) {
  await page
    .locator('[aria-labelledby="image-heading"]')
    .getByRole("button")
    .click()
}
async function context(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open("coco-berlin-context-v2", 1)
      request.onsuccess = () => resolve(request.result)
    })
    return new Promise<{
      fundingId?: string
      withdrawalId?: string
      purchase?: { operationId?: string; requestId: string; phase: string }
    }>((resolve) => {
      const read = db
        .transaction("context")
        .objectStore("context")
        .get("wallet")
      read.onsuccess = () => {
        db.close()
        resolve(read.result)
      }
    })
  })
}
async function balance(page: Page) {
  return page
    .locator('[aria-labelledby="wallet-heading"] [aria-live="polite"]')
    .innerText()
}

for (const encoding of ["creqA", "creqB"]) {
  test(`${encoding}: fund, cancel, approve once, retrieve, reload, withdraw`, async ({
    page,
  }) => {
    mode = encoding
    await fund(page)
    const funded = await balance(page)
    await requestImage(page)
    await expect(
      page.getByRole("button", { name: /Pay.*sats & unlock/ })
    ).toBeVisible()
    expect((await context(page)).purchase?.phase).toBe("review")
    expect(redemptions).toBe(0)
    await page.getByRole("button", { name: "Cancel purchase" }).click()
    await expect.poll(() => balance(page)).toBe(funded)
    await expect
      .poll(async () => (await context(page)).purchase)
      .toBeUndefined()
    await page.getByRole("button", { name: "Request payment details" }).click()
    await expect(
      page.getByRole("button", { name: /Pay.*sats & unlock/ })
    ).toBeVisible()
    const preparedId = (await context(page)).purchase?.operationId
    await page.reload()
    await expect(page.getByRole("button", { name: "Add funds" })).toBeEnabled()
    await requestImage(page)
    expect((await context(page)).purchase?.operationId).toBe(preparedId)
    await page
      .getByRole("button", { name: /Pay.*sats & unlock/ })
      .evaluate((button: HTMLButtonElement) => {
        button.click()
        button.click()
      })
    await expect(page.getByText("The view is yours")).toBeVisible()
    expect(redemptions).toBe(1)
    expect(paidRequests).toBe(1)
    expect(merchantCredit).toBeGreaterThanOrEqual(10)
    await page.getByRole("button", { name: "View image" }).click()
    await expect(page.getByRole("img", { name: /Berlin/i })).toBeVisible()
    const paidBalance = await balance(page)
    await page.reload()
    await expect(page.getByRole("button", { name: "Add funds" })).toBeEnabled()
    await expect.poll(() => balance(page)).toBe(paidBalance)
    expect(redemptions).toBe(1)
    const invoice = fakeInvoice()
    await page.getByRole("button", { name: "Withdraw", exact: true }).click()
    await page.getByLabel("Lightning invoice", { exact: true }).fill(invoice)
    await page.getByRole("button", { name: "Review withdrawal" }).click()
    await expect(
      page.getByRole("button", { name: "Confirm withdrawal" })
    ).toBeVisible()
    await page.getByRole("button", { name: "Cancel withdrawal" }).click()
    await expect.poll(() => balance(page)).toBe(paidBalance)
    await page.getByRole("button", { name: "Review withdrawal" }).click()
    await expect(
      page.getByRole("button", { name: "Confirm withdrawal" })
    ).toBeVisible()
    await page
      .getByRole("button", { name: "Confirm withdrawal" })
      .evaluate((button: HTMLButtonElement) => {
        button.click()
        button.click()
      })
    await expect(
      page.getByText("Sent through Lightning", { exact: true })
    ).toBeVisible({ timeout: 60000 })
    const settled = await balance(page)
    await page.reload()
    await expect(page.getByRole("button", { name: "Add funds" })).toBeEnabled()
    await expect.poll(() => balance(page)).toBe(settled)
    await page.getByRole("button", { name: "Withdraw", exact: true }).click()
    await expect(
      page.getByText("Sent through Lightning", { exact: true })
    ).toBeVisible()
  })
}

for (const invalid of [
  "wrongmint",
  "unit",
  "condition",
  "overlimit",
  "malformed",
  "missing",
  "free",
]) {
  test(`reject ${invalid} challenge without payment`, async ({ page }) => {
    mode = invalid
    await requestImage(page)
    await expect(
      page.getByRole("button", { name: "Retry resource request" })
    ).toBeVisible()
    expect(paidRequests).toBe(0)
    await expect
      .poll(async () => (await context(page))?.purchase)
      .toBeUndefined()
  })
}

test("insufficient funds allows funding and retry without orphan reservation", async ({
  page,
}) => {
  await requestImage(page)
  await expect(
    page.getByRole("button", { name: "Retry resource request" })
  ).toBeVisible()
  await expect.poll(async () => (await context(page)).purchase).toBeUndefined()
  await page.getByRole("button", { name: "Close" }).click()
  await fund(page)
  await requestImage(page)
  await expect(
    page.getByRole("button", { name: /Pay.*sats & unlock/ })
  ).toBeVisible()
})

test("lost paid response recovers the original token after reload without another spend", async ({
  page,
}) => {
  mode = "lost"
  await fund(page)
  await requestImage(page)
  await expect(
    page.getByRole("button", { name: /Pay.*sats & unlock/ })
  ).toBeVisible()
  const purchase = (await context(page)).purchase
  await page.getByRole("button", { name: /Pay.*sats & unlock/ }).click()
  await expect(
    page.getByRole("button", { name: "Recover original purchase" })
  ).toBeVisible()
  expect(redemptions).toBe(1)
  await page.reload()
  await expect(page.getByRole("button", { name: "Add funds" })).toBeEnabled()
  await requestImage(page)
  await page.getByRole("button", { name: "Recover original purchase" }).click()
  await expect(page.getByText("The view is yours")).toBeVisible()
  const recovered = (await context(page)).purchase
  expect(recovered?.operationId).toBe(purchase?.operationId)
  expect(recovered?.requestId).toBe(purchase?.requestId)
  expect(redemptions).toBe(1)
  expect(paidRequests).toBe(2)
  expect(rejected).toBe(0)
})

test("second tab cannot operate the same wallet", async ({
  page,
  context: browserContext,
}) => {
  const second = await browserContext.newPage()
  await second.goto("/")
  await expect(second.getByText(/Waiting for wallet access/)).toBeVisible()
  await second.close()
  await expect(page.getByRole("button", { name: "Add funds" })).toBeEnabled()
})

test("fee-inclusive limit rejection releases all reservations", async ({
  page,
}) => {
  mode = "feelimit"
  await fund(page)
  const funded = await balance(page)
  await requestImage(page)
  await expect(
    page.getByRole("button", { name: "Retry resource request" })
  ).toBeVisible()
  await expect.poll(async () => (await context(page)).purchase).toBeUndefined()
  await expect.poll(() => balance(page)).toBe(funded)
  expect(paidRequests).toBe(0)
})

test("a paid non-image response remains unresolved without a replacement payment", async ({
  page,
}) => {
  mode = "badcontent"
  await fund(page)
  await requestImage(page)
  await expect(
    page.getByRole("button", { name: /Pay.*sats & unlock/ })
  ).toBeVisible()
  const prepared = (await context(page)).purchase
  await page.getByRole("button", { name: /Pay.*sats & unlock/ }).click()
  await expect(
    page.getByRole("button", { name: "Recover original purchase" })
  ).toBeVisible()
  expect((await context(page)).purchase?.operationId).toBe(
    prepared?.operationId
  )
  expect(redemptions).toBe(1)
  await expect(page.getByText("The view is yours")).not.toBeVisible()
})
