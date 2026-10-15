import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { randomUUID } from 'expo-crypto';
import type { PendingInteraction, Snapshot, Turn } from '@pace-remote/protocol';
import { Button, Card, Label } from '../../../components/ui/Primitives';
import { readDraft, saveDraft } from '../../../db';
import { useSnapshot } from '../../../features/conversations/hooks';
import { remoteClient } from '../../../services/remote/client';
import { common, colors, radius, space } from '../../../theme/tokens';

export default function ConversationScreen() {
  const { projectId, sessionId } = useLocalSearchParams<{ projectId: string; sessionId: string }>();
  const { snapshot, loading, error, refresh } = useSnapshot(projectId, sessionId);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [otherQuestion, setOtherQuestion] = useState<{ interaction: PendingInteraction; questionId: string; header: string; question: string }>();
  const [otherAnswer, setOtherAnswer] = useState('');
  const scroll = useRef<ScrollView>(null);
  useEffect(() => { let active = true; void readDraft(projectId, sessionId).then(value => { if (active) setDraft(value); }); return () => { active = false; }; }, [projectId, sessionId]);
  useEffect(() => { const timer = setTimeout(() => { void saveDraft(projectId, sessionId, draft); }, 200); return () => clearTimeout(timer); }, [draft, projectId, sessionId]);
  const send = async (intent?: 'verify_plan' | 'execute_plan') => {
    const prompt = draft.trim(); if (!prompt || sending) return;
    const key = randomUUID(); setSending(true);
    try {
      await remoteClient().call('prompts.send', { projectId, sessionId, prompt, key });
      setDraft(''); void saveDraft(projectId, sessionId, ''); await refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not send prompt.';
      if (message.includes('unknown') || message.includes('timeout')) Alert.alert('Check conversation state first', 'The host may have accepted this prompt. Refresh before deciding whether to resend.');
      else Alert.alert('Could not send prompt', message);
    } finally { setSending(false); }
  };
  const quick = async (method: 'turn.cancel' | 'routing.set' | 'plan.run', params: Record<string, unknown>) => {
    try { await remoteClient().call(method as 'turn.cancel', params as never); await refresh(); }
    catch (cause) { Alert.alert('Action failed', cause instanceof Error ? cause.message : 'Host unavailable.'); }
  };
  const answer = async (interaction: PendingInteraction, decision: 'accept' | 'decline') => {
    try { await remoteClient().call('interaction.answer', { projectId, sessionId, interactionId: interaction.id, decision }); await refresh(); }
    catch (cause) { Alert.alert('Decision not sent', cause instanceof Error ? cause.message : 'Reconnect and refresh.'); }
  };
  const submitAnswer = async (interaction: PendingInteraction, answers: Record<string, { answers: string[] }>) => {
    try { await remoteClient().call('interaction.answer', { projectId, sessionId, interactionId: interaction.id, answers }); await refresh(); }
    catch (cause) { Alert.alert('Answer not sent', cause instanceof Error ? cause.message : 'Refresh and try again.'); }
  };
  const answerQuestion = async (interaction: PendingInteraction) => {
    const question = interaction.questions?.[0]; if (!question) return;
    Alert.alert(question.header, question.question, [...question.options.slice(0, 2).map(option => ({ text: option.label, onPress: () => void submitAnswer(interaction, { [question.id]: { answers: [option.label] } }) })), ...(question.isOther ? [{ text: 'Write a reply', onPress: () => { setOtherQuestion({ interaction, questionId: question.id, header: question.header, question: question.question }); setOtherAnswer(''); } }] : []), { text: 'More options', onPress: () => setOtherQuestion({ interaction, questionId: question.id, header: question.header, question: question.question }) }, { text: 'Cancel', style: 'cancel' }]);
  };
  const actionLink = (name: string, href: string, params: Record<string, string>) => router.push({ pathname: href as never, params: { ...params, projectId, sessionId, name } } as never);
  const body = (state?: Snapshot) => <>
    {state?.active && <Card style={styles.active}><Label color={colors.pending}>PACE IS WORKING</Label><Text style={common.body}>{state.active.prompt}</Text><Text style={common.muted}>{state.active.status}</Text>{state.active.activities.slice(-4).map((activity, i) => <Text key={`${i}-${activity}`} style={common.muted}>· {activity}</Text>)}<Button title="Stop turn" secondary onPress={() => void quick('turn.cancel', { projectId, sessionId })} /></Card>}
    {state?.interactions.map(interaction => <Card key={interaction.id} style={styles.approval}>
      <Label color={colors.pending}>{interaction.kind === 'approval' ? 'APPROVAL REQUIRED' : 'PACE HAS A QUESTION'}</Label>
      {interaction.command && <Text selectable style={styles.command}>{interaction.command}</Text>}
      {interaction.cwd && <Text selectable style={common.muted}>in {interaction.cwd}</Text>}
      {interaction.reason && <Text style={common.body}>{interaction.reason}</Text>}
      {interaction.questions?.map(question => <View key={question.id} style={styles.question}><Text style={common.body}>{question.header}: {question.question}</Text>{question.options.map(option => <Button key={option.label} title={option.label} secondary onPress={() => void submitAnswer(interaction, { [question.id]: { answers: [option.label] } })} />)}{question.isOther && <Button title="Write another answer" secondary onPress={() => { setOtherQuestion({ interaction, questionId: question.id, header: question.header, question: question.question }); setOtherAnswer(''); }} />}</View>)}
      {interaction.kind === 'approval' ? <View style={styles.actions}><Button title="Decline" secondary onPress={() => void answer(interaction, 'decline')} /><Button title="Approve once" onPress={() => void answer(interaction, 'accept')} /></View> : <Button title="Answer question" onPress={() => void answerQuestion(interaction)} />}
    </Card>)}
    {(state?.session.turns ?? []).map((turn, index) => <TurnCard key={`${turn.at}-${index}`} turn={turn} index={index} projectId={projectId} sessionId={sessionId} onOpen={(name, href, params) => actionLink(name, href, params)} />)}
    {!state?.session.turns.length && !state?.active && <Card><Text style={common.body}>Start this conversation with a prompt.</Text></Card>}
  </>;
  return <SafeAreaView style={common.screen} edges={['top', 'left', 'right']}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={12}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={{ color: colors.muted }}>‹</Text></Pressable>
        <View style={{ flex: 1 }}><Text style={common.heading} numberOfLines={1}>{snapshot?.session.title || snapshot?.session.projectPath.split('/').pop() || 'Conversation'}</Text><Text style={common.muted}>{error || (snapshot?.active ? 'Working' : snapshot ? `${snapshot.session.routingMode} · ${snapshot.approvalMode}` : loading ? 'Connecting…' : 'Disconnected')}</Text></View>
        <Pressable onPress={() => router.push(`/host/${projectId}`)}><Text style={{ color: colors.muted }}>List</Text></Pressable>
      </View>
      <View style={styles.toolbar}><Pressable onPress={() => router.push(`/reader?projectId=${projectId}&sessionId=${sessionId}`)}><Text style={styles.tool}>Plan / files</Text></Pressable><Pressable onPress={() => router.push(`/diff?projectId=${projectId}&sessionId=${sessionId}`)}><Text style={styles.tool}>Diff</Text></Pressable><Pressable onPress={() => void quick('plan.run', { projectId, sessionId, action: 'verify', key: randomUUID() })}><Text style={styles.tool}>Verify</Text></Pressable><Pressable onPress={() => void quick('plan.run', { projectId, sessionId, action: 'execute', key: randomUUID() })}><Text style={styles.tool}>Execute</Text></Pressable></View>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={styles.timeline} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        {body(snapshot)}
      </ScrollView>
      <View style={styles.composer}><TextInput value={draft} onChangeText={setDraft} style={styles.input} placeholder={snapshot?.active ? 'Message queues behind this turn' : 'Write a prompt for Pace…'} placeholderTextColor={colors.subtle} multiline maxLength={32000} returnKeyType="default" /><View style={styles.composerActions}><Text style={common.muted}>{snapshot?.session.routingMode || 'offline'} · {snapshot?.session.route.model || 'auto'}</Text><Button title={sending ? 'Sending…' : snapshot?.active ? 'Queue prompt' : 'Send prompt'} disabled={sending || !draft.trim()} onPress={() => void send()} /></View></View>
    </KeyboardAvoidingView>
    <Modal transparent visible={!!otherQuestion} animationType="fade" onRequestClose={() => setOtherQuestion(undefined)}><View style={styles.modalShade}><View style={styles.modalCard}><Text style={common.heading}>{otherQuestion?.header}</Text><Text style={common.body}>{otherQuestion?.question}</Text><TextInput autoFocus value={otherAnswer} onChangeText={setOtherAnswer} style={styles.input} multiline placeholder="Your answer" placeholderTextColor={colors.subtle} /><View style={styles.actions}><Button title="Cancel" secondary onPress={() => setOtherQuestion(undefined)} /><Button title="Submit" disabled={!otherAnswer.trim()} onPress={() => { const q = otherQuestion; if (!q) return; setOtherQuestion(undefined); void submitAnswer(q.interaction, { [q.questionId]: { answers: [otherAnswer.trim()] } }); }} /></View></View></View></Modal>
  </SafeAreaView>;
}
function TurnCard({ turn, index, projectId, sessionId, onOpen }: { turn: Turn; index: number; projectId: string; sessionId: string; onOpen: (name: string, href: string, params: Record<string, string>) => void }) {
  return <View style={styles.turn}>
    <View style={styles.you}><Label color={colors.accent}>YOU</Label><Text selectable style={common.body}>{turn.displayPrompt || turn.prompt}</Text></View>
    <Card><View style={styles.agent}><Label color={turn.failed ? colors.danger : colors.success}>PACE</Label><Text style={common.muted}>TURN {index + 1}</Text></View><Text selectable style={common.body}>{turn.result}</Text>
      {!!turn.route?.model && <Text style={common.muted}>{turn.route.model}{turn.route.effort ? ` · ${turn.route.effort}` : ''}{turn.durationMs ? ` · ${(turn.durationMs / 1000).toFixed(0)}s` : ''}</Text>}
      {turn.fileEdits && turn.fileEdits !== 'none' && <Pressable onPress={() => onOpen(`Turn ${index + 1}`, '/diff', { projectId, sessionId, editId: turn.fileEdits! })}><Text style={styles.link}>Review {turn.fileEdits ? 'file changes' : 'turn diff'}</Text></Pressable>}
      {(turn.artifacts ?? []).map(path => <Pressable key={path} onPress={() => onOpen(path, '/reader', { projectId, sessionId, path })}><Text style={styles.link}>Read {path.split('/').pop()}</Text></Pressable>)}
    </Card>
  </View>;
}
const styles = StyleSheet.create({
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  tool: { color: colors.accent, fontSize: 12, fontWeight: '600' }, timeline: { padding: space.lg, gap: space.md, paddingBottom: space.xl },
  active: { borderColor: colors.pending }, approval: { borderColor: colors.pending, backgroundColor: colors.pendingSurface }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },
  command: { color: colors.text, backgroundColor: colors.code, padding: space.md, borderRadius: radius.sm, fontFamily: Platform.select({ android: 'monospace', default: 'monospace' }) },
  turn: { gap: space.sm }, you: { alignSelf: 'flex-end', maxWidth: '92%', backgroundColor: colors.raised, borderRadius: radius.md, padding: space.md, gap: space.xs }, agent: { flexDirection: 'row', justifyContent: 'space-between' }, link: { color: colors.accent, fontWeight: '600', paddingVertical: space.xs }, question: { gap: space.sm }, modalShade: { flex: 1, justifyContent: 'center', padding: space.xl, backgroundColor: '#000000aa' }, modalCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.md },
  composer: { paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.sm, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border }, input: { maxHeight: 140, minHeight: 48, color: colors.text, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.md, fontSize: 15, textAlignVertical: 'top' }, composerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
