import { useEffect, useState, type ReactNode } from "react"
import { CocoCashuProvider, useMints, useManager } from "@cashu/coco-react"
import { walletConfig } from "./wallet"
import { config } from "./config"
import {
  readContext,
  type WalletContext,
  type OperationBindings,
} from "./storage"

export function WalletMessage({ children }: { children: ReactNode }) {
  return (
    <main className="page-width py-16">
      <h1 className="text-2xl font-semibold">Cashu workshop wallet</h1>
      <p className="mt-4" role="status">
        {children}
      </p>
    </main>
  )
}

function TrustedWallet({
  context,
  children,
}: {
  context: WalletContext
  children: (context: WalletContext, operations: OperationBindings) => ReactNode
}) {
  const { addNewMint } = useMints()
  const manager = useManager()
  const [operations, setOperations] = useState<OperationBindings | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    void (async () => {
      await addNewMint(config.mintUrl, { trusted: true })
      const [mint, melt, send] = await Promise.all([
        context.fundingId ? manager.ops.mint.get(context.fundingId) : undefined,
        context.withdrawalId
          ? manager.ops.melt.get(context.withdrawalId)
          : undefined,
        context.purchase?.operationId
          ? manager.ops.send.get(context.purchase.operationId)
          : undefined,
      ])
      if (
        (context.fundingId && !mint) ||
        (context.withdrawalId && !melt) ||
        (context.purchase?.operationId && !send)
      )
        throw new Error("A retained operation is missing.")
      // Object bindings avoid the published hooks' duplicate ID-hydration race in Strict Mode.
      if (active)
        setOperations({
          mint: mint ?? undefined,
          melt: melt ?? undefined,
          send: send ?? undefined,
        })
    })().catch(() => {
      if (active) setError(true)
    })
    return () => {
      active = false
    }
  }, [addNewMint, manager, context])
  if (error)
    return (
      <WalletMessage>
        Mint or operation recovery failed. Check connectivity and browser
        storage, then reload.
      </WalletMessage>
    )
  if (!operations)
    return (
      <WalletMessage>
        Connecting to the mint and recovering wallet operations…
      </WalletMessage>
    )
  return children(context, operations)
}

export function WorkshopWallet({
  children,
}: {
  children: (context: WalletContext, operations: OperationBindings) => ReactNode
}) {
  const [context, setContext] = useState<WalletContext | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    let release = () => {}
    const abort = new AbortController()
    if (!navigator.locks) {
      void Promise.resolve().then(() => {
        if (active)
          setFailure("This demo needs a browser with Web Locks support.")
      })
      return
    }
    void navigator.locks
      .request(config.walletName, { signal: abort.signal }, async (lock) => {
        if (!active) return
        if (!lock) {
          if (active)
            setFailure(
              "This wallet is open in another tab. Close that tab, then reload."
            )
          return
        }
        await new Promise<void>((resolve) => {
          release = resolve
          void readContext()
            .then((stored) => {
              if (stored && stored.mintUrl !== config.mintUrl)
                throw new Error(
                  "Mint configuration changed. Use a fresh browser profile for a different mint."
                )
              if (active) setContext(stored ?? { mintUrl: config.mintUrl })
            })
            .catch((error: Error) => {
              if (active) setFailure(error.message)
            })
        })
      })
      .catch(() => {
        if (active) setFailure("Could not acquire the wallet lock.")
      })
    return () => {
      active = false
      abort.abort()
      release()
    }
  }, [])
  if (failure) return <WalletMessage>{failure}</WalletMessage>
  if (!context)
    return (
      <WalletMessage>
        Waiting for wallet access. Close any other tab using this wallet.
      </WalletMessage>
    )
  return (
    <CocoCashuProvider
      config={walletConfig}
      fallback={<WalletMessage>Initializing Coco…</WalletMessage>}
      errorFallback={
        <WalletMessage>
          Wallet initialization failed. Check browser storage and reload.
        </WalletMessage>
      }
    >
      <TrustedWallet context={context}>{children}</TrustedWallet>
    </CocoCashuProvider>
  )
}
