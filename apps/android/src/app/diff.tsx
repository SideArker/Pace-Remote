import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { FileChange, TextPage } from '@pace-remote/protocol';
import { Button, Card, Label } from '../components/ui/Primitives';
import { common, colors, space } from '../theme/tokens';
import { remoteClient } from '../services/remote/client';

export default function DiffScreen() {
  const { projectId = '', sessionId = '', editId = '' } = useLocalSearchParams<{ projectId: string; sessionId: string; editId: string }>();
  const [files, setFiles] = useState<FileChange[]>([]); const [path, setPath] = useState(''); const [page, setPage] = useState<TextPage>(); const [next, setNext] = useState(0); const [busy, setBusy] = useState(false);
  const filesFor = async () => {
    setBusy(true);
    try {
      const result = await remoteClient().call<'diff.list', { changes?: FileChange[] } | FileChange[]>('diff.list', { projectId, sessionId, editId });
      const items = Array.isArray(result) ? result : result.changes ?? []; setFiles(items);
      if (items[0]) setPath(items[0].path);
    } catch (error) { Alert.alert('Diff unavailable', error instanceof Error ? error.message : 'Could not read edit history.'); }
    finally { setBusy(false); }
  };
  const read = async (offset = 0, append = false) => {
    if (!path) return;
    setBusy(true);
    try {
      const result = await remoteClient().call<'diff.read', TextPage>('diff.read', { projectId, sessionId, editId, path, offset });
      setPage(old => append && old ? { ...result, text: `${old.text}\n${result.text}` } : result); setNext(result.nextOffset ?? -1);
    } catch (error) { Alert.alert('Diff unavailable', error instanceof Error ? error.message : 'Could not read diff.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { const timer = setTimeout(() => { void filesFor(); }, 0); return () => clearTimeout(timer); }, [projectId, sessionId, editId]);
  useEffect(() => { if (!path) return; const timer = setTimeout(() => { void read(); }, 0); return () => clearTimeout(timer); }, [path]);
  const change = (direction: 'undo' | 'redo') => Alert.alert(`${direction === 'undo' ? 'Undo' : 'Redo'} ${path}?`, 'Pace checks file contents for conflicts before restoring changes.', [{ text: 'Cancel', style: 'cancel' }, { text: direction === 'undo' ? 'Undo file' : 'Redo file', onPress: () => {
    void remoteClient().call('diff.change', { projectId, sessionId, editId, path, direction }).then(async () => { await filesFor(); await read(); }).catch(error => Alert.alert('Change refused', error instanceof Error ? error.message : 'Pace could not restore this file.'));
  } }]);
  return <SafeAreaView style={common.screen}>
    <View style={styles.header}><Button title="‹  Conversation" secondary onPress={() => router.back()} /><Text style={common.heading}>Turn diff</Text><Text style={common.muted}>Unified patch · undo and redo use Pace file history safeguards</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.files}>{files.map(file => <Pressable key={file.path} onPress={() => setPath(file.path)} style={[styles.file, file.path === path && styles.selected]}><Label color={file.undone ? colors.pending : colors.text}>{file.undone ? 'UNDONE' : 'CHANGED'}</Label><Text style={common.muted} numberOfLines={1}>{file.path}</Text></Pressable>)}</ScrollView>
    <View style={{ flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg }}><Button title="Undo file" secondary disabled={!path || busy || files.find(item => item.path === path)?.undone} onPress={() => change('undo')} /><Button title="Redo file" secondary disabled={!path || busy || !files.find(item => item.path === path)?.undone} onPress={() => change('redo')} /></View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: space.lg, gap: space.sm }}>
      {page?.text.split('\n').map((line, index) => <Text selectable key={`${index}-${line}`} style={[styles.diffLine, line.startsWith('+') && styles.added, line.startsWith('-') && styles.removed, line.startsWith('@@') && styles.hunk]}>{line || ' '}</Text>)}
      {files.length === 0 && !busy ? <Card><Text style={common.body}>No saved edits for this turn.</Text></Card> : null}
      {busy && !page ? <Text style={common.muted}>Loading diff…</Text> : null}
      {next >= 0 && page ? <Button title="Load more lines" disabled={busy} secondary onPress={() => void read(next, true)} /> : null}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ header: { padding: space.lg, gap: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border }, files: { padding: space.lg, gap: space.sm }, file: { width: 180, padding: space.md, backgroundColor: colors.surface, borderRadius: 10 }, selected: { borderWidth: 1, borderColor: colors.accent }, diffLine: { color: colors.muted, fontFamily: 'monospace', fontSize: 12, lineHeight: 18 }, added: { color: colors.success, backgroundColor: colors.successSurface }, removed: { color: colors.danger, backgroundColor: '#291B1B' }, hunk: { color: colors.blue, backgroundColor: colors.raised } });
