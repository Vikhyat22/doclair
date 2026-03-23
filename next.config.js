const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack config for `next dev --turbo`.
  // root is set so Turbopack resolves from the correct directory (prevents the
  // multi-lockfile workspace detection from picking /Users/vikhyatgupta as root).
  // The build script uses `--webpack` explicitly, which overrides this config for builds.
  turbopack: {
    root: __dirname,
    resolveAlias: {
      canvas: './src/lib/empty.js',
      // Stub Node.js built-ins that @okathira/ghostpdl-wasm imports conditionally
      'module': './src/lib/empty.js',
      'node:module': './src/lib/empty.js',
      'node:path': './src/lib/empty.js',
      'node:url': './src/lib/empty.js',
      'node:fs': './src/lib/empty.js',
    },
  },
  webpack: (config) => {
    // Mirror the Turbopack resolveAlias stubs so webpack builds work identically.
    // canvas and Node built-ins are imported conditionally by ghostpdl-wasm;
    // webpack must also stub them out to avoid bundle-time resolution errors.
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: require('path').resolve(__dirname, './src/lib/empty.js'),
      'module': require('path').resolve(__dirname, './src/lib/empty.js'),
      'node:module': require('path').resolve(__dirname, './src/lib/empty.js'),
      'node:path': require('path').resolve(__dirname, './src/lib/empty.js'),
      'node:url': require('path').resolve(__dirname, './src/lib/empty.js'),
      'node:fs': require('path').resolve(__dirname, './src/lib/empty.js'),
    }
    // Enable WASM as async modules so the 15MB gs.wasm loads correctly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    }
    // Emit .wasm files as static assets (not inlined) so they can be fetched
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    })
    // Emit pdf.js worker as a static asset so it can be fetched via new URL()
    // without being inlined into the main bundle. This fixes ERR_FILE_NOT_FOUND
    // errors in production where CDN worker URLs are blocked or unavailable.
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?mjs/,
      type: 'asset/resource',
      generator: {
        filename: 'static/worker/[hash][ext][query]',
      },
    })
    return config
  },

  // COEP + COOP enable SharedArrayBuffer for WASM threading.
  // Scoped to compress-pdf only — the sole page using Ghostscript WASM.
  // Applying these globally blocks third-party scripts and cross-origin resources
  // on every other page, which breaks analytics, ads, and Google indexing.
  async redirects() {
    return [
      {
        source: '/blog/how-to-reduce-pdf-size',
        destination: '/blog/how-to-compress-pdf-file',
        permanent: true,
      },
    ]
  },

  async headers() {
    return [
      {
        // Only apply COEP/COOP to compress-pdf
        // which is the only page using Ghostscript WASM
        source: '/compress-pdf',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin'  },
        ],
      },
      {
        // Apply to the compress-pdf API route used by the compress worker
        source: '/api/compress-pdf(.*)',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin'  },
        ],
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
