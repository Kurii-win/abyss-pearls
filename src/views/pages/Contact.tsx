import type { ReactNode } from 'react'
import { CONTACT_INFO, isTodo } from './contactInfo'

function Value({ value, render }: { readonly value: string; readonly render?: (v: string) => ReactNode }) {
  if (isTodo(value)) return <span className="todo">TODO: to be filled in</span>
  return <>{render ? render(value) : value}</>
}

const link = (href: string) => (
  <a href={href} rel="noopener noreferrer" target="_blank">
    {href.replace(/^https?:\/\//, '')}
  </a>
)

export default function Contact() {
  const c = CONTACT_INFO
  const fields: readonly { label: string; value: string; render?: (v: string) => ReactNode }[] = [
    { label: 'Name', value: c.name },
    { label: 'Role', value: c.role },
    { label: 'About', value: c.blurb },
    { label: 'GitHub', value: c.github, render: link },
    { label: 'LinkedIn', value: c.linkedin, render: link },
    { label: 'Email', value: c.email },
  ]
  return (
    <main className="page">
      <title>Contact — Abyss Pearls</title>
      <h1>Contact</h1>
      <p className="lede">
        Studios and licensed operators interested in the game, its math or the codebase: get in touch through any of
        the channels below.
      </p>
      <dl className="contact-list" data-testid="contact-list">
        {fields.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>
              <Value value={f.value} render={f.render} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="note">
        This site has no contact form and sends nothing to a server. Abyss Pearls is a demo on virtual ✦ Pearls
        only.
      </p>
    </main>
  )
}
