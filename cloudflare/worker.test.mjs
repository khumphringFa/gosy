import test from 'node:test'
import assert from 'node:assert/strict'
import worker from './worker.mjs'

test('rejects absent or untrusted origin', async () => {
  const req = new Request('https://gosy.example.workers.dev/')
  assert.equal((await worker.fetch(req, {})).status, 503)
  assert.equal((await worker.fetch(req, { ORIGIN_URL: 'https://evil.example' })).status, 503)
})

test('preserves path and rewrites origin redirect without caching', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(String(url), 'https://gosy-123.run.app/api/test?a=1')
      assert.equal(options.headers.get('x-forwarded-host'), 'gosy.example.workers.dev')
      assert.equal(options.cf.cacheTtl, 0)
      return new Response(null, { status: 302, headers: { location: 'https://gosy-123.run.app/login' } })
    }
    const res = await worker.fetch(new Request('https://gosy.example.workers.dev/api/test?a=1'), { ORIGIN_URL: 'https://gosy-123.run.app' })
    assert.equal(res.headers.get('location'), 'https://gosy.example.workers.dev/login')
  } finally { globalThis.fetch = original }
})
