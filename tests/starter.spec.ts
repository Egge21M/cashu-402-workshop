import { expect, test } from "@playwright/test"

test("starter payment controls remain inert, including after refresh", async ({
  page,
}) => {
  const externalRequests: string[] = []
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url())
    if (url.origin === "http://127.0.0.1:5178") await route.continue()
    else {
      externalRequests.push(url.href)
      await route.abort()
    }
  })
  await page.goto("/")
  await expect(page.getByText("Not connected", { exact: true })).toBeVisible()
  await expect(
    page.getByText("Workshop starter: payment actions are not connected.")
  ).toBeVisible()

  await page.getByRole("button", { name: "Add funds", exact: true }).click()
  await page.getByLabel("Amount", { exact: true }).fill("100")
  await page
    .getByRole("button", { name: "Create Lightning invoice", exact: true })
    .dblclick()
  await expect(
    page.getByRole("button", { name: "Create Lightning invoice", exact: true })
  ).toBeEnabled()
  await expect(
    page.getByText("Waiting for payment", { exact: true })
  ).not.toBeVisible()
  await page.keyboard.press("Escape")

  await page.getByRole("button", { name: "Withdraw", exact: true }).click()
  await page
    .getByLabel("Lightning invoice", { exact: true })
    .fill("lnbc-starter-no-op")
  await page
    .getByRole("button", { name: "Review withdrawal", exact: true })
    .dblclick()
  await expect(
    page.getByRole("button", { name: "Review withdrawal", exact: true })
  ).toBeEnabled()
  await expect(
    page.getByRole("button", { name: "Confirm withdrawal", exact: true })
  ).not.toBeVisible()
  await page.keyboard.press("Escape")

  await page.getByRole("button", { name: "Pay to unlock", exact: true }).click()
  await page
    .getByRole("button", { name: "Request payment details", exact: true })
    .dblclick()
  await expect(
    page.getByRole("button", { name: "Request payment details", exact: true })
  ).toBeEnabled()
  await expect(
    page.getByText("The view is yours", { exact: true })
  ).not.toBeVisible()
  await page.keyboard.press("Escape")

  await page.getByText("Follow the payment", { exact: true }).click()
  await expect(page.getByText(": idle", { exact: true })).toHaveCount(4)
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click()
  await expect(
    page.getByRole("button", { name: "Switch to light theme", exact: true })
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole("button", { name: "Pay to unlock", exact: true })
  ).toBeVisible()
  await expect(page.getByText("Not connected", { exact: true })).toBeVisible()
  await expect(
    page.getByRole("img", { name: /Berlin postcard/ })
  ).not.toBeVisible()
  const storage = await page.evaluate(async () => ({
    databases: await indexedDB.databases(),
    walletKeys: Object.keys(localStorage).filter((key) =>
      key.startsWith("coco-")
    ),
  }))
  expect(storage.databases).toEqual([])
  expect(storage.walletKeys).toEqual([])
  expect(externalRequests).toEqual([])
  expect(errors).toEqual([])
})
