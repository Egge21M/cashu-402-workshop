import { Check, ChevronDown, CircleAlert, LoaderCircle } from "lucide-react"
import type { TraceStep } from "@/workshop/contracts"

export function RequestTrace({ steps }: { steps: TraceStep[] }) {
  return (
    <details className="group rounded-2xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 sm:px-7">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-xs text-primary">HTTP 402</span>
          <span className="text-sm font-medium">Follow the payment</span>
        </span>
        <ChevronDown
          className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <ol className="grid gap-5 border-t px-5 py-5 sm:grid-cols-2 sm:px-7">
        {steps.map((step, index) => (
          <li key={step.label} className="flex min-w-0 gap-3">
            <span
              className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] ${step.status === "success" ? "border-primary/20 bg-primary/10 text-primary" : step.status === "error" || step.status === "unresolved" ? "border-amber-500/30 text-amber-600 dark:text-amber-300" : "text-muted-foreground"}`}
            >
              {step.status === "success" ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : step.status === "pending" ? (
                <LoaderCircle
                  className="size-3.5 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : step.status === "error" || step.status === "unresolved" ? (
                <CircleAlert className="size-3.5" aria-hidden="true" />
              ) : (
                `0${index + 1}`
              )}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold">
                {step.label}
                <span className="sr-only">: {step.status}</span>
              </p>
              <p className="mt-1 text-xs leading-relaxed break-words text-muted-foreground">
                {step.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </details>
  )
}
