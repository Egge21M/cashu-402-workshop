import { ArrowUpRight, Check, LockKeyhole, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PurchaseView } from "@/workshop/contracts"

export function LockedImage({
  purchase,
  onPay,
}: {
  purchase: PurchaseView
  onPay: () => void
}) {
  const unlocked = purchase.status === "unlocked"
  const pending =
    purchase.status === "requesting" || purchase.status === "paying"
  return (
    <section
      className="overflow-hidden rounded-2xl border bg-card"
      aria-labelledby="image-heading"
    >
      <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-7">
        <div>
          <p className="eyebrow mb-1.5 text-muted-foreground">
            THE LITTLE PAYWALL
          </p>
          <h2
            id="image-heading"
            className="text-xl font-semibold tracking-tight"
          >
            Berlin, after hours.
          </h2>
        </div>
        <span className={`status-pill ${unlocked ? "status-pill-green" : ""}`}>
          {unlocked ? (
            <Check className="size-3" aria-hidden="true" />
          ) : (
            <LockKeyhole className="size-3" aria-hidden="true" />
          )}
          {unlocked ? "Unlocked" : "Price at checkout"}
        </span>
      </div>
      <div className="postcard relative isolate flex min-h-88 items-center justify-center overflow-hidden bg-[#182e28] sm:min-h-104">
        {unlocked ? (
          <img
            src={purchase.contentUrl}
            alt="Berlin postcard: the television tower and city rooftops under a warm evening sky"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <img
            src="/berlin-preview.svg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-105 object-cover"
          />
        )}
        {!unlocked && (
          <>
            <div className="absolute inset-0 bg-[#071e17]/45" />
            <div className="relative flex max-w-sm flex-col items-center px-6 py-12 text-center text-white">
              <div className="mb-5 flex size-12 items-center justify-center rounded-full border border-white/25 bg-white/10 backdrop-blur-md">
                <LockKeyhole className="size-5" aria-hidden="true" />
              </div>
              <h3 className="text-[1.9rem] leading-tight font-semibold tracking-[-0.04em] sm:text-4xl">
                A postcard worth
                <br />a little bitcoin.
              </h3>
              <p className="mt-3 max-w-64 text-sm leading-relaxed text-white/75">
                A tiny payment. A full-size image.
                <br />
                No account needed.
              </p>
              <Button
                className="mt-6 h-12 gap-3 px-5 text-sm shadow-lg"
                onClick={onPay}
                aria-haspopup="dialog"
              >
                {pending ? (
                  <LoaderCircle
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  <LockKeyhole aria-hidden="true" />
                )}
                {purchase.status === "unresolved"
                  ? "Review payment status"
                  : pending
                    ? "View payment progress"
                    : purchase.status === "review"
                      ? "Review payment"
                      : "Pay to unlock"}
                {!pending && purchase.status !== "unresolved" && (
                  <ArrowUpRight aria-hidden="true" />
                )}
              </Button>
            </div>
          </>
        )}
        {unlocked && (
          <span className="absolute bottom-5 left-5 rounded-full bg-black/55 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
            Unlocked with Cashu
          </span>
        )}
        {!unlocked && (
          <div className="absolute right-5 bottom-4 left-5 flex justify-between gap-3 font-mono text-[10px] tracking-wide text-white/60">
            <span>PUBLIC BLURRED PREVIEW</span>
            <span>402 / PAYMENT REQUIRED</span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-xs text-muted-foreground sm:px-7">
        <span>A Berlin postcard, powered by Cashu.</span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-primary" />
          Pay once. Enjoy the view.
        </span>
      </div>
    </section>
  )
}
