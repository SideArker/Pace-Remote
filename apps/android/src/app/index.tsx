import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pairingSchema, type Pairing, type Project } from '@pace-remote/protocol';
import { Button, Card, Label } from '../components/ui/Primitives';
import { common, colors, radius, space } from '../theme/tokens';
import { discoverHosts, pairHost, remoteClient, stopDiscoveringHosts } from '../services/remote/client';
import { PaceLan } from '../services/native/PaceLan';

export default function PairingScreen() {
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [token, setToken] = useState('');
  const [hosts, setHosts] = useState<{ name: string; address: string }[]>([]);
  const [working, setWorking] = useState(false);
  useEffect(() => {
    const subscription = PaceLan.onHost(host => setHosts(old => old.some(item => item.address === host.address) ? old : [...old, host]));
    void discoverHosts().catch(() => {});
    return () => { subscription.remove(); void stopDiscoveringHosts(); };
  }, []);
  const fromJson = () => {
    try {
      const parsed = pairingSchema.parse(JSON.parse(code)) as Pairing;
      setAddress(parsed.address); setFingerprint(parsed.fingerprint); setToken(parsed.token);
    } catch { Alert.alert('Pairing code not valid', 'Paste full JSON code printed by `pace remote`.'); }
  };
  const connect = async () => {
    setWorking(true);
    try {
      if (!address.trim() || !fingerprint.trim() || !token.trim()) throw new Error('Enter the host address, certificate fingerprint and current pairing token.');
      const parsed = pairingSchema.parse({ v: 1, address: address.trim(), fingerprint: fingerprint.replaceAll(':', '').trim().toLowerCase(), token: token.trim(), expiresAt: Date.now() + 1000 });
      const projects = await pairHost(parsed, 'Android phone') as { projects?: Project[] } | Project[];
      const items = Array.isArray(projects) ? projects : projects.projects ?? [];
      setToken(''); setCode('');
      if (items.length === 1) router.replace(`/host/${items[0]!.id}`);
      else router.replace('/projects');
    } catch (error) { Alert.alert('Could not pair', error instanceof Error ? error.message : 'Pairing failed.'); }
    finally { setWorking(false); }
  };
  const discovered = useMemo(() => hosts.map(host => <Card key={host.address}>
    <Text style={common.heading}>{host.name}</Text>
    <Text style={common.muted}>{host.address}</Text>
    <Text style={common.muted}>Enter its short lived pairing code below.</Text>
    <Button title="Use this address" secondary onPress={() => setAddress(host.address)} />
  </Card>), [hosts]);
  return <SafeAreaView style={common.screen}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.brand}><View style={styles.mark}><Text style={styles.markText}>P</Text></View><View><Text style={styles.wordmark}>pace <Text style={{ color: colors.muted }}>remote</Text></Text><Text style={common.muted}>Your local Pace session, on this phone.</Text></View></View>
      <Card>
        <Label color={colors.success}>LOCAL CONNECTION</Label>
        <Text style={common.heading}>Pair with Pace on your computer</Text>
        <Text style={common.muted}>Use the one time code from `pace remote`. The phone verifies host certificate before sending it.</Text>
        <TextInput value={code} onChangeText={setCode} placeholder="Paste the complete pairing code" placeholderTextColor={colors.subtle} style={[common.field, styles.code]} multiline autoCapitalize="none" autoCorrect={false} />
        <Button title="Read pairing code" secondary onPress={fromJson} />
        <TextInput value={address} onChangeText={setAddress} placeholder="https://192.168.1.20:8443" placeholderTextColor={colors.subtle} style={common.field} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <TextInput value={fingerprint} onChangeText={setFingerprint} placeholder="Host certificate SHA-256 fingerprint" placeholderTextColor={colors.subtle} style={common.field} autoCapitalize="none" autoCorrect={false} />
        <TextInput value={token} onChangeText={setToken} placeholder="Single use pairing token" placeholderTextColor={colors.subtle} style={common.field} autoCapitalize="none" autoCorrect={false} secureTextEntry />
        <Button title={working ? 'Pairing…' : 'Pair securely'} onPress={() => void connect()} disabled={working} />
      </Card>
      <View style={styles.section}><Label>FOUND ON THIS NETWORK</Label><Text style={common.muted}>Discovery finds computers. It does not establish trust.</Text></View>
      {discovered.length ? discovered : <Card><Text style={common.muted}>No Pace host found. Confirm both devices share Wi-Fi, then enter the address shown in the computer terminal.</Text></Card>}
      <Text style={[common.muted, styles.footer]}>Pace controls project access and command approval. Remote works only while the computer is awake on the same local network.</Text>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  content: { padding: space.lg, paddingTop: space.xl, gap: space.md, paddingBottom: space.xxl },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  mark: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  markText: { color: colors.background, fontSize: 22, fontWeight: '800' },
  wordmark: { color: colors.text, fontSize: 22, fontWeight: '750' },
  code: { minHeight: 78, textAlignVertical: 'top' },
  section: { paddingTop: space.md, gap: space.xs },
  footer: { textAlign: 'center', paddingHorizontal: space.lg, paddingVertical: space.lg },
});
