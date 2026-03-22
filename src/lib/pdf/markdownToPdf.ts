import { marked } from 'marked'

export async function markdownToHTML(markdownText: string): Promise<string> {
  marked.setOptions({ gfm: true, breaks: true })
  return await marked(markdownText)
}
