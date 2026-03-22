import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey:  process.env.AI_API_KEY ?? '',
  baseURL: process.env.AI_BASE_URL,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { extractedText, question } = body

    if (!extractedText || !question) {
      return NextResponse.json(
        { error: 'Missing extractedText or question' },
        { status: 400 }
      )
    }

    // Log env vars are set (not their values)
    console.log('AI_BASE_URL set:', !!process.env.AI_BASE_URL)
    console.log('AI_API_KEY set:', !!process.env.AI_API_KEY)
    console.log('AI_MODEL:', process.env.AI_MODEL)

    const truncated = extractedText.slice(0, 50000)

    const message = await client.messages.create({
      model:      process.env.AI_MODEL ?? 'minimax-m2.7',
      max_tokens: 1024,
      system:
        'You are a helpful assistant. Answer questions based ' +
        'only on the PDF content provided. Be concise and accurate.',
      messages: [
        {
          role:    'user',
          content: `PDF Content:\n${truncated}\n\nQuestion: ${question}`,
        },
      ],
    })

    const content = message.content[0]
    if (!content || content.type !== 'text') {
      console.error('Unexpected response:', JSON.stringify(message))
      return NextResponse.json(
        { error: 'Unexpected response from AI' },
        { status: 500 }
      )
    }

    return NextResponse.json({ answer: content.text })
  } catch (err: unknown) {
    const msg    = err instanceof Error ? err.message : 'Unknown error'
    const status = (err as { status?: number })?.status ?? 500
    console.error('Chat API error:', err)
    return NextResponse.json({ error: msg }, { status })
  }
}
