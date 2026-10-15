import { StyleSheet } from 'react-native';

export const colors = {
  background: '#0D0F10', surface: '#151819', raised: '#1B1F20', border: '#292E30',
  text: '#F0F2F1', muted: '#939B9D', subtle: '#626A6C', accent: '#B6C8C4',
  success: '#9CBFA8', successSurface: '#1A2921', pending: '#D7B87A', pendingSurface: '#2A2419',
  danger: '#D28C84', code: '#111415', blue: '#9CB5C9',
} as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;
export const textSize = { caption: 12, body: 15, title: 20, heading: 25 } as const;
export const common = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  title: { color: colors.text, fontSize: textSize.heading, fontWeight: '700' },
  heading: { color: colors.text, fontSize: textSize.title, fontWeight: '650' },
  body: { color: colors.text, fontSize: textSize.body, lineHeight: 23 },
  muted: { color: colors.muted, fontSize: textSize.caption, lineHeight: 18 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: space.lg, gap: space.sm },
  field: { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: space.md, fontSize: textSize.body },
  button: { minHeight: 48, paddingHorizontal: space.lg, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.accent, borderRadius: radius.md },
  buttonText: { color: colors.background, fontWeight: '700', fontSize: textSize.body },
  secondaryButton: { minHeight: 44, paddingHorizontal: space.md, justifyContent: 'center', alignItems: 'center', borderColor: colors.border, borderWidth: 1, borderRadius: radius.md },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
