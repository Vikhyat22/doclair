import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { extractedText, question } = await req.json()

  if (!extractedText || !question) {
    return NextResponse.json(
      { error: 'Missing extractedText or question' },
      { status: 400 }
    )
  }

  const truncated = extractedText.slice(0, 50000)

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system:
      'You are a helpful assistant. Answer questions based only on the PDF content provided. Be concise and accurate.',
    messages: [
      {
        role: 'user',
        content: `PDF Content:\n${truncated}\n\nQuestion: ${question}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 })
  }

  return NextResponse.json({ answer: content.text })
}
