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

function formatNumber(value: number): string {
  return value.toFixed(2)
}

function formatDiscountLabel(discountType: 'percent' | 'amount', discountValue: number): string {
  if (discountValue <= 0) return '—'
  return discountType === 'percent' ? `${discountValue}%` : formatAmount(discountValue)
}

function formatDisplayDate(value: string): string {
  if (!value) return '—'
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed).replace(/,/g, '')
}

function capLines(lines: string[], maxLines: number): string[] {
  if (lines.length <= maxLines) return lines
  const next = lines.slice(0, maxLines)
  next[maxLines - 1] = `${next[maxLines - 1].replace(/\.*$/, '')}...`
  return next
}

function formatAddressLines(
  address: string,
  font: EmbeddedFont,
  size: number,
  maxWidth: number,
  maxLines: number,
): string[] {
  if (!address.trim()) return ['—']

  const parts = address
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return ['—']

  const lines: string[] = []
  let current = ''

  for (const part of parts) {
    const next = current ? `${current}, ${part}` : part
    if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
      lines.push(current)
      current = part
    } else {
      current = next
    }
  }

  if (current) lines.push(current)
  return capLines(lines, maxLines)
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

function drawLabeledValueRows(
  page: ReturnType<PDFDocument['addPage']>,
  rows: Array<{ label: string; value: string }>,
  x: number,
  y: number,
  width: number,
  labelWidth: number,
  labelFont: EmbeddedFont,
  valueFont: EmbeddedFont,
  size: number,
  color: ReturnType<typeof rgb>,
  mutedColor: ReturnType<typeof rgb>,
) {
  let currentY = y

  for (const row of rows) {
    page.drawText(row.label, {
      x,
      y: currentY,
      size,
      font: labelFont,
      color: mutedColor,
    })

    const valueX = x + labelWidth
    const valueWidth = Math.max(30, width - labelWidth)
    const valueLines = capLines(wrapText(row.value || '—', valueFont, size, valueWidth), 2)

    valueLines.forEach((line, index) => {
      page.drawText(line, {
        x: valueX,
        y: currentY - index * (size + 2),
        size,
        font: valueFont,
        color,
        maxWidth: valueWidth,
      })
    })

    currentY -= Math.max(11, valueLines.length * (size + 2) + 2)
  }

  return currentY
}

export async function generateGSTInvoicePDF(data: GSTInvoiceData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()

  const fontR = await doc.embedFont(StandardFonts.Helvetica)
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontMono = await doc.embedFont(StandardFonts.Courier)
  const fontMonoB = await doc.embedFont(StandardFonts.CourierBold)

  const ink = rgb(0.10, 0.08, 0.07)
  const amber = rgb(0.91, 0.51, 0.05)
  const muted = rgb(0.48, 0.43, 0.38)
  const white = rgb(1, 1, 1)
  const lightBg = rgb(0.98, 0.97, 0.95)
  const panelBg = rgb(0.995, 0.992, 0.985)
  const border = rgb(0.85, 0.83, 0.80)

  const interState = isInterState(data.sellerState, data.placeOfSupply)
  const sellerName = data.sellerName || data.sellerLegalName || 'Your Business'
  const buyerName = data.buyerName || 'Customer'
  const invoiceDateLabel = formatDisplayDate(data.invoiceDate)
  const purchaseOrderDateLabel = data.purchaseOrderDate ? formatDisplayDate(data.purchaseOrderDate) : '—'
  const supplyTypeLabel = interState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'
  const logoImage = data.logoDataUrl ? await embedDataUrlImage(doc, data.logoDataUrl) : undefined
  const margin = 30
  const contentWidth = width - margin * 2

  page.drawRectangle({
    x: margin - 2,
    y: 24,
    width: width - (margin - 2) * 2,
    height: height - 48,
    borderColor: border,
    borderWidth: 1,
    color: white,
  })

  const typeLabels: Record<string, string> = {
    'tax-invoice': 'TAX INVOICE',
    'bill-of-supply': 'BILL OF SUPPLY',
    'credit-note': 'CREDIT NOTE',
    'debit-note': 'DEBIT NOTE',
  }
  const typeLabel = typeLabels[data.invoiceType] ?? 'TAX INVOICE'

  const bandHeight = 28
  const bandY = height - margin - bandHeight
  page.drawRectangle({ x: margin, y: bandY, width: contentWidth, height: bandHeight, color: ink })
  page.drawText(typeLabel, {
    x: margin + 14,
    y: bandY + 8,
    size: 14,
    font: fontB,
    color: white,
  })
  const invoiceCode = data.invoiceNumber || 'DRAFT'
  page.drawText(invoiceCode, {
    x: width - margin - 14 - fontMonoB.widthOfTextAtSize(invoiceCode, 8.4),
    y: bandY + 10,
    size: 8.4,
    font: fontMonoB,
    color: white,
  })
  page.drawText(invoiceDateLabel, {
    x: width - margin - fontR.widthOfTextAtSize(invoiceDateLabel, 7.5),
    y: bandY - 14,
    size: 7.5,
    font: fontR,
    color: muted,
  })

  let y = bandY - 22
  const headerHeight = 176
  const headerBottom = y - headerHeight
  const sellerW = 168
  const buyerW = 165
  const blockGap = 16
  const metaW = contentWidth - sellerW - buyerW - blockGap * 2
  const sellerX = margin + 10
  const buyerX = sellerX + sellerW + blockGap
  const metaX = buyerX + buyerW + blockGap

  page.drawRectangle({ x: margin, y: headerBottom, width: contentWidth, height: headerHeight, color: panelBg })
  page.drawLine({ start: { x: buyerX - 8, y }, end: { x: buyerX - 8, y: headerBottom + 10 }, thickness: 0.5, color: border })
  page.drawLine({ start: { x: metaX - 8, y }, end: { x: metaX - 8, y: headerBottom + 10 }, thickness: 0.5, color: border })

  let ys = y - 2
  if (logoImage) {
    const scale = Math.min(40 / logoImage.width, 28 / logoImage.height, 1)
    const logoW = logoImage.width * scale
    const logoH = logoImage.height * scale
    const logoTopY = ys - 2
    page.drawImage(logoImage, { x: sellerX + 2, y: logoTopY - logoH, width: logoW, height: logoH })
    ys = logoTopY - logoH - 10
  }
  page.drawText('FROM', { x: sellerX, y: ys, size: 6.5, font: fontB, color: amber })
  ys -= 12
  page.drawText(sellerName, { x: sellerX, y: ys, size: 11.6, font: fontB, color: ink, maxWidth: sellerW - 10 })
  ys -= 15
  if (data.sellerLegalName && data.sellerLegalName !== sellerName) {
    page.drawText(`Legal: ${data.sellerLegalName}`, { x: sellerX, y: ys, size: 7.8, font: fontR, color: muted, maxWidth: sellerW - 10 })
    ys -= 11
  }
  const sellerAddressLines = formatAddressLines(data.sellerAddress || '—', fontR, 7.8, sellerW - 10, 3)
  ys = drawParagraph(page, sellerAddressLines, sellerX, ys, fontR, 7.8, muted)
  ys -= 2
  page.drawText(data.sellerState || '—', { x: sellerX, y: ys, size: 7.8, font: fontR, color: muted })
  ys -= 12
  if (data.sellerPhone) {
    page.drawText(`Ph: ${data.sellerPhone}`, { x: sellerX, y: ys, size: 7.6, font: fontR, color: muted })
    ys -= 10.5
  }
  if (data.sellerEmail) {
    page.drawText(`Email: ${data.sellerEmail}`, { x: sellerX, y: ys, size: 7.6, font: fontR, color: muted, maxWidth: sellerW - 10 })
    ys -= 10.5
  }
  if (data.sellerWebsite) {
    page.drawText(`Web: ${data.sellerWebsite}`, { x: sellerX, y: ys, size: 7.6, font: fontR, color: muted, maxWidth: sellerW - 10 })
    ys -= 10.5
  }
  if (data.sellerGSTIN) {
    page.drawText(`GSTIN ${data.sellerGSTIN}`, { x: sellerX, y: ys, size: 7.8, font: fontB, color: ink })
    ys -= 10.5
  }
  if (data.sellerPAN) {
    page.drawText(`PAN ${data.sellerPAN}`, { x: sellerX, y: ys, size: 7.6, font: fontR, color: muted })
    ys -= 10.5
  }

  let yb = y - 2
  page.drawText('BILL TO', { x: buyerX, y: yb, size: 6.5, font: fontB, color: amber })
  yb -= 12
  page.drawText(buyerName, { x: buyerX, y: yb, size: 11.6, font: fontB, color: ink, maxWidth: buyerW - 10 })
  yb -= 15
  const buyerAddressLines = formatAddressLines(data.buyerAddress || '—', fontR, 7.8, buyerW - 10, 3)
  yb = drawParagraph(page, buyerAddressLines, buyerX, yb, fontR, 7.8, muted)
  yb -= 2
  page.drawText(data.buyerState || '—', { x: buyerX, y: yb, size: 7.8, font: fontR, color: muted })
  yb -= 12
  if (data.buyerPhone) {
    page.drawText(`Ph: ${data.buyerPhone}`, { x: buyerX, y: yb, size: 7.6, font: fontR, color: muted })
    yb -= 10.5
  }
  if (data.buyerEmail) {
    page.drawText(`Email: ${data.buyerEmail}`, { x: buyerX, y: yb, size: 7.6, font: fontR, color: muted, maxWidth: buyerW - 10 })
    yb -= 10.5
  }
  if (data.buyerGSTIN) {
    page.drawText(`GSTIN ${data.buyerGSTIN}`, { x: buyerX, y: yb, size: 7.8, font: fontB, color: ink })
    yb -= 10.5
  }

  let yi = y - 2
  const metaRows = [
    ['INVOICE NO', data.invoiceNumber || '—'],
    ['DATE', invoiceDateLabel],
    ['P.O. NO', data.purchaseOrderNumber || '—'],
    ['P.O. DATE', purchaseOrderDateLabel],
    ['PLACE OF SUPPLY', data.placeOfSupply || '—'],
    ['REV. CHARGE', data.reverseCharge ? 'Yes' : 'No'],
    ['SUPPLY TYPE', supplyTypeLabel],
  ] as const
  page.drawText('INVOICE DETAILS', { x: metaX, y: yi, size: 6.5, font: fontB, color: amber })
  yi -= 14
  for (const [label, value] of metaRows) {
    page.drawText(label, { x: metaX, y: yi, size: 6.9, font: fontB, color: muted })
    yi -= 9.5
    page.drawText(value, {
      x: metaX,
      y: yi,
      size: label === 'SUPPLY TYPE' ? 8.1 : 8.5,
      font: label === 'SUPPLY TYPE' ? fontB : fontR,
      color: label === 'SUPPLY TYPE' ? amber : ink,
      maxWidth: metaW - 10,
    })
    yi -= 13.2
  }

  y = headerBottom - 16

  const cols = [
    { label: '#', w: 18, align: 'left' as const },
    { label: 'Description Of Goods / Services', w: 160, align: 'left' as const },
    { label: 'HSN/SAC', w: 48, align: 'left' as const },
    { label: 'Unit', w: 32, align: 'left' as const },
    { label: 'Qty', w: 28, align: 'right' as const },
    { label: 'Rate', w: 52, align: 'right' as const },
    { label: 'Disc.', w: 40, align: 'right' as const },
    { label: 'Taxable', w: 54, align: 'right' as const },
    { label: 'Tax', w: 48, align: 'right' as const },
    { label: 'Total', w: 55, align: 'right' as const },
  ]
  let cursorX = margin
  const positionedCols = cols.map(col => {
    const next = { ...col, x: cursorX }
    cursorX += col.w
    return next
  })

  page.drawRectangle({ x: margin, y: y - 19, width: contentWidth, height: 19, color: ink })
  positionedCols.forEach(col => drawCellText(page, col.label, col.x, col.w, y - 12.2, fontB, 6.6, white, col.align))
  y -= 21

  data.items.forEach((item, idx) => {
    const descriptionLines = capLines(wrapText(item.description || '—', fontR, 7.5, positionedCols[1].w - 6), 3)
    const taxCaption = item.gstRate === 0
      ? 'GST exempt'
      : interState
        ? `IGST ${item.gstRate}%`
        : `CGST ${item.gstRate / 2}% + SGST ${item.gstRate / 2}%`
    const rowH = Math.max(28, descriptionLines.length * 8 + 16)
    if (idx % 2 === 0) {
      page.drawRectangle({ x: margin, y: y - rowH, width: contentWidth, height: rowH, color: lightBg })
    }
    const vals = [
      String(idx + 1),
      '',
      item.hsn || '—',
      item.unit,
      String(item.qty),
      formatNumber(item.rate),
      formatDiscountLabel(item.discountType, item.discountValue),
      formatNumber(item.taxable),
      formatNumber(item.totalTax),
      formatNumber(item.total),
    ]
    const centeredY = y - 14 - Math.max(0, (rowH - 28) / 2)
    positionedCols.forEach((col, ci) => {
      if (ci === 1) {
        let descY = y - 12
        descriptionLines.forEach(line => {
          drawCellText(page, line, col.x, col.w, descY, fontR, 7.5, ink, col.align)
          descY -= 8
        })
        drawCellText(page, taxCaption, col.x, col.w, descY - 1, fontR, 6.5, muted, col.align)
        return
      }
      const cellFont = ci >= 3 ? fontMono : fontR
      drawCellText(page, vals[ci], col.x, col.w, centeredY, cellFont, 7.4, ink, col.align)
    })
    y -= rowH
  })

  y -= 8

  const hsnRows = summarizeHSNRows(data.items)
  const hsnTop = y
  const hsnBoxX = margin
  const hsnBoxW = 316
  const summaryGap = 14
  const totalsBoxX = hsnBoxX + hsnBoxW + summaryGap
  const totalsBoxW = width - margin - totalsBoxX
  const hsnBoxHeight = Math.max(80, 56 + Math.max(hsnRows.length - 1, 0) * 13)
  page.drawRectangle({ x: hsnBoxX, y: hsnTop - hsnBoxHeight, width: hsnBoxW, height: hsnBoxHeight, borderColor: border, borderWidth: 1, color: panelBg })
  page.drawText('HSN / SAC SUMMARY', { x: hsnBoxX + 12, y: hsnTop - 17, size: 8.4, font: fontB, color: amber })
  const hsnCols = interState
    ? [
        { label: 'HSN/SAC', x: hsnBoxX + 12 },
        { label: 'Taxable', x: hsnBoxX + 88 },
        { label: 'IGST', x: hsnBoxX + 168 },
        { label: 'Total Tax', x: hsnBoxX + 236 },
      ]
    : [
        { label: 'HSN/SAC', x: hsnBoxX + 12 },
        { label: 'Taxable', x: hsnBoxX + 82 },
        { label: 'CGST', x: hsnBoxX + 158 },
        { label: 'SGST', x: hsnBoxX + 214 },
        { label: 'Tax', x: hsnBoxX + 268 },
      ]
  hsnCols.forEach(col => page.drawText(col.label, { x: col.x, y: hsnTop - 31, size: 6.8, font: fontB, color: muted }))
  let hsnY = hsnTop - 45
  for (const row of hsnRows) {
    page.drawText(row.hsn, { x: hsnCols[0].x, y: hsnY, size: 7.4, font: fontMono, color: ink })
    page.drawText(formatAmount(row.taxable), { x: hsnCols[1].x, y: hsnY, size: 7.4, font: fontMono, color: ink })
    if (interState) {
      page.drawText(formatAmount(row.igst), { x: hsnCols[2].x, y: hsnY, size: 7.4, font: fontMono, color: ink })
      page.drawText(formatAmount(row.totalTax), { x: hsnCols[3].x, y: hsnY, size: 7.4, font: fontMono, color: ink })
    } else {
      page.drawText(formatAmount(row.cgst), { x: hsnCols[2].x, y: hsnY, size: 7.4, font: fontMono, color: ink })
      page.drawText(formatAmount(row.sgst), { x: hsnCols[3].x, y: hsnY, size: 7.4, font: fontMono, color: ink })
      page.drawText(formatAmount(row.totalTax), { x: hsnCols[4].x, y: hsnY, size: 7.4, font: fontMono, color: ink })
    }
    hsnY -= 13
  }

  const totalRows: Array<{ label: string, value: number, emphasize?: boolean }> = [
    { label: 'Subtotal (Taxable Value)', value: data.subtotal },
    ...(data.totalDiscount > 0 ? [{ label: 'Discount', value: -data.totalDiscount }] : []),
    ...(data.totalTax > 0 ? [{ label: 'Total Tax', value: data.totalTax }] : []),
    ...(!interState
      ? [
          { label: 'CGST', value: data.totalCGST },
          { label: 'SGST', value: data.totalSGST },
        ]
      : [{ label: 'IGST', value: data.totalIGST }]),
    ...(data.roundOff !== 0 ? [{ label: 'Round Off', value: data.roundOff }] : []),
    { label: 'TOTAL', value: data.grandTotal, emphasize: true },
  ]
  const summaryRows = totalRows.filter(row => !row.emphasize)
  const totalRow = totalRows.find(row => row.emphasize)
  const totalsBoxTop = hsnTop
  const totalsBoxHeight = Math.max(98, 68 + summaryRows.length * 14)
  page.drawRectangle({ x: totalsBoxX, y: totalsBoxTop - totalsBoxHeight, width: totalsBoxW, height: totalsBoxHeight, borderColor: border, borderWidth: 1, color: panelBg })
  page.drawText('SUMMARY', { x: totalsBoxX + 12, y: totalsBoxTop - 17, size: 8.4, font: fontB, color: amber })
  let totalsY = totalsBoxTop - 35
  for (const row of summaryRows) {
    page.drawText(row.label, { x: totalsBoxX + 12, y: totalsY, size: 8.2, font: fontR, color: muted, maxWidth: totalsBoxW - 76 })
    const value = formatAmount(row.value)
    page.drawText(value, { x: totalsBoxX + totalsBoxW - 12 - fontMono.widthOfTextAtSize(value, 8.2), y: totalsY, size: 8.2, font: fontMono, color: muted })
    totalsY -= 14
  }
  if (totalRow) {
    page.drawLine({
      start: { x: totalsBoxX + 8, y: totalsY + 4 },
      end: { x: totalsBoxX + totalsBoxW - 8, y: totalsY + 4 },
      thickness: 0.5,
      color: border,
    })
    totalsY -= 8
    page.drawRectangle({ x: totalsBoxX + 8, y: totalsY - 6, width: totalsBoxW - 16, height: 22, color: ink })
    page.drawText(totalRow.label, { x: totalsBoxX + 14, y: totalsY + 1, size: 10.4, font: fontB, color: white })
    const totalValue = formatAmount(totalRow.value)
    page.drawText(totalValue, {
      x: totalsBoxX + totalsBoxW - 14 - fontMonoB.widthOfTextAtSize(totalValue, 10.4),
      y: totalsY + 1,
      size: 10.4,
      font: fontMonoB,
      color: amber,
    })
  }

  const boxBottom = Math.min(hsnTop - hsnBoxHeight, totalsBoxTop - totalsBoxHeight)
  const leftBoxX = margin
  const leftBoxW = 246
  const boxGap = 14
  const rightBoxX = leftBoxX + leftBoxW + boxGap
  const rightBoxW = width - margin - rightBoxX

  function drawInfoBox(x: number, topY: number, boxWidth: number, boxHeight: number, title: string, lines: string[]) {
    page.drawRectangle({ x, y: topY - boxHeight, width: boxWidth, height: boxHeight, borderColor: border, borderWidth: 1, color: panelBg })
    page.drawText(title, { x: x + 12, y: topY - 17, size: 8.4, font: fontB, color: amber })
    let lineY = topY - 32
    for (const line of lines) {
      page.drawText(line, { x: x + 12, y: lineY, size: 8.4, font: fontR, color: muted, maxWidth: boxWidth - 24 })
      lineY -= 11.8
    }
  }

  function drawPaymentBox(
    x: number,
    topY: number,
    boxWidth: number,
    boxHeight: number,
    title: string,
    rows: Array<{ label: string; value: string }>,
  ) {
    page.drawRectangle({ x, y: topY - boxHeight, width: boxWidth, height: boxHeight, borderColor: border, borderWidth: 1, color: panelBg })
    page.drawText(title, { x: x + 12, y: topY - 17, size: 8.4, font: fontB, color: amber })
    drawLabeledValueRows(
      page,
      rows,
      x + 12,
      topY - 32,
      boxWidth - 24,
      58,
      fontB,
      fontMono,
      7.5,
      ink,
      muted,
    )
  }

  const amountLines = capLines(wrapText(numberToWords(data.grandTotal), fontR, 8, leftBoxW - 24), 4)
  const leftBoxHeight = Math.max(66, 38 + amountLines.length * 10)

  const paymentRows = [
    ...(data.bankName ? [{ label: 'Bank', value: data.bankName }] : []),
    ...(data.accountNumber ? [{ label: 'A/C No', value: data.accountNumber }] : []),
    ...(data.ifscCode ? [{ label: 'IFSC', value: data.ifscCode }] : []),
    ...(data.upiId ? [{ label: 'UPI', value: data.upiId }] : []),
  ]
  const summaryLines = paymentRows.length > 0
    ? paymentRows.map(row => `${row.label}: ${row.value}`)
    : [
        `Items: ${data.items.length}`,
        `Buyer State: ${data.buyerState}`,
        `Supply State: ${data.placeOfSupply}`,
        data.reverseCharge ? 'Reverse Charge: Yes' : 'Reverse Charge: No',
      ]
  const rightBoxTitle = paymentRows.length > 0 ? 'Payment Details' : 'Invoice Summary'
  const rightBoxHeight = Math.max(66, 38 + summaryLines.length * 10)
  const infoBoxHeight = Math.max(leftBoxHeight, rightBoxHeight)
  const infoTop = boxBottom - 16

  const noteSections = [
    ...(data.notes ? [{ title: 'NOTES', lines: capLines(wrapText(data.notes, fontR, 7.4, (contentWidth - 40) / 2), 3) }] : []),
    ...(data.termsAndConditions ? [{ title: 'TERMS & CONDITIONS', lines: capLines(wrapText(data.termsAndConditions, fontR, 7.4, (contentWidth - 40) / 2), 3) }] : []),
  ]
  const notesBoxTop = infoTop - infoBoxHeight - 16
  const notesBoxHeight = noteSections.length === 0 ? 0 : noteSections.length === 1 ? 68 : 84

  drawInfoBox(leftBoxX, infoTop, leftBoxW, infoBoxHeight, 'Amount in Words', amountLines)
  if (paymentRows.length > 0) {
    drawPaymentBox(rightBoxX, infoTop, rightBoxW, infoBoxHeight, rightBoxTitle, paymentRows)
  } else {
    drawInfoBox(rightBoxX, infoTop, rightBoxW, infoBoxHeight, rightBoxTitle, summaryLines)
  }
  if (noteSections.length > 0) {
    page.drawRectangle({
      x: margin,
      y: notesBoxTop - notesBoxHeight,
      width: contentWidth,
      height: notesBoxHeight,
      borderColor: border,
      borderWidth: 1,
      color: panelBg,
    })
    if (noteSections.length === 2) {
      page.drawLine({
        start: { x: margin + contentWidth / 2, y: notesBoxTop - 10 },
        end: { x: margin + contentWidth / 2, y: notesBoxTop - notesBoxHeight + 10 },
        thickness: 0.5,
        color: border,
      })
    }
    noteSections.forEach((section, index) => {
      const sectionX = margin + 12 + (noteSections.length === 2 ? index * contentWidth / 2 : 0)
      const sectionW = noteSections.length === 2 ? contentWidth / 2 - 24 : contentWidth - 24
      page.drawText(section.title, { x: sectionX, y: notesBoxTop - 16, size: 7.6, font: fontB, color: amber })
      let sectionY = notesBoxTop - 30
      section.lines.forEach(line => {
        page.drawText(line, { x: sectionX, y: sectionY, size: 7.9, font: fontR, color: muted, maxWidth: sectionW })
        sectionY -= 10.8
      })
    })
  }

  const noteAreaBottom = noteSections.length > 0 ? notesBoxTop - notesBoxHeight : infoTop - infoBoxHeight - 12
  const closingTop = noteAreaBottom - 16
  const closingBottom = 54
  const closingHeight = Math.max(74, closingTop - closingBottom)
  const closingLeftW = contentWidth - 168
  const declarationLines = capLines(wrapText(
    'We declare that this invoice shows the actual price of the goods or services described and that all particulars shown are true and correct.',
    fontR,
    7.2,
    closingLeftW - 24,
  ), 4)

  page.drawRectangle({
    x: margin,
    y: closingBottom,
    width: contentWidth,
    height: closingHeight,
    borderColor: border,
    borderWidth: 1,
    color: panelBg,
  })
  page.drawLine({
    start: { x: margin + closingLeftW, y: closingBottom + 10 },
    end: { x: margin + closingLeftW, y: closingBottom + closingHeight - 10 },
    thickness: 0.5,
    color: border,
  })

  page.drawText('DECLARATION', { x: margin + 12, y: closingBottom + closingHeight - 18, size: 7.4, font: fontB, color: amber })
  let declarationY = closingBottom + closingHeight - 32
  declarationLines.forEach(line => {
    page.drawText(line, { x: margin + 12, y: declarationY, size: 7.7, font: fontR, color: muted, maxWidth: closingLeftW - 24 })
    declarationY -= 10.8
  })

  const signatureX = margin + closingLeftW + 16
  const signatureTop = closingBottom + closingHeight - 20
  page.drawText(`For ${sellerName}`, { x: signatureX, y: signatureTop, size: 8.4, font: fontB, color: ink, maxWidth: 132 })
  page.drawLine({
    start: { x: signatureX, y: closingBottom + 34 },
    end: { x: width - margin - 12, y: closingBottom + 34 },
    thickness: 0.6,
    color: border,
  })
  page.drawText('Authorized Signatory', { x: signatureX, y: closingBottom + 20, size: 8.4, font: fontB, color: ink })

  const footerNote = 'Computer-generated invoice. No signature required.'
  page.drawText(footerNote, { x: margin + 12, y: closingBottom + 12, size: 6.6, font: fontR, color: muted })

  return doc.save()
}
