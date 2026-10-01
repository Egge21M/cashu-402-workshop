import { useState } from "react"
import { ArrowUpRight, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { WalletCard } from "@/components/workshop/wallet-card"
import { LockedImage } from "@/components/workshop/locked-image"
import { FundingDialog } from "@/components/workshop/funding-dialog"
import { WithdrawalDialog } from "@/components/workshop/withdrawal-dialog"
import { PurchaseDialog } from "@/components/workshop/purchase-dialog"
import { RequestTrace } from "@/components/workshop/request-trace"
import { useWorkshopIntegration } from "@/workshop/integration"

import type { WalletContext, OperationBindings } from "@/workshop/storage"
import { isTestMint } from "@/workshop/config"

type DemoDialog = "funding" | "withdrawal" | "purchase"

export function App({
  context,
  operations,
}: {
  context: WalletContext
  operations: OperationBindings
}) {
  const { view, actions } = useWorkshopIntegration(context, operations)
  const [dialog, setDialog] = useState<DemoDialog | null>(null)
  const { theme, setTheme } = useTheme()
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  return (
    <div className="min-h-svh">
      <header className="bg-[#18181b] text-white">
        <div className="page-width flex h-18 items-center justify-between gap-4">
          <a
            href="/"
            className="flex items-center gap-3"
            aria-label="Cashu demo home"
          >
            <img
              src="/cashu.png"
              alt=""
              className="h-9 w-8 object-contain [image-rendering:pixelated]"
            />
            <span className="text-xl font-bold tracking-tight">
              cashu<span className="ml-1 font-mono text-[#59d78b]">++</span>
            </span>
            <span className="ml-2 hidden border-l border-white/20 pl-4 font-mono text-[10px] tracking-[0.12em] text-white/55 sm:block">
              BERLIN / 2026
            </span>
          </a>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white/20 px-2.5 py-1 font-mono text-[10px] text-white/70">
              COCO DEMO
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/70 hover:bg-white/10 hover:text-white"
              aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
              onClick={() => setTheme(dark ? "light" : "dark")}
            >
              {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </Button>
          </div>
        </div>
      </header>
      <main className="page-width py-10 sm:py-14">
        <div className="mb-9 flex items-end justify-between gap-8 sm:mb-11">
          <div>
            <p className="eyebrow mb-4 flex items-center gap-2.5 text-muted-foreground">
              <span className="size-2 rounded-full bg-primary" />
              CASHU PAYMENTS MADE SIMPLE
            </p>
            <h1 className="max-w-3xl text-[clamp(2.5rem,5.7vw,4.75rem)] leading-[1.02] font-semibold tracking-[-0.065em]">
              Small payments.
              <br />
              Open possibilities<span className="text-primary">.</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              Fund a wallet. Unlock an image. Send the rest home.
              <br className="hidden sm:block" /> A little tour of bitcoin
              payments, powered by Cashu.
            </p>
          </div>
          <div className="hidden pb-1 font-mono text-[10px] leading-6 tracking-wider text-muted-foreground lg:block">
            <p>
              LIGHTNING IN{" "}
              <ArrowUpRight className="ml-2 inline size-3" aria-hidden="true" />
            </p>
            <p>CASHU IN BETWEEN</p>
            <p>
              LIGHTNING OUT{" "}
              <ArrowUpRight className="ml-2 inline size-3" aria-hidden="true" />
            </p>
          </div>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-5">
            <WalletCard
              wallet={view.wallet}
              onFund={() => setDialog("funding")}
              onWithdraw={() => setDialog("withdrawal")}
            />
            <div className="px-1 py-1">
              <p className="eyebrow mb-4 text-muted-foreground">
                THREE SMALL STEPS
              </p>
              <ol className="space-y-4">
                {[
                  ["Fund", "Lightning becomes ecash."],
                  ["Unlock", "Ecash opens the paywall."],
                  ["Withdraw", "Ecash goes back to Lightning."],
                ].map(([title, detail], index) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] text-muted-foreground">
                      0{index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold">{title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="min-w-0 space-y-4">
            <LockedImage
              purchase={view.purchase}
              onPay={() => {
                setDialog("purchase")
                if (
                  view.purchase.status === "locked" ||
                  view.purchase.status === "error"
                ) {
                  void actions.requestResource()
                }
              }}
            />
            <RequestTrace steps={view.trace} />
          </div>
        </div>
        <footer className="mt-10 border-t pt-5 sm:mt-12">
          <p className="text-xs text-muted-foreground">
            {isTestMint
              ? "Testnut demo: simulated sats. Do not pay these invoices with real bitcoin."
              : "Disposable workshop wallet. Use small amounts and verify Lightning receipt externally."}
          </p>
        </footer>
      </main>
      <FundingDialog
        actions={actions}
        open={dialog === "funding"}
        onOpenChange={(open) => setDialog(open ? "funding" : null)}
        funding={view.funding}
      />
      <WithdrawalDialog
        actions={actions}
        open={dialog === "withdrawal"}
        onOpenChange={(open) => setDialog(open ? "withdrawal" : null)}
        withdrawal={view.withdrawal}
      />
      <PurchaseDialog
        actions={actions}
        open={dialog === "purchase"}
        onOpenChange={(open) => setDialog(open ? "purchase" : null)}
        purchase={view.purchase}
      />
    </div>
  )
}

export default App
