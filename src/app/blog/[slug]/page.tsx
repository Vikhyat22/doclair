import { notFound } from 'next/navigation'

export function generateStaticParams() {
  return []
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: _ } = await params
  notFound()
}
