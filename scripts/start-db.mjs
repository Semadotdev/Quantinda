import { startPrismaDevServer } from "@prisma/dev"

const server = await startPrismaDevServer({})
console.log("Prisma Dev database running")
console.log("Database URL: postgres://postgres:postgres@localhost:51214/template1?sslmode=disable")
console.log("HTTP URL:", server?.url)

process.on("SIGINT", () => {
  console.log("\nShutting down...")
  process.exit(0)
})

process.on("SIGTERM", () => {
  console.log("\nShutting down...")
  process.exit(0)
})

await new Promise(() => {})
