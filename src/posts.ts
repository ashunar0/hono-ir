import { z } from 'zod'

export type Post = {
  id: number
  title: string
  body: string
  createdAt: string
}

export const postInputSchema = z.object({
  title: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(80, 'タイトルは80文字以内で入力してください'),
  body: z
    .string()
    .min(1, '本文は必須です')
    .max(2000, '本文は2000文字以内で入力してください'),
})

export type PostInput = z.infer<typeof postInputSchema>

const posts: Post[] = [
  {
    id: 1,
    title: 'Hono × Inertia 触ってみた',
    body: 'c.render() で React に props が貫通する体験が最高',
    createdAt: '2026-04-27T10:00:00Z',
  },
  {
    id: 2,
    title: 'CF Workers + Vite の dev 体験',
    body: 'Miniflare で Worker 環境がローカルで動くの便利',
    createdAt: '2026-04-28T09:00:00Z',
  },
]

export const listPosts = (): Post[] =>
  [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

export const findPost = (id: number): Post | undefined =>
  posts.find((p) => p.id === id)

export const createPost = (input: PostInput): Post => {
  const nextId = posts.reduce((max, p) => Math.max(max, p.id), 0) + 1
  const post: Post = {
    id: nextId,
    title: input.title,
    body: input.body,
    createdAt: new Date().toISOString(),
  }
  posts.push(post)
  return post
}

export const updatePost = (
  id: number,
  input: PostInput
): Post | undefined => {
  const target = posts.find((p) => p.id === id)
  if (!target) return undefined
  target.title = input.title
  target.body = input.body
  return target
}

export const deletePost = (id: number): boolean => {
  const index = posts.findIndex((p) => p.id === id)
  if (index === -1) return false
  posts.splice(index, 1)
  return true
}
