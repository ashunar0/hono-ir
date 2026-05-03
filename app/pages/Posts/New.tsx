import { Link, useForm } from '@inertiajs/react'
import type { PageProps } from '../../pages.gen'

export default function New({ values, errors }: PageProps<'Posts/New'>) {
  const form = useForm(values)

  return (
    <main>
      <nav>
        <Link href='/posts'>← Posts 一覧</Link>
      </nav>

      <h1>New Post</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.post('/posts')
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
          {form.processing ? '送信中...' : '投稿'}
        </button>
      </form>
    </main>
  )
}
