import { PDFDocument, StandardFonts, rgb } from '@cantoo/pdf-lib'

export interface GSTLineItem {
  description: string
  hsn:         string
  qty:         number
  unit:        string
  rate:        number
  gstRate:     0 | 5 | 12 | 18 | 28
  taxable:     number
  cgst:        number
  sgst:        number
  igst:        number
  total:       number
}

export interface GSTInvoiceData {
  invoiceNumber:   string
  invoiceDate:     string
  invoiceType:     'tax-invoice' | 'bill-of-supply' | 'credit-note' | 'debit-note'
  sellerName:      string
  sellerAddress:   string
  sellerState:     string
  sellerGSTIN:     string
  sellerPhone:     string
  sellerEmail:     string
  buyerName:       string
  buyerAddress:    string
  buyerState:      string
  buyerGSTIN:      string
  placeOfSupply:   string
  items:           GSTLineItem[]
  subtotal:        number
  totalCGST:       number
  totalSGST:       number
  totalIGST:       number
  grandTotal:      number
  bankName:        string
  accountNumber:   string
  ifscCode:        string
  upiId:           string
  notes:           string
  logoDataUrl:     string
}

export function isInterState(sellerState: string, placeOfSupply: string): boolean {
  return sellerState.toLowerCase().trim() !== placeOfSupply.toLowerCase().trim()
}

export function calcLineItem(
  item: Omit<GSTLineItem, 'taxable'|'cgst'|'sgst'|'igst'|'total'>,
  interState: boolean,
): GSTLineItem {
  const taxable = item.qty * item.rate
  const gstAmt  = taxable * item.gstRate / 100
  return {
    ...item,
    taxable,
    cgst:  interState ? 0 : gstAmt / 2,
    sgst:  interState ? 0 : gstAmt / 2,
    igst:  interState ? gstAmt : 0,
    total: taxable + gstAmt,
  }
}

export function validateGSTIN(gstin: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)
}

export function numberToWords(n: number): string {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
                 'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
                 'Seventeen','Eighteen','Nineteen']
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
  if (n === 0) return 'Zero'
  function convert(num: number): string {
    if (num === 0)       return ''
    if (num < 20)        return ones[num] + ' '
    if (num < 100)       return tens[Math.floor(num/10)] + ' ' + convert(num % 10)
    if (num < 1000)      return ones[Math.floor(num/100)] + ' Hundred ' + convert(num % 100)
    if (num < 100000)    return convert(Math.floor(num/1000)) + 'Thousand ' + convert(num % 1000)
    if (num < 10000000)  return convert(Math.floor(num/100000)) + 'Lakh ' + convert(num % 100000)
    return convert(Math.floor(num/10000000)) + 'Crore ' + convert(num % 10000000)
  }
  const parts = n.toFixed(2).split('.')
  const rupees = parseInt(parts[0])
  const paise  = parseInt(parts[1])
  let result = convert(rupees).trim() + ' Rupees'
  if (paise > 0) result += ' and ' + convert(paise).trim() + ' Paise'
  return result + ' Only'
}

function wrapText(text: string, font: Awaited<ReturnType<PDFDocument['embedFont']>>, size: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? current + ' ' + word : word
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (current) lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

export async function generateGSTInvoicePDF(data: GSTInvoiceData): Promise<Uint8Array> {
  const doc  = await PDFDocument.create()
  const page = doc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()

  const fontR = await doc.embedFont(StandardFonts.Helvetica)
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold)

  const ink    = rgb(0.10, 0.08, 0.07)
  const amber  = rgb(0.91, 0.51, 0.05)
  const muted  = rgb(0.48, 0.43, 0.38)
  const white  = rgb(1, 1, 1)
  const lightBg = rgb(0.98, 0.97, 0.95)

  const interState = isInterState(data.sellerState, data.placeOfSupply)

  let y = height - 30

  // Title bar
  const typeLabels: Record<string, string> = {
    'tax-invoice': 'TAX INVOICE', 'bill-of-supply': 'BILL OF SUPPLY',
    'credit-note': 'CREDIT NOTE', 'debit-note': 'DEBIT NOTE',
  }
  const typeLabel = typeLabels[data.invoiceType] ?? 'TAX INVOICE'
  const labelW = fontB.widthOfTextAtSize(typeLabel, 14) + 24
  page.drawRectangle({ x: (width - labelW) / 2, y: y - 20, width: labelW, height: 20, color: ink })
  page.drawText(typeLabel, {
    x: (width - fontB.widthOfTextAtSize(typeLabel, 14)) / 2,
    y: y - 15, size: 14, font: fontB, color: white,
  })
  y -= 30

  // Seller | Buyer | Invoice meta — 3 columns
  const colW = (width - 80) / 3
  const colY = y

  // Seller
  let ys = colY
  page.drawText('FROM:', { x: 40, y: ys, size: 7, font: fontB, color: amber }); ys -= 12
  page.drawText(data.sellerName, { x: 40, y: ys, size: 10, font: fontB, color: ink, maxWidth: colW - 10 }); ys -= 12
  wrapText(data.sellerAddress, fontR, 8, colW - 10).forEach(l => {
    page.drawText(l, { x: 40, y: ys, size: 8, font: fontR, color: muted }); ys -= 10
  })
  page.drawText('State: ' + data.sellerState, { x: 40, y: ys, size: 8, font: fontR, color: muted }); ys -= 10
  if (data.sellerGSTIN) { page.drawText('GSTIN: ' + data.sellerGSTIN, { x: 40, y: ys, size: 8, font: fontB, color: ink }); ys -= 10 }
  if (data.sellerPhone)  { page.drawText('Ph: ' + data.sellerPhone, { x: 40, y: ys, size: 8, font: fontR, color: muted }); ys -= 10 }
  if (data.sellerEmail)  { page.drawText(data.sellerEmail, { x: 40, y: ys, size: 8, font: fontR, color: muted }); ys -= 10 }

  // Buyer
  let yb = colY
  const bx = 40 + colW
  page.drawText('TO:', { x: bx, y: yb, size: 7, font: fontB, color: amber }); yb -= 12
  page.drawText(data.buyerName, { x: bx, y: yb, size: 10, font: fontB, color: ink, maxWidth: colW - 10 }); yb -= 12
  wrapText(data.buyerAddress, fontR, 8, colW - 10).forEach(l => {
    page.drawText(l, { x: bx, y: yb, size: 8, font: fontR, color: muted }); yb -= 10
  })
  page.drawText('State: ' + data.buyerState, { x: bx, y: yb, size: 8, font: fontR, color: muted }); yb -= 10
  if (data.buyerGSTIN) { page.drawText('GSTIN: ' + data.buyerGSTIN, { x: bx, y: yb, size: 8, font: fontB, color: ink }); yb -= 10 }

  // Invoice meta
  let yi = colY
  const mx = 40 + colW * 2
  page.drawText('INVOICE DETAILS', { x: mx, y: yi, size: 7, font: fontB, color: amber }); yi -= 12
  page.drawText('No: ' + data.invoiceNumber, { x: mx, y: yi, size: 9, font: fontB, color: ink }); yi -= 11
  page.drawText('Date: ' + data.invoiceDate, { x: mx, y: yi, size: 8, font: fontR, color: muted }); yi -= 11
  page.drawText('Place of Supply: ' + data.placeOfSupply, { x: mx, y: yi, size: 8, font: fontR, color: muted }); yi -= 11
  page.drawText(interState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)', { x: mx, y: yi, size: 8, font: fontB, color: amber })

  y = Math.min(ys, yb, yi) - 16

  // Divider
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: rgb(0.85, 0.83, 0.80) })
  y -= 6

  // Table header
  const cols = [
    { label: '#',         x: 40,  w: 18  },
    { label: 'Item',      x: 60,  w: 145 },
    { label: 'HSN',       x: 208, w: 48  },
    { label: 'Qty',       x: 258, w: 32  },
    { label: 'Rate',      x: 292, w: 55  },
    { label: 'Taxable',   x: 350, w: 55  },
    { label: interState ? 'IGST' : 'CGST+SGST', x: 408, w: 60 },
    { label: 'Total',     x: 470, w: 65  },
  ]

  page.drawRectangle({ x: 40, y: y - 14, width: width - 80, height: 14, color: ink })
  cols.forEach(col => page.drawText(col.label, { x: col.x + 2, y: y - 10, size: 7, font: fontB, color: white }))
  y -= 16

  // Item rows
  data.items.forEach((item, idx) => {
    const rowH = 14
    if (idx % 2 === 0) page.drawRectangle({ x: 40, y: y - rowH, width: width - 80, height: rowH, color: lightBg })
    const gstStr = interState
      ? `IGST ${item.gstRate}% = Rs.${item.igst.toFixed(2)}`
      : `C+S ${item.gstRate/2}%+${item.gstRate/2}% = Rs.${(item.cgst+item.sgst).toFixed(2)}`
    const vals = [
      String(idx + 1), item.description, item.hsn,
      `${item.qty} ${item.unit}`, `Rs.${item.rate.toFixed(2)}`,
      `Rs.${item.taxable.toFixed(2)}`, gstStr, `Rs.${item.total.toFixed(2)}`,
    ]
    cols.forEach((col, ci) => page.drawText(vals[ci], { x: col.x + 2, y: y - 10, size: 7, font: fontR, color: ink, maxWidth: col.w - 4 }))
    y -= rowH
  })

  // Divider
  y -= 4
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: rgb(0.85, 0.83, 0.80) })
  y -= 10

  // Totals
  const tx = width - 200
  const drawTotalRow = (label: string, val: string, bold = false) => {
    page.drawText(label, { x: tx, y, size: 9, font: bold ? fontB : fontR, color: bold ? ink : muted })
    page.drawText(val, { x: width - 42 - fontR.widthOfTextAtSize(val, 9), y, size: 9, font: bold ? fontB : fontR, color: bold ? amber : muted })
    y -= 13
  }
  drawTotalRow('Subtotal:', `Rs.${data.subtotal.toFixed(2)}`)
  if (!interState) {
    drawTotalRow('CGST:', `Rs.${data.totalCGST.toFixed(2)}`)
    drawTotalRow('SGST:', `Rs.${data.totalSGST.toFixed(2)}`)
  } else {
    drawTotalRow('IGST:', `Rs.${data.totalIGST.toFixed(2)}`)
  }
  y -= 2
  page.drawRectangle({ x: tx - 8, y: y - 4, width: width - tx - 30, height: 18, color: ink })
  page.drawText('Grand Total:', { x: tx, y, size: 10, font: fontB, color: white })
  const gs = `Rs.${data.grandTotal.toFixed(2)}`
  page.drawText(gs, { x: width - 42 - fontB.widthOfTextAtSize(gs, 10), y, size: 10, font: fontB, color: rgb(0.91, 0.51, 0.05) })
  y -= 24

  // Amount in words
  page.drawText('Amount in words: ' + numberToWords(data.grandTotal), { x: 40, y, size: 8, font: fontR, color: muted, maxWidth: 360 })
  y -= 20

  // Bank details
  if (data.bankName || data.accountNumber || data.ifscCode || data.upiId) {
    page.drawText('Bank Details:', { x: 40, y, size: 8, font: fontB, color: ink }); y -= 10
    if (data.bankName)      { page.drawText('Bank: ' + data.bankName, { x: 40, y, size: 8, font: fontR, color: muted }); y -= 10 }
    if (data.accountNumber) { page.drawText('A/C: ' + data.accountNumber, { x: 40, y, size: 8, font: fontR, color: muted }); y -= 10 }
    if (data.ifscCode)      { page.drawText('IFSC: ' + data.ifscCode, { x: 40, y, size: 8, font: fontR, color: muted }); y -= 10 }
    if (data.upiId)         { page.drawText('UPI: ' + data.upiId, { x: 40, y, size: 8, font: fontR, color: muted }); y -= 10 }
    y -= 4
  }

  if (data.notes) {
    page.drawText('Notes: ' + data.notes, { x: 40, y, size: 8, font: fontR, color: muted, maxWidth: 300 })
    y -= 16
  }

  // Footer
  page.drawText('Generated with Doclair — doclair.in', { x: 40, y: 20, size: 7, font: fontR, color: rgb(0.7, 0.7, 0.7) })

  return doc.save()
}
