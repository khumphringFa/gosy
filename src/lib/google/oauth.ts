import 'server-only'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const oauthCookie = 'gosy-google-flow'
export function googleConfig() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_URL } = process.env
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !APP_URL) return null
  let base: URL
  try { base = new URL(APP_URL) } catch { return null }
  if (base.protocol !== 'https:' || base.pathname !== '/' || base.search || base.hash) return null
  return { clientId: GOOGLE_CLIENT_ID, secret: GOOGLE_CLIENT_SECRET, base, callback: new URL('/api/google/callback', base).href }
}
export function createFlow() {
  const state = randomBytes(32).toString('base64url')
  const verifier = randomBytes(32).toString('base64url')
  return { state, verifier, challenge: createHash('sha256').update(verifier).digest('base64url') }
}
export function verifyFlow(cookie: string | undefined, state: string | null) {
  const [expected, verifier, extra] = (cookie || '').split('.')
  if (!state || !expected || !verifier || extra || !/^[\w-]{43}$/.test(verifier)) return null
  const a = Buffer.from(expected), b = Buffer.from(state)
  return a.length === b.length && timingSafeEqual(a, b) ? verifier : null
}
