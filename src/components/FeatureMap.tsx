import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  FEATURE_CATEGORIES,
  FEATURES,
  buildFeatureInsights,
  coverageScore,
  featureLevels,
  matchBrandKey,
} from "../data/featureMap";
import type { Feature, FeatureLevel } from "../data/featureMap";
import { colors, fonts } from "../theme";

type Props = {
  /** The dashboard's selected brand. */
  brandName: string;
  /** Competitor names ranked best-first; the top five mapped ones are shown. */
  competitorNames: string[];
};

type Column = {
  name: string;
  levels: Record<string, FeatureLevel>;
  coverage: number;
  isBrand: boolean;
};

function levelIcon(level: FeatureLevel | null) {
  if (level === 2)
    return <Ionicons name="checkmark-circle" size={16} color={colors.greenText} />;
  if (level === 1)
    return <Ionicons name="remove-circle" size={16} color={colors.orange} />;
  if (level === 0)
    return <Ionicons name="close-circle-outline" size={16} color={colors.redText} />;
  return <Text style={styles.cellUnknown}>—</Text>;
}

function levelText(level: FeatureLevel | null) {
  if (level === 2) return "offered";
  if (level === 1) return "partially offered";
  if (level === 0) return "not offered";
  return "no data";
}

function CoverageBar({ column, rank }: { column: Column; rank: number }) {
  const percent = Math.round(column.coverage * 100);
  return (
    <View
      style={styles.coverageRow}
      accessibilityLabel={`${column.name} covers ${percent} percent of the feature set`}
      testID={column.isBrand ? "coverage-brand" : "coverage-competitor"}
    >
      <Text
        style={[styles.coverageName, column.isBrand && styles.coverageNameBrand]}
        numberOfLines={1}
      >
        {rank}. {column.name}
        {column.isBrand ? " (you)" : ""}
      </Text>
      <View style={styles.coverageTrack}>
        <View
          style={[
            styles.coverageFill,
            { width: `${percent}%` },
            column.isBrand && styles.coverageFillBrand,
          ]}
        />
      </View>
      <Text style={[styles.coveragePercent, column.isBrand && styles.coverageNameBrand]}>
        {percent}%
      </Text>
    </View>
  );
}

function InsightList({
  icon,
  color,
  title,
  empty,
  features,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  empty: string;
  features: Feature[];
  testID: string;
}) {
  return (
    <View style={styles.insight} testID={testID}>
      <View style={styles.insightHeader}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={[styles.insightTitle, { color }]}>{title}</Text>
      </View>
      {features.length === 0 ? (
        <Text style={styles.insightEmpty}>{empty}</Text>
      ) : (
        <View style={styles.insightChips}>
          {features.map((feature) => (
            <View key={feature.id} style={[styles.chip, { borderColor: color }]}>
              <Text style={styles.chipText}>{feature.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function FeatureMap({ brandName, competitorNames }: Props) {
  const [expanded, setExpanded] = useState(true);

  const { brandColumn, competitorColumns, unmapped } = useMemo(() => {
    const brandLevels = featureLevels(brandName);
    const brand: Column | null = brandLevels
      ? {
          name: matchBrandKey(brandName) ?? brandName,
          levels: brandLevels,
          coverage: coverageScore(brandLevels),
          isBrand: true,
        }
      : null;
    const seen = new Set<string>(brand ? [brand.name] : []);
    const mapped: Column[] = [];
    const missing: string[] = [];
    for (const name of competitorNames) {
      const key = matchBrandKey(name);
      const levels = featureLevels(name);
      if (!key || !levels) {
        missing.push(name);
        continue;
      }
      if (seen.has(key)) continue;
      seen.add(key);
      mapped.push({
        name: key,
        levels,
        coverage: coverageScore(levels),
        isBrand: false,
      });
      if (mapped.length === 5) break;
    }
    return { brandColumn: brand, competitorColumns: mapped, unmapped: missing };
  }, [brandName, competitorNames]);

  const insights = useMemo(
    () =>
      brandColumn
        ? buildFeatureInsights(
            brandColumn.levels,
            competitorColumns.map((column) => column.levels),
          )
        : null,
    [brandColumn, competitorColumns],
  );

  const columns = brandColumn
    ? [brandColumn, ...competitorColumns]
    : competitorColumns;
  const ranked = [...columns].sort((a, b) => b.coverage - a.coverage);

  return (
    <View style={styles.card} testID="feature-map">
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="grid" size={18} color={colors.onPrimary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Feature map</Text>
          <Text style={styles.subtitle}>
            What {brandName} offers against the top competitors, feature by
            feature — where you lead and what to build next.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${expanded ? "Hide" : "Show"} feature map section`}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((current) => !current)}
          style={styles.sectionToggle}
          testID="feature-map-toggle"
        >
          <Text style={styles.sectionToggleText}>
            {expanded ? "Hide" : "Show"}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.primary}
          />
        </Pressable>
      </View>

      {expanded && columns.length === 0 && (
        <Text style={styles.emptyText} testID="feature-map-empty">
          No curated feature data is available for {brandName} or its current
          competitors yet.
        </Text>
      )}

      {expanded && columns.length > 0 && (
        <>
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Feature coverage</Text>
            <Text style={styles.blockHint}>
              Share of the {FEATURES.length}-feature set each brand offers
              (partial counts half).
            </Text>
            {ranked.map((column, index) => (
              <CoverageBar key={column.name} column={column} rank={index + 1} />
            ))}
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Capability matrix</Text>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <Ionicons name="checkmark-circle" size={13} color={colors.greenText} />
                <Text style={styles.legendText}>Offered</Text>
              </View>
              <View style={styles.legendItem}>
                <Ionicons name="remove-circle" size={13} color={colors.orange} />
                <Text style={styles.legendText}>Partial / limited markets</Text>
              </View>
              <View style={styles.legendItem}>
                <Ionicons name="close-circle-outline" size={13} color={colors.redText} />
                <Text style={styles.legendText}>Not offered</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={styles.matrixHeader}>
                  <Text style={[styles.featureCell, styles.matrixHeadText]}>
                    Feature
                  </Text>
                  {columns.map((column) => (
                    <Text
                      key={column.name}
                      style={[
                        styles.brandCell,
                        styles.matrixHeadText,
                        column.isBrand && styles.brandCellOwn,
                      ]}
                      numberOfLines={2}
                    >
                      {column.name}
                      {column.isBrand ? " ★" : ""}
                    </Text>
                  ))}
                </View>
                {FEATURE_CATEGORIES.map((category) => (
                  <View key={category}>
                    <Text style={styles.categoryRow}>{category}</Text>
                    {FEATURES.filter(
                      (feature) => feature.category === category,
                    ).map((feature) => (
                      <View key={feature.id} style={styles.matrixRow}>
                        <Text style={styles.featureCell} numberOfLines={2}>
                          {feature.label}
                        </Text>
                        {columns.map((column) => {
                          const value = column.levels[feature.id] ?? null;
                          return (
                            <View
                              key={column.name}
                              style={[
                                styles.levelCell,
                                column.isBrand && styles.levelCellOwn,
                              ]}
                              accessibilityLabel={`${feature.label} is ${levelText(value)} by ${column.name}`}
                            >
                              {levelIcon(value)}
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {brandColumn && insights && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Where you stand · next steps</Text>
              <InsightList
                icon="trophy"
                color={colors.greenText}
                title="Your edge — features most competitors lack"
                empty="No clear feature advantages over the mapped competitors."
                features={insights.leads}
                testID="feature-leads"
              />
              <InsightList
                icon="trending-up"
                color={colors.redText}
                title="Gaps to close — most competitors offer these"
                empty="No gaps: every feature competitors fully offer, you offer too."
                features={insights.gaps}
                testID="feature-gaps"
              />
              <InsightList
                icon="construct"
                color={colors.orange}
                title="Finish the job — partial today, table stakes elsewhere"
                empty="No partially built features need completing."
                features={insights.partials}
                testID="feature-partials"
              />
            </View>
          )}

          {!brandColumn && (
            <Text style={styles.emptyText}>
              {brandName} is not in the curated feature matrix yet, so the
              comparison shows mapped competitors only.
            </Text>
          )}
          {unmapped.length > 0 && (
            <Text style={styles.footnote}>
              Not yet mapped: {unmapped.join(", ")}. Feature data is curated
              from each provider&apos;s public product pages, not live feeds.
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    gap: 16,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1 },
  title: { fontFamily: fonts.black, fontSize: 18, color: colors.navy },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
    marginTop: 2,
  },
  sectionToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.primaryTint,
  },
  sectionToggleText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.primary,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  },
  block: { gap: 8 },
  blockTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.muted,
    textTransform: "uppercase",
  },
  blockHint: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  coverageRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  coverageName: {
    width: 150,
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.navy,
  },
  coverageNameBrand: { color: colors.primary },
  coverageTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryTint,
    overflow: "hidden",
  },
  coverageFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: colors.navy,
  },
  coverageFillBrand: { backgroundColor: colors.primary },
  coveragePercent: {
    width: 42,
    textAlign: "right",
    fontFamily: fonts.black,
    fontSize: 12,
    color: colors.navy,
  },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendText: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  matrixHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 6,
  },
  matrixHeadText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.navy,
  },
  categoryRow: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.muted,
    paddingVertical: 6,
  },
  matrixRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  featureCell: {
    width: 170,
    paddingRight: 8,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.navy,
  },
  brandCell: {
    width: 92,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  brandCellOwn: { color: colors.primary },
  levelCell: {
    width: 92,
    alignItems: "center",
    justifyContent: "center",
  },
  levelCellOwn: {
    backgroundColor: colors.primaryTint,
    borderRadius: 6,
    paddingVertical: 2,
  },
  cellUnknown: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  insight: { gap: 6, marginTop: 4 },
  insightHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  insightTitle: { fontFamily: fonts.bold, fontSize: 12 },
  insightEmpty: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  insightChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.card,
  },
  chipText: { fontFamily: fonts.bold, fontSize: 11, color: colors.navy },
  footnote: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
  },
});
