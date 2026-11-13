import { defineConfig } from "@playwright/test";

// Both servers are local and isolated. No test uses the real backend.
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  retries: 0,
  timeout: 45_000,
  use: {
    baseURL: "http://localhost:3015",
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {},
  },
  webServer: [
    {
      command: `"${process.env.POSTMAN_EXECUTABLE ?? "postman"}" simulation run postman/simulations/auth.sim.yaml --port 4020 --no-history --output ndjson`,
      url: "http://127.0.0.1:4020/blog-auth/api/v1/auth/me",
      timeout: 60_000,
      stdout: "pipe",
    },
    {
      command: "npm run start -- --port 3015",
      url: "http://localhost:3015/acceso",
      env: { BACKEND_API_URL: "http://127.0.0.1:4020/blog-auth/api/v1", APP_ORIGIN: "http://localhost:3015" },
      timeout: 60_000,
    },
  ],
});
