// Supplied service configuration for the agent. The starter never contacts these endpoints.
export const config = {
  mintUrl: import.meta.env.VITE_MINT_URL || "https://testnut.cashu.space",
  resourceUrl:
    import.meta.env.VITE_RESOURCE_URL ||
    "https://btcplusplus-402-backend.fly.dev/image",
  maxTotal: Number(import.meta.env.VITE_MAX_PAYMENT_SATS || 100),
  replaySafe: false,
  walletName: "coco-berlin-test-v2",
}
