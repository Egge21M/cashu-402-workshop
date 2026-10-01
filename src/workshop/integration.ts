import { useEffect, useRef, useState } from "react"
import type { Manager } from "@cashu/coco-core"
import {
  useBalances,
  useManager,
  useMintOperation,
  useMeltOperation,
  useSendOperation,
} from "@cashu/coco-react"
import type {
  PaymentQuote,
  PurchaseView,
  TraceStep,
  WorkshopIntegration,
  FundingView,
  WithdrawalView,
} from "./contracts"
import { config } from "./config"
import {
  writeContext,
  type WalletContext,
  type OperationBindings,
} from "./storage"
import {
  imageResponse,
  preparedReceiveFee,
  resourceRequest,
  validateChallenge,
  verifyToken,
} from "./resource"

const initialTrace: TraceStep[] = [
  { label: "Request", detail: "Ask for the protected image", status: "idle" },
  {
    label: "402 challenge",
    detail: "Inspect the price and mint",
    status: "idle",
  },
  { label: "Payment", detail: "Approve and send Cashu", status: "idle" },
  { label: "Content", detail: "Retry and receive the image", status: "idle" },
]
const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "The operation could not be completed."
const number = (value: { toString(): string }) => Number(value.toString())

async function hasUntrackedOperations(coco: Manager, context: WalletContext) {
  const [mint, melt, send] = await Promise.all([
    coco.ops.mint.listInFlight(),
    Promise.all([
      coco.ops.melt.listInFlight(),
      coco.ops.melt.listPrepared(),
    ]).then((lists) => lists.flat()),
    Promise.all([
      coco.ops.send.listInFlight(),
      coco.ops.send.listPrepared(),
    ]).then((lists) => lists.flat()),
  ])
  return (
    mint.some((operation) => operation.id !== context.fundingId) ||
    melt.some((operation) => operation.id !== context.withdrawalId) ||
    send.some((operation) => operation.id !== context.purchase?.operationId)
  )
}

export function useWorkshopIntegration(
  initialContext: WalletContext,
  operations: OperationBindings
): WorkshopIntegration {
  const coco = useManager()
  const mint = useMintOperation(operations.mint)
  const melt = useMeltOperation(operations.melt)
  const send = useSendOperation(operations.send)
  const { balances, refresh } = useBalances({
    mintUrls: [config.mintUrl],
    units: ["sat"],
  })
  const [context, setContext] = useState(initialContext)
  const contextRef = useRef(initialContext)
  const busy = useRef(false)
  const [now, setNow] = useState(() => Date.now())
  const [ready, setReady] = useState(false)
  const [walletError, setWalletError] = useState<string | null>(null)
  const [fundingOverride, setFunding] = useState<FundingView | null>(null)
  const [withdrawalOverride, setWithdrawal] = useState<WithdrawalView | null>(
    null
  )
  const [purchase, setPurchase] = useState<PurchaseView>({ status: "locked" })
  const [trace, setTrace] = useState(initialTrace)
  const objectUrl = useRef<string | null>(null)

  async function save(next: WalletContext) {
    // Retain the in-memory identity even when disk writes fail. Do not start another spend.
    contextRef.current = next
    try {
      await writeContext(next)
    } catch (error) {
      setWalletError(message(error))
      throw error
    }
    setContext(next)
  }
  function step(index: number, status: TraceStep["status"], detail: string) {
    setTrace((previous) =>
      previous.map((entry, position) =>
        position === index ? { ...entry, status, detail } : entry
      )
    )
  }
  function showImage(blob: Blob) {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = URL.createObjectURL(blob)
    setPurchase({ status: "unlocked", contentUrl: objectUrl.current })
  }
  async function guard(
    kind: "funding" | "withdrawal" | "purchase",
    action: () => Promise<void>
  ) {
    if (busy.current) return
    busy.current = true
    try {
      if (!ready || walletError)
        throw new Error(walletError || "Wait for wallet recovery to complete.")
      if (await hasUntrackedOperations(coco, contextRef.current)) {
        const error =
          "An untracked wallet operation needs inspection. No new payment will be started."
        setWalletError(error)
        throw new Error(error)
      }
      await action()
    } catch (error) {
      if (
        kind === "purchase" &&
        contextRef.current.purchase?.phase === "preparing" &&
        !walletError
      ) {
        const retained = contextRef.current.purchase
        try {
          if (retained.operationId) {
            const operation = await coco.ops.send.get(retained.operationId)
            if (operation?.state !== "prepared")
              throw new Error("Needs reconciliation", { cause: error })
            await send.cancel()
          } else {
            const operations = [
              ...(await coco.ops.send.listPrepared()),
              ...(await coco.ops.send.listInFlight()),
            ]
            if (operations.length)
              throw new Error("An operation needs reconciliation", {
                cause: error,
              })
          }
          send.reset()
          await save({ ...contextRef.current, purchase: undefined })
          await refresh()
        } catch {
          /* Keep unresolved context if cancellation or persistence cannot be proven. */
        }
      }
      const text = message(error)
      if (kind === "funding") setFunding({ status: "error", message: text })
      if (kind === "withdrawal")
        setWithdrawal({
          status: contextRef.current.withdrawalId ? "unresolved" : "error",
          message: text,
        })
      if (kind === "purchase") {
        const active = contextRef.current.purchase
        const unresolved = !!active
        setPurchase({
          status: unresolved ? "unresolved" : "error",
          message: text,
        })
        step(
          active?.phase === "submitted" ? 3 : 2,
          unresolved ? "unresolved" : "error",
          text
        )
      }
    } finally {
      busy.current = false
    }
  }

  const mintOperation = mint.currentOperation
  let funding: FundingView = fundingOverride ?? { status: "idle" }
  if (!fundingOverride && mintOperation) {
    if (mintOperation.state === "finalized")
      funding = { status: "settled", amount: number(mintOperation.amount) }
    else if (mintOperation.state === "failed")
      funding = {
        status: "error",
        message:
          "Funding failed. Inspect this invoice before starting another.",
      }
    else if (mintOperation.state !== "init") {
      const remaining = mintOperation.expiry
        ? Math.max(0, Math.ceil((mintOperation.expiry * 1000 - now) / 60000))
        : null
      funding = {
        status: "pending",
        amount: number(mintOperation.amount),
        invoice: mintOperation.request,
        expiresLabel:
          remaining === null ? "an unspecified time" : `${remaining} minutes`,
      }
    }
  }
  const meltOperation = melt.currentOperation
  let withdrawal: WithdrawalView = withdrawalOverride ?? { status: "idle" }
  if (!withdrawalOverride && meltOperation && meltOperation.state !== "init") {
    const amount = number(meltOperation.amount)
    const fee =
      number(meltOperation.fee_reserve) + number(meltOperation.swap_fee)
    const quote = { amount, fee, total: amount + fee }
    if (meltOperation.state === "finalized")
      withdrawal = { status: "settled", quote }
    else if (meltOperation.state === "prepared")
      withdrawal = { status: "review", quote }
    else if (meltOperation.state === "rolled_back")
      withdrawal = { status: "idle" }
    else if (meltOperation.state === "failed")
      withdrawal = {
        status: "error",
        message: "The mint reports withdrawal failure and returned the proofs.",
      }
    else withdrawal = { status: "paying", quote }
  }

  useEffect(() => {
    let active = true
    // Re-read after hooks subscribe. Recovery only observes stored operations; it never makes a new payment.
    void (async () => {
      await coco.wallet.balances.total({
        mintUrls: [config.mintUrl],
        units: ["sat"],
      })
      await refresh()
      const retained = initialContext.purchase
      if (await hasUntrackedOperations(coco, initialContext)) {
        throw new Error(
          "An untracked wallet operation needs inspection. No new payment will be started."
        )
      }
      if (!active) return
      if (retained?.phase === "delivered" && retained.content) {
        showImage(retained.content)
        setTrace(initialTrace.map((entry) => ({ ...entry, status: "success" })))
      } else if (retained) {
        const operation = retained.operationId
          ? await coco.ops.send.get(retained.operationId)
          : null
        if (!active) return
        if (
          operation?.state === "prepared" &&
          retained.phase === "review" &&
          retained.quote
        ) {
          setPurchase({ status: "review", quote: retained.quote })
          step(0, "success", "Restored the resource request")
          step(1, "success", "Restored the approved challenge and fees")
        } else {
          setPurchase({
            status: "unresolved",
            message:
              "This purchase was interrupted. Keep its original payment; do not create a replacement. Use recovery only if the API supports replay.",
          })
          step(
            2,
            "unresolved",
            `Retained purchase ${retained.requestId}; payment result needs reconciliation`
          )
        }
      }
      if (
        initialContext.fundingId &&
        !(await coco.ops.mint.get(initialContext.fundingId))
      )
        throw new Error("The retained funding operation is missing.")
      if (
        initialContext.withdrawalId &&
        !(await coco.ops.melt.get(initialContext.withdrawalId))
      )
        throw new Error("The retained withdrawal operation is missing.")
      if (active) setReady(true)
    })().catch((error) => {
      if (active) setWalletError(message(error))
    })
    return () => {
      active = false
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    }
    // Bootstrap is initial-only, like the operation-hook bindings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coco, refresh])

  // Watchers publish terminal events; refresh also reconciles slow/pending quotes without replacement.
  const mintRefresh = mint.refresh
  const meltRefresh = melt.refresh
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
      if (!ready || busy.current) return
      if (context.fundingId) void mintRefresh().catch(() => {})
      if (context.withdrawalId) void meltRefresh().catch(() => {})
    }, 3000)
    return () => window.clearInterval(timer)
  }, [ready, context.fundingId, context.withdrawalId, mintRefresh, meltRefresh])

  async function deliver(token: Parameters<typeof verifyToken>[1]) {
    const retained = contextRef.current.purchase
    if (!retained?.quote || !retained.operationId)
      throw new Error("Purchase context is missing.")
    await verifyToken(coco, token, retained.quote.amount)
    await save({
      ...contextRef.current,
      purchase: { ...retained, phase: "submitted" },
    })
    step(
      2,
      "success",
      "Created a cashuB token covering the price and redemption fee"
    )
    step(3, "pending", "Retrying the same resource with X-Cashu")
    const response = await resourceRequest(retained.resourceUrl, {
      "X-Cashu": coco.wallet.encodeToken(token, { removeDleq: false }),
      ...(config.replaySafe
        ? { "X-Cashu-Purchase-Id": retained.requestId }
        : {}),
    })
    const content = await imageResponse(response)
    await save({
      ...contextRef.current,
      purchase: { ...retained, phase: "delivered", content },
    })
    showImage(content)
    step(
      3,
      "success",
      "The protected API returned the image; cached for reload"
    )
    await refresh()
  }

  return {
    view: {
      wallet: {
        status: walletError ? "error" : ready ? "ready" : "not-connected",
        balance: ready ? number(balances.total.spendable) : null,
        mintLabel: new URL(config.mintUrl).hostname,
        message: walletError ?? undefined,
      },
      funding,
      withdrawal,
      purchase,
      trace,
    },
    actions: {
      createInvoice: (amount) =>
        guard("funding", async () => {
          if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000)
            throw new Error("Enter a whole amount between 1 and 100,000 sats.")
          const id = contextRef.current.fundingId
          const previous = id ? await coco.ops.mint.get(id) : null
          if (previous && !["finalized", "failed"].includes(previous.state)) {
            setFunding(null)
            return
          }
          mint.reset()
          setFunding({ status: "creating" })
          const quote = await coco.quotes.mint.create({
            mintUrl: config.mintUrl,
            amount,
            method: "bolt11",
          })
          const operation = await mint.prepare({ quote, amount })
          await save({ ...contextRef.current, fundingId: operation.id })
          setFunding(null)
          await mint.refresh()
        }),
      cancelFunding: () =>
        guard("funding", async () => {
          // A minted invoice cannot be cancelled through this API. Retain its operation until terminal.
          const id = contextRef.current.fundingId
          const operation = id ? await coco.ops.mint.get(id) : null
          if (operation && ["finalized", "failed"].includes(operation.state)) {
            await save({ ...contextRef.current, fundingId: undefined })
            mint.reset()
          }
          setFunding(null)
        }),
      quoteWithdrawal: (invoice) =>
        guard("withdrawal", async () => {
          const id = contextRef.current.withdrawalId
          const previous = id ? await coco.ops.melt.get(id) : null
          if (
            previous &&
            !["finalized", "rolled_back", "failed"].includes(previous.state)
          ) {
            setWithdrawal(null)
            return
          }
          if (!/^ln(bc|tb|bcrt)[0-9]/i.test(invoice))
            throw new Error("Enter a fixed-amount BOLT11 invoice.")
          melt.reset()
          setWithdrawal({ status: "quoting" })
          const quote = await coco.quotes.melt.create({
            mintUrl: config.mintUrl,
            method: "bolt11",
            methodData: { invoice },
          })
          const prepared = await melt.prepare({ quote })
          await save({ ...contextRef.current, withdrawalId: prepared.id })
          setWithdrawal(null)
        }),
      confirmWithdrawal: () =>
        guard("withdrawal", async () => {
          if (withdrawal.status !== "review") return
          setWithdrawal({ status: "paying", quote: withdrawal.quote })
          await melt.execute()
          setWithdrawal(null)
          await refresh()
        }),
      cancelWithdrawal: () =>
        guard("withdrawal", async () => {
          if (
            withdrawal.status === "settled" ||
            (melt.currentOperation &&
              ["failed", "rolled_back"].includes(melt.currentOperation.state))
          ) {
            await save({ ...contextRef.current, withdrawalId: undefined })
            melt.reset()
            setWithdrawal(null)
            return
          }
          if (withdrawal.status !== "review") return
          await melt.cancel()
          await save({ ...contextRef.current, withdrawalId: undefined })
          melt.reset()
          setWithdrawal(null)
          await refresh()
        }),
      requestResource: () =>
        guard("purchase", async () => {
          if (contextRef.current.purchase) return
          if (!config.resourceUrl)
            throw new Error(
              "Set VITE_RESOURCE_URL to the organizer's protected image API, then restart Vite."
            )
          setPurchase({ status: "requesting" })
          setTrace(initialTrace)
          step(0, "pending", "GET the configured protected image")
          const response = await resourceRequest(config.resourceUrl)
          step(0, "success", `HTTP ${response.status}`)
          if (response.status !== 402)
            throw new Error(
              `Expected a 402 challenge; received HTTP ${response.status}. The image remains locked.`
            )
          const encoded = response.headers.get("X-Cashu")
          if (!encoded || encoded.length > 16384)
            throw new Error(
              "Missing or oversized X-Cashu challenge. Check the API's CORS expose headers."
            )
          const request = await coco.paymentRequests.parse(encoded)
          const amount = validateChallenge(
            request,
            config.mintUrl,
            config.maxTotal
          )
          step(
            1,
            "success",
            `${amount} net sats · ${new URL(config.mintUrl).hostname} · ${request.unit}`
          )
          await save({
            ...contextRef.current,
            purchase: {
              resourceUrl: config.resourceUrl,
              requestId: crypto.randomUUID(),
              startedAt: Date.now(),
              phase: "preparing",
            },
          })
          let gross = amount
          for (let attempt = 0; attempt < 16; attempt++) {
            send.reset()
            const operation = await send.prepare({
              mintUrl: config.mintUrl,
              amount: gross,
            })
            await save({
              ...contextRef.current,
              purchase: {
                ...contextRef.current.purchase!,
                operationId: operation.id,
              },
            })
            const receiverFee = await preparedReceiveFee(operation)
            if (gross - receiverFee >= amount) {
              const quote: PaymentQuote = {
                amount,
                fee: gross - amount + number(operation.fee),
                total: gross + number(operation.fee),
              }
              if (quote.total > config.maxTotal) {
                await send.cancel()
                send.reset()
                await save({ ...contextRef.current, purchase: undefined })
                throw new Error(
                  "The price plus fees exceeds the payment limit."
                )
              }
              await save({
                ...contextRef.current,
                purchase: {
                  ...contextRef.current.purchase!,
                  quote,
                  phase: "review",
                },
              })
              setPurchase({ status: "review", quote })
              step(
                2,
                "idle",
                `Review ${quote.total} sats including all fees; payment is reserved, not sent`
              )
              return
            }
            await send.cancel()
            send.reset()
            await save({
              ...contextRef.current,
              purchase: {
                ...contextRef.current.purchase!,
                operationId: undefined,
              },
            })
            gross = Math.max(gross + 1, amount + receiverFee)
            if (gross > config.maxTotal) break
          }
          await save({ ...contextRef.current, purchase: undefined })
          throw new Error(
            "Could not prepare fee coverage within the payment limit."
          )
        }),
      confirmPurchase: () =>
        guard("purchase", async () => {
          const retained = contextRef.current.purchase
          if (
            purchase.status !== "review" ||
            !retained?.quote ||
            !retained.operationId
          )
            return
          await save({
            ...contextRef.current,
            purchase: { ...retained, phase: "executing" },
          })
          setPurchase({ status: "paying", quote: retained.quote })
          step(2, "pending", "Executing the retained send operation once")
          const { token } = await send.execute()
          await deliver(token)
        }),
      cancelPurchase: () =>
        guard("purchase", async () => {
          if (purchase.status !== "review") return
          await send.cancel()
          await save({ ...contextRef.current, purchase: undefined })
          send.reset()
          setPurchase({ status: "locked" })
          setTrace(initialTrace)
          await refresh()
        }),
      recoverPurchase: () =>
        guard("purchase", async () => {
          const retained = contextRef.current.purchase
          if (!retained?.operationId)
            throw new Error(
              "No operation ID is retained. Inspect wallet storage before another purchase."
            )
          const operation = await coco.ops.send.refresh(retained.operationId)
          if (operation.state === "prepared") {
            await send.cancel()
            await save({ ...contextRef.current, purchase: undefined })
            send.reset()
            setPurchase({ status: "locked" })
            setTrace(initialTrace)
            await refresh()
            return
          }
          if (operation.state === "rolled_back") {
            await save({ ...contextRef.current, purchase: undefined })
            send.reset()
            setPurchase({ status: "locked" })
            return
          }
          if (
            !config.replaySafe ||
            !retained.quote ||
            retained.resourceUrl !== config.resourceUrl
          )
            throw new Error(
              "Safe replay is not configured for this resource. Keep the original purchase for reconciliation."
            )
          if (
            !("token" in operation) ||
            !operation.token ||
            !["pending", "finalized"].includes(operation.state)
          )
            throw new Error(
              "No original token is available yet. Reconcile the retained operation before retrying."
            )
          setPurchase({ status: "paying", quote: retained.quote })
          await deliver(operation.token)
        }),
      refreshWithdrawal: () =>
        guard("withdrawal", async () => {
          await melt.refresh()
          setWithdrawal(null)
          await refresh()
        }),
    },
  }
}
