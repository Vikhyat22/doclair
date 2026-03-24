import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPTS: Record<string, string> = {
  brief: `You are a document summarizer. Return only 3-4 most important bullet points from the document. Format as:

## Key Points
- Point 1
- Point 2
- Point 3
- Point 4

Be extremely concise.`,

  standard: `You are a document summarizer. Return a structured summary with these sections:

## Overview
One paragraph (3-5 sentences) covering the main topic and purpose of the document.

## Key Points
- Bullet point 1
- Bullet point 2
- Bullet point 3
- Bullet point 4
- Bullet point 5

## Important Details
Any critical numbers, dates, names, or facts that a reader must know.

## Conclusion
One paragraph summarizing the document's conclusions or outcomes.

Be concise and accurate. If the document is a contract, highlight key terms and obligations. If it is a research paper, focus on methodology and findings. If it is a financial report, emphasize key metrics.`,

  detailed: `You are a document summarizer. Return an expanded summary with all subsections, supporting details, and quoted passages. Use this format:

## Overview
2-3 paragraphs covering the main topic, context, and purpose.

## Key Points
- At least 8-10 detailed bullet points with supporting context

## Important Details
All critical numbers, dates, names, facts, obligations, deadlines, and figures.

## Supporting Analysis
Any relevant methodology, evidence, arguments, or reasoning presented in the document.

## Conclusion
2 paragraphs summarizing conclusions, outcomes, and next steps if applicable.

Be thorough and include specific details and quotes from the source material where relevant.`,
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { extractedText, summaryType = 'standard' } = body

    if (!extractedText) {
      return NextResponse.json(
        { error: 'Missing extractedText' },
        { status: 400 }
      )
    }

    const baseURL   = process.env.AI_BASE_URL ?? 'https://opencode.ai/zen/go/v1'
    const apiKey    = process.env.AI_API_KEY  ?? ''
    const model     = process.env.AI_MODEL    ?? 'minimax-m2.7'

    const truncated    = extractedText.slice(0, 40000)
    const systemPrompt = SYSTEM_PROMPTS[summaryType as string] ?? SYSTEM_PROMPTS.standard

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
        max_tokens: summaryType === 'detailed' ? 2048 : 1500,
        system:     systemPrompt,
        messages: [
          {
            role:    'user',
            content: `Please summarize this document:\n\n${truncated}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('API error response:', text.slice(0, 500))
      return NextResponse.json(
        { error: `API returned ${response.status}: ${text.slice(0, 200)}` },
        { status: response.status }
      )
    }

    const data    = await response.json()

    // Find first text block — MiniMax returns a thinking block before the text block
    const textBlock = Array.isArray(data?.content)
      ? data.content.find((block: { type: string }) => block.type === 'text')
      : null
    const content = textBlock?.text
                 ?? data?.choices?.[0]?.message?.content
                 ?? null

    if (!content) {
      console.error('No content in response:', JSON.stringify(data).slice(0, 500))
      return NextResponse.json(
        { error: 'No content in AI response' },
        { status: 500 }
      )
    }

    return NextResponse.json({ summary: content })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Summarize API error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
