const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
    resolveAlias: {
      canvas: './src/lib/empty.js',
      // Stub Node.js built-ins that @okathira/ghostpdl-wasm imports conditionally
      // (the runtime check `typeof process !== "undefined"` guards these, but
      //  Turbopack resolves them at bundle time regardless)
      'module': './src/lib/empty.js',
      'node:module': './src/lib/empty.js',
      'node:path': './src/lib/empty.js',
      'node:url': './src/lib/empty.js',
      'node:fs': './src/lib/empty.js',
    },
  },

  webpack: (config) => {
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
    return config
  },

  // COEP + COOP enable SharedArrayBuffer for WASM threading.
  // Scoped to compress-pdf only — the sole page using Ghostscript WASM.
  // Applying these globally blocks third-party scripts and cross-origin resources
  // on every other page, which breaks analytics, ads, and Google indexing.
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
        // Also apply to the compress worker API if it exists
        source: '/api/(.*)',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin'  },
        ],
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
