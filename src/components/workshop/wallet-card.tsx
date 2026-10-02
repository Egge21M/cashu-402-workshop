import { ArrowDownLeft, ArrowUpRight, Circle, Wallet, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { WalletView } from "@/workshop/contracts"
import { formatSats } from "./shared"

export function WalletCard({
  wallet,
  onFund,
  onWithdraw,
}: {
  wallet: WalletView
  onFund: () => void
  onWithdraw: () => void
}) {
  return (
    <section
      className="overflow-hidden rounded-2xl border bg-card"
      aria-labelledby="wallet-heading"
    >
      <div className="p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="wallet-heading"
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <Wallet className="size-4" aria-hidden="true" /> Your wallet
          </h2>
          <span
            className={`status-pill ${wallet.status === "ready" ? "status-pill-green" : ""}`}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {wallet.status === "ready"
              ? "Ready"
              : wallet.status === "error"
                ? "Needs attention"
                : "Not connected"}
          </span>
        </div>
        <p className="mt-9 text-xs text-muted-foreground">Spendable balance</p>
        <p className="mt-2 flex items-baseline gap-2" aria-live="polite">
          <span className="text-5xl font-semibold tracking-[-0.07em] tabular-nums">
            {wallet.balance === null ? "—" : formatSats(wallet.balance)}
          </span>
          <span className="text-lg text-muted-foreground">sats</span>
        </p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {wallet.message ?? "Spendable ecash at your configured mint."}
        </p>
        <div className="mt-7 grid grid-cols-2 gap-2">
          <Button className="h-11" onClick={onFund} aria-haspopup="dialog">
            <ArrowDownLeft aria-hidden="true" /> Add funds
          </Button>
          <Button
            className="h-11"
            variant="outline"
            onClick={onWithdraw}
            aria-haspopup="dialog"
          >
            <ArrowUpRight aria-hidden="true" /> Withdraw
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 border-t bg-muted/30 px-6 py-4 sm:px-7">
        <span className="text-xs text-muted-foreground">Mint</span>
        <span className="flex items-center gap-2 text-xs font-medium">
          <Circle className="size-2 text-muted-foreground" aria-hidden="true" />
          {wallet.mintLabel}
        </span>
      </div>
      <div className="flex items-start gap-2 border-t px-6 py-4 text-xs leading-relaxed text-muted-foreground sm:px-7">
        <Zap className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Fund and withdraw through Lightning. Pay for content with Cashu.
      </div>
    </section>
  )
}
