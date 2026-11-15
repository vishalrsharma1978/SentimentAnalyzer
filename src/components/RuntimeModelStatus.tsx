import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ModelConfiguration, RuntimeMarket } from '../data/runtimeModel';
import { colors, fonts } from '../theme';

type Props = {
  configuration: ModelConfiguration | null;
  market: RuntimeMarket | undefined;
  loading: boolean;
  completed: number;
  total: number;
  error?: string;
  onRetry: () => void;
};

export function RuntimeModelStatus({ configuration, market, loading, completed, total, error, onRetry }: Props) {
  return <View style={styles.card} testID="runtime-model-status">
    <Text accessibilityRole="header" style={styles.title}>
      {loading ? `Building runtime model · ${completed}/${total} markets` : error
        ? 'Model evaluation failed' : market?.status === 'ready'
          ? 'Runtime analytics model ready' : 'Runtime model · limited evidence'}
    </Text>
    {configuration && <Text style={styles.detail}>
      {configuration.brand}{configuration.appName ? ` · App: ${configuration.appName}` : ''}
      {` · ${configuration.platforms.join(', ')} · ${configuration.sources.join(', ')}`}
    </Text>}
    <Text style={styles.detail}>
      Real source data only. Sentiment is classified from review stars, not a newly trained AI model.
      Market comparisons describe monitored storefronts, not market share or customer residence.
    </Text>
    {error && <Text accessibilityRole="alert" style={styles.warning}>{error}</Text>}
    {market && <Text style={styles.detail}>Collected {new Date(market.collectedAt).toLocaleString()}</Text>}
    {market?.availability.map((item, index) => <Text key={`${item.source}-${index}`} style={styles.detail}>
      {item.source}: {item.status === 'available' ? 'Available' : 'Unavailable'} — {item.reason}
    </Text>)}
    {!loading && <Pressable accessibilityRole="button" onPress={onRetry} style={styles.button}>
      <Text style={styles.buttonText}>Rebuild model</Text>
    </Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  card: { marginTop: 12, marginBottom: 8, padding: 18, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, gap: 8 },
  title: { fontFamily: fonts.bold, fontSize: 15, color: colors.navy },
  detail: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted },
  warning: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 20, color: colors.orangeText },
  button: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 12 },
  buttonText: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
});
