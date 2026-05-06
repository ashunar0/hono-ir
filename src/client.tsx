import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import '../app/app.css'
import { AppLayout } from '../app/layouts/AppLayout'

createInertiaApp({
  resolve: async (name) => {
    const pages = import.meta.glob<{ default: ResolvedComponent }>(
      '../app/pages/**/*.tsx'
    )
    const loader = pages[`../app/pages/${name}.tsx`]
    if (!loader) throw new Error(`Page not found: ${name}`)
    const page = await loader()
    // page 自身が layout を指定していなければ AppLayout で wrap
    page.default.layout =
      page.default.layout ?? ((node: ReactNode) => <AppLayout>{node}</AppLayout>)
    return page.default
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
  },
})
