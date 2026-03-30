'use client'

import { useEffect, useRef, useState } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import {
  calcLineItem,
  GST_RATES,
  isInterState,
  validateGSTIN,
} from '@/lib/business/gstInvoice'
import type {
  GSTDiscountType,
  GSTLineItem,
  GSTInvoiceData,
} from '@/lib/business/gstInvoice'

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

interface RawLineItem {
  description: string
  hsn: string
  qty: string
  unit: string
  rate: string
  gstRate: (typeof GST_RATES)[number]
  discountType: GSTDiscountType
  discountValue: string
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
    a: 'Yes. There are no fees, no sign-up, and no watermarks. Your invoice data never leaves your browser.',
  },
  {
    q: 'What is the difference between CGST+SGST and IGST?',
    a: 'When the seller and buyer are in the same state (intra-state), GST is split equally into CGST and SGST. When they are in different states (inter-state), only IGST applies. Doclair detects this automatically based on your seller state and place of supply.',
  },
  {
    q: 'Can I add discounts, PO numbers, and payment details?',
    a: 'Yes. You can add per-item discounts, purchase order details, bank information, UPI, notes, and terms before exporting the invoice PDF.',
  },
  {
    q: 'What is a GSTIN and how do I validate it?',
    a: 'GSTIN is a 15-character alphanumeric number issued to GST-registered businesses in India. Doclair validates the format instantly as you type.',
  },
  {
    q: 'Can I generate a Bill of Supply instead of a Tax Invoice?',
    a: 'Yes. Select Bill of Supply from the invoice type dropdown. You can also create credit notes and debit notes.',
  },
  {
    q: 'Is the generated invoice legally valid in India?',
    a: 'The PDF includes the common GST invoice fields such as GSTIN, HSN/SAC, tax breakup, invoice number, and place of supply. You should still confirm compliance for your exact business setup with your CA or advisor.',
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
      url: 'https://doclair.in/gst-invoice',
      description: 'Generate GST-compliant invoices with GSTIN validation, discounts, HSN codes, PO details, and PDF download. No sign-up, data stays in your browser.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      featureList: [
        'GSTIN validation', 'Auto CGST/SGST vs IGST calculation',
        'Item discounts & round-off', 'PO details', 'HSN code support',
        'Bank details & UPI', 'PDF download', 'No upload to server',
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
    { '@type': 'ListItem', position: 3, name: 'GST Invoice Generator', item: 'https://doclair.in/gst-invoice' },
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

function emptyRawLineItem(): RawLineItem {
  return { description: '', hsn: '', qty: '1', unit: 'Pcs', rate: '', gstRate: 18, discountType: 'percent', discountValue: '0' }
}

export default function GSTInvoicePage() {
  const [invoiceType, setInvoiceType] = useState<GSTInvoiceData['invoiceType']>('tax-invoice')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(TODAY)

  const [sellerName, setSellerName] = useState('')
  const [sellerLegalName, setSellerLegalName] = useState('')
  const [sellerAddress, setSellerAddress] = useState('')
  const [sellerState, setSellerState] = useState('Maharashtra')
  const [sellerGSTIN, setSellerGSTIN] = useState('')
  const [sellerPAN, setSellerPAN] = useState('')
  const [sellerPhone, setSellerPhone] = useState('')
  const [sellerEmail, setSellerEmail] = useState('')
  const [sellerWebsite, setSellerWebsite] = useState('')
  const [logoDataUrl, setLogoDataUrl] = useState('')

  const [buyerName, setBuyerName] = useState('')
  const [buyerAddress, setBuyerAddress] = useState('')
  const [buyerState, setBuyerState] = useState('Maharashtra')
  const [buyerGSTIN, setBuyerGSTIN] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')

  const [placeOfSupply, setPlaceOfSupply] = useState('Maharashtra')
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('')
  const [purchaseOrderDate, setPurchaseOrderDate] = useState('')
  const [reverseCharge, setReverseCharge] = useState(false)

  const [items, setItems] = useState<RawLineItem[]>([emptyRawLineItem()])

  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [upiId, setUpiId] = useState('')

  const [notes, setNotes] = useState('')
  const [termsAndConditions, setTermsAndConditions] = useState('')
  const [roundOff, setRoundOff] = useState('0')

  const [generating, setGenerating] = useState(false)
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null)
  const [resultData, setResultData] = useState<GSTInvoiceData | null>(null)
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>([])
  const [generateError, setGenerateError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('doclair-gst-invoices')
      if (raw) setSavedInvoices(JSON.parse(raw))
    } catch {
      // ignore localStorage parse errors
    }
  }, [])

  const interState = isInterState(sellerState, placeOfSupply)

  const calcedItems: GSTLineItem[] = items.map(item => calcLineItem({
    description: item.description,
    hsn: item.hsn,
    qty: parseFloat(item.qty) || 0,
    unit: item.unit,
    rate: parseFloat(item.rate) || 0,
    gstRate: item.gstRate,
    discountType: item.discountType,
    discountValue: parseFloat(item.discountValue) || 0,
  }, interState))

  const subtotal = calcedItems.reduce((sum, item) => sum + item.taxable, 0)
  const totalDiscount = calcedItems.reduce((sum, item) => sum + item.discountAmount, 0)
  const totalCGST = calcedItems.reduce((sum, item) => sum + item.cgst, 0)
  const totalSGST = calcedItems.reduce((sum, item) => sum + item.sgst, 0)
  const totalIGST = calcedItems.reduce((sum, item) => sum + item.igst, 0)
  const totalTax = calcedItems.reduce((sum, item) => sum + item.totalTax, 0)
  const roundOffValue = parseFloat(roundOff) || 0
  const grandTotal = calcedItems.reduce((sum, item) => sum + item.total, 0) + roundOffValue

  function addItem() {
    setItems(prev => [...prev, emptyRawLineItem()])
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, index) => index !== idx))
  }

  function updateItem(idx: number, field: keyof RawLineItem, value: string | number) {
    setItems(prev => prev.map((item, index) => index === idx ? { ...item, [field]: value } : item))
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = event => setLogoDataUrl(event.target?.result as string)
    reader.readAsDataURL(file)
  }

  function buildInvoiceData(): GSTInvoiceData {
    return {
      invoiceNumber: invoiceNumber || generateInvoiceNumber(),
      invoiceDate,
      invoiceType,
      sellerName,
      sellerLegalName,
      sellerAddress,
      sellerState,
      sellerGSTIN,
      sellerPAN,
      sellerPhone,
      sellerEmail,
      sellerWebsite,
      buyerName,
      buyerAddress,
      buyerState,
      buyerGSTIN,
      buyerPhone,
      buyerEmail,
      placeOfSupply,
      purchaseOrderNumber,
      purchaseOrderDate,
      reverseCharge,
      items: calcedItems,
      subtotal,
      totalDiscount,
      totalCGST,
      totalSGST,
      totalIGST,
      totalTax,
      roundOff: roundOffValue,
      grandTotal,
      bankName,
      accountNumber,
      ifscCode,
      upiId,
      notes,
      termsAndConditions,
      logoDataUrl,
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError('')
    try {
      const data = buildInvoiceData()
      const { generateGSTInvoicePDF } = await import('@/lib/pdf/gstInvoice')
      const bytes = await generateGSTInvoicePDF(data)
      setResultBytes(bytes)
      setResultData(data)
      triggerDownload(bytes, data.invoiceNumber)
    } catch (err) {
      setGenerateError(`Failed to generate invoice: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setGenerating(false)
    }
  }

  function triggerDownload(bytes: Uint8Array, invNum: string) {
    const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `invoice-${invNum}.pdf`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  function handleSaveInvoice() {
    setSaveError('')
    setSaveSuccess(false)
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
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError('Could not save invoice.')
    }
  }

  function handleLoadInvoice(inv: SavedInvoice) {
    const data = inv.data
    setInvoiceType(data.invoiceType)
    setInvoiceNumber(data.invoiceNumber)
    setInvoiceDate(data.invoiceDate)
    setSellerName(data.sellerName)
    setSellerLegalName(data.sellerLegalName || '')
    setSellerAddress(data.sellerAddress)
    setSellerState(data.sellerState)
    setSellerGSTIN(data.sellerGSTIN)
    setSellerPAN(data.sellerPAN || '')
    setSellerPhone(data.sellerPhone)
    setSellerEmail(data.sellerEmail)
    setSellerWebsite(data.sellerWebsite || '')
    setLogoDataUrl(data.logoDataUrl)
    setBuyerName(data.buyerName)
    setBuyerAddress(data.buyerAddress)
    setBuyerState(data.buyerState)
    setBuyerGSTIN(data.buyerGSTIN)
    setBuyerPhone(data.buyerPhone || '')
    setBuyerEmail(data.buyerEmail || '')
    setPlaceOfSupply(data.placeOfSupply)
    setPurchaseOrderNumber(data.purchaseOrderNumber || '')
    setPurchaseOrderDate(data.purchaseOrderDate || '')
    setReverseCharge(Boolean(data.reverseCharge))
    setBankName(data.bankName)
    setAccountNumber(data.accountNumber)
    setIfscCode(data.ifscCode)
    setUpiId(data.upiId)
    setNotes(data.notes)
    setTermsAndConditions(data.termsAndConditions || '')
    setRoundOff(String(data.roundOff ?? 0))
    setItems(data.items.map(item => ({
      description: item.description,
      hsn: item.hsn,
      qty: String(item.qty),
      unit: item.unit,
      rate: String(item.rate),
      gstRate: item.gstRate,
      discountType: item.discountType ?? 'percent',
      discountValue: String(item.discountValue ?? 0),
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
        { name: 'POS Billing', slug: 'pos-billing', icon: '🏪', colorBg: '#FFF0DC', desc: 'Quick billing' },
        { name: 'Compress PDF', slug: 'compress-pdf', icon: '📦', colorBg: '#DCFCE7' },
        { name: 'Merge PDF', slug: 'merge-pdf', icon: '🔗', colorBg: '#EDE9FE' },
      ]}
    />
  )

  return (
    <ToolPageLayout toolName="GST Invoice Generator" sidebar={sidebar}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

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
        <p style={{ fontSize: '16px', fontWeight: 300, color: 'var(--ink)', opacity: 0.65, maxWidth: '560px', marginTop: '12px', lineHeight: 1.6 }}>
          Generate GST-compliant invoices with discounts, PO metadata, GSTIN validation, and print-ready PDF export. No sign-up needed.
        </p>
      </div>

      {resultBytes && resultData && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '16px', padding: '36px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
          <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: '#166534', marginBottom: '6px' }}>
            Invoice Ready!
          </div>
          <div style={{ fontSize: '14px', color: '#166534', opacity: 0.65, marginBottom: '24px' }}>
            invoice-{resultData.invoiceNumber}.pdf · ₹{resultData.grandTotal.toFixed(2)} · {resultData.buyerName || 'Draft invoice'}
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

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>{'// Section 1 — Invoice Details'}</div>
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
              <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="INV-2026-001" style={{ ...inputStyle, flex: 1 }} />
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
          <div>
            <label style={labelStyle}>PO Number</label>
            <input type="text" value={purchaseOrderNumber} onChange={e => setPurchaseOrderNumber(e.target.value)} placeholder="PO-2026-042" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>PO Date</label>
            <input type="date" value={purchaseOrderDate} onChange={e => setPurchaseOrderDate(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '24px' }}>
            <input id="reverse-charge" type="checkbox" checked={reverseCharge} onChange={e => setReverseCharge(e.target.checked)} />
            <label htmlFor="reverse-charge" style={{ ...labelStyle, marginBottom: 0 }}>Reverse charge applicable</label>
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>{'// Section 2 — Your Business (Seller)'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Brand / Trade Name</label>
            <input type="text" value={sellerName} onChange={e => setSellerName(e.target.value)} placeholder="Blue Mango Foods" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Legal Name</label>
            <input type="text" value={sellerLegalName} onChange={e => setSellerLegalName(e.target.value)} placeholder="Blue Mango Foods Pvt. Ltd." style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Address</label>
            <textarea value={sellerAddress} onChange={e => setSellerAddress(e.target.value)} rows={3} placeholder="123, Main Street, City - 400001" style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label style={labelStyle}>State</label>
            <select value={sellerState} onChange={e => setSellerState(e.target.value)} style={inputStyle}>
              {INDIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
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
            <label style={labelStyle}>PAN</label>
            <input type="text" value={sellerPAN} onChange={e => setSellerPAN(e.target.value.toUpperCase())} placeholder="AABCU9603R" maxLength={10} style={inputStyle} />
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
            <label style={labelStyle}>Website</label>
            <input type="text" value={sellerWebsite} onChange={e => setSellerWebsite(e.target.value)} placeholder="www.company.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Logo (optional)</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => logoInputRef.current?.click()}
                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--cream)', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', color: 'var(--ink)' }}
              >Upload Logo</button>
              {logoDataUrl && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoDataUrl} alt="Logo preview" style={{ height: '60px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border)' }} />
                  <button
                    onClick={() => setLogoDataUrl('')}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', color: 'var(--muted)' }}
                  >Remove</button>
                </>
              )}
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
            </div>
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>{'// Section 3 — Customer (Buyer)'}</div>
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
              {INDIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
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
          <div>
            <label style={labelStyle}>Phone</label>
            <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="+91 99887 77665" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="accounts@customer.com" style={inputStyle} />
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>{'// Section 4 — Place of Supply'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'center' }}>
          <div>
            <label style={labelStyle}>Place of Supply</label>
            <select value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} style={inputStyle}>
              {INDIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
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

      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={sectionTitleStyle}>{'// Section 5 — Line Items'}</div>
          <button
            onClick={addItem}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--cream)', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', color: 'var(--ink)' }}
          >+ Add Item</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                {['Description', 'HSN', 'Qty', 'Unit', 'Rate', 'Disc', 'Mode', 'GST %', 'Taxable', 'Tax', 'Total', ''].map(header => (
                  <th key={header} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: '11px', color: 'var(--ink)', opacity: 0.65, whiteSpace: 'nowrap', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const calced = calcedItems[idx]
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 6px', minWidth: '220px' }}>
                      <input type="text" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Item description" style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }} />
                    </td>
                    <td style={{ padding: '8px 6px', minWidth: '90px' }}>
                      <input type="text" value={item.hsn} onChange={e => updateItem(idx, 'hsn', e.target.value)} placeholder="8471" style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }} />
                    </td>
                    <td style={{ padding: '8px 6px', minWidth: '72px' }}>
                      <input type="number" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} min={0} style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }} />
                    </td>
                    <td style={{ padding: '8px 6px', minWidth: '80px' }}>
                      <input type="text" value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} placeholder="Pcs" style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }} />
                    </td>
                    <td style={{ padding: '8px 6px', minWidth: '96px' }}>
                      <input type="number" value={item.rate} onChange={e => updateItem(idx, 'rate', e.target.value)} min={0} placeholder="0.00" style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }} />
                    </td>
                    <td style={{ padding: '8px 6px', minWidth: '92px' }}>
                      <input type="number" value={item.discountValue} onChange={e => updateItem(idx, 'discountValue', e.target.value)} min={0} placeholder="0" style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }} />
                    </td>
                    <td style={{ padding: '8px 6px', minWidth: '88px' }}>
                      <select value={item.discountType} onChange={e => updateItem(idx, 'discountType', e.target.value as GSTDiscountType)} style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }}>
                        <option value="percent">%</option>
                        <option value="amount">₹</option>
                      </select>
                    </td>
                    <td style={{ padding: '8px 6px', minWidth: '84px' }}>
                      <select value={item.gstRate} onChange={e => updateItem(idx, 'gstRate', parseInt(e.target.value, 10) as (typeof GST_RATES)[number])} style={{ ...inputStyle, padding: '6px 8px', fontSize: '12px' }}>
                        {GST_RATES.map(rate => <option key={rate} value={rate}>{rate}%</option>)}
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

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '280px', background: 'var(--cream)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: 'var(--muted)' }}>
              <span>Subtotal</span><span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>₹{subtotal.toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: 'var(--muted)' }}>
                <span>Discount</span><span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>-₹{totalDiscount.toFixed(2)}</span>
              </div>
            )}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: 'var(--muted)' }}>
              <span>Total Tax</span><span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>₹{totalTax.toFixed(2)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Round Off</label>
              <input type="number" value={roundOff} onChange={e => setRoundOff(e.target.value)} step="0.01" style={{ ...inputStyle, width: '110px', padding: '6px 8px', fontSize: '12px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, color: 'var(--ink)', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
              <span>Grand Total</span><span style={{ fontFamily: 'var(--font-dm-mono), DM Mono, monospace', color: 'var(--amber)' }}>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>{'// Section 6 — Bank & Payment Details'}</div>
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

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>{'// Section 7 — Notes & Terms'}</div>
        <div style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Payment due in 7 days. Delivery schedule or other invoice notes..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          <div>
            <label style={labelStyle}>Terms & Conditions</label>
            <textarea
              value={termsAndConditions}
              onChange={e => setTermsAndConditions(e.target.value)}
              rows={3}
              placeholder="Goods once sold will not be taken back. Subject to local jurisdiction."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            flex: 1,
            background: generating ? 'rgba(26,22,18,0.5)' : 'var(--ink)',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '100px',
            border: 'none',
            cursor: generating ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-syne), Syne, sans-serif',
            fontWeight: 700,
            fontSize: '17px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {generating ? '⏳ Generating...' : '🧾 Generate Invoice PDF'}
        </button>
        <button
          onClick={handleSaveInvoice}
          style={{
            padding: '16px 20px',
            borderRadius: '100px',
            border: '1px solid var(--border)',
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
            fontWeight: 500,
            fontSize: '14px',
            color: 'var(--ink)',
          }}
        >💾 Save Invoice</button>
      </div>
      {generateError && <p style={{ color: '#DC2626', fontSize: '13px', marginTop: '8px' }}>{generateError}</p>}
      {saveError && <p style={{ color: '#DC2626', fontSize: '13px', marginTop: '8px' }}>{saveError}</p>}
      {saveSuccess && <p style={{ color: '#16A34A', fontSize: '13px', marginTop: '8px' }}>✓ Invoice saved!</p>}

      {savedInvoices.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>{'// Recently Saved Invoices'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {savedInvoices.slice(0, 3).map((inv, idx) => (
              <button
                key={idx}
                onClick={() => handleLoadInvoice(inv)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
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

      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
        <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
          How to Create a GST Invoice PDF — Step by Step
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
          A GST-compliant invoice usually includes GSTIN, HSN/SAC codes, commercial metadata, tax breakdowns, and invoice numbering. Doclair now supports discounts, PO fields, buyer contact details, payment details, and a print-ready PDF generated entirely in your browser.
        </p>
        <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Enter your business trade name, legal name, GSTIN, and address.</strong> GSTIN is validated instantly as you type.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Add buyer details, place of supply, and PO information.</strong> Leave GSTIN blank for B2C invoices.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Add line items with HSN/SAC codes, quantity, rate, GST, and discounts.</strong> CGST/SGST or IGST is calculated automatically.</li>
          <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Review totals, round-off, payment details, notes, and terms.</strong> Then export the final PDF.</li>
        </ol>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>Is this GST invoice format legally compliant?</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>The format includes the common GST invoice blocks used by Indian businesses, including tax breakup, amount in words, HSN summary, PO metadata, and signatory space. Always confirm the final format with your CA if you have industry-specific requirements.</p>
        <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>GST Invoice on iPhone and Android</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>Doclair works in mobile Safari and Chrome. Fill in the invoice details on your phone and download the PDF directly to share by WhatsApp, email, or print.</p>
      </div>

      <FAQ faqs={FAQS} />
    </ToolPageLayout>
  )
}
