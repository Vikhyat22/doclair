export const GST_RATES = [0, 5, 12, 18, 28] as const

export type GSTRate = typeof GST_RATES[number]

export type GSTDiscountType = 'percent' | 'amount'

export interface GSTLineItemInput {
  description: string
  hsn: string
  qty: number
  unit: string
  rate: number
  gstRate: GSTRate
  discountType: GSTDiscountType
  discountValue: number
}

export interface GSTLineItem extends GSTLineItemInput {
  gross: number
  discountAmount: number
  taxable: number
  cgst: number
  sgst: number
  igst: number
  totalTax: number
  total: number
}

export interface GSTInvoiceData {
  invoiceNumber: string
  invoiceDate: string
  invoiceType: 'tax-invoice' | 'bill-of-supply' | 'credit-note' | 'debit-note'
  sellerName: string
  sellerLegalName: string
  sellerAddress: string
  sellerState: string
  sellerGSTIN: string
  sellerPAN: string
  sellerPhone: string
  sellerEmail: string
  sellerWebsite: string
  buyerName: string
  buyerAddress: string
  buyerState: string
  buyerGSTIN: string
  buyerPhone: string
  buyerEmail: string
  placeOfSupply: string
  purchaseOrderNumber: string
  purchaseOrderDate: string
  reverseCharge: boolean
  items: GSTLineItem[]
  subtotal: number
  totalDiscount: number
  totalCGST: number
  totalSGST: number
  totalIGST: number
  totalTax: number
  roundOff: number
  grandTotal: number
  bankName: string
  accountNumber: string
  ifscCode: string
  upiId: string
  notes: string
  termsAndConditions: string
  logoDataUrl: string
}

export interface GSTHSNSummaryRow {
  hsn: string
  gstRate: number
  taxable: number
  cgst: number
  sgst: number
  igst: number
  totalTax: number
}

export function isInterState(sellerState: string, placeOfSupply: string): boolean {
  return sellerState.toLowerCase().trim() !== placeOfSupply.toLowerCase().trim()
}

export function validateGSTIN(gstin: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)
}

function clampDiscount(item: GSTLineItemInput): number {
  const gross = item.qty * item.rate
  if (gross <= 0) return 0

  if (item.discountType === 'percent') {
    return Math.min(gross, Math.max(0, gross * item.discountValue / 100))
  }

  return Math.min(gross, Math.max(0, item.discountValue))
}

export function calcLineItem(item: GSTLineItemInput, interState: boolean): GSTLineItem {
  const gross = item.qty * item.rate
  const discountAmount = clampDiscount(item)
  const taxable = Math.max(0, gross - discountAmount)
  const gstAmt = taxable * item.gstRate / 100

  return {
    ...item,
    gross,
    discountAmount,
    taxable,
    cgst: interState ? 0 : gstAmt / 2,
    sgst: interState ? 0 : gstAmt / 2,
    igst: interState ? gstAmt : 0,
    totalTax: gstAmt,
    total: taxable + gstAmt,
  }
}

export function summarizeHSNRows(items: GSTLineItem[]): GSTHSNSummaryRow[] {
  const groups = new Map<string, GSTHSNSummaryRow>()

  for (const item of items) {
    const key = `${item.hsn || 'NA'}|${item.gstRate}`
    const current = groups.get(key) ?? {
      hsn: item.hsn || 'NA',
      gstRate: item.gstRate,
      taxable: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0,
    }

    current.taxable += item.taxable
    current.cgst += item.cgst
    current.sgst += item.sgst
    current.igst += item.igst
    current.totalTax += item.totalTax
    groups.set(key, current)
  }

  return [...groups.values()]
}

export function numberToWords(n: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  if (n === 0) return 'Zero'

  function convert(num: number): string {
    if (num === 0) return ''
    if (num < 20) return `${ones[num]} `
    if (num < 100) return `${tens[Math.floor(num / 10)]} ${convert(num % 10)}`
    if (num < 1000) return `${ones[Math.floor(num / 100)]} Hundred ${convert(num % 100)}`
    if (num < 100000) return `${convert(Math.floor(num / 1000))}Thousand ${convert(num % 1000)}`
    if (num < 10000000) return `${convert(Math.floor(num / 100000))}Lakh ${convert(num % 100000)}`
    return `${convert(Math.floor(num / 10000000))}Crore ${convert(num % 10000000)}`
  }

  const parts = n.toFixed(2).split('.')
  const rupees = parseInt(parts[0], 10)
  const paise = parseInt(parts[1], 10)
  let result = `${convert(rupees).trim()} Rupees`
  if (paise > 0) result += ` and ${convert(paise).trim()} Paise`
  return `${result} Only`
}
