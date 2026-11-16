import { timingSafeEqual } from 'node:crypto'
import { getPayloadClient } from '@/lib/payload/getPayloadClient'

export async function POST(request: Request) {
  const secret = process.env.JOBS_SECRET
  const expected = Buffer.from(`Bearer ${secret || ''}`)
  const received = Buffer.from(request.headers.get('authorization') || '')
  if (!secret || received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return new Response(null, { status: 401 })
  }
  const payload = await getPayloadClient()
  await payload.jobs.handleSchedules({ allQueues: true })
  await payload.jobs.run({ allQueues: true, limit: 10, sequential: true, overrideAccess: true })
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
