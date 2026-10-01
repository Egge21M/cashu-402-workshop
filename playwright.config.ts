import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  testMatch:
    process.env.WORKSHOP_PUBLIC_API === "true"
      ? "public-api.spec.ts"
      : "workshop.spec.ts",
  workers: 1,
  timeout: 90000,
  expect: { timeout: 30000 },
  use: {
    baseURL: "http://127.0.0.1:5178",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "npm run dev -- --port 5178 --strictPort",
    url: "http://127.0.0.1:5178",
    reuseExistingServer: false,
    env: {
      VITE_RESOURCE_URL:
        process.env.WORKSHOP_PUBLIC_API === "true"
          ? "https://btcplusplus-402-backend.fly.dev/image"
          : "http://127.0.0.1:5189/image",
      VITE_RESOURCE_REPLAY_SAFE:
        process.env.WORKSHOP_PUBLIC_API === "true" ? "false" : "true",
      VITE_MAX_PAYMENT_SATS: "100",
    },
  },
})
