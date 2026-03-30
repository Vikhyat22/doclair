export const GST_RATES = [0, 5, 12, 18, 28] as const

export type GSTRate = typeof GST_RATES[number]

export type POSPaymentMode = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Mixed'

export interface POSProduct {
  id: string
  name: string
  price: number
  hsn: string
  gstRate: GSTRate
  unit: string
  category?: string
}

export interface POSCartItem {
  product: POSProduct
  qty: number
  discount: number
}

export interface POSBill {
  id: string
  billNumber: string
  date: string
  customer: string
  customerPhone?: string
  orderRef?: string
  paymentMode?: POSPaymentMode
  items: POSCartItem[]
  total: number
  gstBreakup: Record<number, number>
}

export interface POSShopProfile {
  name: string
  address: string
  gstin: string
  phone: string
  logoDataUrl?: string
}

export function computePOSGSTBreakup(items: POSCartItem[]): Record<number, number> {
  const breakup: Record<number, number> = {}
  for (const ci of items) {
    const taxable = ci.product.price * ci.qty * (1 - ci.discount / 100)
    const gst = taxable * ci.product.gstRate / 100
    breakup[ci.product.gstRate] = (breakup[ci.product.gstRate] ?? 0) + gst
  }
  return breakup
}

export function computePOSTotal(items: POSCartItem[]): number {
  return items.reduce((sum, ci) => {
    const taxable = ci.product.price * ci.qty * (1 - ci.discount / 100)
    return sum + taxable * (1 + ci.product.gstRate / 100)
  }, 0)
}
