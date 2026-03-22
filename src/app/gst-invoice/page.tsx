'use client'

import { useState, useEffect, useRef } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import {
  generateGSTInvoicePDF,
  validateGSTIN,
  calcLineItem,
  isInterState,
} from '@/lib/pdf/gstInvoice'
import type { GSTLineItem, GSTInvoiceData } from '@/lib/pdf/gstInvoice'

const INDIAN_STATES = [
  'Andaman and Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar',
  'Chandigarh','Chhattisgarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Goa',
  'Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka',
  'Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya',
  'Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu',
  'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
]

const GST_RATES = [0, 5, 12, 18, 28] as const

interface RawLineItem {
  description: string
  hsn: string
  qty: string
  unit: string
  rate: string
  gstRate: 0 | 5 | 12 | 18 | 28
}

interface SavedInvoice {
  invoiceNumber: string
  invoiceDate: string
  buyerName: string
  grandTotal: number
  data: GSTInvoiceData
}

const FAQS = [
  {
    q: 'Is this GST invoice generator completely free?',
    a: 'Yes. There are no fees, no sign-up, and no watermarks. Your invoice data never leaves your browser — everything runs locally using PDF-lib.',
  },
  {
    q: 'What is the difference between CGST+SGST and IGST?',
    a: 'When the seller and buyer are in the same state (intra-state), GST is split equally into CGST (Central) and SGST (State). When they are in different states (inter-state), only IGST (Integrated GST) applies. Doclair detects this automatically based on your seller state and place of supply.',
  },
  {
    q: 'What is a GSTIN and how do I validate it?',
    a: 'GSTIN (Goods and Services Tax Identification Number) is a 15-character alphanumeric code assigned to every GST-registered business in India. The format is: 2-digit state code + 10-character PAN + entity type + Z + check digit. Doclair validates the format instantly as you type.',
  },
  {
    q: 'What is an HSN code?',
    a: 'HSN (Harmonised System of Nomenclature) is an internationally accepted 4-8 digit code that classifies goods. In India, HSN codes determine the applicable GST rate for each product or service. SAC (Service Accounting Code) is used for services.',
  },
  {
    q: 'Can I generate a Bill of Supply instead of a Tax Invoice?',
    a: 'Yes. Select "Bill of Supply" from the Invoice Type dropdown. Bill of Supply is issued by composition dealers or when supplying exempt goods/services where no GST is collected.',
  },
  {
    q: 'Is the generated invoice legally valid in India?',
    a: 'The PDF generated contains all mandatory fields required under GST rules (GSTIN, HSN, tax breakup, place of supply, etc.). However, you should consult a CA to confirm compliance for your specific business situation.',
  },
]

const JSON_LD_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'GST Invoice Generator — Doclair',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any (browser-based)',
      url: 'https://doclair.com/gst-invoice',
      description: 'Generate GST-compliant Tax Invoices free. CGST/SGST and IGST auto-calculated. GSTIN validation, HSN codes, bank details. No sign-up, data never leaves your browser.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      featureList: [
        'GSTIN validation', 'Auto CGST/SGST vs IGST calculation',
        'HSN code support', 'Bank details & UPI', 'PDF download',
        'No upload to server', 'Save & reload invoices',
      ],
      provider: { '@type': 'Organization', name: 'Doclair', url: 'https://doclair.com' },
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
    { '@type': 'ListItem', position: 1, name: 'Home',                  item: 'https://doclair.com' },
    { '@type': 'ListItem', position: 2, name: 'Tools',                 item: 'https://doclair.com/tools' },
    { '@type': 'ListItem', position: 3, name: 'GST Invoice Generator', item: 'https://doclair.com/gst-invoice' },
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

const sectionStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  padding: '28px',
}

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
  fontSize: '10px',
  color: 'var(--amber)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  fontWeight: 500,
  marginBottom: '20px',
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: '16px',
}

const TODAY = new Date().toISOString().slice(0, 10)

function generateInvoiceNumber() {
  return `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`
}

export default function GSTInvoicePage() {
  const [invoiceType, setInvoiceType] = useState<GSTInvoiceData['invoiceType']>('tax-invoice')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(TODAY)

  // Seller
  const [sellerName, setSellerName] = useState('')
  const [sellerAddress, setSellerAddress] = useState('')
  const [sellerState, setSellerState] = useState('Maharashtra')
  const [sellerGSTIN, setSellerGSTIN] = useState('')
  const [sellerPhone, setSellerPhone] = useState('')
  const [sellerEmail, setSellerEmail] = useState('')
  const [logoDataUrl, setLogoDataUrl] = useState('')

  // Buyer
  const [buyerName, setBuyerName] = useState('')
  const [buyerAddress, setBuyerAddress] = useState('')
  const [buyerState, setBuyerState] = useState('Maharashtra')
  const [buyerGSTIN, setBuyerGSTIN] = useState('')

  // Place of Supply
  const [placeOfSupply, setPlaceOfSupply] = useState('Maharashtra')

  // Line Items
  const [items, setItems] = useState<RawLineItem[]>([
    { description: '', hsn: '', qty: '1', unit: 'Pcs', rate: '', gstRate: 18 },
  ])

  // Bank
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [upiId, setUpiId] = useState('')

  // Notes
  const [notes, setNotes] = useState('')

  // State
  const [generating, setGenerating] = useState(false)
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null)
  const [resultData, setResultData] = useState<GSTInvoiceData | null>(null)
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>([])

  const logoInputRef = useRef<HTMLInputElement>(null)

  // Load saved invoices from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('doclair-gst-invoices')
      if (raw) {
        setSavedInvoices(JSON.parse(raw))
      }
    } catch {
      // ignore
    }
  }, [])

  const interState = isInterState(sellerState, placeOfSupply)

  // Computed line items
  const calcedItems: GSTLineItem[] = items.map(item => {
    const qty = parseFloat(item.qty) || 0
    const rate = parseFloat(item.rate) || 0
    return calcLineItem(
      { description: item.description, hsn: item.hsn, qty, unit: item.unit, rate, gstRate: item.gstRate },
      interState,
    )
  })

  const subtotal = calcedItems.reduce((s, i) => s + i.taxable, 0)
  const totalCGST = calcedItems.reduce((s, i) => s + i.cgst, 0)
  const totalSGST = calcedItems.reduce((s, i) => s + i.sgst, 0)
  const totalIGST = calcedItems.reduce((s, i) => s + i.igst, 0)
  const grandTotal = calcedItems.reduce((s, i) => s + i.total, 0)

  function addItem() {
    setItems(prev => [...prev, { description: '', hsn: '', qty: '1', unit: 'Pcs', rate: '', gstRate: 18 }])
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof RawLineItem, value: string | number) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogoDataUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function buildInvoiceData(): GSTInvoiceData {
    return {
      invoiceNumber: invoiceNumber || generateInvoiceNumber(),
      invoiceDate,
      invoiceType,
      sellerName,
      sellerAddress,
      sellerState,
      sellerGSTIN,
      sellerPhone,
      sellerEmail,
      buyerName,
      buyerAddress,
      buyerState,
      buyerGSTIN,
      placeOfSupply,
      items: calcedItems,
      subtotal,
      totalCGST,
      totalSGST,
      totalIGST,
      grandTotal,
      bankName,
      accountNumber,
      ifscCode,
      upiId,
      notes,
      logoDataUrl,
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const data = buildInvoiceData()
      const bytes = await generateGSTInvoicePDF(data)
      setResultBytes(bytes)
      setResultData(data)
      triggerDownload(bytes, data.invoiceNumber)
    } catch (err) {
      alert('Failed to generate invoice: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setGenerating(false)
    }
  }

  function triggerDownload(bytes: Uint8Array, invNum: string) {
    const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice-${invNum}.pdf`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  function handleSaveInvoice() {
    try {
      const data = buildInvoiceData()
      const entry: SavedInvoice = {
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate,
        buyerName: data.buyerName,
        grandTotal: data.grandTotal,
        data,
      }
      const existing: SavedInvoice[] = (() => {
        try { return JSON.parse(localStorage.getItem('doclair-gst-invoices') || '[]') } catch { return [] }
      })()
      const updated = [entry, ...existing].slice(0, 20)
      localStorage.setItem('doclair-gst-invoices', JSON.stringify(updated))
      setSavedInvoices(updated.slice(0, 3))
      alert('Invoice saved!')
    } catch {
      alert('Could not save invoice.')
    }
  }

  function handleLoadInvoice(inv: SavedInvoice) {
    const d = inv.data
    setInvoiceType(d.invoiceType)
    setInvoiceNumber(d.invoiceNumber)
    setInvoiceDate(d.invoiceDate)
    setSellerName(d.sellerName)
    setSellerAddress(d.sellerAddress)
    setSellerState(d.sellerState)
    setSellerGSTIN(d.sellerGSTIN)
    setSellerPhone(d.sellerPhone)
    setSellerEmail(d.sellerEmail)
    setLogoDataUrl(d.logoDataUrl)
    setBuyerName(d.buyerName)
    setBuyerAddress(d.buyerAddress)
    setBuyerState(d.buyerState)
    setBuyerGSTIN(d.buyerGSTIN)
    setPlaceOfSupply(d.placeOfSupply)
    setBankName(d.bankName)
    setAccountNumber(d.accountNumber)
    setIfscCode(d.ifscCode)
    setUpiId(d.upiId)
    setNotes(d.notes)
    // Rebuild raw items from calced
    setItems(d.items.map(i => ({
      description: i.description,
      hsn: i.hsn,
      qty: String(i.qty),
      unit: i.unit,
      rate: String(i.rate),
      gstRate: i.gstRate,
    })))
    setResultBytes(null)
    setResultData(null)
  }

  function handleNewInvoice() {
    setResultBytes(null)
    setResultData(null)
    setInvoiceNumber('')
  }

  const sellerGSTINValid = sellerGSTIN ? validateGSTIN(sellerGSTIN) : null
  const buyerGSTINValid = buyerGSTIN ? validateGSTIN(buyerGSTIN) : null

  const sidebar = (
    <ToolSidebar
      reverseActions={[
        { name: 'PDF to Text', slug: 'pdf-to-text', icon: '📄', colorBg: '#DCFCE7' },
      ]}
      relatedTools={[
        { name: 'POS Billing',   slug: 'pos-billing',  icon: '🏪', colorBg: '#FFF0DC', desc: 'Quick billing' },
        { name: 'Compress PDF',  slug: 'compress-pdf', icon: '📦', colorBg: '#DCFCE7' },
        { name: 'Merge PDF',     slug: 'merge-pdf',    icon: '🔗', colorBg: '#EDE9FE' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="GST Invoice Generator" toolSlug="gst-invoice" sidebar={sidebar}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

      {/* Header */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>✓ 100% Free</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>🔒 Data Stays On Device</span>
          <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF7ED', color: '#9A3412', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500 }}>🇮🇳 India</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          <span style={{ color: 'var(--ink)' }}>GST Invoice </span>
          <span style={{ color: 'var(--amber)' }}>Generator</span>
        </h1>
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '520px', marginTop: '12px', lineHeight: 1.6 }}>
          Generate GST-compliant Tax Invoices with auto CGST/SGST/IGST calculation, GSTIN validation, and PDF download. No sign-up needed.
        </p>
      </div>

      {/* Result card */}
      {resultBytes && resultData && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '16px', padding: '36px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
          <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: '#166534', marginBottom: '6px' }}>
            Invoice Ready!
          </div>
          <div style={{ fontSize: '14px', color: '#166534', opacity: 0.65, marginBottom: '24px' }}>
            invoice-{resultData.invoiceNumber}.pdf · ₹{resultData.grandTotal.toFixed(2)} · {resultData.buyerName}
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => triggerDownload(resultBytes, resultData.invoiceNumber)}
              style={{ background: '#16A34A', color: 'white', padding: '12px 28px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontWeight: 500, fontSize: '15px' }}
            >⬇ Download Again</button>
            <button
              onClick={handleNewInvoice}
              style={{ background: 'transparent', color: '#166534', padding: '12px 28px', borderRadius: '100px', border: '1px solid #BBF7D0', cursor: 'pointer', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontWeight: 500, fontSize: '15px' }}
            >+ New Invoice</button>
          </div>
        </div>
      )}

      {/* SECTION 1: Invoice Details */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>// Section 1 — Invoice Details</div>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Invoice Type</label>
            <select value={invoiceType} onChange={e => setInvoiceType(e.target.value as GSTInvoiceData['invoiceType'])} style={inputStyle}>
              <option value="tax-invoice">Tax Invoice</option>
              <option value="bill-of-supply">Bill of Supply</option>
              <option value="credit-note">Credit Note</option>
              <option value="debit-note">Debit Note</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Invoice Number</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                placeholder="INV-2026-001"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => setInvoiceNumber(generateInvoiceNumber())}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--cream)', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', whiteSpace: 'nowrap', color: 'var(--ink)' }}
              >Generate</button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Invoice Date</label>
            <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={inputStyle} />
          </div>
        </div>
      </div>

      {/* SECTION 2: Seller */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>// Section 2 — Your Business (Seller)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Business Name</label>
            <input type="text" value={sellerName} onChange={e => setSellerName(e.target.value)} placeholder="Acme Pvt. Ltd." style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Address</label>
            <textarea value={sellerAddress} onChange={e => setSellerAddress(e.target.value)} rows={3} placeholder="123, Main Street, City - 400001" style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label style={labelStyle}>State</label>
            <select value={sellerState} onChange={e => setSellerState(e.target.value)} style={inputStyle}>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>
              GSTIN
              {sellerGSTIN && (
                <span style={{ marginLeft: '8px', color: sellerGSTINValid ? '#16A34A' : '#DC2626', fontSize: '12px' }}>
                  {sellerGSTINValid ? '✓ Valid' : '✗ Invalid'}
                </span>
              )}
            </label>
            <input type="text" value={sellerGSTIN} onChange={e => setSellerGSTIN(e.target.value.toUpperCase())} placeholder="27AABCU9603R1ZX" maxLength={15} style={{ ...inputStyle, borderColor: sellerGSTIN ? (sellerGSTINValid ? '#16A34A' : '#DC2626') : 'var(--border)' }} />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input type="tel" value={sellerPhone} onChange={e => setSellerPhone(e.target.value)} placeholder="+91 98765 43210" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={sellerEmail} onChange={e => setSellerEmail(e.target.value)} placeholder="billing@company.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Logo (optional)</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => logoInputRef.current?.click()}
                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--cream)', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', color: 'var(--ink)' }}
              >Upload Logo</button>
              {logoDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoDataUrl} alt="Logo preview" style={{ height: '60px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border)' }} />
              )}
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Buyer */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>// Section 3 — Customer (Buyer)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Customer Name</label>
            <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Customer Name or Business" style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Address</label>
            <textarea value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} rows={3} placeholder="Customer address" style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label style={labelStyle}>State</label>
            <select value={buyerState} onChange={e => setBuyerState(e.target.value)} style={inputStyle}>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>
              GSTIN (optional)
              {buyerGSTIN && (
                <span style={{ marginLeft: '8px', color: buyerGSTINValid ? '#16A34A' : '#DC2626', fontSize: '12px' }}>
                  {buyerGSTINValid ? '✓ Valid' : '✗ Invalid'}
                </span>
              )}
            </label>
            <input type="text" value={buyerGSTIN} onChange={e => setBuyerGSTIN(e.target.value.toUpperCase())} placeholder="Leave blank for B2C" maxLength={15} style={{ ...inputStyle, borderColor: buyerGSTIN ? (buyerGSTINValid ? '#16A34A' : '#DC2626') : 'var(--border)' }} />
          </div>
        </div>
      </div>

      {/* SECTION 4: Place of Supply */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>// Section 4 — Place of Supply</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'center' }}>
          <div>
            <label style={labelStyle}>Place of Supply</label>
            <select value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} style={inputStyle}>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={{
              padding: '10px 16px',
              borderRadius: '8px',
              background: interState ? '#FFF0DC' : '#DCFCE7',
              color: interState ? '#92400E' : '#166534',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
            }}>
              {interState ? '🔀 Inter-State → IGST applies' : '✓ Intra-State → CGST + SGST applies'}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5: Line Items */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={sectionTitleStyle}>// Section 5 — Line Items</div>
          <button
            onClick={addItem}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--cream)', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', color: 'var(--ink)' }}
          >+ Add Item</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                {['Description', 'HSN', 'Qty', 'Unit', 'Rate (₹)', 'GST %', 'Taxable', 'Tax', 'Total', ''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: '11px', color: 'var(--ink)', opacity: 0.65, whiteSpace: 'nowrap', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const calced = calcedItems[idx]
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 6px' }}>
                      <input type="text" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Item description" style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }} />
                    </td>
                    <td style={{ padding: '8px 6px', minWidth: '70px' }}>
                      <input type="text" value={item.hsn} onChange={e => updateItem(idx, 'hsn', e.target.value)} placeholder="8471" style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }} />
                    </td>
                    <td style={{ padding: '8px 6px', minWidth: '60px' }}>
                      <input type="number" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} min={0} style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }} />
                    </td>
                    <td style={{ padding: '8px 6px', minWidth: '70px' }}>
                      <input type="text" value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} placeholder="Pcs" style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }} />
                    </td>
                    <td style={{ padding: '8px 6px', minWidth: '90px' }}>
                      <input type="number" value={item.rate} onChange={e => updateItem(idx, 'rate', e.target.value)} min={0} placeholder="0.00" style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }} />
                    </td>
                    <td style={{ padding: '8px 6px', minWidth: '80px' }}>
                      <select value={item.gstRate} onChange={e => updateItem(idx, 'gstRate', parseInt(e.target.value) as 0|5|12|18|28)} style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }}>
                        {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>₹{calced.taxable.toFixed(2)}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {interState ? `₹${calced.igst.toFixed(2)}` : `₹${(calced.cgst + calced.sgst).toFixed(2)}`}
                    </td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>₹{calced.total.toFixed(2)}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <button onClick={() => removeItem(idx)} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: '#FEE2E2', color: '#DC2626', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Running totals */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '260px', background: 'var(--cream)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: 'var(--muted)' }}>
              <span>Subtotal</span><span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>₹{subtotal.toFixed(2)}</span>
            </div>
            {interState ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: 'var(--muted)' }}>
                <span>IGST</span><span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>₹{totalIGST.toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: 'var(--muted)' }}>
                  <span>CGST</span><span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>₹{totalCGST.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: 'var(--muted)' }}>
                  <span>SGST</span><span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>₹{totalSGST.toFixed(2)}</span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, color: 'var(--ink)', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
              <span>Grand Total</span><span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', color: 'var(--amber)' }}>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 6: Bank & Payment */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>// Section 6 — Bank & Payment Details</div>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Bank Name</label>
            <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="State Bank of India" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Account Number</label>
            <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="1234567890" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>IFSC Code</label>
            <input type="text" value={ifscCode} onChange={e => setIfscCode(e.target.value.toUpperCase())} placeholder="SBIN0001234" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>UPI ID</label>
            <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="business@upi" style={inputStyle} />
          </div>
        </div>
      </div>

      {/* SECTION 7: Notes */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>// Section 7 — Notes (optional)</div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Payment terms, delivery notes, or any additional information..."
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* Generate Button */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            flex: 1, background: generating ? 'rgba(26,22,18,0.5)' : 'var(--ink)', color: 'white',
            padding: '16px 24px', borderRadius: '100px', border: 'none', cursor: generating ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '17px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => { if (!generating) e.currentTarget.style.transform = 'scale(1.02)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          {generating ? '⏳ Generating...' : '🧾 Generate Invoice PDF'}
        </button>
        <button
          onClick={handleSaveInvoice}
          style={{
            padding: '16px 20px', borderRadius: '100px', border: '1px solid var(--border)',
            background: 'transparent', cursor: 'pointer',
            fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontWeight: 500, fontSize: '14px',
            color: 'var(--ink)', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >💾 Save Invoice</button>
      </div>

      {/* Saved Invoices */}
      {savedInvoices.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>// Recently Saved Invoices</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {savedInvoices.slice(0, 3).map((inv, idx) => (
              <button
                key={idx}
                onClick={() => handleLoadInvoice(inv)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)',
                  background: 'white', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--amber)'; e.currentTarget.style.background = '#FFFBEB' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'white' }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{inv.invoiceNumber}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{inv.invoiceDate} · {inv.buyerName}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '13px', fontWeight: 600, color: 'var(--amber)' }}>₹{inv.grandTotal.toFixed(2)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FAQ */}
      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
