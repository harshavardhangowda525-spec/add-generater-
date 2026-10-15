import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { copyFileSync, existsSync } from 'node:fs';

/** Routes listed in sitemap.xml (training detail pages included). */
const ROUTES = [
  '/',
  '/training/strength-training',
  '/training/personalised-coaching',
  '/training/mobility-and-movement',
  '/training/general-fitness',
  '/privacy',
];

/**
 * Canonical URL, og:url and sitemap.xml need an absolute site URL. They are
 * only emitted once VITE_SITE_URL is set, so nothing points at a guessed domain.
 */
function seo(siteUrl: string, deployBase: string): Plugin {
  const base = siteUrl.replace(/\/$/, '');
  return {
    name: 'outfitx-seo',
    transformIndexHtml(html) {
      const tags = base
        ? `<link rel="canonical" href="${base}/" />\n    <meta property="og:url" content="${base}/" />\n    <meta property="og:image" content="${base}/og-image.jpg" />`
        : `<meta property="og:image" content="${deployBase}og-image.jpg" />`;
      return html.replace('<!--seo:absolute-->', tags);
    },
    writeBundle(options) {
      // GitHub Pages serves 404.html for unknown paths; reusing the app shell makes deep links work.
      const dir = options.dir ?? 'dist';
      if (existsSync(`${dir}/index.html`)) copyFileSync(`${dir}/index.html`, `${dir}/404.html`);
    },
    generateBundle() {
      const sitemapLine = base ? `\nSitemap: ${base}/sitemap.xml` : '';
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n${sitemapLine}\n` });
      if (!base) return;
      const urls = ROUTES.map((r) => `  <url><loc>${base}${r}</loc></url>`).join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // Deploy base path. '/' for a root domain; '/add-generater-/' for the GitHub Pages preview.
    base: env.VITE_BASE || '/',
    plugins: [react(), tailwindcss(), seo(env.VITE_SITE_URL ?? '', env.VITE_BASE || '/')],
    build: { target: 'es2022', cssMinify: true },
  };
});
