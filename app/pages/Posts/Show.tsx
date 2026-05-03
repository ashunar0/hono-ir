import { Link, router } from '@inertiajs/react'
import type { PageProps } from '../../pages.gen'

export default function Show({ post }: PageProps<'Posts/Show'>) {
  return (
    <main>
      <nav>
        <Link href='/posts'>← Posts 一覧</Link>
        <Link href={`/posts/${post.id}/edit`}>編集</Link>
      </nav>

      <article>
        <h1>{post.title}</h1>
        <small>{new Date(post.createdAt).toLocaleString('ja-JP')}</small>
        <p>{post.body}</p>
      </article>

      <button
        type='button'
        onClick={() => {
          if (!confirm('本当に削除しますか？')) return
          router.delete(`/posts/${post.id}`)
        }}
      >
        削除
      </button>
    </main>
  )
}
