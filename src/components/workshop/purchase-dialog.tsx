import { LockKeyhole, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import type { PurchaseView, WorkshopActions } from "@/workshop/contracts"
import { formatSats, Notice, OperationResult, QuoteDetails } from "./shared"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchase: PurchaseView
  actions: WorkshopActions
}

export function PurchaseDialog({
  open,
  onOpenChange,
  purchase,
  actions,
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Unlock this image"
      description="Berlin, after hours. A single Cashu payment gives you the full picture."
    >
      <div className="space-y-5">
        {(purchase.status === "locked" || purchase.status === "requesting") && (
          <>
            <div className="flex items-center gap-4 rounded-xl border bg-muted/40 p-4">
              <div className="flex size-11 items-center justify-center rounded-lg border bg-background">
                <LockKeyhole
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="text-sm font-medium">Berlin, after hours.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Price and fees supplied by the API
                </p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              The server’s payment request will supply the price and accepted
              mint. Review the full total before approving a payment.
            </p>
            <Button
              className="h-12 w-full"
              disabled={purchase.status === "requesting"}
              onClick={() => {
                void actions.requestResource()
              }}
            >
              {purchase.status === "requesting" && (
                <LoaderCircle
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              )}
              {purchase.status === "requesting"
                ? "Requesting payment details…"
                : "Request payment details"}
            </Button>
          </>
        )}
        {(purchase.status === "review" || purchase.status === "paying") && (
          <>
            <QuoteDetails quote={purchase.quote} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              The image costs {formatSats(purchase.quote.amount)} sats. The
              total includes the fees needed to deliver that amount.
            </p>
            {purchase.status === "paying" ? (
              <OperationResult
                pending
                title="Unlocking your image"
                description="Waiting for the payment and the image response. Keep this purchase while its result is pending."
              />
            ) : (
              <>
                <Button
                  className="h-12 w-full"

                  onClick={() => {
                    void actions.confirmPurchase()
                  }}
                >
                  <LockKeyhole aria-hidden="true" />
                  Pay {formatSats(purchase.quote.total)} sats & unlock
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"

                  onClick={() => {
                    void actions.cancelPurchase()
                  }}
                >
                  Cancel purchase
                </Button>
              </>
            )}
          </>
        )}
        {purchase.status === "unlocked" && (
          <>
            <OperationResult
              title="The view is yours"
              description="Payment accepted. Your image is ready."
            />
            <Button className="h-11 w-full" onClick={() => onOpenChange(false)}>
              View image
            </Button>
          </>
        )}
        {(purchase.status === "error" || purchase.status === "unresolved") && (
          <>
            <Notice message={purchase.message} />
            {purchase.status === "unresolved" && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  void actions.recoverPurchase()
                }}
              >
                Recover original purchase
              </Button>
            )}
          </>
        )}
        {purchase.status === "error" && (
          <Button
            variant="outline"
            className="h-11 w-full"

            onClick={() => {
              void actions.requestResource()
            }}
          >
            Retry resource request
          </Button>
        )}
      </div>
    </Dialog>
  )
}
