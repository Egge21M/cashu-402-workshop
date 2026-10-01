import {
  normalizeMintUrl,
  type Manager,
  type PreparedSendOperation,
} from "@cashu/coco-core"
import type { Token } from "@cashu/cashu-ts"
import { walletConfig } from "./wallet"
type ResolvedPaymentRequest = Awaited<
  ReturnType<Manager["paymentRequests"]["parse"]>
>
import { config } from "./config"

export async function resourceRequest(url: string, headers?: HeadersInit) {
  return fetch(url, {
    headers,
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  })
}

export function validateChallenge(
  request: ResolvedPaymentRequest,
  mintUrl: string,
  maxTotal: number
): number {
  if (request.transport.type !== "inband")
    throw new Error("This resource must use an in-band X-Cashu payment.")
  if (request.unit !== "sat" || request.paymentRequest.unit !== "sat")
    throw new Error("Only explicit sat requests are supported.")
  if (!request.allowedMints.some((mint) => normalizeMintUrl(mint) === mintUrl))
    throw new Error("The API does not accept the configured trusted mint.")
  if (request.spendingCondition)
    throw new Error(
      "Locking conditions are outside this workshop's payment policy."
    )
  const amount = Number(request.amount?.toString())
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > maxTotal)
    throw new Error(
      "The requested amount is missing, invalid, or over the payment limit."
    )
  return amount
}

export function inputFee(
  ids: string[],
  keysets: { id: string; feePpk: number }[]
): number {
  const rates = new Map(keysets.map((keyset) => [keyset.id, keyset.feePpk]))
  return Math.ceil(
    ids.reduce((total, id) => {
      const rate = rates.get(id)
      if (rate === undefined || !Number.isSafeInteger(rate) || rate < 0)
        throw new Error("Unknown token keyset fee.")
      return total + rate
    }, 0) / 1000
  )
}

export async function preparedReceiveFee(
  operation: PreparedSendOperation
): Promise<number> {
  const keysets = await walletConfig.repo.keysetRepository.getKeysetsByMintUrl(
    config.mintUrl
  )
  if (operation.needsSwap) {
    if (!operation.outputData?.send.length)
      throw new Error("Missing outgoing output plan.")
    return inputFee(
      operation.outputData.send.map((output) => output.blindedMessage.id),
      keysets
    )
  }
  const proofs = await walletConfig.repo.proofRepository.getProofsBySecrets(
    config.mintUrl,
    operation.inputProofSecrets
  )
  if (proofs.length !== operation.inputProofSecrets.length)
    throw new Error("Missing reserved send proofs.")
  return inputFee(
    proofs.map((proof) => proof.id),
    keysets
  )
}

export async function verifyToken(
  manager: Manager,
  token: Token,
  netAmount: number
) {
  const { keysets } = await manager.mint.addMint(config.mintUrl, {
    trusted: true,
  })
  const fee = inputFee(
    token.proofs.map((proof) => proof.id),
    keysets
  )
  const gross = token.proofs.reduce(
    (sum, proof) => sum + Number(proof.amount.toString()),
    0
  )
  if (
    normalizeMintUrl(token.mint) !== config.mintUrl ||
    token.unit !== "sat" ||
    gross - fee < netAmount
  )
    throw new Error("The outgoing token does not cover the approved net price.")
}

export async function imageResponse(response: Response): Promise<Blob> {
  if (!response.ok)
    throw new Error(`Resource response: HTTP ${response.status}.`)
  const type = response.headers.get("Content-Type")?.split(";")[0]
  if (
    !type ||
    ![
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "image/avif",
      "image/svg+xml",
    ].includes(type)
  )
    throw new Error("The API did not return a supported image.")
  const blob = await response.blob()
  if (!blob.size || blob.size > 10 * 1024 * 1024)
    throw new Error("The resource is empty or exceeds the 10 MB demo limit.")
  return blob
}
