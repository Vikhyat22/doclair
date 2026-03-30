import { PDFDocument, StandardFonts, rgb } from '@cantoo/pdf-lib'
import {
  isInterState,
  numberToWords,
  summarizeHSNRows,
} from '../business/gstInvoice'
import type { GSTInvoiceData } from '../business/gstInvoice'

export {
  calcLineItem,
  GST_RATES,
  isInterState,
  numberToWords,
  summarizeHSNRows,
  validateGSTIN,
} from '../business/gstInvoice'
export type {
  GSTDiscountType,
  GSTHSNSummaryRow,
  GSTInvoiceData,
  GSTLineItem,
  GSTLineItemInput,
  GSTRate,
} from '../business/gstInvoice'

type EmbeddedFont = Awaited<ReturnType<PDFDocument['embedFont']>>

function wrapText(text: string, font: EmbeddedFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']

  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(next, size) > maxWidth) {
      if (current) lines.push(current)
      current = word
    } else {
      current = next
    }
  }

  if (current) lines.push(current)
  return lines
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const marker = ';base64,'
  const markerIndex = dataUrl.indexOf(marker)
  const base64 = markerIndex >= 0 ? dataUrl.slice(markerIndex + marker.length) : dataUrl
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function embedDataUrlImage(doc: PDFDocument, dataUrl: string) {
  const bytes = dataUrlToUint8Array(dataUrl)
  return /^data:image\/jpe?g/i.test(dataUrl) ? doc.embedJpg(bytes) : doc.embedPng(bytes)
}

function formatAmount(value: number): string {
  return `Rs.${value.toFixed(2)}`
}

function formatDiscountLabel(discountType: 'percent' | 'amount', discountValue: number): string {
  if (discountValue <= 0) return '—'
  return discountType === 'percent' ? `${discountValue}%` : formatAmount(discountValue)
}

function drawCellText(
  page: ReturnType<PDFDocument['addPage']>,
  text: string,
  x: number,
  width: number,
  y: number,
  font: EmbeddedFont,
  size: number,
  color: ReturnType<typeof rgb>,
  align: 'left' | 'right' = 'left',
) {
  if (align === 'right') {
    const cellText = text.length > 18 ? text.slice(0, 18) : text
    const drawX = x + width - 2 - font.widthOfTextAtSize(cellText, size)
    page.drawText(cellText, { x: drawX, y, size, font, color })
    return
  }

  page.drawText(text, { x: x + 2, y, size, font, color, maxWidth: width - 4 })
}

function drawParagraph(
  page: ReturnType<PDFDocument['addPage']>,
  lines: string[],
  x: number,
  y: number,
  font: EmbeddedFont,
  size: number,
  color: ReturnType<typeof rgb>,
) {
  let currentY = y
  for (const line of lines) {
    page.drawText(line, { x, y: currentY, size, font, color })
    currentY -= size + 2
  }
  return currentY
}

export async function generateGSTInvoicePDF(data: GSTInvoiceData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()

  const fontR = await doc.embedFont(StandardFonts.Helvetica)
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold)

  const ink = rgb(0.10, 0.08, 0.07)
  const amber = rgb(0.91, 0.51, 0.05)
  const muted = rgb(0.48, 0.43, 0.38)
  const white = rgb(1, 1, 1)
  const lightBg = rgb(0.98, 0.97, 0.95)
  const border = rgb(0.85, 0.83, 0.80)

  const interState = isInterState(data.sellerState, data.placeOfSupply)
  const logoImage = data.logoDataUrl ? await embedDataUrlImage(doc, data.logoDataUrl) : undefined

  let y = height - 30

  const typeLabels: Record<string, string> = {
    'tax-invoice': 'TAX INVOICE',
    'bill-of-supply': 'BILL OF SUPPLY',
    'credit-note': 'CREDIT NOTE',
    'debit-note': 'DEBIT NOTE',
  }
  const typeLabel = typeLabels[data.invoiceType] ?? 'TAX INVOICE'
  const labelW = fontB.widthOfTextAtSize(typeLabel, 14) + 24
  page.drawRectangle({ x: (width - labelW) / 2, y: y - 20, width: labelW, height: 20, color: ink })
  page.drawText(typeLabel, {
    x: (width - fontB.widthOfTextAtSize(typeLabel, 14)) / 2,
    y: y - 15,
    size: 14,
    font: fontB,
    color: white,
  })
  y -= 30

  const colW = (width - 80) / 3
  const colY = y

  let ys = colY
  if (logoImage) {
    const scale = Math.min(80 / logoImage.width, 42 / logoImage.height, 1)
    const logoW = logoImage.width * scale
    const logoH = logoImage.height * scale
    page.drawImage(logoImage, { x: 40, y: ys - logoH + 2, width: logoW, height: logoH })
    ys -= logoH + 10
  }
  page.drawText('FROM:', { x: 40, y: ys, size: 7, font: fontB, color: amber })
  ys -= 12
  page.drawText(data.sellerName, { x: 40, y: ys, size: 10, font: fontB, color: ink, maxWidth: colW - 10 })
  ys -= 12
  if (data.sellerLegalName) {
    page.drawText(`Legal: ${data.sellerLegalName}`, { x: 40, y: ys, size: 8, font: fontR, color: muted, maxWidth: colW - 10 })
    ys -= 10
  }
  ys = drawParagraph(page, wrapText(data.sellerAddress, fontR, 8, colW - 10), 40, ys, fontR, 8, muted)
  if (data.sellerPhone) {
    page.drawText(`Ph: ${data.sellerPhone}`, { x: 40, y: ys, size: 8, font: fontR, color: muted })
    ys -= 10
  }
  if (data.sellerEmail) {
    page.drawText(data.sellerEmail, { x: 40, y: ys, size: 8, font: fontR, color: muted })
    ys -= 10
  }
  if (data.sellerWebsite) {
    page.drawText(data.sellerWebsite, { x: 40, y: ys, size: 8, font: fontR, color: muted })
    ys -= 10
  }
  if (data.sellerGSTIN) {
    page.drawText(`GSTIN ${data.sellerGSTIN}`, { x: 40, y: ys, size: 8, font: fontB, color: ink })
    ys -= 10
  }
  if (data.sellerPAN) {
    page.drawText(`PAN ${data.sellerPAN}`, { x: 40, y: ys, size: 8, font: fontR, color: muted })
    ys -= 10
  }

  let yb = colY
  const bx = 40 + colW
  page.drawText('BILL TO:', { x: bx, y: yb, size: 7, font: fontB, color: amber })
  yb -= 12
  page.drawText(data.buyerName, { x: bx, y: yb, size: 10, font: fontB, color: ink, maxWidth: colW - 10 })
  yb -= 12
  yb = drawParagraph(page, wrapText(data.buyerAddress, fontR, 8, colW - 10), bx, yb, fontR, 8, muted)
  page.drawText(`State: ${data.buyerState}`, { x: bx, y: yb, size: 8, font: fontR, color: muted })
  yb -= 10
  if (data.buyerPhone) {
    page.drawText(`Ph: ${data.buyerPhone}`, { x: bx, y: yb, size: 8, font: fontR, color: muted })
    yb -= 10
  }
  if (data.buyerEmail) {
    page.drawText(data.buyerEmail, { x: bx, y: yb, size: 8, font: fontR, color: muted })
    yb -= 10
  }
  if (data.buyerGSTIN) {
    page.drawText(`GSTIN ${data.buyerGSTIN}`, { x: bx, y: yb, size: 8, font: fontB, color: ink })
    yb -= 10
  }

  let yi = colY
  const mx = 40 + colW * 2
  const metaRows = [
    ['INVOICE NO', data.invoiceNumber],
    ['DATE', data.invoiceDate],
    ['P.O. NO', data.purchaseOrderNumber || '—'],
    ['P.O. DATE', data.purchaseOrderDate || '—'],
    ['PLACE OF SUPPLY', data.placeOfSupply],
    ['REV. CHARGE', data.reverseCharge ? 'Yes' : 'No'],
    ['SUPPLY TYPE', interState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'],
  ]
  page.drawText('INVOICE DETAILS', { x: mx, y: yi, size: 7, font: fontB, color: amber })
  yi -= 14
  for (const [label, value] of metaRows) {
    page.drawText(label, { x: mx, y: yi, size: 6.5, font: fontB, color: muted })
    yi -= 9
    page.drawText(value, { x: mx, y: yi, size: 8, font: label === 'SUPPLY TYPE' ? fontB : fontR, color: label === 'SUPPLY TYPE' ? amber : ink, maxWidth: colW - 10 })
    yi -= 12
  }

  y = Math.min(ys, yb, yi) - 12
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: border })
  y -= 6

  const cols = [
    { label: '#', x: 40, w: 18, align: 'left' as const },
    { label: 'Item', x: 60, w: 126, align: 'left' as const },
    { label: 'HSN', x: 188, w: 34, align: 'left' as const },
    { label: 'Qty', x: 224, w: 24, align: 'right' as const },
    { label: 'Unit', x: 250, w: 28, align: 'left' as const },
    { label: 'Rate', x: 280, w: 46, align: 'right' as const },
    { label: 'Disc.', x: 328, w: 42, align: 'right' as const },
    { label: 'Taxable', x: 372, w: 50, align: 'right' as const },
    { label: 'Tax', x: 424, w: 54, align: 'right' as const },
    { label: 'Total', x: 480, w: 55, align: 'right' as const },
  ]

  page.drawRectangle({ x: 40, y: y - 14, width: width - 80, height: 14, color: ink })
  cols.forEach(col => drawCellText(page, col.label, col.x, col.w, y - 10, fontB, 6.5, white, col.align))
  y -= 16

  data.items.forEach((item, idx) => {
    const rowH = 18
    if (idx % 2 === 0) {
      page.drawRectangle({ x: 40, y: y - rowH, width: width - 80, height: rowH, color: lightBg })
    }
    const vals = [
      String(idx + 1),
      item.description,
      item.hsn || '—',
      String(item.qty),
      item.unit,
      formatAmount(item.rate),
      formatDiscountLabel(item.discountType, item.discountValue),
      formatAmount(item.taxable),
      formatAmount(item.totalTax),
      formatAmount(item.total),
    ]
    cols.forEach((col, ci) => {
      drawCellText(page, vals[ci], col.x, col.w, y - 11, fontR, 6.8, ink, col.align)
    })
    y -= rowH
  })

  y -= 4
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.5, color: border })
  y -= 10

  const hsnRows = summarizeHSNRows(data.items)
  const hsnTop = y
  const hsnBoxX = 40
  const hsnBoxW = 280
  const hsnBoxHeight = Math.max(64, 28 + hsnRows.length * 12)
  page.drawRectangle({ x: hsnBoxX, y: hsnTop - hsnBoxHeight, width: hsnBoxW, height: hsnBoxHeight, borderColor: border, borderWidth: 1, color: white })
  page.drawText('HSN / SAC SUMMARY', { x: hsnBoxX + 12, y: hsnTop - 15, size: 8, font: fontB, color: amber })
  const hsnCols = [
    { label: 'HSN/SAC', x: hsnBoxX + 12 },
    { label: 'Taxable', x: hsnBoxX + 86 },
    { label: 'Tax', x: hsnBoxX + 150 },
    { label: 'Rate', x: hsnBoxX + 210 },
  ]
  hsnCols.forEach(col => page.drawText(col.label, { x: col.x, y: hsnTop - 28, size: 6.5, font: fontB, color: muted }))
  let hsnY = hsnTop - 40
  for (const row of hsnRows) {
    page.drawText(row.hsn, { x: hsnCols[0].x, y: hsnY, size: 7, font: fontR, color: ink })
    page.drawText(formatAmount(row.taxable), { x: hsnCols[1].x, y: hsnY, size: 7, font: fontR, color: ink })
    page.drawText(formatAmount(row.totalTax), { x: hsnCols[2].x, y: hsnY, size: 7, font: fontR, color: ink })
    page.drawText(`${row.gstRate}%`, { x: hsnCols[3].x, y: hsnY, size: 7, font: fontR, color: ink })
    hsnY -= 12
  }

  const totalsBoxX = 336
  const totalsBoxW = width - 40 - totalsBoxX
  const totalRows: Array<{ label: string, value: number, emphasize?: boolean }> = [
    { label: 'Subtotal', value: data.subtotal },
    ...(data.totalDiscount > 0 ? [{ label: 'Discount', value: -data.totalDiscount }] : []),
    ...(!interState
      ? [
          { label: 'CGST', value: data.totalCGST },
          { label: 'SGST', value: data.totalSGST },
        ]
      : [{ label: 'IGST', value: data.totalIGST }]),
    ...(data.roundOff !== 0 ? [{ label: 'Round Off', value: data.roundOff }] : []),
    { label: 'TOTAL', value: data.grandTotal, emphasize: true },
  ]
  const totalsBoxTop = hsnTop
  const totalsBoxHeight = 26 + totalRows.length * 14
  page.drawRectangle({ x: totalsBoxX, y: totalsBoxTop - totalsBoxHeight, width: totalsBoxW, height: totalsBoxHeight, borderColor: border, borderWidth: 1, color: white })
  page.drawText('SUMMARY', { x: totalsBoxX + 12, y: totalsBoxTop - 15, size: 8, font: fontB, color: amber })
  let totalsY = totalsBoxTop - 31
  for (const row of totalRows) {
    if (row.emphasize) {
      page.drawRectangle({ x: totalsBoxX + 8, y: totalsY - 4, width: totalsBoxW - 16, height: 18, color: ink })
      page.drawText(row.label, { x: totalsBoxX + 14, y: totalsY, size: 9.5, font: fontB, color: white })
      const totalValue = formatAmount(row.value)
      page.drawText(totalValue, { x: totalsBoxX + totalsBoxW - 14 - fontB.widthOfTextAtSize(totalValue, 9.5), y: totalsY, size: 9.5, font: fontB, color: amber })
      totalsY -= 18
      continue
    }
    page.drawText(row.label, { x: totalsBoxX + 12, y: totalsY, size: 8.5, font: fontR, color: muted })
    const value = formatAmount(row.value)
    page.drawText(value, { x: totalsBoxX + totalsBoxW - 12 - fontR.widthOfTextAtSize(value, 8.5), y: totalsY, size: 8.5, font: fontR, color: muted })
    totalsY -= 14
  }

  const infoTop = Math.min(totalsBoxTop - totalsBoxHeight - 14, hsnTop - hsnBoxHeight - 14)
  const leftBoxX = 40
  const rightBoxX = 305
  const leftBoxW = 245
  const rightBoxW = width - 40 - rightBoxX

  function drawInfoBox(x: number, topY: number, boxWidth: number, boxHeight: number, title: string, lines: string[]) {
    page.drawRectangle({ x, y: topY - boxHeight, width: boxWidth, height: boxHeight, borderColor: border, borderWidth: 1, color: white })
    page.drawText(title, { x: x + 12, y: topY - 16, size: 8, font: fontB, color: amber })
    let lineY = topY - 30
    for (const line of lines) {
      page.drawText(line, { x: x + 12, y: lineY, size: 8, font: fontR, color: muted, maxWidth: boxWidth - 24 })
      lineY -= 10
    }
  }

  const amountLines = wrapText(numberToWords(data.grandTotal), fontR, 8, leftBoxW - 24)
  const leftBoxHeight = Math.max(62, 34 + amountLines.length * 10)

  const paymentLines = [
    ...(data.bankName ? [`Bank: ${data.bankName}`] : []),
    ...(data.accountNumber ? [`A/C: ${data.accountNumber}`] : []),
    ...(data.ifscCode ? [`IFSC: ${data.ifscCode}`] : []),
    ...(data.upiId ? [`UPI: ${data.upiId}`] : []),
  ]
  const summaryLines = paymentLines.length > 0
    ? paymentLines
    : [
        `Items: ${data.items.length}`,
        `Buyer State: ${data.buyerState}`,
        `Supply State: ${data.placeOfSupply}`,
        data.reverseCharge ? 'Reverse Charge: Yes' : 'Reverse Charge: No',
      ]
  const rightBoxTitle = paymentLines.length > 0 ? 'Payment Details' : 'Invoice Summary'
  const rightBoxHeight = Math.max(62, 34 + summaryLines.length * 10)
  const infoBoxHeight = Math.max(leftBoxHeight, rightBoxHeight)

  drawInfoBox(leftBoxX, infoTop, leftBoxW, infoBoxHeight, 'Amount in Words', amountLines)
  drawInfoBox(rightBoxX, infoTop, rightBoxW, infoBoxHeight, rightBoxTitle, summaryLines)

  const declarationParts = [
    data.notes ? `Notes: ${data.notes}` : '',
    data.termsAndConditions ? `Terms: ${data.termsAndConditions}` : '',
    'This is a computer-generated invoice and does not require a handwritten signature.',
  ].filter(Boolean)
  const declarationLines = declarationParts.flatMap(part => wrapText(part, fontR, 8, width - 104))
  const declarationTop = infoTop - infoBoxHeight - 16
  const declarationHeight = Math.max(62, 34 + declarationLines.length * 10)
  drawInfoBox(40, declarationTop, width - 80, declarationHeight, 'Notes & Declaration', declarationLines)

  const signatureTop = declarationTop - declarationHeight - 26
  page.drawText(`For ${data.sellerName || 'Seller'}`, { x: width - 162, y: signatureTop + 8, size: 8, font: fontB, color: ink })
  page.drawLine({ start: { x: width - 190, y: signatureTop }, end: { x: width - 40, y: signatureTop }, thickness: 0.6, color: border })
  page.drawText('Authorized Signatory', { x: width - 162, y: signatureTop - 14, size: 8, font: fontB, color: ink })

  return doc.save()
}
