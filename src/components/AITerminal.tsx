import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import type { ModelConfiguration, RuntimeMarket } from '../data/runtimeModel';
import { fonts } from '../theme';

export type TerminalTone = 'prompt' | 'info' | 'ok' | 'warn' | 'error' | 'muted' | 'accent';
export type TerminalLine = { tone: TerminalTone; text: string };

type Props = {
  title?: string;
  configuration: ModelConfiguration | null;
  market: RuntimeMarket | undefined;
  loading: boolean;
  completed: number;
  total: number;
  error?: string;
  country: string;
  decisionLines?: string[];
  defaultCollapsed?: boolean;
};

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const timestamp = (value: string) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleTimeString() : value;
};

export function buildTerminalLines({
  configuration, market, loading, completed, total, error, country, decisionLines,
}: Omit<Props, 'title'>): TerminalLine[] {
  const lines: TerminalLine[] = [];
  const brand = configuration?.brand ?? 'brand';
  lines.push({ tone: 'prompt', text: `$ runtime-model build --brand "${brand}" --market ${country}` });
  if (configuration) {
    lines.push({ tone: 'muted', text: `  platforms: ${configuration.platforms.join(', ') || 'none'}` });
    lines.push({ tone: 'muted', text: `  sources: ${configuration.sources.join(', ') || 'none'}` });
  }
  if (loading) lines.push({ tone: 'info', text: `> evaluating markets · ${completed}/${total} complete …` });
  if (error) lines.push({ tone: 'error', text: `! ${error}` });

  if (market) {
    lines.push({ tone: 'muted', text: `> collected ${timestamp(market.collectedAt)}` });
    const statusTone: TerminalTone = market.status === 'ready' ? 'ok' : market.status === 'limited' ? 'warn' : 'error';
    lines.push({ tone: statusTone, text: `[model] status: ${market.status.toUpperCase()}` });
    for (const item of market.availability) {
      lines.push({
        tone: item.status === 'available' ? 'ok' : 'warn',
        text: `[${item.source}] ${item.status === 'available' ? 'AVAILABLE' : 'UNAVAILABLE'} — ${item.reason}`,
      });
    }
    lines.push({ tone: 'info', text: `[reviews] ${market.reviews.length} verified records parsed` });
    const peers = market.competitors.length;
    lines.push({ tone: peers ? 'ok' : 'warn', text: `[competitors] ${peers} peer${peers === 1 ? '' : 's'} discovered` });
    const liveQuotes = market.quotes.filter((quote) => quote.status === 'live').length;
    lines.push({ tone: 'info', text: `[quotes] ${liveQuotes}/${market.quotes.length} live share price${market.quotes.length === 1 ? '' : 's'}` });
  } else if (!loading && !error) {
    lines.push({ tone: 'muted', text: '> awaiting model evidence …' });
  }

  for (const line of decisionLines ?? []) lines.push({ tone: 'accent', text: `» ${line}` });
  lines.push({ tone: 'prompt', text: loading ? '_' : '$ _' });
  return lines;
}

const toneColor: Record<TerminalTone, string> = {
  prompt: '#7CFFB2',
  info: '#8BD6FF',
  ok: '#5DF2A0',
  warn: '#FFD166',
  error: '#FF7B72',
  muted: '#8A93A6',
  accent: '#C4B5FD',
};

export function AITerminal({ title = 'AI Terminal', defaultCollapsed = false, ...rest }: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const lines = buildTerminalLines(rest);
  return <View style={styles.shell} testID="ai-terminal">
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: !collapsed }}
      onPress={() => setCollapsed((current) => !current)}
      style={styles.titleBar}
    >
      <View style={styles.dots}>
        <View style={[styles.dot, { backgroundColor: '#FF5F56' }]} />
        <View style={[styles.dot, { backgroundColor: '#FFBD2E' }]} />
        <View style={[styles.dot, { backgroundColor: '#27C93F' }]} />
      </View>
      <Text style={styles.titleText}>{title}</Text>
      <Text style={[styles.badge, rest.loading ? styles.badgeLive : styles.badgeIdle]}>
        {rest.loading ? '● STREAMING' : '● IDLE'}
      </Text>
      <Text style={styles.chevron}>{collapsed ? '▸ expand' : '▾ minimize'}</Text>
    </Pressable>
    {!collapsed && <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
      {lines.map((line, index) => <Text
        key={`${index}-${line.text}`}
        style={[styles.line, { color: toneColor[line.tone] }]}
      >{line.text}</Text>)}
    </ScrollView>}
  </View>;
}

const styles = StyleSheet.create({
  shell: { marginTop: 12, marginBottom: 8, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#1E2A3A', backgroundColor: '#0B1020' },
  titleBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#11182B', borderBottomWidth: 1, borderBottomColor: '#1E2A3A' },
  dots: { flexDirection: 'row', gap: 6, marginRight: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  titleText: { flex: 1, color: '#C9D4E5', fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.4 },
  badge: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, marginRight: 10 },
  badgeLive: { color: '#5DF2A0' },
  badgeIdle: { color: '#8A93A6' },
  chevron: { color: '#8BD6FF', fontFamily: fonts.bold, fontSize: 11 },
  body: { maxHeight: 260, backgroundColor: '#0B1020' },
  bodyContent: { padding: 12, gap: 3 },
  line: { fontFamily: mono, fontSize: 12, lineHeight: 18 },
});
