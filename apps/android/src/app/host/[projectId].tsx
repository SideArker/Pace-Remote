import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@pace-remote/protocol';
import { Button, Card, Label } from '../../components/ui/Primitives';
import { common, colors } from '../../theme/tokens';
import { remoteClient, loadConnection } from '../../services/remote/client';

export default function ConversationsScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [status, setStatus] = useState('Loading saved conversations…');
  const refresh = useCallback(async () => {
    try {
      const connection = await loadConnection(); if (!connection) { router.replace('/'); return; }
      const client = remoteClient(); await client.connect(connection);
      const response = await client.call<'sessions.list', { sessions?: Session[] } | Session[]>('sessions.list', { projectId });
      const items = Array.isArray(response) ? response : response.sessions ?? [];
      setSessions(items); setStatus(`${items.length} saved conversations`);
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Host unavailable.'); }
  }, [projectId]);
  useEffect(() => { const timer = setTimeout(() => { void refresh(); }, 0); return () => clearTimeout(timer); }, [refresh]);
  const open = (session: Session) => router.push({ pathname: '/conversation/[projectId]/[sessionId]', params: { projectId, sessionId: session.id } });
  const create = async () => {
    try {
      const session = await remoteClient().call<'sessions.create', { id: string }>('sessions.create', { projectId, kind: 'normal' });
      open(session as Session);
    } catch (error) { Alert.alert('Could not start conversation', error instanceof Error ? error.message : 'Host unavailable.'); }
  };
  return <SafeAreaView style={common.screen}><ScrollView contentContainerStyle={common.content}>
    <Pressable onPress={() => router.back()}><Text style={{ color: colors.muted }}>‹  Projects</Text></Pressable>
    <Text style={common.title}>Conversations</Text><Text style={common.muted}>{status}</Text>
    <Button title="New conversation" onPress={() => void create()} /><Button title="Refresh" secondary onPress={() => void refresh()} />
    {sessions.map(session => <Pressable key={session.id} onPress={() => open(session)}><Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Label color={session.kind === 'planning' ? colors.blue : colors.success}>{session.kind === 'planning' ? 'PLAN' : 'PACE SESSION'}</Label><Text style={common.muted}>{new Date(session.updatedAt).toLocaleDateString()}</Text></View>
      <Text style={common.heading}>{session.title || session.turns?.at(-1)?.displayPrompt || session.turns?.at(-1)?.prompt || 'Empty conversation'}</Text>
      <Text style={common.muted} numberOfLines={2}>{session.turns?.at(-1)?.result || 'No completed turns'}</Text>
      <Text style={common.muted}>{session.turns?.length ?? 0} turns  ·  {session.routingMode} routing</Text>
    </Card></Pressable>)}
    {!sessions.length && <Card><Text style={common.body}>No saved conversations for this project yet.</Text></Card>}
  </ScrollView></SafeAreaView>;
}
