import { randomBytes, randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getFieldsToSign, jwtSign } from 'payload'
import { generatePayloadCookie } from 'payload/shared'
import { googleConfig, oauthCookie, verifyFlow } from '@/lib/google/oauth'
import { getPayloadClient } from '@/lib/payload/getPayloadClient'

export async function GET(request: NextRequest) {
  const config = googleConfig()
  if (!config) return new Response('Google sign-in is not configured.', { status: 503 })
  const finish = (path: string) => {
    const res = NextResponse.redirect(new URL(path, config.base))
    res.cookies.set(oauthCookie, '', { maxAge: 0, httpOnly: true, secure: true, sameSite: 'lax', path: '/api/google' })
    res.headers.set('Cache-Control', 'no-store')
    return res
  }
  const code = request.nextUrl.searchParams.get('code')
  const verifier = verifyFlow(request.cookies.get(oauthCookie)?.value, request.nextUrl.searchParams.get('state'))
  if (!code || !verifier) return finish('/login?google=failed')
  try {
    const exchange = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', cache: 'no-store',
      body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.secret, redirect_uri: config.callback, grant_type: 'authorization_code', code_verifier: verifier }), signal: AbortSignal.timeout(10000) })
    if (!exchange.ok) return finish('/login?google=failed')
    const token = await exchange.json() as { access_token?: string }
    if (!token.access_token) return finish('/login?google=failed')
    const identity = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` }, cache: 'no-store', signal: AbortSignal.timeout(10000) })
    if (!identity.ok) return finish('/login?google=failed')
    const profile = await identity.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string }
    if (!profile.sub || !profile.email || profile.email_verified !== true) return finish('/login?google=failed')
    const email = profile.email.toLowerCase().trim()
    const payload = await getPayloadClient()
    const existing = await payload.find({ collection: 'users', where: { googleSubject: { equals: profile.sub } }, limit: 1, depth: 0, overrideAccess: true, showHiddenFields: true })
    let user = existing.docs[0]
    if (!user) {
      const emailMatch = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0, overrideAccess: true })
      // Never automatically link a Google identity to an existing password/admin account.
      if (emailMatch.totalDocs) return finish('/login?google=existing')
      user = await payload.create({ collection: 'users', data: { googleSubject: profile.sub, email, name: profile.name?.slice(0, 200), password: randomBytes(32).toString('base64url'), role: 'guest' }, overrideAccess: true, showHiddenFields: true })
    }
    // Google login is only for guests. Partner and administrator authentication stays unchanged.
    if (user.role !== 'guest' || (user.lockUntil && Date.parse(user.lockUntil) > Date.now())) return finish('/login?google=failed')
    const collection = payload.collections.users.config
    const auth = collection.auth
    const now = new Date()
    const sid = randomUUID()
    if (!auth.useSessions) return finish('/login?google=failed')
    const sessions = (user.sessions || []).filter((session) => Date.parse(session.expiresAt) > now.getTime())
    sessions.push({ id: sid, createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + auth.tokenExpiration * 1000).toISOString() })
    await payload.db.updateOne({ collection: 'users', id: user.id, data: { sessions }, returning: false })
    const { token: sessionToken } = await jwtSign({ fieldsToSign: getFieldsToSign({ collectionConfig: collection, email: user.email, sid, user }), secret: payload.secret, tokenExpiration: auth.tokenExpiration })
    const response = finish('/dashboard')
    response.headers.append('Set-Cookie', generatePayloadCookie({ collectionAuthConfig: auth, cookiePrefix: payload.config.cookiePrefix, token: sessionToken }))
    return response
  } catch {
    return finish('/login?google=failed')
  }
}
