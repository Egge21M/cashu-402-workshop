import { useState } from "react"
import { ArrowUpRight, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { WithdrawalView, WorkshopActions } from "@/workshop/contracts"
import { formatSats, Notice, OperationResult, QuoteDetails } from "./shared"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  withdrawal: WithdrawalView
  actions: WorkshopActions
}

export function WithdrawalDialog({
  open,
  onOpenChange,
  withdrawal,
  actions,
}: Props) {
  const [invoice, setInvoice] = useState("")
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Send it back to Lightning"
      description="Paste an invoice from your Lightning wallet. Review the amount and fees before paying."
    >
      <div className="space-y-5">
        {(withdrawal.status === "idle" ||
          withdrawal.status === "quoting" ||
          withdrawal.status === "error") && (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault()
              void actions.quoteWithdrawal(invoice.trim())
            }}
          >
            {withdrawal.status === "error" && (
              <Notice message={withdrawal.message} />
            )}
            <div>
              <label
                htmlFor="withdrawal-invoice"
                className="mb-2 block text-sm font-medium"
              >
                Lightning invoice
              </label>
              <Textarea
                id="withdrawal-invoice"
                name="invoice"
                placeholder="lnbc…"
                className="font-mono text-xs"
                value={invoice}
                onChange={(event) => setInvoice(event.target.value)}
                required
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                disabled={withdrawal.status === "quoting"}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Use a BOLT11 invoice with an amount.
              </p>
            </div>
            <Button
              type="submit"
              className="h-12 w-full"
              disabled={!invoice.trim() || withdrawal.status === "quoting"}
            >
              {withdrawal.status === "quoting" ? (
                <LoaderCircle
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <ArrowUpRight aria-hidden="true" />
              )}
              {withdrawal.status === "quoting"
                ? "Checking invoice…"
                : "Review withdrawal"}
            </Button>
          </form>
        )}
        {(withdrawal.status === "review" || withdrawal.status === "paying") && (
          <>
            <QuoteDetails
              quote={withdrawal.quote}
              feeLabel="Maximum fee reserve"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Any unused fee reserve is returned after settlement.
            </p>
            {withdrawal.status === "paying" ? (
              <OperationResult
                pending
                title="Payment in progress"
                description="Waiting for the Lightning payment to settle. Keep this operation while its result is pending."
              />
            ) : (
              <>
                <Button
                  className="h-12 w-full"

                  onClick={() => {
                    void actions.confirmWithdrawal()
                  }}
                >
                  <ArrowUpRight aria-hidden="true" />
                  Confirm withdrawal
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"

                  onClick={() => {
                    void actions.cancelWithdrawal()
                  }}
                >
                  Cancel withdrawal
                </Button>
              </>
            )}
          </>
        )}
        {withdrawal.status === "settled" && (
          <>
            <OperationResult
              title="Sent through Lightning"
              description={`${formatSats(withdrawal.quote.amount)} sats were sent to the invoice.`}
            />
            <Button
              className="h-11 w-full"
              onClick={() => {
                void actions.cancelWithdrawal()
                onOpenChange(false)
              }}
            >
              Back to the demo
            </Button>
          </>
        )}
        {withdrawal.status === "unresolved" && (
          <>
            <Notice message={withdrawal.message} />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                void actions.refreshWithdrawal()
              }}
            >
              Check original withdrawal
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              The payment result needs to be checked before another withdrawal.
            </p>
          </>
        )}
      </div>
    </Dialog>
  )
}
