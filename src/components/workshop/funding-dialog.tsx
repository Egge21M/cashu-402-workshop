import { useState } from "react"
import { Copy, LoaderCircle, Zap } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { FundingView, WorkshopActions } from "@/workshop/contracts"
import { formatSats, Notice, OperationResult } from "./shared"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  funding: FundingView
  actions: WorkshopActions
}

export function FundingDialog({ open, onOpenChange, funding, actions }: Props) {
  const [amount, setAmount] = useState("1000")
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  async function copyInvoice(invoice: string) {
    try {
      await navigator.clipboard.writeText(invoice)
      setCopyFeedback("Invoice copied.")
    } catch {
      setCopyFeedback("Copy is unavailable. Select and copy the invoice below.")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a little bitcoin"
      description="Create a Lightning invoice, pay it from your wallet, and receive Cashu ecash."
    >
      <div className="space-y-5">
        {(funding.status === "idle" ||
          funding.status === "creating" ||
          funding.status === "error" ||
          funding.status === "expired") && (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault()
              void actions.createInvoice(Number(amount))
            }}
          >
            {(funding.status === "error" || funding.status === "expired") && (
              <Notice message={funding.message} />
            )}
            <div>
              <label
                htmlFor="funding-amount"
                className="mb-2 block text-sm font-medium"
              >
                Amount
              </label>
              <div className="relative">
                <Input
                  id="funding-amount"
                  name="amount"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={funding.status === "creating"}
                  className="pr-14 text-base"
                />
                <span className="pointer-events-none absolute top-3.5 right-3 text-sm text-muted-foreground">
                  sats
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[100, 500, 1000].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    disabled={funding.status === "creating"}
                    aria-pressed={amount === String(preset)}
                    className={
                      amount === String(preset)
                        ? "border-primary bg-primary/5 text-primary"
                        : "text-muted-foreground"
                    }
                    onClick={() => setAmount(String(preset))}
                  >
                    {formatSats(preset)}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              type="submit"
              className="h-12 w-full"
              disabled={funding.status === "creating"}
            >
              {funding.status === "creating" ? (
                <LoaderCircle
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Zap aria-hidden="true" />
              )}
              {funding.status === "creating"
                ? "Creating invoice…"
                : "Create Lightning invoice"}
            </Button>
          </form>
        )}
        {funding.status === "pending" && (
          <>
            <div className="text-center">
              <p className="text-3xl font-semibold tracking-tight">
                {formatSats(funding.amount)}{" "}
                <span className="text-lg font-normal text-muted-foreground">
                  sats
                </span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Scan with a Lightning wallet
              </p>
            </div>
            <div className="mx-auto w-fit rounded-xl border bg-white p-4">
              <QRCodeSVG
                value={funding.invoice}
                size={200}
                marginSize={2}
                title={`Lightning invoice for ${funding.amount} sats`}
              />
            </div>
            <div
              className="flex items-center justify-center gap-2 text-xs text-muted-foreground"
              role="status"
            >
              <span className="size-1.5 rounded-full bg-amber-500" />
              Waiting for payment
            </div>
            <div>
              <label
                htmlFor="funding-invoice"
                className="mb-2 block text-xs font-medium"
              >
                Lightning invoice
              </label>
              <Input
                id="funding-invoice"
                readOnly
                value={funding.invoice}
                className="font-mono text-xs"
              />
            </div>
            <Button
              variant="outline"
              className="h-11 w-full"
              onClick={() => {
                void copyInvoice(funding.invoice)
              }}
            >
              <Copy aria-hidden="true" />
              Copy invoice
            </Button>
            {copyFeedback && (
              <p
                className="text-center text-xs text-muted-foreground"
                role="status"
              >
                {copyFeedback}
              </p>
            )}
            <p className="text-center text-xs text-muted-foreground">
              Expires in {funding.expiresLabel}
            </p>
            <Button
              variant="ghost"
              className="w-full"

              onClick={() => {
                void actions.cancelFunding()
                onOpenChange(false)
              }}
            >
              Close invoice
            </Button>
          </>
        )}
        {funding.status === "settled" && (
          <>
            <OperationResult
              title="Funds received"
              description={`${formatSats(funding.amount)} sats have been added to your wallet.`}
            />
            <Button
              className="h-11 w-full"
              onClick={() => {
                void actions.cancelFunding()
                onOpenChange(false)
              }}
            >
              Back to the demo
            </Button>
          </>
        )}
      </div>
    </Dialog>
  )
}
