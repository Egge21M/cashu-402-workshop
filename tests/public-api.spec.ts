import { fakeInvoice } from "./fake-invoice.ts"
import { test, expect } from "@playwright/test"

test("public organizer API: real challenge, test-mint payment, protected image, reload, withdrawal", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", () => errors.push("Unhandled browser error"))
  let paymentHeaders: Record<string, string> | undefined
  page.on("request", (request) => {
    if (
      (request.url().endsWith("/api/workshop-image") ||
        request.url() === "https://btcplusplus-402-backend.fly.dev/image") &&
      request.headers()["x-cashu"]
    )
      paymentHeaders = request.headers()
  })
  await page.goto("/")
  await expect(page.getByRole("button", { name: "Add funds" })).toBeEnabled()
  await page.getByRole("button", { name: "Add funds" }).click()
  await page.getByLabel("Amount", { exact: true }).fill("100")
  await page.getByRole("button", { name: "Create Lightning invoice" }).click()
  await expect(page.getByText("Funds received", { exact: true })).toBeVisible({
    timeout: 60000,
  })
  await page.getByRole("button", { name: "Back to the demo" }).click()
  await page
    .locator('[aria-labelledby="image-heading"]')
    .getByRole("button")
    .click()
  await expect(
    page.getByRole("button", { name: /Pay.*sats & unlock/ })
  ).toBeVisible()
  await expect(page.getByText(/The image costs 1 sats/)).toBeVisible()
  const paidResponse = page.waitForResponse(
    (response) =>
      (response.url().endsWith("/api/workshop-image") ||
        response.url() === "https://btcplusplus-402-backend.fly.dev/image") &&
      response.status() !== 402
  )
  await page.getByRole("button", { name: /Pay.*sats & unlock/ }).click()
  const response = await paidResponse
  expect(response.status()).toBe(200)
  expect(response.headers()["content-type"]).toMatch(/^image\//)
  await expect(page.getByText("The view is yours")).toBeVisible()
  await page.getByRole("button", { name: "View image" }).click()
  await expect
    .poll(() =>
      page
        .getByRole("img", { name: /Berlin postcard/ })
        .evaluate((img: HTMLImageElement) => img.naturalWidth)
    )
    .toBeGreaterThan(0)
  const balance = page.locator(
    '[aria-labelledby="wallet-heading"] [aria-live="polite"]'
  )
  const paidBalance = await balance.innerText()
  // A read-only replay of the already spent token probes the public service contract; no new ecash is created.
  expect(paymentHeaders).toBeDefined()
  const replay = await page.request.get(
    "https://btcplusplus-402-backend.fly.dev/image",
    {
      headers: {
        "X-Cashu": paymentHeaders!["x-cashu"],
        ...(paymentHeaders!["x-cashu-purchase-id"]
          ? { "X-Cashu-Purchase-Id": paymentHeaders!["x-cashu-purchase-id"] }
          : {}),
      },
    }
  )
  console.log(
    `Public API duplicate-token response: HTTP ${replay.status()}; no safe-replay guarantee assumed.`
  )
  await page.reload()
  await expect(page.getByRole("button", { name: "Add funds" })).toBeEnabled()
  await expect.poll(() => balance.innerText()).toBe(paidBalance)
  await expect(
    page.getByRole("img", { name: /Berlin postcard/ })
  ).not.toBeVisible()
  await expect(
    page.getByRole("button", { name: "Pay to unlock", exact: true })
  ).toBeVisible()
  const invoice = fakeInvoice()
  await page.getByRole("button", { name: "Withdraw", exact: true }).click()
  await page.getByLabel("Lightning invoice", { exact: true }).fill(invoice)
  await page.getByRole("button", { name: "Review withdrawal" }).click()
  await expect(
    page.getByRole("button", { name: "Confirm withdrawal" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Confirm withdrawal" }).click()
  await expect(
    page.getByText("Sent through Lightning", { exact: true })
  ).toBeVisible({ timeout: 60000 })
  expect(errors).toEqual([])
})
