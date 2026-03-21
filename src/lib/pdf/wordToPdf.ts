import mammoth from 'mammoth'

export interface WordConversionResult {
  html:      string
  warnings:  string[]
  hasImages: boolean
  wordCount: number
}

export async function wordToHTML(file: File): Promise<WordConversionResult> {
  const bytes  = await file.arrayBuffer()
  const result = await mammoth.convertToHtml(
    { arrayBuffer: bytes },
    {
      styleMap: [
        "p[style-name='Heading 1']      => h1:fresh",
        "p[style-name='Heading 2']      => h2:fresh",
        "p[style-name='Heading 3']      => h3:fresh",
        "p[style-name='Heading 4']      => h4:fresh",
        "p[style-name='Title']          => h1.doc-title:fresh",
        "p[style-name='Subtitle']       => p.doc-subtitle:fresh",
        "p[style-name='Caption']        => p.caption:fresh",
        "r[style-name='Strong']         => strong",
        "r[style-name='Emphasis']       => em",
        "p[style-name='List Paragraph'] => li:fresh",
      ],
      convertImage: mammoth.images.imgElement(image =>
        image.read('base64').then(data => ({
          src:   `data:${image.contentType};base64,${data}`,
          style: 'max-width: 100%; height: auto;',
        }))
      ),
    }
  )

  const html      = result.value
  const warnings  = result.messages
    .filter(m => m.type === 'warning')
    .map(m => m.message)
  const wordCount = (html.match(/\b\w+\b/g) ?? []).length

  return {
    html,
    warnings,
    hasImages: html.includes('<img'),
    wordCount,
  }
}
