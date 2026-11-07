import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'differential.pw.ts',workers:1,reporter:'list',outputDir:process.env.TMPDIR+'/ui-library-playwright',use:{baseURL:'http://127.0.0.1:4196',browserName:'chromium',headless:true},webServer:{cwd:fileURLToPath(new URL('../../..',import.meta.url)),command:'pnpm exec vite --host 127.0.0.1 --port 4196 --strictPort',url:'http://127.0.0.1:4196/src/browser/ui-library/index.html',reuseExistingServer:false,timeout:120000}});
