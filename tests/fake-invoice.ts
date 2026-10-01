import { randomBytes } from "node:crypto"
import bolt11 from "bolt11"

/** Fresh, signed invoice for Testnut's FakeWallet only. There is no Lightning recipient. */
export function fakeInvoice(amount = 5): string {
  const encoded = bolt11.encode({
    satoshis: amount,
    timestamp: Math.floor(Date.now() / 1000),
    tags: [
      { tagName: "payment_hash", data: randomBytes(32).toString("hex") },
      {
        tagName: "description",
        data: "FAKE Testnut workshop verification only",
      },
      { tagName: "payment_secret", data: randomBytes(32).toString("hex") },
      { tagName: "expire_time", data: 3600 },
      { tagName: "min_final_cltv_expiry", data: 40 },
      {
        tagName: "feature_bits",
        data: {
          word_length: 4,
          payment_secret: { supported: true, required: false },
        },
      },
    ],
  })
  const invoice = bolt11.sign(encoded, randomBytes(32)).paymentRequest
  if (!invoice) throw new Error("Could not generate the fake invoice.")
  return invoice
}
