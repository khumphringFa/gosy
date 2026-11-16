import { NextResponse } from 'next/server'
import { createFlow, googleConfig, oauthCookie } from '@/lib/google/oauth'

export async function GET() {
  const config = googleConfig()
  if (!config) return new Response('Google sign-in is not configured yet. Please use email sign-in.', { status: 503 })
  const flow = createFlow()
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.callback,
    response_type: 'code', scope: 'openid email profile', state: flow.state,
    code_challenge: flow.challenge, code_challenge_method: 'S256' }).toString()
  const response = NextResponse.redirect(url)
  response.cookies.set(oauthCookie, `${flow.state}.${flow.verifier}`, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/api/google' })
  response.headers.set('Cache-Control', 'no-store')
  return response
}
