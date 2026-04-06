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

  // logo
  if (shop.logoDataUrl) height += 40
  // header band
  height += 22
  // shop name + details
  height += 16
  const shopLines = [
    ...(shop.address ? wrapText(shop.address, fontR, 6.8, pageWidth - 30) : []),
    ...(shop.gstin ? [`GSTIN: ${shop.gstin}`] : []),
    ...(shop.phone ? [`Ph: ${shop.phone}`] : []),
  ]
  height += shopLines.length * 9
  height += 18

  const metaLines = [
    bill.billNumber ? 'Bill No' : '',
    bill.date ? 'Date' : '',
    bill.orderRef ? 'Order Ref' : '',
    bill.customer ? 'Customer' : '',
    bill.customerPhone ? 'Phone' : '',
    bill.paymentMode ? 'Paid via' : '',
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

  // grand total band
  height += 52
  // footer
  height += 28
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

  const white  = rgb(1, 1, 1)
  const ink    = rgb(0.10, 0.08, 0.07)
  const muted  = rgb(0.48, 0.43, 0.38)
  const amber  = rgb(0.91, 0.51, 0.05)
  const border = rgb(0.84, 0.80, 0.76)
  const lightBg = rgb(0.98, 0.97, 0.95)

  const contentLeft  = 12
  const contentRight = pageWidth - 12
  const qtyX         = 126
  const rateRightX   = 175
  const totalRightX  = 214

  const subtotal    = bill.items.reduce((sum, item) => sum + item.product.price * item.qty * (1 - item.discount / 100), 0)
  const gstEntries  = Object.entries(bill.gstBreakup).filter(([, value]) => value > 0)

  let y = pageHeight - 14

  // Outer card
  page.drawRectangle({ x: 7, y: 7, width: pageWidth - 14, height: pageHeight - 14, borderColor: border, borderWidth: 0.8, color: white })

  // ── helpers ──────────────────────────────────────────────────────────────────
  function drawDivider() {
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

  function drawSummaryRow(label: string, value: string) {
    page.drawText(label, { x: contentLeft, y, size: 7.2, font: fontR, color: muted })
    drawRightText(value, totalRightX, 7.2, fontMono, muted)
    y -= 10
  }

  // ── Logo ─────────────────────────────────────────────────────────────────────
  if (shop.logoDataUrl) {
    const logo = await embedDataUrlImage(doc, shop.logoDataUrl)
    const scale  = Math.min(52 / logo.width, 34 / logo.height, 1)
    const logoW  = logo.width  * scale
    const logoH  = logo.height * scale
    page.drawImage(logo, { x: (pageWidth - logoW) / 2, y: y - logoH, width: logoW, height: logoH })
    y -= logoH + 6
  }

  // ── Header band: "GST RECEIPT" ────────────────────────────────────────────
  const bandH = 18
  page.drawRectangle({ x: 7, y: y - bandH, width: pageWidth - 14, height: bandH, color: ink })
  const label = 'GST RECEIPT'
  page.drawText(label, {
    x: (pageWidth - fontB.widthOfTextAtSize(label, 7.5)) / 2,
    y: y - bandH + 5,
    size: 7.5, font: fontB, color: white,
  })
  y -= bandH + 10

  // ── Shop info (centered) ──────────────────────────────────────────────────
  drawCenteredText(shop.name || 'My Shop', 11.5, fontB)
  if (shop.address) {
    for (const line of wrapText(shop.address, fontR, 6.8, pageWidth - 28)) {
      drawCenteredText(line, 6.8, fontR, muted)
    }
  }
  if (shop.gstin) drawCenteredText(`GSTIN: ${shop.gstin}`, 6.8, fontR, muted)
  if (shop.phone) drawCenteredText(`Ph: ${shop.phone}`, 6.8, fontR, muted)

  y -= 2
  drawDivider()

  // ── Bill meta ─────────────────────────────────────────────────────────────
  if (bill.billNumber)    drawMetaRow('Bill No:',    bill.billNumber)
  if (bill.date)          drawMetaRow('Date:',        bill.date)
  if (bill.orderRef)      drawMetaRow('Order Ref:',   bill.orderRef)
  if (bill.customer)      drawMetaRow('Customer:',    bill.customer)
  if (bill.customerPhone) drawMetaRow('Phone:',       bill.customerPhone)
  if (bill.paymentMode)   drawMetaRow('Paid via:',    bill.paymentMode)

  y -= 1
  drawDivider()

  // ── Column headers ────────────────────────────────────────────────────────
  page.drawText('ITEM', { x: contentLeft, y, size: 6.4, font: fontB, color: muted })
  page.drawText('QTY',  { x: qtyX,        y, size: 6.4, font: fontB, color: muted })
  page.drawText('RATE', { x: 148,          y, size: 6.4, font: fontB, color: muted })
  page.drawText('AMT',  { x: 194,          y, size: 6.4, font: fontB, color: muted })
  y -= 12

  // ── Items ─────────────────────────────────────────────────────────────────
  for (const ci of bill.items) {
    const taxable   = ci.product.price * ci.qty * (1 - ci.discount / 100)
    const gstAmount = taxable * ci.product.gstRate / 100
    const nameLines = wrapText(ci.product.name, fontR, 7, qtyX - contentLeft - 4)

    for (const [index, line] of nameLines.entries()) {
      page.drawText(line, { x: contentLeft, y, size: 7, font: index === 0 ? fontB : fontR, color: ink })
      if (index === 0) {
        page.drawText(String(ci.qty), { x: qtyX + 2, y, size: 6.6, font: fontMono, color: ink })
        drawRightText(formatLineAmount(ci.product.price), rateRightX, 6.6, fontMono)
        drawRightText(formatLineAmount(taxable),          totalRightX, 6.6, fontMono)
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

  // ── GST summary ───────────────────────────────────────────────────────────
  y -= 2
  drawSummaryRow('Subtotal', formatAmount(subtotal))
  for (const [rate, amount] of gstEntries) {
    const halfRate = Number(rate) / 2
    const rowLabel = Number(rate) === 0 ? 'GST @0%' : `CGST@${halfRate}% + SGST@${halfRate}%`
    drawSummaryRow(rowLabel, formatAmount(amount))
  }

  y -= 4
  drawDivider()
  y -= 4

  // ── Grand Total (full-width dark band) ────────────────────────────────────
  const totalBandH = 22
  page.drawRectangle({ x: 7, y: y - totalBandH, width: pageWidth - 14, height: totalBandH, color: ink })
  page.drawText('GRAND TOTAL', {
    x: contentLeft + 4,
    y: y - totalBandH + 7,
    size: 9, font: fontB, color: white,
  })
  const totalStr = formatAmount(bill.total)
  page.drawText(totalStr, {
    x: totalRightX - fontMonoB.widthOfTextAtSize(totalStr, 10),
    y: y - totalBandH + 6,
    size: 10, font: fontMonoB, color: amber,
  })
  y -= totalBandH + 10

  // ── Footer ────────────────────────────────────────────────────────────────
  drawCenteredText('Thank you! Come Again', 7.8, fontB, muted)
  drawCenteredText('Subject to local court jurisdiction', 5.8, fontR, muted)

  return doc.save()
}
