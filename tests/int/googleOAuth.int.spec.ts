import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
import { createFlow, verifyFlow } from '../../src/lib/google/oauth'

describe('Google OAuth flow', () => {
  it('uses independent PKCE state and verifier and rejects forged state', () => {
    const flow = createFlow()
    expect(flow.state).not.toBe(flow.verifier)
    expect(flow.challenge).not.toBe(flow.verifier)
    expect(verifyFlow(`${flow.state}.${flow.verifier}`, flow.state)).toBe(flow.verifier)
    expect(verifyFlow(`${flow.state}.${flow.verifier}`, 'forged')).toBeNull()
    expect(verifyFlow(undefined, flow.state)).toBeNull()
    expect(verifyFlow(`${flow.state}.invalid`, flow.state)).toBeNull()
  })
})
