import { AlertCircle, Check, LoaderCircle } from "lucide-react"
import type { PaymentQuote } from "@/workshop/contracts"

export const formatSats = (amount: number) =>
  new Intl.NumberFormat("en-US").format(amount)

export function Notice({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-3 text-xs leading-relaxed text-amber-800 dark:text-amber-200"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}

export function QuoteDetails({
  quote,
  feeLabel = "Payment fees",
}: {
  quote: PaymentQuote
  feeLabel?: string
}) {
  return (
    <dl className="rounded-xl border bg-muted/40 p-4 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Amount</dt>
        <dd className="font-medium tabular-nums">
          {formatSats(quote.amount)} sats
        </dd>
      </div>
      <div className="mt-3 flex justify-between gap-4">
        <dt className="text-muted-foreground">{feeLabel}</dt>
        <dd className="font-medium tabular-nums">
          {formatSats(quote.fee)} sats
        </dd>
      </div>
      <div className="mt-4 flex justify-between gap-4 border-t pt-4">
        <dt className="font-medium">Total to approve</dt>
        <dd className="font-semibold tabular-nums">
          {formatSats(quote.total)} sats
        </dd>
      </div>
    </dl>
  )
}

export function OperationResult({
  title,
  description,
  pending = false,
}: {
  title: string
  description: string
  pending?: boolean
}) {
  const Icon = pending ? LoaderCircle : Check
  return (
    <div className="space-y-3 py-5 text-center" role="status">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon
          className={`size-6 ${pending ? "animate-spin motion-reduce:animate-none" : ""}`}
          aria-hidden="true"
        />
      </span>
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
