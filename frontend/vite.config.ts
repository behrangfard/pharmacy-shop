import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * نسخهٔ کش سرویس‌ورکر را در هر build خودکار عوض می‌کند.
 *
 * فایل public/sw.js دستی نگه‌داری می‌شود و مقدار VERSION داخلش ثابت است؛
 * اگر این مقدار دستی عوض نشود، مرورگر نام کش قدیمی را می‌بیند و فایل‌های
 * کهنه را نگه می‌دارد. این پلاگین بعد از نوشته‌شدن dist، از نام فایل‌های
 * هش‌دار (assets) یک اثر انگشت می‌سازد و جای VERSION می‌گذارد؛ در نتیجه هر
 * تغییر واقعی در باندل، نسخهٔ کش را هم عوض می‌کند.
 */
function serviceWorkerVersion(): Plugin {
  let outDir = path.resolve('dist')

  return {
    name: 'behrang-sw-version',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      const swPath = path.join(outDir, 'sw.js')

      try {
        const source = await readFile(swPath, 'utf8')
        const assets = await readdir(path.join(outDir, 'assets'))
        const fingerprint = createHash('sha256')
          .update(
            assets
              .filter((name) => /\.(js|css)$/.test(name))
              .sort()
              .join('|'),
          )
          .digest('hex')
          .slice(0, 10)

        const pattern = /const VERSION = "[^"]*";/

        if (!pattern.test(source)) {
          this.warn(
            'الگوی VERSION در sw.js پیدا نشد؛ نسخهٔ کش سرویس‌ورکر تغییر نکرد.',
          )
          return
        }

        await writeFile(
          swPath,
          source.replace(pattern, `const VERSION = "${fingerprint}";`),
          'utf8',
        )

        this.info(`نسخهٔ کش سرویس‌ورکر: ${fingerprint}`)
      } catch (error) {
        this.warn(`به‌روزرسانی نسخهٔ سرویس‌ورکر انجام نشد: ${String(error)}`)
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorkerVersion()],
  server: {
    port: 5173,
    // listening روی همهٔ اینترفیس‌ها: هم روی همین کامپیوتر (localhost) و هم با
    // IP شبکهٔ محلی از گوشی/تبلتِ وصل به همان مودم باز می‌شود.
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },

})
