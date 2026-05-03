import { Hono } from 'hono'
import { inertia } from '@hono/inertia'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { rootView } from './root-view'
import {
  createPost,
  deletePost,
  findPost,
  listPosts,
  postInputSchema,
  updatePost,
  type PostInput,
} from './posts'

const toFieldErrors = (
  error: z.core.$ZodError<unknown>
): Record<string, string> => {
  const out: Record<string, string> = {}
  const flat = z.flattenError(error)
  for (const [key, messages] of Object.entries(flat.fieldErrors)) {
    const msgs = messages as string[] | undefined
    const first = msgs?.[0]
    if (first) out[key] = first
  }
  return out
}

const recoverInput = (data: unknown): PostInput => {
  const obj = (data ?? {}) as Partial<PostInput>
  return {
    title: typeof obj.title === 'string' ? obj.title : '',
    body: typeof obj.body === 'string' ? obj.body : '',
  }
}

const app = new Hono()

app.use(inertia({ version: '1', rootView }))

const routes = app
  .get('/', (c) => c.render('Home', { message: 'Hello, Hono × Inertia!' }))
  .get('/posts', (c) => c.render('Posts/Index', { posts: listPosts() }))
  .get('/posts/new', (c) =>
    c.render('Posts/New', {
      values: { title: '', body: '' },
      errors: {} as Record<string, string>,
    })
  )
  .post(
    '/posts',
    zValidator('json', postInputSchema, (result, c) => {
      if (!result.success) {
        return c.render('Posts/New', {
          values: recoverInput(result.data),
          errors: toFieldErrors(result.error),
        })
      }
    }),
    (c) => {
      const post = createPost(c.req.valid('json'))
      return c.redirect(`/posts/${post.id}`, 303)
    }
  )
  .get('/posts/:id{[0-9]+}', (c) => {
    const id = Number(c.req.param('id'))
    const post = findPost(id)
    if (!post) return c.notFound()
    return c.render('Posts/Show', { post })
  })
  .get('/posts/:id{[0-9]+}/edit', (c) => {
    const id = Number(c.req.param('id'))
    const post = findPost(id)
    if (!post) return c.notFound()
    return c.render('Posts/Edit', {
      post,
      errors: {} as Record<string, string>,
    })
  })
  .patch(
    '/posts/:id{[0-9]+}',
    zValidator('json', postInputSchema, (result, c) => {
      if (!result.success) {
        const id = Number(c.req.param('id'))
        const post = findPost(id)
        if (!post) return c.notFound()
        return c.render('Posts/Edit', {
          post: { ...post, ...recoverInput(result.data) },
          errors: toFieldErrors(result.error),
        })
      }
    }),
    (c) => {
      const id = Number(c.req.param('id'))
      const post = updatePost(id, c.req.valid('json'))
      if (!post) return c.notFound()
      return c.redirect(`/posts/${post.id}`, 303)
    }
  )
  .delete('/posts/:id{[0-9]+}', (c) => {
    const id = Number(c.req.param('id'))
    if (!deletePost(id)) return c.notFound()
    return c.redirect('/posts', 303)
  })

export default routes
export type AppType = typeof routes
