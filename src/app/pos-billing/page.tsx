'use client'

import { useEffect, useRef, useState } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import {
  computePOSGSTBreakup,
  computePOSTotal,
  GST_RATES,
} from '@/lib/business/posBilling'
import type {
  POSBill as Bill,
  POSCartItem as CartItem,
  POSPaymentMode,
  POSProduct as Product,
  POSShopProfile as ShopProfile,
} from '@/lib/business/posBilling'

const SAMPLE_PRODUCTS: Product[] = [
  { id: 'demo-1', name: 'Cotton T-Shirt', price: 499, hsn: '6109', gstRate: 12, unit: 'Pcs', category: 'Clothing' },
  { id: 'demo-2', name: 'Denim Jeans', price: 1299, hsn: '6203', gstRate: 12, unit: 'Pcs', category: 'Clothing' },
  { id: 'demo-3', name: 'Casual Sneakers', price: 1899, hsn: '6404', gstRate: 18, unit: 'Pair', category: 'Footwear' },
  { id: 'demo-4', name: 'Leather Belt', price: 399, hsn: '4203', gstRate: 12, unit: 'Pcs', category: 'Accessories' },
  { id: 'demo-5', name: 'Stainless Steel Bottle', price: 349, hsn: '7323', gstRate: 18, unit: 'Pcs', category: 'Accessories' },
  { id: 'demo-6', name: 'Notebook A5', price: 89, hsn: '4820', gstRate: 12, unit: 'Pcs', category: 'Stationery' },
  { id: 'demo-7', name: 'Ballpoint Pen (Pack 10)', price: 60, hsn: '9608', gstRate: 12, unit: 'Pack', category: 'Stationery' },
  { id: 'demo-8', name: 'Hand Sanitizer 500ml', price: 199, hsn: '3808', gstRate: 18, unit: 'Bottle', category: 'Health' },
]

const PAYMENT_MODES: POSPaymentMode[] = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Mixed']

const LS_PRODUCTS = 'doclair-pos-products'
const LS_BILLS = 'doclair-pos-bills'
const LS_SHOP = 'doclair-pos-shop'

const FAQS = [
  {
    q: 'Is POS Billing on Doclair free to use?',
    a: 'Yes, completely free with no limits, no subscription, and no watermarks on receipts. Your data stays on your device.',
  },
  {
    q: 'Does it work offline?',
    a: 'Yes. Once the page has loaded, the POS workflow works offline. Products, bills, and the shop profile are stored in your browser.',
  },
  {
    q: 'Can I add order references, customer phone, and payment mode?',
    a: 'Yes. Each receipt can include customer name, customer phone, order reference, and payment mode before export.',
  },
  {
    q: 'Can I print the thermal receipt directly?',
    a: 'Yes. The PDF is sized for 80mm thermal printers and grows only as tall as the bill needs.',
  },
  {
    q: 'Is GST automatically calculated on receipts?',
    a: 'Yes. Each product carries a GST rate, the cart calculates GST automatically, and the receipt shows the GST breakup in the final PDF.',
  },
]

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'POS Billing — Doclair',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.in/pos-billing',
      description: 'Free point-of-sale billing for Indian shops. Product catalog, GST receipts, order references, payment mode, and bill history. Works offline.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      featureList: [
        'Product catalog', 'Quick-add starter products', 'Cart with qty & discount',
        'GST calculation', 'Thermal receipt PDF', 'Customer phone & order ref',
        'Payment mode', 'Shop logo on receipts', 'Bill history',
      ],
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.in' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://doclair.in' },
    { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://doclair.in/tools' },
    { '@type': 'ListItem', position: 3, name: 'POS Billing', item: 'https://doclair.in/pos-billing' },
  ],
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '14px',
  fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
  color: 'var(--ink)',
  background: 'white',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--ink)',
  opacity: 0.65,
  marginBottom: '6px',
  display: 'block',
  fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
}

const cardStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '24px',
}

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
  fontSize: '10px',
  color: 'var(--amber)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  fontWeight: 500,
  marginBottom: '16px',
}

function newBillNumber() {
  return `BILL-${Date.now().toString().slice(-6)}`
}

function triggerDownload(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

function emptyProduct(): Omit<Product, 'id'> {
  return { name: '', price: 0, hsn: '', gstRate: 18, unit: 'Pcs', category: 'General' }
}

export default function POSBillingPage() {
  const [activeTab, setActiveTab] = useState<'bill' | 'products' | 'history'>('bill')
  const [shop, setShop] = useState<ShopProfile>({ name: '', address: '', gstin: '', phone: '', logoDataUrl: '' })
  const [shopOpen, setShopOpen] = useState(false)
  const shopLogoInputRef = useRef<HTMLInputElement>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>(emptyProduct())

  const [cart, setCart] = useState<CartItem[]>([])
  const [customer, setCustomer] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [orderRef, setOrderRef] = useState('')
  const [paymentMode, setPaymentMode] = useState<POSPaymentMode>('Cash')
  const [search, setSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')
  const searchRef = useRef<HTMLDivElement>(null)

  const [bills, setBills] = useState<Bill[]>([])
  const [generatingBill, setGeneratingBill] = useState(false)
  const [billError, setBillError] = useState('')
  const [reprintErrors, setReprintErrors] = useState<Record<string, string>>({})
  const [productNameError, setProductNameError] = useState('')

  useEffect(() => {
    try {
      const rawProducts = localStorage.getItem(LS_PRODUCTS)
      setProducts(rawProducts ? JSON.parse(rawProducts) : SAMPLE_PRODUCTS)
    } catch {
      setProducts(SAMPLE_PRODUCTS)
    }

    try {
      const rawBills = localStorage.getItem(LS_BILLS)
      if (rawBills) setBills(JSON.parse(rawBills))
    } catch {
      // ignore
    }

    try {
      const rawShop = localStorage.getItem(LS_SHOP)
      if (rawShop) setShop(JSON.parse(rawShop))
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function saveProducts(updated: Product[]) {
    setProducts(updated)
    try { localStorage.setItem(LS_PRODUCTS, JSON.stringify(updated)) } catch { /* ignore */ }
  }

  function saveShop(updated: ShopProfile) {
    setShop(updated)
    try { localStorage.setItem(LS_SHOP, JSON.stringify(updated)) } catch { /* ignore */ }
  }

  function saveBills(updated: Bill[]) {
    setBills(updated)
    try { localStorage.setItem(LS_BILLS, JSON.stringify(updated)) } catch { /* ignore */ }
  }

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item)
      }
      return [...prev, { product, qty: 1, discount: 0 }]
    })
    setSearch('')
    setShowSuggestions(false)
  }

  function updateCartQty(id: string, delta: number) {
    setCart(prev => prev.map(item => item.product.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item))
  }

  function updateCartDiscount(id: string, discount: number) {
    setCart(prev => prev.map(item => item.product.id === id ? { ...item, discount: Math.min(100, Math.max(0, discount)) } : item))
  }

  function removeFromCart(id: string) {
    setCart(prev => prev.filter(item => item.product.id !== id))
  }

  const visibleProducts = activeCategory === 'All'
    ? products
    : products.filter(product => product.category === activeCategory)
  const suggestions = search.trim().length > 0
    ? visibleProducts.filter(product => product.name.toLowerCase().includes(search.toLowerCase())).slice(0, 6)
    : []
  const quickAddProducts = visibleProducts.slice(0, 8)
  const categories = ['All', ...new Set(products.map(product => product.category).filter(Boolean))] as string[]

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.qty * (1 - item.discount / 100), 0)
  const gstBreakup = computePOSGSTBreakup(cart)
  const totalGST = Object.values(gstBreakup).reduce((sum, value) => sum + value, 0)
  const grandTotal = computePOSTotal(cart)

  async function handleGenerateBill() {
    if (cart.length === 0) {
      setBillError('Cart is empty.')
      return
    }

    setBillError('')
    setGeneratingBill(true)
    try {
      const bill: Bill = {
        id: crypto.randomUUID(),
        billNumber: newBillNumber(),
        date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        customer,
        customerPhone,
        orderRef,
        paymentMode,
        items: cart,
        total: grandTotal,
        gstBreakup,
      }
      const { generatePOSReceiptPDF } = await import('@/lib/pdf/posReceipt')
      const bytes = await generatePOSReceiptPDF(bill, shop)
      triggerDownload(bytes, `${bill.billNumber}.pdf`)
      saveBills([bill, ...bills].slice(0, 100))
      setCart([])
      setCustomer('')
      setCustomerPhone('')
      setOrderRef('')
      setPaymentMode('Cash')
    } catch (err) {
      setBillError(`Failed to generate bill: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setGeneratingBill(false)
    }
  }

  async function handleReprint(bill: Bill) {
    setReprintErrors(prev => ({ ...prev, [bill.id]: '' }))
    try {
      const { generatePOSReceiptPDF } = await import('@/lib/pdf/posReceipt')
      const bytes = await generatePOSReceiptPDF(bill, shop)
      triggerDownload(bytes, `${bill.billNumber}.pdf`)
    } catch (err) {
      setReprintErrors(prev => ({ ...prev, [bill.id]: `Reprint failed: ${err instanceof Error ? err.message : String(err)}` }))
    }
  }

  function handleDeleteBill(id: string) {
    if (!confirm('Delete this bill?')) return
    saveBills(bills.filter(bill => bill.id !== id))
  }

  function handleAddProduct() {
    if (!newProduct.name.trim()) {
      setProductNameError('Product name is required.')
      return
    }

    setProductNameError('')
    if (editingProduct) {
      saveProducts(products.map(product => product.id === editingProduct.id ? { ...newProduct, id: editingProduct.id } : product))
      setEditingProduct(null)
    } else {
      saveProducts([...products, { ...newProduct, id: crypto.randomUUID() }])
    }
    setNewProduct(emptyProduct())
  }

  function handleEditProduct(product: Product) {
    setEditingProduct(product)
    setNewProduct({
      name: product.name,
      price: product.price,
      hsn: product.hsn,
      gstRate: product.gstRate,
      unit: product.unit,
      category: product.category || 'General',
    })
  }

  function handleDeleteProduct(id: string) {
    if (!confirm('Delete this product?')) return
    saveProducts(products.filter(product => product.id !== id))
  }

  function handleShopLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = event => saveShop({ ...shop, logoDataUrl: event.target?.result as string })
    reader.readAsDataURL(file)
  }

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'GST Invoice', slug: 'gst-invoice', icon: '🧾', colorBg: '#FFF0DC', desc: 'Full tax invoice' },
      ]}
      relatedTools={[
        { name: 'Merge PDF', slug: 'merge-pdf', icon: '🔗', colorBg: '#EDE9FE' },
        { name: 'Compress PDF', slug: 'compress-pdf', icon: '📦', colorBg: '#DCFCE7' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="POS Billing" sidebar={sidebar}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>🔒 Data Stays On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF7ED', color: '#9A3412', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>🇮🇳 India</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>📶 Works Offline</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          <span style={{ color: 'var(--ink)' }}>POS </span>
          <span style={{ color: 'var(--amber)' }}>Billing</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '560px', marginTop: '12px', lineHeight: 1.6 }}>
          Point-of-sale billing for Indian shops. Add products quickly, capture checkout details, and export GST thermal receipts without sending data anywhere.
        </p>
      </div>

      <div style={cardStyle}>
        <button
          onClick={() => setShopOpen(open => !open)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <div style={sectionTitleStyle}>{`// Shop Profile${shop.name ? ` — ${shop.name}` : ''}`}</div>
          <span style={{ fontSize: '12px', color: 'var(--muted)', transition: 'transform 0.25s', display: 'inline-block', transform: shopOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
        </button>
        {shopOpen && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
            {(['name', 'address', 'gstin', 'phone'] as const).map(field => (
              <div key={field}>
                <label style={labelStyle}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <input
                  type="text"
                  value={shop[field]}
                  onChange={e => saveShop({ ...shop, [field]: e.target.value })}
                  placeholder={field === 'name' ? 'My Shop' : field === 'gstin' ? '27AABCU9603R1ZX' : ''}
                  style={inputStyle}
                />
              </div>
            ))}
            <div>
              <label style={labelStyle}>Logo</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => shopLogoInputRef.current?.click()}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--cream)', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', color: 'var(--ink)' }}
                >Upload Logo</button>
                {shop.logoDataUrl && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shop.logoDataUrl} alt="Shop logo preview" style={{ height: '48px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border)', background: 'white' }} />
                    <button
                      onClick={() => saveShop({ ...shop, logoDataUrl: '' })}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', color: 'var(--muted)' }}
                    >Remove</button>
                  </>
                )}
                <input ref={shopLogoInputRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleShopLogoUpload} style={{ display: 'none' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0', background: 'var(--cream)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border)' }}>
        {(['bill', 'products', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '9px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              background: activeTab === tab ? 'white' : 'transparent',
              color: activeTab === tab ? 'var(--ink)' : 'var(--muted)',
              boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {tab === 'bill' ? '🛒 New Bill' : tab === 'products' ? '📦 Products' : '📜 History'}
          </button>
        ))}
      </div>

      {activeTab === 'bill' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>{'// Add Products to Cart'}</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '999px',
                    border: activeCategory === category ? '1px solid #D97706' : '1px solid var(--border)',
                    background: activeCategory === category ? '#FFF7ED' : 'white',
                    color: activeCategory === category ? '#92400E' : 'var(--ink)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                    fontSize: '13px',
                  }}
                >
                  {category}
                </button>
              ))}
            </div>

            <div ref={searchRef} style={{ position: 'relative' }}>
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setShowSuggestions(true) }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search product name..."
                style={inputStyle}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  background: 'white',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  marginTop: '4px',
                  overflow: 'hidden',
                }}>
                  {suggestions.map(product => (
                    <button
                      key={product.id}
                      onMouseDown={() => addToCart(product)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        textAlign: 'left',
                        fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}>{product.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{product.category || 'General'} · GST {product.gstRate}% · {product.unit}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '14px', fontWeight: 600, color: 'var(--amber)' }}>₹{product.price.toFixed(2)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {search.length === 0 && quickAddProducts.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ ...labelStyle, marginBottom: '10px' }}>Quick Add</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '10px' }}>
                  {quickAddProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '4px',
                        padding: '14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        background: '#FFFBEB',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>{product.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{product.category || 'General'} · GST {product.gstRate}%</div>
                      <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '13px', fontWeight: 700, color: 'var(--amber)' }}>₹{product.price.toFixed(2)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Customer Name</label>
                <input type="text" value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Walk-in Customer" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Customer Phone</label>
                <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="+91 99887 77665" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Order Ref / No.</label>
                <input type="text" value={orderRef} onChange={e => setOrderRef(e.target.value)} placeholder="POS-2026-042" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Payment Mode</label>
                <select value={paymentMode} onChange={e => setPaymentMode(e.target.value as POSPaymentMode)} style={inputStyle}>
                  {PAYMENT_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
                </select>
              </div>
            </div>
          </div>

          {cart.length > 0 && (
            <div style={cardStyle}>
              <div style={sectionTitleStyle}>{'// Cart'}</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Product', 'Price', 'Qty', 'Disc %', 'Total', ''].map(header => (
                        <th key={header} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map(item => {
                      const lineTotal = item.product.price * item.qty * (1 - item.discount / 100) * (1 + item.product.gstRate / 100)
                      return (
                        <tr key={item.product.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px' }}>
                            <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{item.product.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{item.product.category || 'General'} · GST {item.product.gstRate}%</div>
                          </td>
                          <td style={{ padding: '10px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '13px', color: 'var(--muted)' }}>₹{item.product.price.toFixed(2)}</td>
                          <td style={{ padding: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button onClick={() => updateCartQty(item.product.id, -1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                              <span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '13px', minWidth: '24px', textAlign: 'center' }}>{item.qty}</span>
                              <button onClick={() => updateCartQty(item.product.id, 1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                            </div>
                          </td>
                          <td style={{ padding: '10px' }}>
                            <input
                              type="number"
                              value={item.discount}
                              min={0}
                              max={100}
                              onChange={e => updateCartDiscount(item.product.id, parseFloat(e.target.value) || 0)}
                              style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px', width: '70px' }}
                            />
                          </td>
                          <td style={{ padding: '10px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>₹{lineTotal.toFixed(2)}</td>
                          <td style={{ padding: '10px' }}>
                            <button onClick={() => removeFromCart(item.product.id)} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: '#FEE2E2', color: '#DC2626', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: '280px', background: 'var(--cream)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: 'var(--muted)' }}>
                    <span>Subtotal</span><span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {Object.entries(gstBreakup).filter(([, value]) => value > 0).map(([rate, amount]) => {
                    const halfRate = Number(rate) / 2
                    return (
                      <div key={rate} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: 'var(--muted)' }}>
                        <span>{Number(rate) === 0 ? 'GST @0%' : `CGST@${halfRate}% + SGST@${halfRate}%`}</span>
                        <span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>₹{amount.toFixed(2)}</span>
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, color: 'var(--ink)', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                    <span>Total</span><span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', color: 'var(--amber)' }}>₹{grandTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>
                    incl. GST ₹{totalGST.toFixed(2)}
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerateBill}
                disabled={generatingBill}
                style={{
                  marginTop: '16px',
                  width: '100%',
                  background: generatingBill ? 'rgba(26,22,18,0.5)' : 'var(--ink)',
                  color: 'white',
                  padding: '14px 24px',
                  borderRadius: '100px',
                  border: 'none',
                  cursor: generatingBill ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-syne), Syne, sans-serif',
                  fontWeight: 700,
                  fontSize: '16px',
                }}
              >
                {generatingBill ? '⏳ Generating...' : `🖨 Generate Bill PDF · ₹${grandTotal.toFixed(2)}`}
              </button>
              {billError && <p style={{ color: '#DC2626', fontSize: '13px', marginTop: '8px' }}>{billError}</p>}
            </div>
          )}

          {cart.length === 0 && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 32px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🛒</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>Cart is empty</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Pick products above or use the starter catalog to add items quickly.</div>
              {billError && <p style={{ color: '#DC2626', fontSize: '13px', marginTop: '12px' }}>{billError}</p>}
            </div>
          )}
        </div>
      )}

      {activeTab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>{`// ${editingProduct ? 'Edit Product' : 'Add Product'}`}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Product Name *</label>
                <input type="text" value={newProduct.name} onChange={e => { setNewProduct(product => ({ ...product, name: e.target.value })); if (productNameError) setProductNameError('') }} placeholder="Product name" style={{ ...inputStyle, borderColor: productNameError ? '#DC2626' : undefined }} />
                {productNameError && <p style={{ color: '#DC2626', fontSize: '13px', marginTop: '8px' }}>{productNameError}</p>}
              </div>
              <div>
                <label style={labelStyle}>Price (₹)</label>
                <input type="number" value={newProduct.price || ''} onChange={e => setNewProduct(product => ({ ...product, price: parseFloat(e.target.value) || 0 }))} min={0} placeholder="0.00" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>HSN Code</label>
                <input type="text" value={newProduct.hsn} onChange={e => setNewProduct(product => ({ ...product, hsn: e.target.value }))} placeholder="8471" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>GST Rate</label>
                <select value={newProduct.gstRate} onChange={e => setNewProduct(product => ({ ...product, gstRate: parseInt(e.target.value, 10) as (typeof GST_RATES)[number] }))} style={inputStyle}>
                  {GST_RATES.map(rate => <option key={rate} value={rate}>{rate}%</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Unit</label>
                <input type="text" value={newProduct.unit} onChange={e => setNewProduct(product => ({ ...product, unit: e.target.value }))} placeholder="Pcs" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <input type="text" value={newProduct.category || ''} onChange={e => setNewProduct(product => ({ ...product, category: e.target.value }))} placeholder="Clothing" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={handleAddProduct}
                style={{ padding: '10px 24px', borderRadius: '100px', border: 'none', background: 'var(--ink)', color: 'white', cursor: 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontWeight: 500, fontSize: '14px' }}
              >{editingProduct ? '✓ Save Changes' : '+ Add Product'}</button>
              {editingProduct && (
                <button
                  onClick={() => { setEditingProduct(null); setNewProduct(emptyProduct()) }}
                  style={{ padding: '10px 20px', borderRadius: '100px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '14px', color: 'var(--muted)' }}
                >Cancel</button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {products.map(product => (
              <div
                key={product.id}
                style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', cursor: 'pointer' }}
                onClick={() => handleEditProduct(product)}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>{product.name}</div>
                <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '16px', color: 'var(--amber)', fontWeight: 700, marginBottom: '4px' }}>₹{product.price.toFixed(2)}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{product.category || 'General'} · HSN: {product.hsn || '—'} · GST {product.gstRate}% · {product.unit}</div>
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteProduct(product.id) }}
                  style={{ marginTop: '12px', padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#FEE2E2', color: '#DC2626', cursor: 'pointer', fontSize: '11px' }}
                >Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>{`// Bill History (${bills.length} bills)`}</div>
          {bills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)', fontSize: '14px' }}>No bills yet. Generate your first bill from the New Bill tab.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {bills.map(bill => (
                <div
                  key={bill.id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: '1px solid var(--border)', borderRadius: '10px', background: 'white', gap: '12px', flexWrap: 'wrap' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{bill.billNumber}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                      {bill.date}
                      {bill.customer ? ` · ${bill.customer}` : ''}
                      {bill.orderRef ? ` · ${bill.orderRef}` : ''}
                      {bill.paymentMode ? ` · ${bill.paymentMode}` : ''}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '14px', fontWeight: 600, color: 'var(--amber)', whiteSpace: 'nowrap' }}>₹{bill.total.toFixed(2)}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleReprint(bill)}
                        style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', color: 'var(--ink)' }}
                      >Reprint</button>
                      <button
                        onClick={() => handleDeleteBill(bill.id)}
                        style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#FEE2E2', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', color: '#DC2626' }}
                      >Delete</button>
                    </div>
                    {reprintErrors[bill.id] && <p style={{ color: '#DC2626', fontSize: '12px', margin: 0 }}>{reprintErrors[bill.id]}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Create a POS Bill — Step by Step
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          Generate a clean, printable point-of-sale bill in seconds. Doclair&apos;s POS Billing tool now supports quick-add starter products, customer phone, order reference, payment mode, and a thermal-style receipt PDF.
        </p>
        <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Set up your shop once.</strong> Business details and logo are saved automatically for future receipts.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Add products with search, category chips, or the starter catalog.</strong> You can also maintain your own catalog in the Products tab.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Capture the checkout details.</strong> Add customer name, customer phone, order reference, discount, and payment mode before export.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Generate the receipt PDF.</strong> The bill is saved to history for quick reprints later.</li>
        </ol>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Can I add a logo to the bill?</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>Yes. Open Shop Profile, upload a PNG or JPG logo, and it will appear at the top of every exported receipt. The PDF stays sized for 80mm thermal printing and expands only as tall as the bill needs.</p>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>POS Billing on iPhone and Android</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>Doclair works in mobile Safari and Chrome. Create bills on your phone and share directly via WhatsApp or print to a nearby Bluetooth thermal printer.</p>
      </div>

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
