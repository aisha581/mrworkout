import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'

export const metadata = {
  title: 'MR. WORKOUT Blog — Science-Backed Fitness',
  description: 'Progressive overload, hypertrophy, CNS recovery — no fluff, just results.',
}

export default function BlogIndex() {
  const posts = getAllPosts()

  return (
    <main style={{ maxWidth: '860px', margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#FFD700', fontSize: '2.2rem', marginBottom: '0.5rem' }}>MR. WORKOUT Blog</h1>
      <p style={{ color: '#aaa', marginBottom: '3rem' }}>Science-backed training. Zero excuses.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {posts.map(post => (
          <article key={post.slug} style={{
            background: '#111', borderRadius: '12px', padding: '1.75rem',
            borderLeft: '4px solid #FFD700',
          }}>
            <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
              <h2 style={{ color: '#fff', fontSize: '1.3rem', margin: '0 0 0.5rem' }}>{post.title}</h2>
            </Link>
            <p style={{ color: '#bbb', margin: '0 0 1rem', fontSize: '0.95rem' }}>{post.excerpt}</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {post.tags.map(tag => (
                <span key={tag} style={{
                  background: '#222', color: '#FFD700', borderRadius: '4px',
                  padding: '0.2rem 0.6rem', fontSize: '0.78rem',
                }}>#{tag}</span>
              ))}
            </div>
            <Link href={`/blog/${post.slug}`} style={{ color: '#FFD700', fontSize: '0.9rem', fontWeight: 700 }}>
              Read more →
            </Link>
          </article>
        ))}
      </div>
    </main>
  )
}
