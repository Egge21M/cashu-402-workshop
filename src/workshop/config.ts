import { normalizeMintUrl } from "@cashu/coco-core"

function endpoint(value: string): string {
  const url = new URL(value, window.location.origin)
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  ) {
    throw new Error("Use HTTPS, or a localhost endpoint for rehearsal.")
  }
  if (url.username || url.password || url.hash)
    throw new Error("Invalid endpoint configuration.")
  return url.href
}

export const config = {
  mintUrl: normalizeMintUrl(
    endpoint(import.meta.env.VITE_MINT_URL || "https://testnut.cashu.space")
  ),
  resourceUrl: endpoint(
    import.meta.env.VITE_RESOURCE_URL ||
      "https://btcplusplus-402-backend.fly.dev/image"
  ),
  // Enable only for an API that caches the same purchase ID + token and safely replays its response.
  replaySafe: import.meta.env.VITE_RESOURCE_REPLAY_SAFE === "true",
  maxTotal: Number(import.meta.env.VITE_MAX_PAYMENT_SATS || 100),
  walletName: "coco-berlin-test-v2",
}
if (!Number.isSafeInteger(config.maxTotal) || config.maxTotal < 1)
  throw new Error("Invalid payment limit.")
export const isTestMint = config.mintUrl === "https://testnut.cashu.space"
