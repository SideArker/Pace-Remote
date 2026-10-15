import { requireNativeModule } from 'expo-modules-core';
import type { EventSubscription } from 'react-native';

type NativeEvent = { text: string } | { status: 'connected' | 'disconnected' | 'error' } | { name: string; address: string };
type PaceLanNative = {
  pair(address: string, fingerprint: string, token: string, name: string): Promise<string>;
  connect(address: string, fingerprint: string): Promise<void>;
  send(message: string): Promise<void>;
  disconnect(): Promise<void>;
  discover(): Promise<void>;
  stopDiscovery(): Promise<void>;
  addListener(event: string, listener: (payload: NativeEvent) => void): EventSubscription;
};
const Native = requireNativeModule<PaceLanNative>('PaceLan');
export const PaceLan = {
  pair: (address: string, fingerprint: string, token: string, name: string) => Native.pair(address, fingerprint, token, name),
  connect: (address: string, fingerprint: string) => Native.connect(address, fingerprint),
  send: (message: string) => Native.send(message),
  disconnect: () => Native.disconnect(),
  discover: () => Native.discover(),
  stopDiscovery: () => Native.stopDiscovery(),
  onMessage: (fn: (text: string) => void) => Native.addListener('message', event => { if ('text' in event) fn(event.text); }),
  onState: (fn: (state: 'connected' | 'disconnected' | 'error') => void) => Native.addListener('state', event => { if ('status' in event) fn(event.status); }),
  onHost: (fn: (host: { name: string; address: string }) => void) => Native.addListener('host', event => { if ('name' in event && 'address' in event) fn(event); }),
};
