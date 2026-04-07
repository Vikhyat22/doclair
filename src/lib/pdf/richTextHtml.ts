const ALLOWED_TAGS = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
])

const DISALLOWED_TAGS = new Set([
  'button',
  'embed',
  'form',
  'iframe',
  'input',
  'link',
  'meta',
  'object',
  'script',
  'select',
  'style',
  'textarea',
])

const TAG_NAME_MAP: Record<string, string> = {
  article: 'div',
  aside: 'div',
  b: 'strong',
  del: 's',
  figcaption: 'p',
  figure: 'div',
  footer: 'div',
  header: 'div',
  main: 'div',
  section: 'div',
}

const ALLOWED_STYLE_PROPERTIES = new Set([
  'background-color',
  'border',
  'border-bottom',
  'border-collapse',
  'border-color',
  'border-left',
  'border-right',
  'border-style',
  'border-top',
  'border-width',
  'color',
  'font-size',
  'font-style',
  'font-weight',
  'height',
  'line-height',
  'list-style-type',
  'margin',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-top',
  'text-align',
  'text-decoration',
  'text-indent',
  'vertical-align',
  'white-space',
  'width',
])

const VOID_TAGS = new Set(['br', 'hr', 'img'])

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function sanitizeInlineStyle(styleValue: string) {
  return styleValue
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const [property, ...valueParts] = part.split(':')
      const normalizedProperty = property?.trim().toLowerCase()
      const normalizedValue = valueParts.join(':').trim()

      if (!normalizedProperty || !normalizedValue) return null
      if (!ALLOWED_STYLE_PROPERTIES.has(normalizedProperty)) return null
      if (/expression\s*\(|javascript:/i.test(normalizedValue)) return null

      return `${normalizedProperty}: ${normalizedValue}`
    })
    .filter((value): value is string => Boolean(value))
    .join('; ')
}

function sanitizeLinkUrl(rawUrl: string) {
  const trimmed = rawUrl.trim()

  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed

  return null
}

function sanitizeImageUrl(rawUrl: string) {
  const trimmed = rawUrl.trim()

  if (/^(https?:|blob:)/i.test(trimmed)) return trimmed
  if (/^data:image\//i.test(trimmed)) return trimmed

  return null
}

function copyDimensionAttribute(source: HTMLElement, target: HTMLElement, attribute: 'width' | 'height') {
  const value = source.getAttribute(attribute)?.trim()
  if (!value) return
  if (/^\d+(\.\d+)?(%|px)?$/i.test(value)) target.setAttribute(attribute, value)
}

function sanitizeNode(node: Node, targetDocument: Document): Node[] {
  if (node.nodeType === Node.TEXT_NODE) {
    return [targetDocument.createTextNode(node.textContent ?? '')]
  }

  if (!(node instanceof HTMLElement)) return []

  const originalTag = node.tagName.toLowerCase()
  if (DISALLOWED_TAGS.has(originalTag)) return []

  const tagName = TAG_NAME_MAP[originalTag] ?? originalTag
  if (!ALLOWED_TAGS.has(tagName)) {
    return Array.from(node.childNodes).flatMap(child => sanitizeNode(child, targetDocument))
  }

  const element = targetDocument.createElement(tagName)

  const style = sanitizeInlineStyle(node.getAttribute('style') ?? '')
  if (style) element.setAttribute('style', style)

  if (tagName === 'a') {
    const href = node.getAttribute('href')
    const sanitizedHref = href ? sanitizeLinkUrl(href) : null

    if (sanitizedHref) {
      element.setAttribute('href', sanitizedHref)
      element.setAttribute('target', '_blank')
      element.setAttribute('rel', 'noopener noreferrer')
    }
  }

  if (tagName === 'img') {
    const src = node.getAttribute('src') ?? node.getAttribute('data-src') ?? ''
    const sanitizedSrc = sanitizeImageUrl(src)
    if (!sanitizedSrc) return []

    element.setAttribute('src', sanitizedSrc)

    const alt = node.getAttribute('alt')?.trim()
    if (alt) element.setAttribute('alt', alt)

    copyDimensionAttribute(node, element, 'width')
    copyDimensionAttribute(node, element, 'height')

    return [element]
  }

  if (tagName === 'td' || tagName === 'th') {
    const colspan = node.getAttribute('colspan')?.trim()
    const rowspan = node.getAttribute('rowspan')?.trim()

    if (colspan && /^\d+$/.test(colspan)) element.setAttribute('colspan', colspan)
    if (rowspan && /^\d+$/.test(rowspan)) element.setAttribute('rowspan', rowspan)
  }

  if (VOID_TAGS.has(tagName)) return [element]

  for (const child of Array.from(node.childNodes)) {
    for (const sanitizedChild of sanitizeNode(child, targetDocument)) {
      element.appendChild(sanitizedChild)
    }
  }

  if ((tagName === 'a' || tagName === 'span' || tagName === 'div') && !element.attributes.length) {
    return Array.from(element.childNodes)
  }

  if (!element.textContent?.trim() && !element.querySelector('img, br, hr, table')) {
    return []
  }

  return [element]
}

export function plainTextToRichTextHtml(text: string) {
  const normalized = text.replace(/\r\n?/g, '\n').trim()
  if (!normalized) return ''

  return normalized
    .split(/\n{2,}/)
    .map(paragraph => `<p>${paragraph.split('\n').map(line => escapeHtml(line)).join('<br>')}</p>`)
    .join('')
}

export function sanitizeRichTextHtml(html: string) {
  if (typeof window === 'undefined') return html

  const parser = new DOMParser()
  const parsedDocument = parser.parseFromString(html, 'text/html')
  const cleanDocument = document.implementation.createHTMLDocument('')
  const container = cleanDocument.createElement('div')

  for (const child of Array.from(parsedDocument.body.childNodes)) {
    for (const sanitizedChild of sanitizeNode(child, cleanDocument)) {
      container.appendChild(sanitizedChild)
    }
  }

  return container.innerHTML.trim()
}

async function blobUrlToDataUrl(url: string) {
  const response = await fetch(url)
  const blob = await response.blob()

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image data'))
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Failed to read image data'))
    reader.readAsDataURL(blob)
  })
}

export async function prepareRichTextHtmlForPdf(html: string) {
  if (typeof window === 'undefined') return html

  const sanitizedHtml = sanitizeRichTextHtml(html)
  if (!sanitizedHtml) return sanitizedHtml

  const parser = new DOMParser()
  const parsedDocument = parser.parseFromString(sanitizedHtml, 'text/html')
  const images = Array.from(parsedDocument.querySelectorAll('img'))

  await Promise.all(images.map(async image => {
    const src = image.getAttribute('src')?.trim()
    if (!src) {
      image.remove()
      return
    }

    if (src.startsWith('blob:')) {
      try {
        image.setAttribute('src', await blobUrlToDataUrl(src))
      } catch {
        image.remove()
      }
    }
  }))

  return parsedDocument.body.innerHTML.trim()
}
