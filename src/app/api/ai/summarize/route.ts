import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey:  process.env.AI_API_KEY,
  baseURL: process.env.AI_BASE_URL,
})

const SYSTEM_PROMPTS: Record<string, string> = {
  brief: `You are a document summarizer. Return only 3-4 most important bullet points from the document. Format as:

## Key Points
- Point 1
- Point 2
- Point 3
- Point 4

Be extremely concise.`,

  standard: `You are a document summarizer. Analyze the provided PDF text and return a structured summary in this exact format:

## Overview
One paragraph (3-5 sentences) covering the main topic and purpose of the document.

## Key Points
- Bullet point 1
- Bullet point 2
- Bullet point 3
- Bullet point 4
- Bullet point 5

(5-8 key points)

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
  const { extractedText, summaryType = 'standard' } = await req.json()

  if (!extractedText) {
    return NextResponse.json({ error: 'Missing extractedText' }, { status: 400 })
  }

  const truncated    = extractedText.slice(0, 50000)
  const systemPrompt = SYSTEM_PROMPTS[summaryType as string] ?? SYSTEM_PROMPTS.standard

  const message = await client.messages.create({
    model:      process.env.AI_MODEL ?? 'minimax-m2.7',
    max_tokens: summaryType === 'detailed' ? 2048 : 1024,
    system:     systemPrompt,
    messages: [
      {
        role:    'user',
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
