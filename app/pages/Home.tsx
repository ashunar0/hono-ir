import { Link } from '@inertiajs/react'
import type { PageProps } from '../pages.gen'

export default function Home({ message }: PageProps<'Home'>) {
  return (
    <main>
      <h1>{message}</h1>
      <p>It works!</p>
      <p>
        <Link href='/posts'>Posts 一覧へ →</Link>
      </p>
    </main>
  )
}
