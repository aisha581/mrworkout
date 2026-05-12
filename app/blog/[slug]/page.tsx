import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllSlugs, getPost } from '@/lib/blog'
import { DownloadCTA } from '@/components/DownloadCTA'
import type { Metadata } from 'next'

export async function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt },
  }
}

const components = { DownloadCTA }

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug)

  return (
    <main style={{ maxWidth: '780px', margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'sans-serif', color: '#e0e0e0' }}>
      <a href="/blog" style={{ color: '#FFD700', fontSize: '0.9rem', textDecoration: 'none' }}>← All posts</a>

      <h1 style={{ color: '#fff', fontSize: '2rem', margin: '1.5rem 0 0.5rem', lineHeight: 1.2 }}>{post.title}</h1>
      <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '2.5rem' }}>{post.date}</p>

      <div style={{ lineHeight: 1.8, fontSize: '1.05rem' }}>
        <MDXRemote source={post.content} components={components} />
      </div>
    </main>
  )
}
