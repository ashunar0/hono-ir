import { Link, useForm } from '@inertiajs/react'
import type { PageProps } from '../../pages.gen'

export default function Edit({ post, errors }: PageProps<'Posts/Edit'>) {
  const form = useForm({
    title: post.title,
    body: post.body,
  })

  return (
    <main>
      <nav>
        <Link href={`/posts/${post.id}`}>← 詳細に戻る</Link>
      </nav>

      <h1>Edit Post</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.patch(`/posts/${post.id}`)
        }}
      >
        <div>
          <label htmlFor='title'>Title</label>
          <input
            id='title'
            type='text'
            value={form.data.title}
            onChange={(e) => form.setData('title', e.target.value)}
          />
          {errors.title && <p>{errors.title}</p>}
        </div>

        <div>
          <label htmlFor='body'>Body</label>
          <textarea
            id='body'
            rows={6}
            value={form.data.body}
            onChange={(e) => form.setData('body', e.target.value)}
          />
          {errors.body && <p>{errors.body}</p>}
        </div>

        <button type='submit' disabled={form.processing}>
          {form.processing ? '更新中...' : '更新'}
        </button>
      </form>
    </main>
  )
}
