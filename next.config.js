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

  // COEP + COOP enable SharedArrayBuffer for WASM threading
  // Note: these may block cross-origin resources that lack the required CORP header
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin'  },
        ],
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
