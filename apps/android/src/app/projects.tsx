import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Project } from '@pace-remote/protocol';
import { Button, Card, Label } from '../components/ui/Primitives';
import { readProjects, saveProjects } from '../db';
import { loadConnection, remoteClient, forgetConnection } from '../services/remote/client';
import { common, colors, space } from '../theme/tokens';

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState('Connecting to host…');
  const refresh = useCallback(async () => {
    try {
      const connection = await loadConnection();
      if (!connection) { router.replace('/'); return; }
      const client = remoteClient(); await client.connect(connection);
      const response = await client.call<'projects.list', { projects?: Project[] } | Project[]>('projects.list', {});
      const items = Array.isArray(response) ? response : response.projects ?? [];
      setProjects(items); await saveProjects(items); setStatus('Connected to Pace host');
    } catch (error) { const cached = await readProjects(); setProjects(cached); setStatus(error instanceof Error ? error.message : 'Host unavailable. Cached projects shown.'); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => { void refresh(); }, 0); return () => clearTimeout(timer); }, [refresh]);
  const newSession = async (project: Project) => {
    try {
      const session = await remoteClient().call<'sessions.create', { id: string }>('sessions.create', { projectId: project.id, kind: 'normal' });
      router.push({ pathname: '/conversation/[projectId]/[sessionId]', params: { projectId: project.id, sessionId: session.id } });
    } catch (error) { Alert.alert('Could not create conversation', error instanceof Error ? error.message : 'Host unavailable.'); }
  };
  return <SafeAreaView style={common.screen}><ScrollView contentContainerStyle={common.content}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View><Text style={common.title}>Projects</Text><Text style={common.muted}>{status}</Text></View><Pressable onPress={() => router.replace('/')}><Text style={{ color: colors.muted }}>Host</Text></Pressable></View>
    <Button title="Refresh projects" secondary onPress={() => void refresh()} />
    {projects.length === 0 ? <Card><Label>NO SAVED PROJECTS</Label><Text style={common.body}>Start a Pace conversation on the computer. The remote host only exposes saved Pace project entries.</Text></Card> : projects.map(project => <Card key={project.id}>
      <Label color={project.exists ? colors.success : colors.pending}>{project.exists ? 'AVAILABLE' : 'PROJECT MISSING'}</Label>
      <Text style={common.body} selectable>{project.path}</Text>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button title="Open conversations" onPress={() => router.push(`/host/${project.id}`)} />
        <Button title="New" secondary onPress={() => void newSession(project)} />
      </View>
    </Card>)}
    <Button title="Forget this host" secondary onPress={() => Alert.alert('Forget host?', 'This removes the saved host pin from this phone.', [{ text: 'Cancel' }, { text: 'Forget', style: 'destructive', onPress: () => { void forgetConnection().then(() => router.replace('/')); } }])} />
  </ScrollView></SafeAreaView>;
}
