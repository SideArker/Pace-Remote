import { describe, expect, it } from 'vitest';
import { parseRequest, pairingSchema, VERSION } from './index';
const id = '01234567-89ab-4cde-8abc-0123456789ab';
const projectId = 'a'.repeat(64);
describe('remote v1 wire contract', () => {
  it('rejects protocol mismatch, unknown operations, and injected parameters', () => {
    expect(() => parseRequest({ v: 2, id, method: 'projects.list', params: {} })).toThrow();
    expect(() => parseRequest({ v: 1, id, method: 'app-server/rpc', params: {} })).toThrow();
    expect(() => parseRequest({ v: 1, id, method: 'projects.list', params: { path: '/' } })).toThrow();
  });
  it('requires a stable prompt key and scoped IDs', () => {
    const request = { v: VERSION, id, method: 'prompts.send', params: { projectId, sessionId: id, key: id, prompt: 'test' } };
    expect(parseRequest(request)).toEqual(request);
    expect(() => parseRequest({ ...request, params: { ...request.params, key: undefined } })).toThrow();
    expect(() => parseRequest({ ...request, params: { ...request.params, sessionId: '../secret' } })).toThrow();
  });
  it('bounds prompt size and accepts the Pace effort catalog', () => {
    expect(() => parseRequest({ v: 1, id, method: 'prompts.send', params: { projectId, sessionId: id, key: id, prompt: 'x'.repeat(32001) } })).toThrow();
    for (const effort of ['minimal', 'low', 'medium', 'high', 'xhigh', 'ultra', 'persistent']) {
      expect(parseRequest({ v: 1, id, method: 'routing.set', params: { projectId, sessionId: id, mode: 'manual', route: { model: 'test', effort } } }).method).toBe('routing.set');
    }
  });
  it('requires a high entropy pairing secret and explicit host pin', () => {
    expect(pairingSchema.safeParse({ v: 1, address: 'https://192.168.1.2:8443', fingerprint: projectId, token: projectId, expiresAt: Date.now() + 1000 }).success).toBe(true);
    expect(pairingSchema.safeParse({ v: 1, address: 'https://192.168.1.2:8443', fingerprint: projectId, token: '123456', expiresAt: 1 }).success).toBe(false);
  });
});
