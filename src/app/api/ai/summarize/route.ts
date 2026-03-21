import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { extractedText } = await req.json()

  if (!extractedText) {
    return NextResponse.json({ error: 'Missing extractedText' }, { status: 400 })
  }

  const truncated = extractedText.slice(0, 50000)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `Summarize the provided PDF content. Return:
1. Main topic (1 sentence)
2. Key points (5 bullet points)
3. Word count estimate
Be concise.`,
    messages: [
      {
        role: 'user',
        content: `PDF Content:\n${truncated}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 })
  }

  return NextResponse.json({ summary: content.text })
}
