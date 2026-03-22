import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { extractedText, question } = await req.json()

    if (!extractedText || !question) {
      return NextResponse.json(
        { error: 'Missing extractedText or question' },
        { status: 400 }
      )
    }

    const truncated = extractedText.slice(0, 40000)
    const baseURL   = process.env.AI_BASE_URL ?? 'https://opencode.ai/zen/go/v1'
    const apiKey    = process.env.AI_API_KEY  ?? ''
    const model     = process.env.AI_MODEL    ?? 'minimax-m2.7'

    console.log('Calling:', `${baseURL}/messages`)
    console.log('Model:', model)

    const response = await fetch(`${baseURL}/messages`, {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'Authorization':     `Bearer ${apiKey}`,
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system:
          'You are a helpful assistant. Answer questions ' +
          'based only on the PDF content provided. ' +
          'Be concise and accurate.',
        messages: [
          {
            role:    'user',
            content: `PDF Content:\n${truncated}\n\nQuestion: ${question}`,
          },
        ],
      }),
    })

    console.log('Response status:', response.status)

    if (!response.ok) {
      const text = await response.text()
      console.error('API error response:', text.slice(0, 500))
      return NextResponse.json(
        { error: `API returned ${response.status}: ${text.slice(0, 200)}` },
        { status: response.status }
      )
    }

    const data    = await response.json()
    console.log('Response keys:', Object.keys(data))

    const content = data?.content?.[0]?.text
                 ?? data?.choices?.[0]?.message?.content
                 ?? null

    if (!content) {
      console.error('No content in response:', JSON.stringify(data).slice(0, 500))
      return NextResponse.json(
        { error: 'No content in AI response' },
        { status: 500 }
      )
    }

    return NextResponse.json({ answer: content })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Chat API error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
