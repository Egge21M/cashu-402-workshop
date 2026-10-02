/** UI views populated by the Coco integration. */
export type WalletView = {
  status: "not-connected" | "ready" | "error"
  balance: number | null
  mintLabel: string
  message?: string
}

export type FundingView =
  | { status: "idle" | "creating" }
  | { status: "pending"; amount: number; invoice: string; expiresLabel: string }
  | { status: "settled"; amount: number }
  | { status: "expired" | "error"; message: string }

export type PaymentQuote = {
  amount: number
  fee: number
  total: number
}

export type WithdrawalView =
  | { status: "idle" | "quoting" }
  | { status: "review" | "paying" | "settled"; quote: PaymentQuote }
  | { status: "error" | "unresolved"; message: string }

export type PurchaseView =
  | { status: "locked" | "requesting" }
  | { status: "review" | "paying"; quote: PaymentQuote }
  | { status: "unlocked"; contentUrl: string }
  | { status: "error" | "unresolved"; message: string }

export type TraceStep = {
  label: string
  detail: string
  status: "idle" | "pending" | "success" | "error" | "unresolved"
}

export type WorkshopView = {
  wallet: WalletView
  funding: FundingView
  withdrawal: WithdrawalView
  purchase: PurchaseView
  trace: TraceStep[]
}

export type WorkshopActions = {
  createInvoice: (amountSats: number) => Promise<void>
  cancelFunding: () => Promise<void>
  quoteWithdrawal: (bolt11: string) => Promise<void>
  confirmWithdrawal: () => Promise<void>
  cancelWithdrawal: () => Promise<void>
  requestResource: () => Promise<void>
  confirmPurchase: () => Promise<void>
  cancelPurchase: () => Promise<void>
  recoverPurchase: () => Promise<void>
  refreshWithdrawal: () => Promise<void>
}

export type WorkshopIntegration = {
  view: WorkshopView
  actions: WorkshopActions
}
