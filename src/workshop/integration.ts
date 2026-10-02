import type {
  WorkshopActions,
  WorkshopIntegration,
  WorkshopView,
} from "./contracts"

// Implement the five workshop steps here. These actions intentionally do nothing.
const noOp = async (): Promise<void> => {}

const actions: WorkshopActions = {
  createInvoice: noOp,
  cancelFunding: noOp,
  quoteWithdrawal: noOp,
  confirmWithdrawal: noOp,
  cancelWithdrawal: noOp,
  requestResource: noOp,
  confirmPurchase: noOp,
  cancelPurchase: noOp,
  recoverPurchase: noOp,
  refreshWithdrawal: noOp,
}

const view: WorkshopView = {
  wallet: {
    status: "not-connected",
    balance: null,
    mintLabel: "testnut.cashu.space",
    message: "Connect the wallet during the workshop.",
  },
  funding: { status: "idle" },
  withdrawal: { status: "idle" },
  purchase: { status: "locked" },
  trace: [
    { label: "Request", detail: "Ask for the protected image", status: "idle" },
    {
      label: "402 challenge",
      detail: "Inspect the price and mint",
      status: "idle",
    },
    { label: "Payment", detail: "Approve and send Cashu", status: "idle" },
    { label: "Content", detail: "Retry and receive the image", status: "idle" },
  ],
}

export function useWorkshopIntegration(): WorkshopIntegration {
  return { view, actions }
}
