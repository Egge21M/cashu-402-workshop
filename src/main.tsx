import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

import { WorkshopWallet } from "@/workshop/wallet-provider"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="cashu-workshop-theme">
      <WorkshopWallet>
        {(context, operations) => (
          <App context={context} operations={operations} />
        )}
      </WorkshopWallet>
    </ThemeProvider>
  </StrictMode>
)
