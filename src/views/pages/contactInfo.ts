/**
 * Contact details shown on /contact. Kurii: edit the values here (one place).
 * Any value still set to TODO is shown as a clearly marked placeholder, not a link.
 * Deliberately no form and no backend; an email address is shown as text only.
 */
export const TODO = 'TODO'

export const CONTACT_INFO = {
  name: TODO,
  role: TODO,
  blurb: TODO,
  github: TODO,
  linkedin: TODO,
  email: TODO,
} as const

export function isTodo(value: string): boolean {
  return value.trim() === '' || value.trim().toUpperCase().startsWith(TODO)
}
