import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e',testMatch:'comments.spec.ts',workers:1,retries:0,timeout:30_000,
  use:{baseURL:'http://localhost:3019',headless:true,launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}},
  webServer:[
    {command:'node tests/support/comments-backend.mjs',url:'http://127.0.0.1:4023/__calls'},
    {command:'npm run start -- --port 3019',url:'http://localhost:3019/acceso',env:{BACKEND_API_URL:'http://127.0.0.1:4023/api/v1',APP_ORIGIN:'http://localhost:3019'},timeout:60_000},
  ],
});
