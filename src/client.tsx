import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import '../app/app.css'

createInertiaApp({
  resolve: async (name) => {
    const pages = import.meta.glob<{ default: ResolvedComponent }>(
      '../app/pages/**/*.tsx'
    )
    const loader = pages[`../app/pages/${name}.tsx`]
    if (!loader) throw new Error(`Page not found: ${name}`)
    const page = await loader()
    return page.default
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
  },
})
