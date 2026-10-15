import { MAX_MESSAGE_BYTES, VERSION, type Method, type Params, type Pairing, type Project, type Request, type Response } from '@pace-remote/protocol';
import * as SecureStore from 'expo-secure-store';
import { PaceLan } from '../native/PaceLan';

type Changed = { v: 1; type: 'changed'; cursor: string; projectId: string; sessionId: string };
type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> };
export type HostConnection = { address: string; fingerprint: string };
const KEY = 'pace.remote.host.v1';
export async function saveConnection(connection: HostConnection) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(connection), { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
}
export async function loadConnection(): Promise<HostConnection | undefined> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return;
  try {
    const connection = JSON.parse(raw) as HostConnection;
    if (typeof connection.address !== 'string' || typeof connection.fingerprint !== 'string') return;
    return connection;
  } catch { return; }
}
export async function forgetConnection() { await PaceLan.disconnect(); await SecureStore.deleteItemAsync(KEY); }

class PaceRemoteClient {
  private pending = new Map<string, Pending>();
  private listeners = new Set<(event: Changed) => void>();
  private status: 'connected' | 'disconnected' | 'error' = 'disconnected';
  private messageSub = PaceLan.onMessage(text => this.receive(text));
  private stateSub = PaceLan.onState(status => {
    this.status = status;
    if (status !== 'connected') this.rejectAll(new Error(status === 'error' ? 'Connection failed. Check host address, pairing, and certificate.' : 'Host disconnected. Reconnect and refresh state.'));
  });
  async connect(connection: HostConnection) {
    if (this.status === 'connected') return;
    await PaceLan.connect(connection.address, connection.fingerprint);
    await new Promise<void>((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (this.status === 'connected') { clearInterval(timer); resolve(); }
        else if (this.status === 'error' || Date.now() - started > 10000) { clearInterval(timer); reject(new Error('Could not establish a trusted connection to host.')); }
      }, 50);
    });
  }
  onChanged(listener: (event: Changed) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  get connected() { return this.status === 'connected'; }
  async call<M extends Method, R = unknown>(method: M, params: Params<M>): Promise<R> {
    if (!this.connected) throw new Error('Host disconnected. Reconnect before sending commands.');
    const id = crypto.randomUUID();
    const envelope: Request = { v: VERSION, id, method, params } as Request;
    const data = JSON.stringify(envelope);
    if (new TextEncoder().encode(data).byteLength > MAX_MESSAGE_BYTES) throw new Error('Request exceeds 1 MiB.');
    const response = new Promise<R>((resolve, reject) => {
      const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error('Request result unknown. Refresh host state before retrying.')); }, 15000);
      this.pending.set(id, { resolve: value => resolve(value as R), reject, timeout });
    });
    try { await PaceLan.send(data); }
    catch (error) { const pending = this.pending.get(id); if (pending) clearTimeout(pending.timeout); this.pending.delete(id); throw error; }
    return response;
  }
  private receive(text: string) {
    if (new TextEncoder().encode(text).byteLength > MAX_MESSAGE_BYTES) { void PaceLan.disconnect(); return; }
    let message: Response | Changed;
    try { message = JSON.parse(text) as Response | Changed; } catch { void PaceLan.disconnect(); return; }
    if (message.v !== VERSION) { void PaceLan.disconnect(); return; }
    if ('type' in message) { if (message.type === 'changed' && typeof message.cursor === 'string') this.listeners.forEach(listener => listener(message)); return; }
    const pending = this.pending.get(message.id);
    if (!pending) return;
    clearTimeout(pending.timeout); this.pending.delete(message.id);
    if (message.ok) pending.resolve(message.data);
    else pending.reject(new Error(message.error.message));
  }
  private rejectAll(error: Error) { for (const pending of this.pending.values()) { clearTimeout(pending.timeout); pending.reject(error); } this.pending.clear(); }
  dispose() { this.rejectAll(new Error('Connection closed.')); this.messageSub.remove(); this.stateSub.remove(); this.listeners.clear(); void PaceLan.disconnect(); }
}
let client: PaceRemoteClient | undefined;
export function remoteClient() { return client ??= new PaceRemoteClient(); }
export async function pairHost(pairing: Pairing, name: string) {
  const result = JSON.parse(await PaceLan.pair(pairing.address, pairing.fingerprint, pairing.token, name)) as { v: number; deviceId: string };
  if (result.v !== VERSION || !/^[a-f0-9]{64}$/.test(result.deviceId)) throw new Error('Host rejected pairing response.');
  const connection = { address: pairing.address, fingerprint: pairing.fingerprint };
  await saveConnection(connection);
  await remoteClient().connect(connection);
  return remoteClient().call<'projects.list', { projects: Project[] }>('projects.list', {});
}
export async function discoverHosts() { return PaceLan.discover(); }
export async function stopDiscoveringHosts() { return PaceLan.stopDiscovery(); }
