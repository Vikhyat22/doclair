import { PDFDocument, StandardFonts, rgb } from '@cantoo/pdf-lib'
import type { POSBill, POSShopProfile } from '../business/posBilling'

export type { POSBill, POSCartItem, POSPaymentMode, POSProduct, POSShopProfile } from '../business/posBilling'
export { computePOSGSTBreakup, computePOSTotal } from '../business/posBilling'

type EmbeddedFont = Awaited<ReturnType<PDFDocument['embedFont']>>

function wrapText(text: string, font: EmbeddedFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']

  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = word
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

function formatLineAmount(value: number): string {
  return value.toFixed(2)
}

function estimateReceiptHeight(
  bill: POSBill,
  shop: POSShopProfile,
  fontR: EmbeddedFont,
): number {
  const pageWidth = 226
  const itemNameWidth = 118
  let height = 18

  if (shop.logoDataUrl) height += 34
  height += 20

  const shopLines = [
    ...(shop.address ? wrapText(shop.address, fontR, 6.8, pageWidth - 30) : []),
    ...(shop.gstin ? [`GSTIN: ${shop.gstin}`] : []),
    ...(shop.phone ? [`Ph: ${shop.phone}`] : []),
  ]
  height += shopLines.length * 8
  height += 18

  const metaLines = [
    bill.billNumber ? `Bill No: ${bill.billNumber}` : '',
    bill.date ? `Date: ${bill.date}` : '',
    bill.orderRef ? `Order Ref: ${bill.orderRef}` : '',
    bill.customer ? `Customer: ${bill.customer}` : '',
    bill.customerPhone ? `Phone: ${bill.customerPhone}` : '',
    bill.paymentMode ? `Paid via: ${bill.paymentMode}` : '',
  ].filter(Boolean)
  height += Math.max(32, metaLines.length * 9 + 6)
  height += 14

  for (const ci of bill.items) {
    const nameLines = wrapText(ci.product.name, fontR, 7, itemNameWidth)
    height += Math.max(nameLines.length, 1) * 8 + 14
    height += 7
    if (ci.discount > 0) height += 7
  }

  const gstEntries = Object.values(bill.gstBreakup).filter(value => value > 0)
  if (gstEntries.length > 0) height += gstEntries.length * 9 + 18

  height += 44
  return Math.max(220, height)
}

export async function generatePOSReceiptPDF(bill: POSBill, shop: POSShopProfile): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const fontR = await doc.embedFont(StandardFonts.Helvetica)
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontMono = await doc.embedFont(StandardFonts.Courier)
  const fontMonoB = await doc.embedFont(StandardFonts.CourierBold)

  const pageWidth = 226
  const pageHeight = estimateReceiptHeight(bill, shop, fontR)
  const page = doc.addPage([pageWidth, pageHeight])

  const white = rgb(1, 1, 1)
  const ink = rgb(0.10, 0.08, 0.07)
  const muted = rgb(0.48, 0.43, 0.38)
  const amber = rgb(0.91, 0.51, 0.05)
  const border = rgb(0.84, 0.80, 0.76)
  const lightBg = rgb(0.98, 0.97, 0.95)
  const contentLeft = 12
  const contentRight = pageWidth - 12
  const itemWidth = 100
  const qtyX = 122
  const rateRightX = 170
  const totalRightX = 214
  const subtotal = bill.items.reduce((sum, item) => sum + item.product.price * item.qty * (1 - item.discount / 100), 0)
  const gstEntries = Object.entries(bill.gstBreakup).filter(([, value]) => value > 0)

  let y = pageHeight - 16

  page.drawRectangle({ x: 7, y: 7, width: pageWidth - 14, height: pageHeight - 14, borderColor: border, borderWidth: 0.8, color: white })

  function drawLine() {
    page.drawLine({ start: { x: contentLeft, y }, end: { x: contentRight, y }, thickness: 0.5, color: border })
    y -= 6
  }

  function drawCenteredText(text: string, size: number, font: EmbeddedFont, color = ink) {
    const x = (pageWidth - font.widthOfTextAtSize(text, size)) / 2
    page.drawText(text, { x, y, size, font, color })
    y -= size + 3
  }

  function drawRightText(text: string, rightX: number, size: number, font: EmbeddedFont, color = ink) {
    const x = rightX - font.widthOfTextAtSize(text, size)
    page.drawText(text, { x, y, size, font, color })
  }

  function drawMetaRow(label: string, value: string) {
    page.drawText(label, { x: contentLeft, y, size: 6.8, font: fontR, color: muted })
    const x = Math.max(contentLeft + 52, contentRight - fontMono.widthOfTextAtSize(value, 6.8))
    page.drawText(value, { x, y, size: 6.8, font: fontMono, color: ink })
    y -= 9
  }

  function drawSummaryRow(label: string, value: string, emphasize = false) {
    page.drawText(label, {
      x: contentLeft,
      y,
      size: emphasize ? 9.4 : 7.2,
      font: emphasize ? fontB : fontR,
      color: emphasize ? ink : muted,
    })
    drawRightText(value, totalRightX, emphasize ? 9.4 : 7.2, emphasize ? fontMonoB : fontMono, emphasize ? amber : muted)
    y -= emphasize ? 15 : 10
  }

  if (shop.logoDataUrl) {
    const logo = await embedDataUrlImage(doc, shop.logoDataUrl)
    const scale = Math.min(48 / logo.width, 26 / logo.height, 1)
    const width = logo.width * scale
    const height = logo.height * scale
    page.drawImage(logo, {
      x: (pageWidth - width) / 2,
      y: y - height,
      width,
      height,
    })
    y -= height + 8
  }

  page.drawRectangle({ x: contentLeft, y: y - 11, width: 62, height: 14, color: lightBg, borderColor: border, borderWidth: 0.5 })
  page.drawText('GST RECEIPT', { x: contentLeft + 8, y: y - 6, size: 6.5, font: fontB, color: amber })
  y -= 18

  drawCenteredText(shop.name || 'My Shop', 11.5, fontB)
  if (shop.address) {
    for (const line of wrapText(shop.address, fontR, 6.8, pageWidth - 28)) {
      drawCenteredText(line, 6.8, fontR, muted)
    }
  }
  if (shop.gstin) drawCenteredText(`GSTIN: ${shop.gstin}`, 6.8, fontR, muted)
  if (shop.phone) drawCenteredText(`Ph: ${shop.phone}`, 6.8, fontR, muted)

  y -= 3
  drawLine()

  drawMetaRow('Bill No:', bill.billNumber)
  drawMetaRow('Date:', bill.date)
  if (bill.orderRef) drawMetaRow('Order Ref:', bill.orderRef)
  if (bill.customer) drawMetaRow('Customer:', bill.customer)
  if (bill.customerPhone) drawMetaRow('Phone:', bill.customerPhone)
  if (bill.paymentMode) drawMetaRow('Paid via:', bill.paymentMode)

  y -= 1
  drawLine()

  page.drawText('ITEM', { x: contentLeft, y, size: 6.4, font: fontB, color: muted })
  page.drawText('QTY', { x: qtyX, y, size: 6.4, font: fontB, color: muted })
  page.drawText('RATE', { x: 143, y, size: 6.4, font: fontB, color: muted })
  page.drawText('AMT', { x: 191, y, size: 6.4, font: fontB, color: muted })
  y -= 12

  for (const ci of bill.items) {
    const taxable = ci.product.price * ci.qty * (1 - ci.discount / 100)
    const gstAmount = taxable * ci.product.gstRate / 100
    const nameLines = wrapText(ci.product.name, fontR, 7, itemWidth)

    page.drawRectangle({ x: contentLeft - 2, y: y - (nameLines.length * 9 + (ci.discount > 0 ? 18 : 10)), width: contentRight - contentLeft + 4, height: nameLines.length * 9 + (ci.discount > 0 ? 18 : 10), color: white })
    for (const [index, line] of nameLines.entries()) {
      page.drawText(line, { x: contentLeft, y, size: 7, font: index === 0 ? fontB : fontR, color: ink })
      if (index === 0) {
        page.drawText(String(ci.qty), { x: qtyX + 2, y, size: 6.6, font: fontMono, color: ink })
        drawRightText(formatLineAmount(ci.product.price), rateRightX, 6.6, fontMono)
        drawRightText(formatLineAmount(taxable), totalRightX, 6.6, fontMono)
      }
      y -= 8.5
    }

    page.drawText(`GST@${ci.product.gstRate}%: ${formatAmount(gstAmount)}`, { x: contentLeft, y, size: 6.2, font: fontR, color: muted })
    y -= 8
    if (ci.discount > 0) {
      page.drawText(`Discount ${ci.discount}%`, { x: contentLeft, y, size: 6.2, font: fontR, color: muted })
      y -= 8
    }
    page.drawLine({ start: { x: contentLeft, y }, end: { x: contentRight, y }, thickness: 0.35, color: border })
    y -= 6
  }

  y -= 2
  drawSummaryRow('Subtotal', formatAmount(subtotal))
  for (const [rate, amount] of gstEntries) {
    const halfRate = Number(rate) / 2
    const label = Number(rate) === 0 ? 'GST @0%' : `CGST@${halfRate}% + SGST@${halfRate}%`
    drawSummaryRow(label, formatAmount(amount))
  }
  y -= 2
  drawLine()
  y -= 2
  drawSummaryRow('GRAND TOTAL', formatAmount(bill.total), true)
  y -= 3
  drawLine()
  y -= 2

  drawCenteredText('Thank you! Come Again', 7.8, fontB, muted)
  drawCenteredText('Subject to local court jurisdiction', 5.8, fontR, muted)

  return doc.save()
}
