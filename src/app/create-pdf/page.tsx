'use client'

import { useState, useCallback, useEffect, useRef, type ChangeEvent, type ClipboardEvent, type MouseEvent } from 'react'
import ToolPageLayout from '@/components/layout/ToolPageLayout'
import DownloadCard from '@/components/ui/DownloadCard'
import ErrorCard from '@/components/ui/ErrorCard'
import FAQ from '@/components/ui/FAQ'
import ToolSidebar from '@/components/ui/ToolSidebar'
import { plainTextToRichTextHtml, sanitizeRichTextHtml } from '@/lib/pdf/richTextHtml'
import { richTextToPdfBlob, type RichTextPdfOrientation, type RichTextPdfPageSize } from '@/lib/pdf/richTextToPdf'

type ToolState = 'idle' | 'processing' | 'done' | 'error'

const FAQS = [
  {
    q: 'How does the PDF export work?',
    a: 'Clicking "Generate PDF" creates the PDF in your browser and downloads it directly. No print dialog is required.',
  },
  {
    q: 'What formatting is supported?',
    a: 'The toolbar supports headings (H1, H2), bold, italic, bulleted lists, and numbered lists. The editor also includes controls for creating and editing links, tables, and images.',
  },
  {
    q: 'Can I choose page size and orientation?',
    a: 'Yes. You can switch between A4 and Letter, and choose portrait or landscape before generating the PDF.',
  },
  {
    q: 'Are my files uploaded anywhere?',
    a: 'No. PDF generation runs entirely in your browser. Your content stays on your device.',
  },
  {
    q: 'Can I paste content from another document?',
    a: 'Yes. Pasting can keep supported rich formatting such as tables, links, and images, while plain text still works cleanly too.',
  },
  {
    q: 'Is there a character or page limit?',
    a: 'There is no hard limit. The PDF will span as many pages as needed for your content.',
  },
]

const SIDEBAR_RELATED = [
  { name: 'Markdown to PDF', slug: 'markdown-to-pdf', icon: '#️⃣', colorBg: '#F3F4F6', desc: 'From Markdown' },
  { name: 'Text to PDF',     slug: 'text-to-pdf',     icon: '📄', colorBg: '#FFF0DC', desc: 'From plain text' },
  { name: 'HTML to PDF',     slug: 'html-to-pdf',     icon: '🌐', colorBg: '#DBEAFE', desc: 'From HTML / URL' },
  { name: 'Word to PDF',     slug: 'word-to-pdf',     icon: '📝', colorBg: '#EDE9FE', desc: 'Convert .docx' },
]

type PageSize = RichTextPdfPageSize
type PageOrientation = RichTextPdfOrientation

const PAGE_SIZE_OPTIONS: Array<{ value: PageSize, label: string }> = [
  { value: 'A4', label: 'A4' },
  { value: 'Letter', label: 'Letter' },
]

const PAGE_ORIENTATION_OPTIONS: Array<{ value: PageOrientation, label: string }> = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
]

function buildDocumentTitle(text: string) {
  const firstLine = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .find(Boolean)

  return (firstLine || 'My Document').slice(0, 80)
}

function buildDownloadFilename(text: string) {
  const slug = buildDocumentTitle(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || 'doclair-document'}.pdf`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function insertHtmlAtSelection(html: string) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  range.deleteContents()

  const fragment = range.createContextualFragment(html)
  const lastNode = fragment.lastChild

  range.insertNode(fragment)
  if (lastNode) placeCaretAtEnd(lastNode)
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read pasted image'))
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Failed to read pasted image'))
    reader.readAsDataURL(file)
  })
}

interface ToolbarButton {
  label: string
  title: string
  cmd:   string
  value?: string
}

type ImageSize = 'small' | 'medium' | 'full'

interface ActiveFormats {
  formatBlock: 'h1' | 'h2' | null
  bold: boolean
  italic: boolean
  unorderedList: boolean
  orderedList: boolean
}

const EMPTY_ACTIVE_FORMATS: ActiveFormats = {
  formatBlock: null,
  bold: false,
  italic: false,
  unorderedList: false,
  orderedList: false,
}

const TOOLBAR: ToolbarButton[] = [
  { label: 'H1',  title: 'Heading 1',    cmd: 'formatBlock', value: 'H1'  },
  { label: 'H2',  title: 'Heading 2',    cmd: 'formatBlock', value: 'H2'  },
  { label: 'B',   title: 'Bold',         cmd: 'bold'                       },
  { label: 'I',   title: 'Italic',       cmd: 'italic'                     },
  { label: '• UL', title: 'Bullet list', cmd: 'insertUnorderedList'        },
  { label: '1. OL', title: 'Ordered list', cmd: 'insertOrderedList'        },
]

const IMAGE_SIZE_OPTIONS: Array<{ value: ImageSize, label: string }> = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'full', label: 'Full Width' },
]

function createMarkerId() {
  return `doclair-${Math.random().toString(36).slice(2, 10)}`
}

function escapeHtmlText(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeHtmlAttribute(value: string) {
  return escapeHtmlText(value)
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function normalizeLinkUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function getImageWidthForSize(size: ImageSize) {
  if (size === 'small') return '240px'
  if (size === 'medium') return '420px'
  return '100%'
}

function getImageSizeFromElement(image: HTMLImageElement): ImageSize {
  const widthValue = image.style.width.trim() || image.getAttribute('width')?.trim() || ''
  if (widthValue.endsWith('%')) return 'full'

  const width = Number.parseFloat(widthValue)
  if (Number.isNaN(width)) return 'medium'
  if (width <= 260) return 'small'
  if (width <= 460) return 'medium'
  return 'full'
}

function applyImageSizeToElement(image: HTMLImageElement, size: ImageSize) {
  image.style.width = getImageWidthForSize(size)
  image.style.maxWidth = '100%'
  image.style.height = 'auto'
}

function getRangeSelectedNode(range: Range) {
  if (
    range.startContainer === range.endContainer &&
    range.startContainer.hasChildNodes() &&
    range.endOffset === range.startOffset + 1
  ) {
    return range.startContainer.childNodes[range.startOffset] ?? null
  }

  return null
}

function createEmptyParagraph() {
  const paragraph = document.createElement('p')
  paragraph.innerHTML = '<br>'
  return paragraph
}

function buildTableHtml(rows: number, columns: number, marker: string) {
  const safeRows = Math.max(1, Math.min(rows, 12))
  const safeColumns = Math.max(1, Math.min(columns, 8))

  const headerRow = Array.from({ length: safeColumns }, (_, index) => `<th>Heading ${index + 1}</th>`).join('')
  const bodyRows = Array.from({ length: Math.max(0, safeRows - 1) }, () => (
    `<tr>${Array.from({ length: safeColumns }, () => '<td><br></td>').join('')}</tr>`
  )).join('')

  return `<table data-doclair-marker="${marker}"><thead><tr>${headerRow}</tr></thead>${bodyRows ? `<tbody>${bodyRows}</tbody>` : ''}</table><p><br></p>`
}

function sameActiveFormats(a: ActiveFormats, b: ActiveFormats) {
  return (
    a.formatBlock === b.formatBlock &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.unorderedList === b.unorderedList &&
    a.orderedList === b.orderedList
  )
}

function getClosestWithinEditor(editor: HTMLDivElement, node: Node | null, selector: string) {
  const element = node instanceof Element ? node : node?.parentElement ?? null
  const closest = element?.closest(selector)
  return closest && editor.contains(closest) ? closest : null
}

function isMeaningfulEditorNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent?.trim())
  return node.nodeType === Node.ELEMENT_NODE
}

function getTopLevelEditorNode(editor: HTMLDivElement, node: Node | null) {
  let current = node
  while (current && current.parentNode !== editor) current = current.parentNode
  return current?.parentNode === editor ? current : null
}

function rangeIntersectsNode(range: Range, node: Node) {
  try {
    return range.intersectsNode(node)
  } catch {
    return false
  }
}

function getSelectedTopLevelEditorNodes(editor: HTMLDivElement, range: Range) {
  const nodes = Array.from(editor.childNodes).filter(node => isMeaningfulEditorNode(node) && rangeIntersectsNode(range, node))
  if (nodes.length > 0) return nodes

  const fallback = getTopLevelEditorNode(editor, range.startContainer)
  return fallback && isMeaningfulEditorNode(fallback) ? [fallback] : []
}

function extractListItemHTML(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim() ?? ''
    return text ? [text] : []
  }

  if (!(node instanceof HTMLElement)) return []

  const tagName = node.tagName.toLowerCase()
  if (tagName === 'ul' || tagName === 'ol') {
    return Array.from(node.children)
      .filter((child): child is HTMLLIElement => child instanceof HTMLLIElement)
      .map(child => child.innerHTML || '<br>')
  }

  return [node.innerHTML || '<br>']
}

function createListFromNodes(listType: 'ul' | 'ol', nodes: Node[]) {
  const list = document.createElement(listType)

  for (const node of nodes) {
    for (const html of extractListItemHTML(node)) {
      const item = document.createElement('li')
      item.innerHTML = html
      list.appendChild(item)
    }
  }

  return list
}

function mergeAdjacentLists(list: HTMLUListElement | HTMLOListElement) {
  let mergedList = list
  const listType = mergedList.tagName.toLowerCase()
  const previous = mergedList.previousElementSibling

  if (previous && previous.tagName.toLowerCase() === listType) {
    while (mergedList.firstElementChild) previous.appendChild(mergedList.firstElementChild)
    mergedList.remove()
    mergedList = previous as HTMLUListElement | HTMLOListElement
  }

  const next = mergedList.nextElementSibling
  if (next && next.tagName.toLowerCase() === listType) {
    while (next.firstElementChild) mergedList.appendChild(next.firstElementChild)
    next.remove()
  }

  return mergedList
}

function createParagraphFromListItem(item: HTMLLIElement) {
  const paragraph = document.createElement('p')
  paragraph.innerHTML = item.innerHTML || '<br>'
  return paragraph
}

function unwrapList(list: HTMLUListElement | HTMLOListElement) {
  const fragment = document.createDocumentFragment()
  const paragraphs = Array.from(list.children)
    .filter((child): child is HTMLLIElement => child instanceof HTMLLIElement)
    .map(createParagraphFromListItem)

  for (const paragraph of paragraphs) fragment.appendChild(paragraph)
  list.replaceWith(fragment)

  return paragraphs
}

function unwrapCurrentListItem(list: HTMLUListElement | HTMLOListElement, item: HTMLLIElement) {
  const beforeList = document.createElement(list.tagName.toLowerCase()) as HTMLUListElement | HTMLOListElement
  const afterList = document.createElement(list.tagName.toLowerCase()) as HTMLUListElement | HTMLOListElement
  const children = Array.from(list.children).filter((child): child is HTMLLIElement => child instanceof HTMLLIElement)
  const currentIndex = children.indexOf(item)

  children.slice(0, currentIndex).forEach(child => beforeList.appendChild(child.cloneNode(true)))
  children.slice(currentIndex + 1).forEach(child => afterList.appendChild(child.cloneNode(true)))

  const paragraph = createParagraphFromListItem(item)

  const nodes: Node[] = []
  if (beforeList.children.length > 0) nodes.push(beforeList)
  nodes.push(paragraph)
  if (afterList.children.length > 0) {
    if (afterList instanceof HTMLOListElement) afterList.start = currentIndex + 2
    nodes.push(afterList)
  }

  list.replaceWith(...nodes)
  return paragraph
}

function placeCaretAtEnd(node: Node | null) {
  if (!node) return

  const selection = window.getSelection()
  if (!selection) return

  const range = document.createRange()
  range.selectNodeContents(node)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

function normalizeFormatBlock(value: string) {
  const normalized = value.replace(/[<>\s"]/g, '').toLowerCase()
  return normalized === 'h1' || normalized === 'h2' ? normalized : null
}

function getActiveFormats(editor: HTMLDivElement | null): ActiveFormats {
  if (!editor) return EMPTY_ACTIVE_FORMATS

  const selection = window.getSelection()
  const anchorNode = selection?.anchorNode ?? null
  if (!anchorNode || !editor.contains(anchorNode)) return EMPTY_ACTIVE_FORMATS

  const queryState = (command: string) => {
    try {
      return document.queryCommandState(command)
    } catch {
      return false
    }
  }

  const queryValue = (command: string) => {
    try {
      return String(document.queryCommandValue(command) ?? '')
    } catch {
      return ''
    }
  }

  const headingFromDom = getClosestWithinEditor(editor, anchorNode, 'h1, h2')?.tagName.toLowerCase() as ActiveFormats['formatBlock'] | undefined

  return {
    formatBlock: normalizeFormatBlock(queryValue('formatBlock')) ?? headingFromDom ?? null,
    bold: queryState('bold') || Boolean(getClosestWithinEditor(editor, anchorNode, 'b, strong')),
    italic: queryState('italic') || Boolean(getClosestWithinEditor(editor, anchorNode, 'i, em')),
    unorderedList: queryState('insertUnorderedList') || Boolean(getClosestWithinEditor(editor, anchorNode, 'ul')),
    orderedList: queryState('insertOrderedList') || Boolean(getClosestWithinEditor(editor, anchorNode, 'ol')),
  }
}

function isToolbarButtonActive(button: ToolbarButton, activeFormats: ActiveFormats) {
  if (button.cmd === 'formatBlock') {
    return activeFormats.formatBlock === button.value?.toLowerCase()
  }

  if (button.cmd === 'bold') return activeFormats.bold
  if (button.cmd === 'italic') return activeFormats.italic
  if (button.cmd === 'insertUnorderedList') return activeFormats.unorderedList
  if (button.cmd === 'insertOrderedList') return activeFormats.orderedList

  return false
}

export default function CreatePDFPage() {
  const editorRef   = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const savedSelectionRef = useRef<Range | null>(null)
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null)
  const activeTableRef = useRef<HTMLTableElement | null>(null)
  const activeCellRef = useRef<HTMLTableCellElement | null>(null)
  const activeImageRef = useRef<HTMLImageElement | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>(EMPTY_ACTIVE_FORMATS)
  const [pageSize, setPageSize] = useState<PageSize>('A4')
  const [pageOrientation, setPageOrientation] = useState<PageOrientation>('portrait')
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [resultFilename, setResultFilename] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [tableRows, setTableRows] = useState(3)
  const [tableColumns, setTableColumns] = useState(3)
  const [selectedLink, setSelectedLink] = useState(false)
  const [selectedTable, setSelectedTable] = useState(false)
  const [selectedImage, setSelectedImage] = useState(false)
  const [imageAlt, setImageAlt] = useState('')
  const [imageSize, setImageSize] = useState<ImageSize>('medium')

  const refreshToolbarState = useCallback(() => {
    const next = getActiveFormats(editorRef.current)
    setActiveFormats(prev => (sameActiveFormats(prev, next) ? prev : next))
  }, [])

  const clearElementContext = useCallback(() => {
    savedSelectionRef.current = null
    activeLinkRef.current = null
    activeTableRef.current = null
    activeCellRef.current = null
    activeImageRef.current = null
    setSelectedLink(false)
    setSelectedTable(false)
    setSelectedImage(false)
    setLinkUrl('')
    setImageAlt('')
    setImageSize('medium')
  }, [])

  const captureSelectionContext = useCallback(() => {
    const editor = editorRef.current
    const selection = window.getSelection()

    if (!editor || !selection || selection.rangeCount === 0) {
      clearElementContext()
      return
    }

    const range = selection.getRangeAt(0)
    if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) {
      clearElementContext()
      return
    }

    savedSelectionRef.current = range.cloneRange()

    const anchorNode = selection.anchorNode ?? range.startContainer
    const directNode = getRangeSelectedNode(range)
    const link = getClosestWithinEditor(editor, anchorNode, 'a')
    const table = getClosestWithinEditor(editor, anchorNode, 'table')
    const cell = getClosestWithinEditor(editor, anchorNode, 'td, th')
    const image = getClosestWithinEditor(editor, anchorNode, 'img')
      ?? (directNode instanceof HTMLImageElement && editor.contains(directNode) ? directNode : null)

    activeLinkRef.current = link instanceof HTMLAnchorElement ? link : null
    activeTableRef.current = table instanceof HTMLTableElement ? table : null
    activeCellRef.current = cell instanceof HTMLTableCellElement ? cell : null
    activeImageRef.current = image instanceof HTMLImageElement ? image : null

    setSelectedLink(Boolean(activeLinkRef.current))
    setSelectedTable(Boolean(activeTableRef.current))
    setSelectedImage(Boolean(activeImageRef.current))
    setLinkUrl(activeLinkRef.current?.getAttribute('href') ?? '')

    if (activeImageRef.current) {
      setImageAlt(activeImageRef.current.alt ?? '')
      setImageSize(getImageSizeFromElement(activeImageRef.current))
    } else {
      setImageAlt('')
      setImageSize('medium')
    }
  }, [clearElementContext])

  const syncSelectionState = useCallback(() => {
    refreshToolbarState()
    captureSelectionContext()
  }, [captureSelectionContext, refreshToolbarState])

  const clearGeneratedState = useCallback(() => {
    setResultBlob(null)
    setResultFilename('')
    setErrorMessage('')
    setToolState(prev => (prev === 'processing' ? prev : 'idle'))
  }, [])

  const handleResetResult = useCallback(() => {
    setResultBlob(null)
    setResultFilename('')
    setErrorMessage('')
    setToolState('idle')
  }, [])

  const syncEditorState = useCallback(() => {
    const text = editorRef.current?.innerText?.trim()
    setIsEmpty(!text)
    syncSelectionState()
    clearGeneratedState()
  }, [clearGeneratedState, syncSelectionState])

  const ensureEditorSelection = useCallback(() => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection) return false

    editor.focus()

    if (savedSelectionRef.current) {
      try {
        selection.removeAllRanges()
        selection.addRange(savedSelectionRef.current)
        return true
      } catch {
        savedSelectionRef.current = null
      }
    }

    placeCaretAtEnd(editor)
    if (selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange()
      return true
    }

    return false
  }, [])

  const insertMarkedHtml = useCallback((html: string, marker: string) => {
    if (!ensureEditorSelection()) return null

    document.execCommand('insertHTML', false, html)
    const inserted = editorRef.current?.querySelector(`[data-doclair-marker="${marker}"]`) ?? null

    if (inserted instanceof HTMLElement) {
      inserted.removeAttribute('data-doclair-marker')
    }

    return inserted
  }, [ensureEditorSelection])

  const execCmd = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
    syncEditorState()
  }, [syncEditorState])

  const handleInput = useCallback(() => {
    syncEditorState()
  }, [syncEditorState])

  const handlePaste = useCallback(async (event: ClipboardEvent<HTMLDivElement>) => {
    const clipboard = event.clipboardData
    if (!clipboard) return

    const html = clipboard.getData('text/html')
    const text = clipboard.getData('text/plain')
    const imageFiles = Array.from(clipboard.items)
      .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter((file): file is File => Boolean(file))

    if (html.trim()) {
      event.preventDefault()
      const sanitizedHtml = sanitizeRichTextHtml(html)

      if (sanitizedHtml) {
        insertHtmlAtSelection(sanitizedHtml)
        syncEditorState()
        return
      }
    }

    if (imageFiles.length > 0) {
      event.preventDefault()

      try {
        const imageHtml = (await Promise.all(imageFiles.map(fileToDataUrl)))
          .map(src => `<p><img src="${src}" alt="Pasted image" /></p>`)
          .join('')

        if (imageHtml) {
          insertHtmlAtSelection(imageHtml)
          syncEditorState()
        }
      } catch {
        setErrorMessage('Failed to read the pasted image.')
        setToolState('error')
      }

      return
    }

    if (text.trim()) {
      event.preventDefault()
      insertHtmlAtSelection(plainTextToRichTextHtml(text))
      syncEditorState()
    }
  }, [syncEditorState])

  const handleEditorClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLImageElement) {
      const selection = window.getSelection()
      if (!selection) return

      const range = document.createRange()
      range.selectNode(event.target)
      selection.removeAllRanges()
      selection.addRange(range)
      syncSelectionState()
      return
    }

    window.requestAnimationFrame(syncSelectionState)
  }, [syncSelectionState])

  const handleApplyLink = useCallback(() => {
    const editor = editorRef.current
    const normalizedUrl = normalizeLinkUrl(linkUrl)
    if (!editor || !normalizedUrl || !ensureEditorSelection()) return

    setLinkUrl(normalizedUrl)

    if (activeLinkRef.current) {
      activeLinkRef.current.setAttribute('href', normalizedUrl)
      activeLinkRef.current.setAttribute('target', '_blank')
      activeLinkRef.current.setAttribute('rel', 'noopener noreferrer')
      placeCaretAtEnd(activeLinkRef.current)
      syncEditorState()
      return
    }

    const selection = window.getSelection()
    const selectedText = selection?.toString().trim() ?? ''

    if (selectedText) {
      document.execCommand('createLink', false, normalizedUrl)
      const createdLink = getClosestWithinEditor(editor, window.getSelection()?.anchorNode ?? null, 'a')
      if (createdLink instanceof HTMLAnchorElement) {
        createdLink.setAttribute('href', normalizedUrl)
        createdLink.setAttribute('target', '_blank')
        createdLink.setAttribute('rel', 'noopener noreferrer')
      }
    } else {
      const marker = createMarkerId()
      const label = normalizedUrl.replace(/^https?:\/\//, '')
      const inserted = insertMarkedHtml(
        `<a data-doclair-marker="${marker}" href="${escapeHtmlAttribute(normalizedUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtmlText(label)}</a>&nbsp;`,
        marker,
      )

      if (inserted instanceof HTMLAnchorElement) {
        placeCaretAtEnd(inserted.nextSibling ?? inserted)
      }
    }

    syncEditorState()
  }, [ensureEditorSelection, insertMarkedHtml, linkUrl, syncEditorState])

  const handleRemoveLink = useCallback(() => {
    const link = activeLinkRef.current
    if (!link || !link.parentNode) return

    const movedChildren = Array.from(link.childNodes)
    movedChildren.forEach(child => link.parentNode?.insertBefore(child, link))
    const caretTarget = movedChildren.at(-1) ?? link.parentNode
    link.remove()
    placeCaretAtEnd(caretTarget)
    syncEditorState()
  }, [syncEditorState])

  const handleInsertTable = useCallback(() => {
    const marker = createMarkerId()
    const inserted = insertMarkedHtml(buildTableHtml(tableRows, tableColumns, marker), marker)

    if (inserted instanceof HTMLTableElement) {
      const firstCell = inserted.querySelector('tbody td, thead th')
      placeCaretAtEnd(firstCell ?? inserted)
    }

    syncEditorState()
  }, [insertMarkedHtml, syncEditorState, tableColumns, tableRows])

  const handleAddTableRow = useCallback(() => {
    const table = activeTableRef.current
    if (!table) return

    const currentRow = activeCellRef.current?.parentElement instanceof HTMLTableRowElement
      ? activeCellRef.current.parentElement
      : null
    const columnCount = Math.max(1, ...Array.from(table.rows).map(row => row.cells.length))

    let newRow: HTMLTableRowElement
    if (currentRow?.parentElement?.tagName.toLowerCase() === 'thead') {
      const body = table.tBodies[0] ?? table.createTBody()
      newRow = body.insertRow(0)
    } else if (currentRow?.parentElement instanceof HTMLTableSectionElement) {
      newRow = currentRow.parentElement.insertRow(currentRow.sectionRowIndex + 1)
    } else {
      const body = table.tBodies[0] ?? table.createTBody()
      newRow = body.insertRow(-1)
    }

    for (let index = 0; index < columnCount; index += 1) {
      const cell = newRow.insertCell(-1)
      cell.innerHTML = '<br>'
    }

    placeCaretAtEnd(newRow.cells[0] ?? newRow)
    syncEditorState()
  }, [syncEditorState])

  const handleAddTableColumn = useCallback(() => {
    const table = activeTableRef.current
    if (!table) return

    const insertionIndex = activeCellRef.current?.cellIndex ?? Math.max(0, (table.rows[0]?.cells.length ?? 1) - 1)

    Array.from(table.rows).forEach(row => {
      const isHeaderRow = row.parentElement?.tagName.toLowerCase() === 'thead'
      const newCell = document.createElement(isHeaderRow ? 'th' : 'td')
      newCell.innerHTML = isHeaderRow ? `Heading ${insertionIndex + 2}` : '<br>'
      row.insertBefore(newCell, row.cells[insertionIndex + 1] ?? null)
    })

    const targetRow = activeCellRef.current?.parentElement instanceof HTMLTableRowElement
      ? activeCellRef.current.parentElement
      : table.rows[0]

    placeCaretAtEnd(targetRow?.cells[Math.min(insertionIndex + 1, targetRow.cells.length - 1)] ?? targetRow)
    syncEditorState()
  }, [syncEditorState])

  const handleRemoveTable = useCallback(() => {
    const table = activeTableRef.current
    if (!table) return

    const paragraph = createEmptyParagraph()
    table.replaceWith(paragraph)
    placeCaretAtEnd(paragraph)
    syncEditorState()
  }, [syncEditorState])

  const handleRemoveTableRow = useCallback(() => {
    const table = activeTableRef.current
    const row = activeCellRef.current?.parentElement instanceof HTMLTableRowElement
      ? activeCellRef.current.parentElement
      : null

    if (!table || !row) return

    const nextRow = row.nextElementSibling instanceof HTMLTableRowElement
      ? row.nextElementSibling
      : row.previousElementSibling instanceof HTMLTableRowElement
        ? row.previousElementSibling
        : null

    row.remove()

    if (!table.rows.length) {
      const paragraph = createEmptyParagraph()
      table.replaceWith(paragraph)
      placeCaretAtEnd(paragraph)
    } else {
      placeCaretAtEnd(nextRow?.cells[0] ?? table.rows[0]?.cells[0] ?? table)
    }

    syncEditorState()
  }, [syncEditorState])

  const handleRemoveTableColumn = useCallback(() => {
    const table = activeTableRef.current
    const cell = activeCellRef.current
    if (!table || !cell) return

    const columnIndex = cell.cellIndex
    Array.from(table.rows).forEach(row => {
      if (row.cells[columnIndex]) row.deleteCell(columnIndex)
    })

    const firstRow = table.rows[0]
    if (!firstRow || firstRow.cells.length === 0) {
      const paragraph = createEmptyParagraph()
      table.replaceWith(paragraph)
      placeCaretAtEnd(paragraph)
    } else {
      const nextColumnIndex = Math.min(columnIndex, firstRow.cells.length - 1)
      const targetCell = Array.from(table.rows)
        .map(row => row.cells[nextColumnIndex] ?? null)
        .find((candidate): candidate is HTMLTableCellElement => candidate instanceof HTMLTableCellElement)

      placeCaretAtEnd(targetCell ?? firstRow)
    }

    syncEditorState()
  }, [syncEditorState])

  const handlePickImage = useCallback(() => {
    imageInputRef.current?.click()
  }, [])

  const handleImageInput = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const src = await fileToDataUrl(file)
      const defaultAlt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Inserted image'

      if (activeImageRef.current) {
        activeImageRef.current.setAttribute('src', src)
        activeImageRef.current.setAttribute('alt', activeImageRef.current.alt || defaultAlt)
        applyImageSizeToElement(activeImageRef.current, imageSize)
        placeCaretAtEnd(activeImageRef.current)
      } else {
        const marker = createMarkerId()
        const inserted = insertMarkedHtml(
          `<p><img data-doclair-marker="${marker}" src="${escapeHtmlAttribute(src)}" alt="${escapeHtmlAttribute(defaultAlt)}" style="width: ${getImageWidthForSize(imageSize)};" /></p>`,
          marker,
        )

        if (inserted instanceof HTMLImageElement) {
          applyImageSizeToElement(inserted, imageSize)
          placeCaretAtEnd(inserted)
        }
      }

      syncEditorState()
    } catch {
      setErrorMessage('Failed to read the selected image.')
      setToolState('error')
    } finally {
      event.target.value = ''
    }
  }, [imageSize, insertMarkedHtml, syncEditorState])

  const handleApplyImageAlt = useCallback(() => {
    const image = activeImageRef.current
    if (!image) return

    image.setAttribute('alt', imageAlt.trim())
    placeCaretAtEnd(image)
    syncEditorState()
  }, [imageAlt, syncEditorState])

  const handleApplyImageSize = useCallback((size: ImageSize) => {
    setImageSize(size)
    if (!activeImageRef.current) return

    applyImageSizeToElement(activeImageRef.current, size)
    placeCaretAtEnd(activeImageRef.current)
    syncEditorState()
  }, [syncEditorState])

  const handleRemoveImage = useCallback(() => {
    const image = activeImageRef.current
    if (!image) return

    const parent = image.parentElement
    if (parent && parent.tagName.toLowerCase() === 'p' && parent.childElementCount === 1 && !parent.textContent?.trim()) {
      const paragraph = createEmptyParagraph()
      parent.replaceWith(paragraph)
      placeCaretAtEnd(paragraph)
    } else {
      image.remove()
      placeCaretAtEnd(parent)
    }

    syncEditorState()
  }, [syncEditorState])

  const toggleList = useCallback((listType: 'ul' | 'ol') => {
    const editor = editorRef.current
    if (!editor) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return

    const topLevelNode = getTopLevelEditorNode(editor, range.startContainer)
    const topLevelElement = topLevelNode instanceof HTMLElement ? topLevelNode : null

    if (topLevelElement && topLevelElement.tagName.toLowerCase() === listType) {
      const currentItem = getClosestWithinEditor(editor, range.startContainer, 'li')
      const paragraph = currentItem instanceof HTMLLIElement && currentItem.parentElement === topLevelElement
        ? unwrapCurrentListItem(topLevelElement as HTMLUListElement | HTMLOListElement, currentItem)
        : unwrapList(topLevelElement as HTMLUListElement | HTMLOListElement)[0] ?? null

      placeCaretAtEnd(paragraph)
      syncEditorState()
      return
    }

    const nodes = range.collapsed
      ? (topLevelNode ? [topLevelNode] : [])
      : getSelectedTopLevelEditorNodes(editor, range)

    if (nodes.length === 0) return

    const list = createListFromNodes(listType, nodes)
    nodes[0].parentNode?.insertBefore(list, nodes[0])
    nodes.forEach(node => node.parentNode?.removeChild(node))

    const mergedList = mergeAdjacentLists(list)
    placeCaretAtEnd(mergedList.lastElementChild ?? mergedList)
    syncEditorState()
  }, [syncEditorState])

  const handleToolbarAction = useCallback((button: ToolbarButton) => {
    if (button.cmd === 'insertUnorderedList') {
      toggleList('ul')
      return
    }

    if (button.cmd === 'insertOrderedList') {
      toggleList('ol')
      return
    }

    execCmd(button.cmd, button.value)
  }, [execCmd, toggleList])

  useEffect(() => {
    let frameId = 0

    const handleSelectionChange = () => {
      const activeElement = document.activeElement
      if (activeElement && controlsRef.current?.contains(activeElement)) return

      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(syncSelectionState)
    }

    document.addEventListener('selectionchange', handleSelectionChange)

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      window.cancelAnimationFrame(frameId)
    }
  }, [syncSelectionState])

  const handleGenerate = useCallback(async () => {
    const editor = editorRef.current
    if (!editor) return

    const plainText = editor.innerText.trim()
    const html = sanitizeRichTextHtml(editor.innerHTML)
    if (!plainText) return

    setToolState('processing')
    setErrorMessage('')

    try {
      const filename = buildDownloadFilename(plainText)
      const blob = await richTextToPdfBlob({
        html,
        title: buildDocumentTitle(plainText),
        pageSize,
        pageOrientation,
      })

      setResultBlob(blob)
      setResultFilename(filename)
      setToolState('done')
      downloadBlob(blob, filename)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate PDF'
      setErrorMessage(message)
      setToolState('error')
    }
  }, [pageOrientation, pageSize])

  const handleDownload = useCallback(() => {
    if (!resultBlob || !resultFilename) return
    downloadBlob(resultBlob, resultFilename)
  }, [resultBlob, resultFilename])

  const handlePageSizeChange = useCallback((value: PageSize) => {
    setPageSize(value)
    clearGeneratedState()
  }, [clearGeneratedState])

  const handlePageOrientationChange = useCallback((value: PageOrientation) => {
    setPageOrientation(value)
    clearGeneratedState()
  }, [clearGeneratedState])

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    border: `1px solid ${active ? 'rgba(217, 119, 6, 0.45)' : 'var(--border)'}`,
    borderRadius: '6px',
    background: active ? '#FFF8F0' : 'white', color: active ? 'var(--amber)' : 'var(--ink)',
    cursor: 'pointer', fontSize: '12px', fontWeight: 600,
    fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
    boxShadow: active ? '0 0 0 2px rgba(217, 119, 6, 0.12)' : 'none',
    transition: 'all 0.15s',
  })

  const settingsButtonStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px',
    border: `1px solid ${active ? 'rgba(217, 119, 6, 0.45)' : 'var(--border)'}`,
    borderRadius: '999px',
    background: active ? '#FFF8F0' : 'white',
    color: active ? 'var(--amber)' : 'var(--ink)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
    boxShadow: active ? '0 0 0 2px rgba(217, 119, 6, 0.12)' : 'none',
    transition: 'all 0.15s',
  })

  const panelCardStyle: React.CSSProperties = {
    padding: '14px',
    border: '1px solid #F3E8D3',
    borderRadius: '14px',
    background: '#FFFDF8',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  }

  const panelLabelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#92400E',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-dm-mono), DM Mono, monospace',
  }

  const panelInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontSize: '13px',
    color: 'var(--ink)',
    outline: 'none',
    background: 'white',
  }

  return (
    <>
<ToolPageLayout
        toolName="Create PDF"
        sidebar={<ToolSidebar relatedTools={SIDEBAR_RELATED} />}
      >
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#DCFCE7', color: '#166534', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✓ 100% Free</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#FFF0DC', color: '#92400E', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>🔒 Files Stay On Device</span>
            <span style={{ padding: '5px 12px', borderRadius: '100px', background: '#EDE9FE', color: '#6B21A8', fontFamily: 'var(--font-dm-mono), DM Mono, monospace', fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em' }}>✦ No Watermark</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: '10px' }}>
            <span style={{ color: 'var(--ink)' }}>Create PDF </span>
            <span style={{ color: 'var(--amber)' }}>Start from Blank Document</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px', lineHeight: 1.6, maxWidth: '640px', marginBottom: '16px' }}>
            Create a new PDF from scratch using a rich text editor. Choose A4 or Letter, switch portrait or landscape, and download the finished PDF directly in your browser.
          </p>
        </div>

        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '16px', padding: '16px 18px', display: 'flex', gap: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: '#92400E', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>
              Page Size
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {PAGE_SIZE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  style={settingsButtonStyle(pageSize === option.value)}
                  aria-pressed={pageSize === option.value}
                  onClick={() => handlePageSizeChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: '#92400E', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>
              Orientation
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {PAGE_ORIENTATION_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  style={settingsButtonStyle(pageOrientation === option.value)}
                  aria-pressed={pageOrientation === option.value}
                  onClick={() => handlePageOrientationChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#92400E', lineHeight: 1.6, maxWidth: '360px' }}>
            Your current export will download as <strong>{pageSize}</strong> in <strong>{pageOrientation}</strong> mode.
          </div>
        </div>

        {/* Editor */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: '#FAFAFA', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {TOOLBAR.map(btn => (
              <button
                key={btn.cmd + btn.value}
                type="button"
                style={btnStyle(isToolbarButtonActive(btn, activeFormats))}
                title={btn.title}
                aria-pressed={isToolbarButtonActive(btn, activeFormats)}
                onMouseDown={event => event.preventDefault()}
                onClick={() => handleToolbarAction(btn)}
              >
                {btn.label}
              </button>
            ))}
            <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />
            <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-dm-mono), DM Mono, monospace' }}>
              Select text or use the element controls for links, tables, and images
            </span>
          </div>

          <div
            ref={controlsRef}
            style={{
              padding: '14px',
              borderBottom: '1px solid var(--border)',
              background: '#FFFCF7',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
            }}
          >
            <div style={panelCardStyle}>
              <span style={panelLabelStyle}>Link</span>
              <input
                value={linkUrl}
                onChange={event => setLinkUrl(event.target.value)}
                placeholder="https://doclair.in"
                style={panelInputStyle}
              />
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" style={btnStyle(selectedLink)} onMouseDown={event => event.preventDefault()} onClick={handleApplyLink}>
                  {selectedLink ? 'Update Link' : 'Add Link'}
                </button>
                {selectedLink && (
                  <button type="button" style={btnStyle()} onMouseDown={event => event.preventDefault()} onClick={handleRemoveLink}>
                    Remove
                  </button>
                )}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                Select text to create a link, or place the caret inside an existing link to edit it.
              </span>
            </div>

            <div style={panelCardStyle}>
              <span style={panelLabelStyle}>Table</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={tableRows}
                  onChange={event => setTableRows(Math.max(1, Number.parseInt(event.target.value || '1', 10)))}
                  style={{ ...panelInputStyle, width: '50%' }}
                  aria-label="Table rows"
                />
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={tableColumns}
                  onChange={event => setTableColumns(Math.max(1, Number.parseInt(event.target.value || '1', 10)))}
                  style={{ ...panelInputStyle, width: '50%' }}
                  aria-label="Table columns"
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" style={btnStyle()} onMouseDown={event => event.preventDefault()} onClick={handleInsertTable}>
                  Insert Table
                </button>
                {selectedTable && (
                  <>
                    <button type="button" style={btnStyle(true)} onMouseDown={event => event.preventDefault()} onClick={handleAddTableRow}>
                      + Row
                    </button>
                    <button type="button" style={btnStyle(true)} onMouseDown={event => event.preventDefault()} onClick={handleAddTableColumn}>
                      + Col
                    </button>
                    <button type="button" style={btnStyle()} onMouseDown={event => event.preventDefault()} onClick={handleRemoveTableRow}>
                      - Row
                    </button>
                    <button type="button" style={btnStyle()} onMouseDown={event => event.preventDefault()} onClick={handleRemoveTableColumn}>
                      - Col
                    </button>
                    <button type="button" style={btnStyle()} onMouseDown={event => event.preventDefault()} onClick={handleRemoveTable}>
                      Remove
                    </button>
                  </>
                )}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                Insert a new table, then click inside it to add or remove rows and columns.
              </span>
            </div>

            <div style={panelCardStyle}>
              <span style={panelLabelStyle}>Image</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" style={btnStyle(selectedImage)} onMouseDown={event => event.preventDefault()} onClick={handlePickImage}>
                  {selectedImage ? 'Replace Image' : 'Add Image'}
                </button>
                {selectedImage && (
                  <button type="button" style={btnStyle()} onMouseDown={event => event.preventDefault()} onClick={handleRemoveImage}>
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageInput}
                style={{ display: 'none' }}
              />
              <input
                value={imageAlt}
                onChange={event => setImageAlt(event.target.value)}
                placeholder="Image alt text"
                style={panelInputStyle}
              />
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {IMAGE_SIZE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    style={btnStyle(selectedImage && imageSize === option.value)}
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => handleApplyImageSize(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" style={btnStyle()} onMouseDown={event => event.preventDefault()} onClick={handleApplyImageAlt}>
                  Update Image
                </button>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                Upload a new image, or click an existing one to change its size, alt text, or source.
              </span>
            </div>
          </div>

          {/* Content editable */}
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onFocus={syncSelectionState}
            onKeyUp={syncSelectionState}
            onMouseUp={syncSelectionState}
            onSelect={syncSelectionState}
            onClick={handleEditorClick}
            onPaste={handlePaste}
            suppressContentEditableWarning
            data-placeholder="Start typing your document here…"
            style={{
              minHeight: '400px',
              padding: '24px 28px',
              outline: 'none',
              fontSize: '15px',
              lineHeight: 1.8,
              color: 'var(--ink)',
              fontFamily: 'Georgia, serif',
            }}
          />
        </div>

        {toolState === 'processing' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '38px', marginBottom: '14px' }}>📄</div>
            <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '8px' }}>
              Generating PDF…
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Building your {pageSize} {pageOrientation} document in the browser.
            </div>
          </div>
        )}

        {toolState === 'error' && (
          <ErrorCard
            message={errorMessage || 'Failed to generate PDF.'}
            hint="Try shortening the document or removing unsupported formatting, then generate again."
            onReset={handleResetResult}
          />
        )}

        {toolState === 'done' && resultBlob && resultFilename && (
          <DownloadCard
            filename={resultFilename}
            description={`${pageSize} ${pageOrientation} PDF downloaded directly in your browser`}
            onDownload={handleDownload}
            onReset={handleResetResult}
            title="PDF downloaded!"
            resetLabel="Keep editing →"
            nextSteps={[
              { slug: 'compress-pdf', name: 'Compress PDF', icon: '🗜️' },
              { slug: 'add-page-numbers', name: 'Add Page Numbers', icon: '🔢' },
              { slug: 'merge-pdf', name: 'Merge PDF', icon: '🔗' },
            ]}
          />
        )}

        {!isEmpty && toolState === 'idle' && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleGenerate} style={{ background: 'var(--ink)', color: 'white', padding: '14px 32px', borderRadius: '100px', fontSize: '15px', fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              Generate PDF →
            </button>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Direct download with {pageSize} {pageOrientation} settings</span>
          </div>
        )}

        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '14px 18px', fontSize: '13px', color: '#92400E', lineHeight: 1.6 }}>
          <strong>📄 Tip:</strong> For more powerful formatting, use <a href="/markdown-to-pdf" style={{ color: 'var(--amber)', textDecoration: 'underline' }}>Markdown to PDF</a> or convert a <a href="/word-to-pdf" style={{ color: 'var(--amber)', textDecoration: 'underline' }}>Word document</a>.
        </div>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px' }}>
          <h2 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '22px', color: 'var(--ink)', marginBottom: '10px' }}>
            How to Create a PDF from Scratch — Step by Step
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            Need a quick text document saved as PDF? Doclair&apos;s Create PDF tool lets you choose page settings, write in the browser, add links, tables, and images, and download the file directly.
          </p>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Choose your page size and orientation.</strong> Switch between A4 and Letter, then pick portrait or landscape.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Type or paste your content into the editor.</strong> Use the toolbar for headings, bold, italic, and lists, then use the element controls for links, tables, and images.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Review the document in the editor.</strong> The page is optimized for simple text documents with clean print styling.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Click Generate PDF to build and download the file.</strong> No print dialog is required.</li>
            <li style={{ fontSize: '14px', color: 'var(--ink)', lineHeight: 1.7 }}><strong>Open or share the finished PDF from your device.</strong> Your content stays in the browser the whole time.</li>
          </ol>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
            When to create a PDF vs convert one?
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7, marginBottom: '24px' }}>
            Use Create PDF when you need a new document from scratch — for blank forms, cover pages, or simple text documents. For converting existing files (Word, Excel, images), use the dedicated conversion tools in the Convert category.
          </p>
          <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--ink)', marginBottom: '8px' }}>
            Create PDF on iPhone and Android
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--ink)', opacity: 0.65, lineHeight: 1.7 }}>
            Doclair works in mobile Safari and Chrome. Choose your page settings, use the basic formatting toolbar, and save the PDF directly from your browser without installing any app.
          </p>
        </div>

        <FAQ faqs={FAQS} />
      </ToolPageLayout>

      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          pointer-events: none;
        }

        [contenteditable] a {
          color: #B45309;
          text-decoration: underline;
        }

        [contenteditable] img {
          display: block;
          max-width: 100%;
          height: auto;
          margin: 16px 0;
          border-radius: 12px;
        }

        [contenteditable] table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }

        [contenteditable] th,
        [contenteditable] td {
          border: 1px solid #D1D5DB;
          padding: 8px 10px;
          vertical-align: top;
        }

        [contenteditable] th {
          background: #F9FAFB;
          font-weight: 700;
        }
      `}</style>
    </>
  )
}
