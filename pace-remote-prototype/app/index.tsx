import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bot, Check, Clock3, Code2,
  FileCode2, GitBranch, ListTodo, MessageSquareText, MoreHorizontal,
  Paperclip, Plus, ShieldCheck,
  Terminal, Wifi, X, Zap,
} from 'lucide-react-native';
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Throwaway UI study: three structures for the same Pace Remote session.
// Switch with ?variant=chat, ?variant=task, or ?variant=sections.

const C = {
  bg: '#0D0F10', surface: '#151819', raised: '#1B1F20', border: '#292E30',
  text: '#F0F2F1', muted: '#939B9D', dim: '#626A6C', accent: '#B6C8C4',
  green: '#9CBFA8', greenBg: '#1A2921', amber: '#D7B87A', amberBg: '#2A2419',
  red: '#D28C84', code: '#111415', blue: '#9CB5C9',
};

type Variant = 'chat' | 'task' | 'sections';
const variants: Variant[] = ['chat', 'task', 'sections'];
const variantNames: Record<Variant, string> = {
  chat: 'Rozmowa', task: 'Zadanie', sections: 'Sekcje',
};

function Label({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[s.label, style]}>{children}</Text>;
}

function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'amber' | 'green' }) {
  const toneStyle = tone === 'amber' ? s.tagAmber : tone === 'green' ? s.tagGreen : s.tagNeutral;
  return <View style={[s.tag, toneStyle]}><Text style={s.tagText}>{children}</Text></View>;
}

function TopBar({ compact = false }: { compact?: boolean }) {
  return (
    <View style={s.topBar}>
      <View style={s.brandMark}><Zap size={15} color={C.bg} fill={C.bg} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.brand}>pace <Text style={s.brandRemote}>remote</Text></Text>
        {!compact && <Text style={s.connection}><Wifi size={10} color={C.green} />  POŁĄCZONO Z MACBOOK-PRO</Text>}
      </View>
      <Pressable style={s.iconButton}><MoreHorizontal size={20} color={C.muted} /></Pressable>
    </View>
  );
}

function SessionHeading({ eyebrow = 'AKTYWNA SESJA' }: { eyebrow?: string }) {
  return (
    <View style={s.sessionHeading}>
      <View style={s.sessionTitleRow}>
        <Text style={s.title}>Checkout retries</Text>
        <Tag tone="green">działa</Tag>
      </View>
      <View style={s.metaRow}>
        <GitBranch size={13} color={C.muted} />
        <Text style={s.metaText}>feat/retry-policy</Text>
        <Text style={s.metaDot}>·</Text>
        <Text style={s.metaText}>pace-web</Text>
      </View>
      <Label style={s.eyebrow}>{eyebrow}</Label>
    </View>
  );
}

function UserBubble() {
  return (
    <View style={s.userMessage}>
      <Text style={s.body}>Add exponential backoff to the checkout retry flow. Keep the maximum delay under 30 seconds.</Text>
      <Text style={s.time}>YOU · 10:42</Text>
    </View>
  );
}

function AgentMessage() {
  return (
    <View style={s.agentBlock}>
      <View style={s.agentIdentity}>
        <View style={s.agentMark}><Bot size={14} color={C.accent} /></View>
        <Text style={s.agentName}>Pace</Text><Text style={s.time}>10:43</Text>
      </View>
      <Text style={s.body}>I’ll update the retry delay with exponential backoff and cap it at 30 seconds. I found the retry loop in <Text style={s.inlineCode}>checkout.ts</Text>.</Text>
      <View style={s.toolLine}><Terminal size={13} color={C.dim} /><Text style={s.toolText}>Read checkout.ts</Text><Check size={13} color={C.green} /></View>
    </View>
  );
}

function ApprovalCard({ onApprove, approved }: { onApprove: () => void; approved: boolean }) {
  return (
    <View style={s.approvalCard}>
      <View style={s.approvalTop}>
        <View style={s.approvalIcon}><ShieldCheck size={16} color={C.amber} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.approvalTitle}>{approved ? 'Działanie zatwierdzone' : 'Wymaga zatwierdzenia'}</Text>
          <Text style={s.approvalSub}>Pace chce zmienić plik</Text>
        </View>
        <Tag tone={approved ? 'green' : 'amber'}>{approved ? 'OK' : '1 plik'}</Tag>
      </View>
      <View style={s.fileRow}><FileCode2 size={14} color={C.muted} /><Text style={s.fileName}>src/checkout.ts</Text><Text style={s.diffCount}><Text style={{ color: C.green }}>+8</Text> <Text style={{ color: C.red }}>−3</Text></Text></View>
      <Text style={s.approvalDescription}>Zmiana logiki ponawiania płatności. Maksymalne opóźnienie: 28 s.</Text>
      {!approved && <View style={s.actionRow}>
        <Pressable style={s.secondaryButton}><X size={14} color={C.muted} /><Text style={s.secondaryButtonText}>Odrzuć</Text></Pressable>
        <Pressable style={s.primaryButton} onPress={onApprove}><Check size={15} color={C.bg} /><Text style={s.primaryButtonText}>Zatwierdź</Text></Pressable>
      </View>}
    </View>
  );
}

function Composer() {
  return (
    <View style={s.composer}>
      <TextInput placeholder="Napisz do Pace…" placeholderTextColor={C.dim} style={s.composerInput} />
      <View style={s.composerActions}>
        <Pressable style={s.smallIcon}><Plus size={18} color={C.muted} /></Pressable>
        <Pressable style={s.smallIcon}><Paperclip size={16} color={C.muted} /></Pressable>
        <View style={{ flex: 1 }} />
        <Pressable style={s.sendButton}><ArrowUp size={16} color={C.bg} /></Pressable>
      </View>
    </View>
  );
}

function ChatFirst({ approved, onApprove }: { approved: boolean; onApprove: () => void }) {
  return <>
    <TopBar />
    <SessionHeading />
    <View style={s.chatTimeline}>
      <UserBubble />
      <AgentMessage />
      <ApprovalCard approved={approved} onApprove={onApprove} />
      <View style={s.pendingLine}><Clock3 size={13} color={C.amber} /><Text style={s.pendingText}>Pace czeka na Twoją decyzję</Text></View>
    </View>
    <Composer />
  </>;
}

function PlanRow({ n, title, done, active = false }: { n: string; title: string; done?: boolean; active?: boolean }) {
  return <View style={s.planRow}>
    <View style={[s.stepCircle, done && s.stepDone, active && s.stepActive]}>
      {done ? <Check size={12} color={C.bg} /> : <Text style={[s.stepNumber, active && { color: C.amber }]}>{n}</Text>}
    </View>
    <Text style={[s.planText, done && s.planDone, active && s.planActive]}>{title}</Text>
    {active && <Tag tone="amber">teraz</Tag>}
  </View>;
}

function TaskFirst({ approved, onApprove }: { approved: boolean; onApprove: () => void }) {
  return <>
    <TopBar compact />
    <View style={s.taskHeader}><SessionHeading eyebrow="ZADANIE · 4 KROKI" /></View>
    <View style={s.taskStats}>
      <View style={s.stat}><Text style={s.statValue}>2/4</Text><Text style={s.statLabel}>KROKI</Text></View>
      <View style={s.statDivider} />
      <View style={s.stat}><Text style={s.statValue}>1</Text><Text style={s.statLabel}>DECYZJA</Text></View>
      <View style={s.statDivider} />
      <View style={s.stat}><Text style={s.statValue}>~2m</Text><Text style={s.statLabel}>CZAS</Text></View>
    </View>
    <View style={s.sectionHeading}><Label>PLAN PACE</Label><Pressable style={s.inlineAction}><Text style={s.inlineActionText}>Otwórz plan</Text><ArrowRight size={13} color={C.accent} /></Pressable></View>
    <View style={s.planCard}>
      <PlanRow n="1" title="Locate checkout retry logic" done />
      <PlanRow n="2" title="Add capped exponential backoff" done />
      <PlanRow n="3" title="Update unit tests" active />
      <PlanRow n="4" title="Run checkout test suite" />
    </View>
    <View style={s.sectionHeading}><Label>DECYZJA DO CIEBIE</Label><Clock3 size={13} color={C.amber} /></View>
    <ApprovalCard approved={approved} onApprove={onApprove} />
    <View style={s.lastMessage}>
      <View style={s.agentMark}><Bot size={14} color={C.accent} /></View>
      <Text style={s.lastMessageText}>Zmieniłem retry delay. Zatwierdź diff, a potem zaktualizuję testy.</Text>
    </View>
  </>;
}

function DiffPreview() {
  return <View style={s.diffCard}>
    <View style={s.diffHeader}><Code2 size={14} color={C.muted} /><Text style={s.fileName}>src/checkout.ts</Text><Text style={s.diffCount}><Text style={{ color: C.green }}>+4</Text> <Text style={{ color: C.red }}>−2</Text></Text></View>
    <View style={s.codeRows}>
      <Text style={s.codeLine}><Text style={s.lineNo}>18 </Text> const delay = baseDelay * 2 ** attempt;</Text>
      <Text style={[s.codeLine, s.codeRemoved]}><Text style={s.lineNo}>19 </Text>- await sleep(delay);</Text>
      <Text style={[s.codeLine, s.codeAdded]}><Text style={s.lineNo}>19 </Text>+ await sleep(Math.min(delay, 28_000));</Text>
      <Text style={s.codeLine}><Text style={s.lineNo}>20 </Text> return retryRequest();</Text>
    </View>
    <View style={s.diffFooter}><Text style={s.diffFooterText}>Podgląd · 1 z 1 pliku</Text><ArrowDown size={13} color={C.muted} /></View>
  </View>;
}

function Sections({ approved, onApprove }: { approved: boolean; onApprove: () => void }) {
  const [tab, setTab] = useState<'Rozmowa' | 'Plan' | 'Diff'>('Rozmowa');
  return <>
    <TopBar />
    <View style={s.sectionHeader}><SessionHeading eyebrow="PACE-WEB · SESJA 08:41" /></View>
    <View style={s.segmented}>
      {(['Rozmowa', 'Plan', 'Diff'] as const).map((name) => {
        const Icon = name === 'Rozmowa' ? MessageSquareText : name === 'Plan' ? ListTodo : Code2;
        return <Pressable key={name} onPress={() => setTab(name)} style={[s.segment, tab === name && s.segmentActive]}>
          <Icon size={14} color={tab === name ? C.text : C.muted} /><Text style={[s.segmentText, tab === name && s.segmentTextActive]}>{name}</Text>
          {name === 'Diff' && <View style={s.segmentDot} />}
        </Pressable>;
      })}
    </View>
    {tab === 'Rozmowa' && <View style={s.sectionContent}>
      <View style={s.compactUser}><Text style={s.body}>Add exponential backoff to the checkout retry flow.</Text><Text style={s.time}>10:42</Text></View>
      <AgentMessage />
      <View style={s.approvalCompact}><View style={s.approvalTop}><ShieldCheck size={16} color={C.amber} /><Text style={[s.approvalTitle, { flex: 1 }]}>{approved ? 'Zmiana zatwierdzona' : 'Zatwierdź zmianę'}</Text><Tag tone={approved ? 'green' : 'amber'}>{approved ? 'OK' : '1 plik'}</Tag></View><Text style={s.approvalDescription}>src/checkout.ts · <Text style={{ color: C.green }}>+8</Text> <Text style={{ color: C.red }}>−3</Text></Text>{!approved && <Pressable onPress={onApprove} style={[s.primaryButton, { alignSelf: 'flex-start', marginTop: 10 }]}><Check size={14} color={C.bg} /><Text style={s.primaryButtonText}>Zatwierdź</Text></Pressable>}</View>
      <DiffPreview />
    </View>}
    {tab === 'Plan' && <View style={s.sectionContent}><Text style={s.panelTitle}>Dodaj exponential backoff</Text><Text style={[s.mutedCopy, { marginTop: 5, marginBottom: 18 }]}>4 kroki · Ostatnia aktualizacja 10:43</Text><View style={s.planCard}><PlanRow n="1" title="Locate checkout retry logic" done /><PlanRow n="2" title="Add capped exponential backoff" done /><PlanRow n="3" title="Update unit tests" active /><PlanRow n="4" title="Run checkout test suite" /></View><AgentMessage /></View>}
    {tab === 'Diff' && <View style={s.sectionContent}><View style={s.diffSummary}><Text style={s.panelTitle}>Zmiany w sesji</Text><Tag tone="green">1 plik</Tag></View><Text style={s.mutedCopy}>Zmiana logiki ponawiania płatności. Maksymalne opóźnienie: 28 s.</Text><DiffPreview /><ApprovalCard approved={approved} onApprove={onApprove} /></View>}
    <View style={s.composerMini}><Text style={s.composerMiniText}>Wiadomość do Pace…</Text><Pressable style={s.sendButton}><ArrowUp size={16} color={C.bg} /></Pressable></View>
  </>;
}

function PrototypeSwitcher({ current, onChange }: { current: Variant; onChange: (v: Variant) => void }) {
  const idx = variants.indexOf(current);
  return <View style={s.switcher}>
    <Pressable accessibilityLabel="Poprzedni wariant" onPress={() => onChange(variants[(idx + variants.length - 1) % variants.length])} style={s.switchArrow}><ArrowLeft size={15} color={C.text} /></Pressable>
    <View style={s.switchLabel}><Text style={s.switchEyebrow}>PROTOTYP UI</Text><Text style={s.switchName}>{idx + 1} / 3 · {variantNames[current]}</Text></View>
    <Pressable accessibilityLabel="Następny wariant" onPress={() => onChange(variants[(idx + 1) % variants.length])} style={s.switchArrow}><ArrowRight size={15} color={C.text} /></Pressable>
  </View>;
}

export default function PrototypeScreen() {
  const params = useLocalSearchParams<{ variant?: string }>();
  const routeVariant = variants.includes(params.variant as Variant) ? params.variant as Variant : 'chat';
  const [approved, setApproved] = useState(false);
  const changeVariant = (variant: Variant) => router.setParams({ variant });

  return <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
      {routeVariant === 'chat' && <ChatFirst approved={approved} onApprove={() => setApproved(true)} />}
      {routeVariant === 'task' && <TaskFirst approved={approved} onApprove={() => setApproved(true)} />}
      {routeVariant === 'sections' && <Sections approved={approved} onApprove={() => setApproved(true)} />}
      <View style={{ height: 92 }} />
    </ScrollView>
    <PrototypeSwitcher current={routeVariant} onChange={changeVariant} />
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, scrollContent: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12 },
  topBar: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 23 },
  brandMark: { width: 29, height: 29, borderRadius: 9, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  brand: { color: C.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.5 }, brandRemote: { color: C.muted, fontWeight: '400' },
  connection: { color: C.muted, fontSize: 8, letterSpacing: 1.1, marginTop: 3 }, iconButton: { padding: 5 },
  sessionHeading: { marginBottom: 18 }, sessionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { color: C.text, fontSize: 23, fontWeight: '600', letterSpacing: -0.6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 }, metaText: { color: C.muted, fontSize: 12 }, metaDot: { color: C.dim, fontSize: 13 },
  eyebrow: { marginTop: 19 }, label: { color: C.dim, fontSize: 10, fontWeight: '700', letterSpacing: 1.3 },
  tag: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 }, tagText: { color: C.muted, fontSize: 10, fontWeight: '600' },
  tagNeutral: { backgroundColor: C.raised }, tagAmber: { backgroundColor: C.amberBg }, tagGreen: { backgroundColor: C.greenBg },
  body: { color: '#D5D9D8', fontSize: 14, lineHeight: 21 }, time: { color: C.dim, fontSize: 10, letterSpacing: 0.35 },
  chatTimeline: { gap: 18 }, userMessage: { alignSelf: 'flex-end', maxWidth: '88%', backgroundColor: C.raised, borderRadius: 17, borderTopRightRadius: 5, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, gap: 8 },
  agentBlock: { gap: 9 }, agentIdentity: { flexDirection: 'row', alignItems: 'center', gap: 7 }, agentMark: { width: 25, height: 25, backgroundColor: '#242B2B', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, agentName: { color: C.text, fontSize: 12, fontWeight: '600', flex: 1 },
  inlineCode: { color: C.accent, backgroundColor: C.raised, fontFamily: 'monospace', fontSize: 12 }, toolLine: { flexDirection: 'row', gap: 7, alignItems: 'center', paddingVertical: 4 }, toolText: { color: C.muted, fontSize: 11, flex: 1 },
  approvalCard: { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: 15, padding: 14, gap: 11 }, approvalTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  approvalIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.amberBg, alignItems: 'center', justifyContent: 'center' }, approvalTitle: { color: C.text, fontWeight: '600', fontSize: 13 }, approvalSub: { color: C.muted, fontSize: 11, marginTop: 3 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, borderTopColor: C.border, borderTopWidth: 1, borderBottomColor: C.border, borderBottomWidth: 1 }, fileName: { color: '#D5D9D8', fontSize: 11, fontFamily: 'monospace', flex: 1 }, diffCount: { color: C.muted, fontFamily: 'monospace', fontSize: 11 },
  approvalDescription: { color: C.muted, fontSize: 11, lineHeight: 16 }, actionRow: { flexDirection: 'row', gap: 8 }, secondaryButton: { borderRadius: 9, backgroundColor: C.raised, paddingHorizontal: 12, height: 37, flexDirection: 'row', alignItems: 'center', gap: 6 }, secondaryButtonText: { color: C.muted, fontSize: 12, fontWeight: '600' },
  primaryButton: { borderRadius: 9, backgroundColor: C.accent, paddingHorizontal: 13, height: 37, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, primaryButtonText: { color: C.bg, fontSize: 12, fontWeight: '700' },
  pendingLine: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: -5 }, pendingText: { color: C.amber, fontSize: 11 },
  composer: { marginTop: 21, backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 }, composerInput: { height: 40, color: C.text, fontSize: 13 }, composerActions: { flexDirection: 'row', alignItems: 'center', gap: 9 }, smallIcon: { padding: 4 }, sendButton: { width: 31, height: 31, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  taskHeader: { marginTop: 1 }, taskStats: { flexDirection: 'row', borderWidth: 1, borderColor: C.border, borderRadius: 13, backgroundColor: C.surface, paddingVertical: 13, marginBottom: 21, justifyContent: 'space-around', alignItems: 'center' }, stat: { alignItems: 'center', gap: 4 }, statValue: { color: C.text, fontSize: 16, fontWeight: '600' }, statLabel: { color: C.dim, fontSize: 8, letterSpacing: 1 }, statDivider: { width: 1, height: 27, backgroundColor: C.border },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 2 }, inlineAction: { flexDirection: 'row', gap: 4, alignItems: 'center' }, inlineActionText: { color: C.accent, fontSize: 11 },
  planCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 5, marginBottom: 19 }, planRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 }, stepCircle: { width: 21, height: 21, borderRadius: 11, borderColor: C.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, stepDone: { backgroundColor: C.green, borderColor: C.green }, stepActive: { borderColor: C.amber }, stepNumber: { color: C.dim, fontSize: 10 }, planText: { flex: 1, color: '#CDD2D0', fontSize: 12 }, planDone: { color: C.muted }, planActive: { color: C.text, fontWeight: '600' },
  lastMessage: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 16, marginBottom: 12 }, lastMessageText: { color: C.muted, fontSize: 12, lineHeight: 18, flex: 1, paddingTop: 4 },
  sectionHeader: { marginBottom: 5 }, segmented: { flexDirection: 'row', backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 4, marginBottom: 18 }, segment: { flex: 1, height: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 9 }, segmentActive: { backgroundColor: C.raised }, segmentText: { color: C.muted, fontSize: 11 }, segmentTextActive: { color: C.text, fontWeight: '600' }, segmentDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.amber }, sectionContent: { gap: 16 }, compactUser: { borderLeftColor: C.border, borderLeftWidth: 2, paddingLeft: 12, gap: 6 },
  approvalCompact: { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: 13, padding: 13 }, diffCard: { backgroundColor: C.code, borderRadius: 12, overflow: 'hidden', borderColor: C.border, borderWidth: 1 }, diffHeader: { height: 39, flexDirection: 'row', gap: 7, alignItems: 'center', paddingHorizontal: 11, borderBottomColor: C.border, borderBottomWidth: 1 }, codeRows: { paddingVertical: 8 }, codeLine: { color: '#BBC2C0', fontSize: 10, lineHeight: 19, fontFamily: 'monospace', paddingHorizontal: 8 }, lineNo: { color: C.dim }, codeRemoved: { backgroundColor: '#301E1D', color: '#D29B94' }, codeAdded: { backgroundColor: '#1C2B22', color: '#A6C8AF' }, diffFooter: { height: 31, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 11, borderTopWidth: 1, borderTopColor: C.border }, diffFooterText: { color: C.dim, fontSize: 10 },
  panelTitle: { color: C.text, fontSize: 17, fontWeight: '600' }, mutedCopy: { color: C.muted, fontSize: 12, lineHeight: 18 }, diffSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  composerMini: { marginTop: 20, height: 48, flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: 13, paddingLeft: 13, paddingRight: 8 }, composerMiniText: { color: C.dim, fontSize: 12, flex: 1 },
  switcher: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: '#252A2B', borderColor: '#3A4142', borderWidth: 1, borderRadius: 17, padding: 5, gap: 4, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 }, switchArrow: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, switchLabel: { alignItems: 'center', minWidth: 105, paddingHorizontal: 5 }, switchEyebrow: { color: C.dim, fontSize: 8, fontWeight: '700', letterSpacing: 1.1 }, switchName: { color: C.text, fontSize: 11, fontWeight: '600', marginTop: 2 },
});
