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

function estimateReceiptHeight(
  bill: POSBill,
  shop: POSShopProfile,
  fontR: EmbeddedFont,
): number {
  const pageWidth = 226
  const itemNameWidth = 104
  let height = 24

  if (shop.logoDataUrl) height += 46
  height += 18

  const shopLines = [
    ...(shop.address ? wrapText(shop.address, fontR, 7, pageWidth - 20) : []),
    ...(shop.gstin ? [`GSTIN: ${shop.gstin}`] : []),
    ...(shop.phone ? [`Ph: ${shop.phone}`] : []),
  ]
  height += shopLines.length * 11
  height += 26
  const metaLines = [
    bill.customer ? `Customer: ${bill.customer}` : '',
    bill.customerPhone ? `Phone: ${bill.customerPhone}` : '',
    bill.orderRef ? `Order Ref: ${bill.orderRef}` : '',
    bill.paymentMode ? `Paid via: ${bill.paymentMode}` : '',
  ].filter(Boolean)
  height += Math.max(24, metaLines.length * 10 + 8)
  height += 22

  for (const ci of bill.items) {
    const nameLines = wrapText(ci.product.name, fontR, 7, itemNameWidth)
    height += Math.max(nameLines.length, 1) * 9 + 4
    if (ci.discount > 0) height += 10
  }

  const gstEntries = Object.values(bill.gstBreakup).filter(value => value > 0)
  if (gstEntries.length > 0) height += gstEntries.length * 11 + 25

  height += 58
  return Math.max(240, height)
}

export async function generatePOSReceiptPDF(bill: POSBill, shop: POSShopProfile): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const fontR = await doc.embedFont(StandardFonts.Helvetica)
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 226
  const pageHeight = estimateReceiptHeight(bill, shop, fontR)
  const page = doc.addPage([pageWidth, pageHeight])

  const white = rgb(1, 1, 1)
  const ink = rgb(0.10, 0.08, 0.07)
  const muted = rgb(0.48, 0.43, 0.38)
  const amber = rgb(0.91, 0.51, 0.05)
  const soft = rgb(0.97, 0.95, 0.92)
  const border = rgb(0.84, 0.80, 0.76)
  const qtyX = 118
  const priceRightX = 176
  const totalRightX = 216

  let y = pageHeight - 16

  page.drawRectangle({ x: 7, y: 7, width: pageWidth - 14, height: pageHeight - 14, borderColor: border, borderWidth: 0.8, color: white })

  function drawLine() {
    page.drawLine({ start: { x: 10, y }, end: { x: pageWidth - 10, y }, thickness: 0.5, color: border })
    y -= 7
  }

  function drawCenteredText(text: string, size: number, font: EmbeddedFont, color = ink) {
    const x = (pageWidth - font.widthOfTextAtSize(text, size)) / 2
    page.drawText(text, { x, y, size, font, color })
    y -= size + 4
  }

  function drawRightText(text: string, rightX: number, size: number, font: EmbeddedFont, color = ink) {
    const x = rightX - font.widthOfTextAtSize(text, size)
    page.drawText(text, { x, y, size, font, color })
  }

  if (shop.logoDataUrl) {
    const logo = await embedDataUrlImage(doc, shop.logoDataUrl)
    const scale = Math.min(52 / logo.width, 34 / logo.height, 1)
    const width = logo.width * scale
    const height = logo.height * scale
    page.drawImage(logo, {
      x: (pageWidth - width) / 2,
      y: y - height,
      width,
      height,
    })
    y -= height + 10
  }

  drawCenteredText(shop.name || 'My Shop', 12, fontB)
  if (shop.address) {
    for (const line of wrapText(shop.address, fontR, 7, pageWidth - 20)) {
      drawCenteredText(line, 7, fontR, muted)
    }
  }
  if (shop.gstin) drawCenteredText(`GSTIN: ${shop.gstin}`, 7, fontR, muted)
  if (shop.phone) drawCenteredText(`Ph: ${shop.phone}`, 7, fontR, muted)

  y -= 4
  drawLine()

  drawCenteredText(bill.billNumber, 9, fontB)
  drawCenteredText(`Date: ${bill.date}`, 7, fontR, muted)
  if (bill.orderRef) drawCenteredText(`Order Ref: ${bill.orderRef}`, 7, fontR, muted)
  if (bill.customer) drawCenteredText(`Customer: ${bill.customer}`, 7, fontR, muted)
  if (bill.customerPhone) drawCenteredText(`Phone: ${bill.customerPhone}`, 7, fontR, muted)
  if (bill.paymentMode) drawCenteredText(`Paid via: ${bill.paymentMode}`, 7, fontR, muted)

  y -= 4
  drawLine()

  page.drawRectangle({ x: 10, y: y - 14, width: pageWidth - 20, height: 14, color: soft })
  page.drawText('Item', { x: 10, y, size: 7, font: fontB, color: muted })
  page.drawText('Qty', { x: qtyX, y, size: 7, font: fontB, color: muted })
  page.drawText('Price', { x: 139, y, size: 7, font: fontB, color: muted })
  page.drawText('Total', { x: 189, y, size: 7, font: fontB, color: muted })
  y -= 15

  for (const ci of bill.items) {
    const lineTotal = ci.product.price * ci.qty * (1 - ci.discount / 100)
    const nameLines = wrapText(ci.product.name, fontR, 7, 102)
    const rowStartY = y

    for (const [index, line] of nameLines.entries()) {
      page.drawText(line, { x: 10, y, size: 7, font: fontR, color: ink })
      if (index === 0) {
        page.drawText(String(ci.qty), { x: qtyX + 2, y, size: 7, font: fontR, color: ink })
        drawRightText(`Rs.${ci.product.price.toFixed(2)}`, priceRightX, 7, fontR)
        drawRightText(`Rs.${lineTotal.toFixed(2)}`, totalRightX, 7, fontR)
      }
      y -= 10
    }

    if (ci.discount > 0) {
      page.drawText(`Discount ${ci.discount}%`, { x: 10, y, size: 6, font: fontR, color: muted })
      y -= 9
    }

    const rowHeight = rowStartY - y
    if (rowHeight < 13) y -= 13 - rowHeight
    y -= 3
  }

  drawLine()

  page.drawText('Subtotal', { x: 10, y, size: 7, font: fontR, color: muted })
  drawRightText(`Rs.${bill.items.reduce((sum, item) => sum + item.product.price * item.qty * (1 - item.discount / 100), 0).toFixed(2)}`, totalRightX, 7, fontR, muted)
  y -= 12

  const gstEntries = Object.entries(bill.gstBreakup).filter(([, value]) => value > 0)
  for (const [rate, amount] of gstEntries) {
    const halfRate = Number(rate) / 2
    const label = Number(rate) === 0 ? 'GST @0%' : `CGST@${halfRate}% + SGST@${halfRate}%`
    page.drawText(label, { x: 10, y, size: 7, font: fontR, color: muted, maxWidth: 150 })
    drawRightText(`Rs.${amount.toFixed(2)}`, totalRightX, 7, fontR, muted)
    y -= 12
  }

  if (gstEntries.length > 0) {
    y -= 2
    drawLine()
  }

  page.drawText('GRAND TOTAL', { x: 10, y, size: 10, font: fontB, color: ink })
  drawRightText(`Rs.${bill.total.toFixed(2)}`, totalRightX, 10, fontB, amber)
  y -= 20

  drawLine()
  y -= 4
  drawCenteredText('Thank you for your purchase!', 8.5, fontR, muted)
  drawCenteredText('Subject to local court jurisdiction', 6, fontR, muted)

  return doc.save()
}
