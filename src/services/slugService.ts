const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const DEFAULT_LENGTH = 8

export function generateRandomSlug(length = DEFAULT_LENGTH): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length))
  }
  return result
}

export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function isValidSlug(input: string): boolean {
  return /^[a-z0-9-]+$/.test(input) && input.length > 0
}
