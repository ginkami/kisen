const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
export const SLUG_MIN_LENGTH = 3
export const SLUG_DEFAULT_LENGTH = 10
const MAX_SLUG_ATTEMPTS = 10

export function generateRandomSlug(length = SLUG_DEFAULT_LENGTH): string {
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
  return (
    /^[a-z0-9-]+$/.test(input) && input.length >= SLUG_MIN_LENGTH
  )
}

export async function generateUniqueSlug(
  isAvailable: (slug: string) => Promise<boolean>,
  length = SLUG_DEFAULT_LENGTH
): Promise<string> {
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const candidate = generateRandomSlug(length)
    if (await isAvailable(candidate)) {
      return candidate
    }
  }
  throw new Error('Failed to generate unique slug')
}
