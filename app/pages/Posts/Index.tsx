import { Link } from '@inertiajs/react'
import type { PageProps } from '../../pages.gen'

export default function Index({ posts }: PageProps<'Posts/Index'>) {
  return (
    <main>
      <nav>
        <Link href='/'>← Home</Link>
      </nav>

      <header>
        <h1>Posts</h1>
        <Link href='/posts/new'>+ 新規投稿</Link>
      </header>

      {posts.length === 0 ? (
        <p>まだ投稿がありません</p>
      ) : (
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              <h2>
                <Link href={`/posts/${post.id}`}>{post.title}</Link>
              </h2>
              <p>{post.body}</p>
              <small>{new Date(post.createdAt).toLocaleString('ja-JP')}</small>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
