import type {
  MintOperation,
  MeltOperation,
  SendOperation,
} from "@cashu/coco-core"

export type OperationBindings = {
  mint?: MintOperation
  melt?: MeltOperation
  send?: SendOperation
}

import type { PaymentQuote } from "./contracts"

export type PurchaseContext = {
  resourceUrl: string
  requestId: string
  startedAt: number
  operationId?: string
  quote?: PaymentQuote
  phase: "preparing" | "review" | "executing" | "submitted" | "delivered"
}
export type WalletContext = {
  mintUrl: string
  fundingId?: string
  withdrawalId?: string
  purchase?: PurchaseContext
}

let database: Promise<IDBDatabase> | undefined
function open() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("coco-berlin-context-v2", 1)
    request.onupgradeneeded = () => request.result.createObjectStore("context")
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(new Error("Could not open purchase storage."))
  })
  return database
}
export async function readContext(): Promise<WalletContext | undefined> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("context")
    const request = transaction.objectStore("context").get("wallet")
    request.onsuccess = () => {
      const context = request.result as WalletContext | undefined
      // Remove images saved by the previous version while keeping payment recovery metadata.
      if (context?.purchase && "content" in context.purchase) {
        delete context.purchase.content
        void writeContext(context).then(() => resolve(context), reject)
      } else resolve(context)
    }
    request.onerror = () =>
      reject(new Error("Could not read purchase storage."))
  })
}
export async function writeContext(context: WalletContext): Promise<void> {
  const db = await open()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("context", "readwrite")
    transaction.objectStore("context").put(context, "wallet")
    transaction.oncomplete = () => resolve()
    transaction.onabort = transaction.onerror = () =>
      reject(
        new Error(
          "Could not save purchase context. No further payment will be started."
        )
      )
  })
}
