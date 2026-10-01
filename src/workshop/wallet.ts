import { IndexedDbRepositories } from "@cashu/coco-indexeddb"
import { generateMnemonic, mnemonicToSeed } from "@scure/bip39"
import { wordlist } from "@scure/bip39/wordlists/english.js"
import { config } from "./config"

// This is a disposable browser wallet. Never import a personal seed here.
async function seedGetter() {
  const key = `${config.walletName}-mnemonic`
  let mnemonic = localStorage.getItem(key)
  if (!mnemonic) {
    mnemonic = generateMnemonic(wordlist)
    localStorage.setItem(key, mnemonic)
  }
  return mnemonicToSeed(mnemonic)
}
export const walletConfig = {
  repo: new IndexedDbRepositories({ name: config.walletName }),
  seedGetter,
}
