import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { TextPage } from '@pace-remote/protocol';
import { Button, Card } from '../components/ui/Primitives';
import { common, colors, space } from '../theme/tokens';
import { remoteClient } from '../services/remote/client';

export default function ReaderScreen() {
  const { projectId = '', sessionId = '', path = '' } = useLocalSearchParams<{ projectId: string; sessionId: string; path: string }>();
  const [page, setPage] = useState<TextPage>(); const [next, setNext] = useState(0); const [busy, setBusy] = useState(true); const [error, setError] = useState('');
  const load = async (offset: number, append = false) => {
    setBusy(true); setError('');
    try {
      const result = await remoteClient().call<'reader.read', TextPage>('reader.read', { projectId, sessionId, path, offset });
      setPage(old => append && old ? { ...result, text: `${old.text}\n${result.text}` } : result); setNext(result.nextOffset ?? -1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'File could not be read.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { const timer = setTimeout(() => { void load(0); }, 0); return () => clearTimeout(timer); }, [projectId, sessionId, path]);
  return <SafeAreaView style={common.screen}>
    <View style={{ padding: space.lg, borderBottomWidth: 1, borderBottomColor: colors.border, gap: space.sm }}><Button title="‹  Conversation" secondary onPress={() => router.back()} /><Text style={common.heading} numberOfLines={2}>{path}</Text><Text style={common.muted}>Read only · host validates file access · {page?.totalLines ?? '…'} lines</Text></View>
    <ScrollView contentContainerStyle={{ padding: space.lg }}>
      {error ? <Card><Text style={{ color: colors.danger }}>{error}</Text><Button title="Retry" secondary onPress={() => void load(next < 0 ? 0 : next)} /></Card> : null}
      {page ? <Markdown style={{ body: { color: colors.text, fontSize: 15, lineHeight: 23 }, heading1: { color: colors.text, fontSize: 24 }, heading2: { color: colors.text, fontSize: 20 }, heading3: { color: colors.text, fontSize: 17 }, paragraph: { marginTop: 4, marginBottom: 10 }, code_inline: { color: colors.blue, backgroundColor: colors.code }, fence: { color: colors.text, backgroundColor: colors.code, padding: space.md }, link: { color: colors.accent }, blockquote: { borderLeftColor: colors.border, backgroundColor: colors.surface } }}>{page.text}</Markdown> : null}
      {busy && !page ? <ActivityIndicator color={colors.accent} /> : null}
      {next >= 0 ? <Button title={busy ? 'Loading…' : 'Load next page'} disabled={busy} onPress={() => void load(next, true)} /> : null}
      {page && next < 0 ? <Text style={[common.muted, { textAlign: 'center' }]}>End of file</Text> : null}
    </ScrollView>
  </SafeAreaView>;
}
