import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_")
  const backend = env.VITE_RESOURCE_PROXY_TARGET
    ? new URL(env.VITE_RESOURCE_PROXY_TARGET)
    : null
  if (
    backend &&
    backend.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(backend.hostname)
  )
    throw new Error("Resource proxy requires HTTPS or localhost.")
  const proxy = backend
    ? {
        "/api/workshop-image": {
          target: backend.origin,
          changeOrigin: true,
          rewrite: () => backend.pathname + backend.search,
        },
      }
    : undefined
  return {
    server: { hmr: false, host: "127.0.0.1", proxy },
    preview: { host: "127.0.0.1", proxy },
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": resolve(import.meta.dirname, "./src") } },
  }
})
