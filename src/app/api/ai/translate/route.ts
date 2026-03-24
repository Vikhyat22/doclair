import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text, targetLanguage, pageNum } = await req.json()

    if (!text || !targetLanguage) {
      return NextResponse.json({ error: 'Missing text or targetLanguage' }, { status: 400 })
    }

    const baseURL = process.env.AI_BASE_URL ?? 'https://opencode.ai/zen/go/v1'
    const apiKey  = process.env.AI_API_KEY  ?? ''
    const model   = process.env.AI_MODEL    ?? 'minimax-m2.7'

    const truncated = text.slice(0, 8000)

    const response = await fetch(`${baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'Authorization':     `Bearer ${apiKey}`,
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: `You are a professional translator. Translate the provided text accurately into ${targetLanguage}. Preserve paragraph structure, line breaks, and formatting as much as possible. Return only the translated text — no explanations, no preamble.`,
        messages: [{ role: 'user', content: truncated }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: `API error ${response.status}: ${err.slice(0, 200)}` }, { status: response.status })
    }

    const data = await response.json()

    // Find first text block — MiniMax returns a thinking block before the text block
    const textBlock = Array.isArray(data?.content)
      ? data.content.find((block: { type: string }) => block.type === 'text')
      : null
    const translated = textBlock?.text
                    ?? data?.choices?.[0]?.message?.content
                    ?? ''

    return NextResponse.json({ translated, pageNum })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
