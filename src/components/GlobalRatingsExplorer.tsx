import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { RatingSunburst } from "./RatingSunburst";
import { detectDeviceMentions } from "../data/deviceMentions";
import {
  FAILURE_MIN_REVIEWS,
  FAILURE_NEGATIVE_SHARE,
  summarizePlatformDevices,
} from "../data/platformDevices";
import type { PlatformKey } from "../data/platformDevices";
import {
  channelColors,
  channelLabels,
  channelRating,
  channelScore,
  condenseLadder,
  ladderTiers,
  rankMarkets,
  storeRatingBasis,
} from "../data/marketAnalytics";
import type { Channel, Market, MarketRatings } from "../data/marketAnalytics";
import { colors, ratingShade } from "../theme";

type Props = {
  brand: string;
  markets: Market[];
  ratings: MarketRatings;
  errors: Record<string, string>;
  loading: boolean;
  region: string;
  country: Market;
  onRegion: (region: string) => void;
  onCountry: (market: Market) => void;
  onRetry: () => void;
  /** Reviews already collected for the selected country; used for the device tables. */
  reviews?: {
    source: string;
    text: string;
    sentiment: "positive" | "neutral" | "negative";
    rating: number;
  }[];
};
const modes = ["Sunburst", "Heatmap", "Ranked bars"] as const;
const channels: Channel[] = ["brand", "web", "mobile", "ios", "android"];
const scoreText = (score: number | null) =>
  score === null ? "N/A" : score.toFixed(2);
export function GlobalRatingsExplorer({
  brand,
  markets,
  ratings,
  errors,
  loading,
  region,
  country,
  onRegion,
  onCountry,
  onRetry,
  reviews = [],
}: Props) {
  const [mode, setMode] = useState<(typeof modes)[number]>("Sunburst");
  const [focused, setFocused] = useState(false);
  const [channel, setChannel] = useState<Channel>("mobile");
  const [showAllRanks, setShowAllRanks] = useState(false);
  const regions = [
    "Global",
    ...new Set(markets.map((market) => market.region)),
  ];
  const visible = markets.filter(
    (market) => region === "Global" || market.region === region,
  );
  const ranked = rankMarkets(markets, ratings, region, channel);
  const selectCountry = (market: Market, nextChannel: Channel = "mobile") => {
    setFocused(true);
    setChannel(nextChannel);
    onCountry(market);
  };
  const drill = (code: string, nextChannel: Channel | null) => {
    const market = visible.find((item) => item.code === code);
    if (market) selectCountry(market, nextChannel ?? "mobile");
  };
  const selectedScore = channelRating(ratings[country.code], channel);
  const selectedData = ratings[country.code];
  const selectedDetail = channelScore(selectedData, channel);
  const channelName = channelLabels[channel].toLowerCase();

  const tierColors = {
    strong: colors.greenLight,
    fair: colors.orangeLight,
    weak: colors.redLight,
  } as const;
  const bestMarket = ranked[0] ?? null;
  const weakestMarket = ranked.length > 1 ? ranked[ranked.length - 1] : null;
  const spread =
    bestMarket && weakestMarket ? bestMarket.score - weakestMarket.score : null;
  const regionAverage = ranked.length
    ? ranked.reduce((sum, market) => sum + market.score, 0) / ranked.length
    : null;
  const vsAverage =
    selectedScore !== null && regionAverage !== null
      ? selectedScore - regionAverage
      : null;
  const stats = [
    {
      label: `${country.name} · ${channelLabels[channel]}`,
      value: scoreText(selectedScore),
      unit: "/ 5",
      note:
        vsAverage === null
          ? "No rating yet"
          : `${vsAverage >= 0 ? "+" : ""}${vsAverage.toFixed(2)} vs ${region === "Global" ? "global" : region} average`,
      tone:
        vsAverage === null
          ? colors.muted
          : vsAverage >= 0
            ? colors.greenText
            : colors.redText,
    },
    {
      label: "Strongest market",
      value: bestMarket ? bestMarket.code : "—",
      unit: bestMarket ? bestMarket.score.toFixed(2) : "",
      note: bestMarket ? bestMarket.name : "No ratings yet",
      tone: colors.greenText,
    },
    {
      label: "Weakest market",
      value: weakestMarket ? weakestMarket.code : "—",
      unit: weakestMarket ? weakestMarket.score.toFixed(2) : "",
      note: weakestMarket
        ? `${weakestMarket.name}${spread !== null ? ` · ${spread.toFixed(2)} spread` : ""}`
        : "Needs two rated markets",
      tone: colors.redText,
    },
  ];
  const devicePlatform: PlatformKey | null =
    focused && (channel === "ios" || channel === "android") ? channel : null;
  const deviceSummary = devicePlatform
    ? summarizePlatformDevices(reviews, devicePlatform, detectDeviceMentions)
    : null;
  const tiers = ladderTiers(ranked);
  const condensed = condenseLadder(ranked, country.code);
  const compact = !showAllRanks && condensed.hidden > 0;
  const shownCodes = new Set(condensed.shown.map((market) => market.code));
  const rankRow = (market: (typeof ranked)[number]) => (
    <Pressable
      key={market.code}
      accessibilityRole="button"
      accessibilityLabel={`Explore ${market.name}, rank ${market.rank}, rating ${market.score.toFixed(2)}`}
      onPress={() => selectCountry(market, channel)}
      style={[
        styles.rankRow,
        country.code === market.code && styles.selectedRow,
      ]}
    >
      <Text style={styles.rank}>#{market.rank}</Text>
      <View style={styles.rankCopy}>
        <View style={styles.rankLabel}>
          <Text style={styles.countryName}>{market.name}</Text>
          <Text style={styles.score}>{market.score.toFixed(2)}</Text>
        </View>
        {!compact && (channel === "brand" || channel === "mobile") && (
          <Text style={styles.caption}>
            {storeRatingBasis(ratings[market.code])}
          </Text>
        )}
        <View style={styles.track}>
          <View
            style={[
              styles.bar,
              {
                width: `${market.score * 20}%`,
                backgroundColor: ratingShade(market.score),
              },
              country.code === market.code && styles.barSelected,
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
  const rankingChart = () => (
    <View style={styles.ranking}>
      <Text style={styles.panelTitle}>
        {region === "Global" ? "Global" : region} {channelName} rating ladder
      </Text>
      <Text style={styles.caption}>
        {brand}&apos;s {channelName} rating across monitored countries, not
        competitor or download rank.
      </Text>
      {ranked.length === 0 && (
        <Text style={styles.empty}>
          {loading
            ? `Collecting ${channelName} ratings...`
            : `No ${channelName} ratings available in this region.`}
        </Text>
      )}
      {ranked.length > 0 && (
        <View style={styles.tierSummary} testID="ladder-tier-summary">
          {tiers.map((tier) => (
            <View key={tier.key} style={styles.tierPill}>
              <View
                style={[
                  styles.tierDot,
                  { backgroundColor: tierColors[tier.key] },
                ]}
              />
              <Text style={styles.tierText}>
                {tier.markets.length}{" "}
                {tier.markets.length === 1 ? "country" : "countries"} ·{" "}
                {tier.label}
              </Text>
            </View>
          ))}
        </View>
      )}
      {tiers.map((tier) => {
        const rows = tier.markets.filter(
          (market) => !compact || shownCodes.has(market.code),
        );
        if (rows.length === 0) return null;
        const collapsed = tier.markets.length - rows.length;
        return (
          <View key={tier.key}>
            {tiers.length > 1 && (
              <View style={styles.tierHeading}>
                <View
                  style={[
                    styles.tierDot,
                    { backgroundColor: tierColors[tier.key] },
                  ]}
                />
                <Text style={styles.tierHeadingText}>
                  {tier.label} · {tier.markets.length}
                </Text>
              </View>
            )}
            {rows.map(rankRow)}
            {collapsed > 0 && (
              <Text style={styles.caption}>+{collapsed} more in this tier</Text>
            )}
          </View>
        );
      })}
      {condensed.hidden > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showAllRanks }}
          accessibilityLabel={
            showAllRanks
              ? "Show fewer ranked countries"
              : `Show all ${ranked.length} ranked countries`
          }
          onPress={() => setShowAllRanks((current) => !current)}
          style={styles.chip}
        >
          <Text style={styles.chipText}>
            {showAllRanks
              ? "Show top and bottom only"
              : `Show all ${ranked.length} countries`}
          </Text>
        </Pressable>
      )}
    </View>
  );

  const heatmap = () => (
    <View style={styles.heatmap}>
      <Text style={styles.panelTitle}>Country × experience heatmap</Text>
      <Text style={styles.caption}>
        Color intensity represents rating (1–5). Brand = provisional store-based
        rating; Website = live country-site checks; iOS/Android = store ratings.
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={styles.matrix}>
          <View style={styles.matrixRow}>
            <Text style={styles.matrixName}>Country</Text>
            {channels.map((item) => (
              <Text key={item} style={styles.columnHeading}>
                {channelLabels[item]}
              </Text>
            ))}
          </View>
          {visible.map((market) => (
            <View key={market.code} style={styles.matrixRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => selectCountry(market)}
                style={styles.matrixName}
              >
                <Text style={styles.countryName}>{market.name}</Text>
              </Pressable>
              {channels.map((item) => {
                const value = channelRating(ratings[market.code], item);
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityLabel={`${market.name} ${channelLabels[item]} ${value === null ? "unavailable" : value.toFixed(2)}`}
                    onPress={() => selectCountry(market, item)}
                    style={[
                      styles.heatCell,
                      {
                        backgroundColor:
                          value === null
                            ? colors.lineSoft
                            : value >= 4
                              ? colors.greenSoft
                              : value >= 3
                                ? colors.orangeSoft
                                : colors.redSoft,
                      },
                    ]}
                  >
                    <Text style={styles.heatValue}>{scoreText(value)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.shell} testID="global-ratings-explorer">
      <View style={styles.body}>
        <View style={styles.statStrip} testID="market-stats">
          {stats.map((stat) => (
            <View
              key={stat.label}
              style={styles.stat}
              accessibilityLabel={`${stat.label} ${stat.value} ${stat.unit}`}
            >
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>
                {stat.value}
                <Text style={styles.statUnit}> {stat.unit}</Text>
              </Text>
              <Text
                style={[styles.statNote, { color: stat.tone }]}
                numberOfLines={2}
              >
                {stat.note}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.controlsRow}>
          <View style={styles.controlGroup}>
            <Text style={styles.fieldLabel}>REGION</Text>
            <View style={styles.chips}>
              {regions.map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityLabel={`Region ${item}`}
                  accessibilityState={{ selected: region === item }}
                  onPress={() => {
                    setFocused(false);
                    setChannel("mobile");
                    onRegion(item);
                  }}
                  style={[styles.chip, region === item && styles.activeChip]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      region === item && styles.activeChipText,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={[styles.controlGroup, styles.controlGroupGrow]}>
            <Text style={styles.fieldLabel}>COUNTRY · SELECT TO DRILL DOWN</Text>
            <View style={styles.chips}>
              {visible.map((market) => (
                <Pressable
                  key={market.code}
                  accessibilityRole="button"
                  accessibilityLabel={`Country ${market.name}`}
                  accessibilityState={{
                    selected: market.code === country.code,
                  }}
                  onPress={() => selectCountry(market)}
                  style={[
                    styles.chip,
                    market.code === country.code && styles.activeCountry,
                  ]}
                >
                  <Text style={styles.chipText}>
                    {market.code} · {market.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={[styles.controlGroup, styles.controlGroupEnd]}>
            <Text style={styles.fieldLabel}>CHART · DATA</Text>
            <View style={styles.chips}>
              {modes.map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityLabel={`Chart ${item}`}
                  accessibilityState={{ selected: mode === item }}
                  onPress={() => setMode(item)}
                  style={[styles.chip, mode === item && styles.activeChip]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      mode === item && styles.activeChipText,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh country ratings"
                onPress={onRetry}
                style={styles.chip}
              >
                <Text style={styles.chipText}>
                  {loading ? "Refreshing..." : "Refresh ratings"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
        <Text style={styles.method}>
          Rank scope: {region} · {ranked.length} rated / {visible.length}{" "}
          monitored · by {channelLabels[channel]} rating; ties share rank.
        </Text>
        {Object.keys(errors).length > 0 && (
          <Text accessibilityRole="alert" style={styles.error}>
            Some countries could not be loaded: {Object.keys(errors).join(", ")}
            . {Object.values(errors)[0]} Refresh to retry.
          </Text>
        )}
        {visible.length === 0 ? (
          <Text style={styles.empty}>
            No monitored countries in this region.
          </Text>
        ) : mode === "Heatmap" ? (
          heatmap()
        ) : mode === "Ranked bars" ? (
          rankingChart()
        ) : (
          <View style={styles.chartGrid}>
            <RatingSunburst
              markets={visible}
              ratings={ratings}
              country={country}
              focused={focused}
              channel={channel}
              onDrill={drill}
              onReset={() => {
                setFocused(false);
                setChannel("mobile");
              }}
            />
            {rankingChart()}
          </View>
        )}

        <View style={styles.detailHeader}>
          <View>
            <Text style={styles.panelTitle} testID="selected-detail-title">
              {country.name}
            </Text>
            <Text style={styles.caption} testID="selected-detail-channel">
              {channelLabels[channel]} · Tap a card to focus the sunburst.
            </Text>
          </View>
          <Text style={styles.detailScore}>
            {scoreText(selectedScore)}
            <Text style={styles.outOf}> / 5</Text>
          </Text>
        </View>
        <View style={styles.channelGrid}>
          {channels
            .filter(
              (item) =>
                item !== "web" || channelRating(selectedData, "web") !== null,
            )
            .map((item) => {
              const score = channelRating(selectedData, item);
              const store =
                item === "ios"
                  ? selectedData?.apple
                  : item === "android"
                    ? selectedData?.google
                    : null;
              const scoreDetail = channelScore(selectedData, item);
              const detail =
                item === "brand" || item === "mobile"
                  ? storeRatingBasis(selectedData)
                  : item === "web"
                    ? score === null
                      ? scoreDetail?.basis || "Probing website..."
                      : "Live site checks"
                    : score === null
                      ? "Rating unavailable"
                      : store
                        ? `${store.reviewCount.toLocaleString()} store ratings`
                        : "Mean of available stores";
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityLabel={`Focus ${channelLabels[item]}`}
                  accessibilityState={{ selected: channel === item && focused }}
                  onPress={() => {
                    setFocused(true);
                    setChannel(item);
                  }}
                  style={[
                    styles.channelCard,
                    channel === item && focused && styles.channelSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.channelAccent,
                      { backgroundColor: channelColors[item] },
                    ]}
                  />
                  <Text style={styles.channelLabel}>{channelLabels[item]}</Text>
                  <Text style={styles.channelValue}>{scoreText(score)}</Text>
                  <Text style={styles.caption}>{detail}</Text>
                </Pressable>
              );
            })}
        </View>
        {deviceSummary && (
          <View style={styles.deviceTable} testID="device-table">
            <Text style={styles.panelTitle}>
              {channelLabels[channel]} devices and operating systems ·{" "}
              {country.name}
            </Text>
            <Text style={styles.caption}>
              Only what reviewers wrote in their {deviceSummary.source} reviews.
              {` ${deviceSummary.namingDevice} of ${deviceSummary.totalReviews} reviews name a device or OS.`}
            </Text>
            {deviceSummary.failingRows.length > 0 && (
              <View
                accessibilityRole="alert"
                style={styles.failureCallout}
                testID="device-failure-callout"
              >
                <Text style={styles.failureTitle}>
                  Failing on {deviceSummary.failingRows.length}{" "}
                  {deviceSummary.failingRows.length === 1
                    ? "device or OS"
                    : "devices and operating systems"}
                </Text>
                <Text style={styles.failureText}>
                  {deviceSummary.failingRows
                    .map(
                      (row) =>
                        `${row.label} (${row.negative} of ${row.reviews} reviews negative)`,
                    )
                    .join(" · ")}
                </Text>
              </View>
            )}
            {deviceSummary.rows.length === 0 ? (
              <Text style={styles.empty} testID="device-table-empty">
                {deviceSummary.totalReviews === 0
                  ? `No ${deviceSummary.source} reviews collected for ${country.name} yet.`
                  : `None of the ${deviceSummary.totalReviews} ${deviceSummary.source} reviews for ${country.name} name a device or operating system.`}
              </Text>
            ) : (
              <View style={styles.deviceGrid}>
                <View style={styles.deviceRow}>
                  <Text style={[styles.deviceHead, styles.deviceName]}>
                    Device / OS
                  </Text>
                  <Text style={[styles.deviceHead, styles.deviceKind]}>
                    Type
                  </Text>
                  <Text style={[styles.deviceHead, styles.deviceNum]}>
                    Reviews
                  </Text>
                  <Text style={[styles.deviceHead, styles.deviceNum]}>
                    Negative
                  </Text>
                  <Text style={[styles.deviceHead, styles.deviceNum]}>
                    Avg ★
                  </Text>
                  <Text style={[styles.deviceHead, styles.deviceStatus]}>
                    Status
                  </Text>
                </View>
                {deviceSummary.rows.map((row) => (
                  <View
                    key={row.label}
                    style={[
                      styles.deviceRow,
                      row.failing && styles.deviceRowFailing,
                    ]}
                    accessibilityLabel={`${row.label}, ${row.reviews} reviews, ${row.negative} negative${row.failing ? ", failing" : ""}`}
                  >
                    <Text
                      style={[
                        styles.deviceCell,
                        styles.deviceName,
                        row.failing && styles.deviceFailingText,
                      ]}
                    >
                      {row.label}
                    </Text>
                    <Text style={[styles.deviceCell, styles.deviceKind]}>
                      {row.kind === "os" ? "OS" : "Device"}
                    </Text>
                    <Text style={[styles.deviceCell, styles.deviceNum]}>
                      {row.reviews}
                    </Text>
                    <Text
                      style={[
                        styles.deviceCell,
                        styles.deviceNum,
                        row.negative > 0 && styles.deviceFailingText,
                      ]}
                    >
                      {row.negative} ({Math.round(row.negativeShare * 100)}%)
                    </Text>
                    <Text style={[styles.deviceCell, styles.deviceNum]}>
                      {row.avgRating.toFixed(1)}
                    </Text>
                    <Text
                      style={[
                        styles.deviceCell,
                        styles.deviceStatus,
                        row.failing
                          ? styles.deviceFailingText
                          : styles.deviceOkText,
                      ]}
                    >
                      {row.failing ? "Failing" : "OK"}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.caption}>
              Failing = at least {Math.round(FAILURE_NEGATIVE_SHARE * 100)}% of
              reviews naming it are negative, from {FAILURE_MIN_REVIEWS}+
              reviews.
            </Text>
          </View>
        )}
        {selectedDetail && !(channel === "web" && selectedScore === null) && (
          <View style={styles.breakdown} testID="channel-breakdown">
            <Text style={styles.panelTitle}>
              {channelLabels[channel]} breakdown · {country.name}
            </Text>
            <Text style={styles.caption}>{selectedDetail.basis}</Text>
            {selectedDetail.components.map((component) => (
              <View
                key={component.label}
                style={styles.componentRow}
                accessibilityLabel={`${component.label} ${Math.round(component.score * 100)} percent`}
              >
                <Text style={styles.componentLabel}>{component.label}</Text>
                <View style={[styles.track, styles.componentTrack]}>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: `${component.score * 100}%`,
                        // Same rating scheme as the charts: the 0–1 component
                        // score maps to the 0–5 scale before shading.
                        backgroundColor: ratingShade(component.score * 5),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.componentValue}>
                  {Math.round(component.score * 100)}%
                </Text>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.method}>
          Brand = provisional average of App Store + Google Play ratings.
          Website = live check of the country site (speed, security,
          mobile/SEO), scaled 1–5.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    backgroundColor: colors.card,
    overflow: "hidden",
    marginBottom: 20,
    marginTop: 12,
  },
  body: { padding: 16 },
  statStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  stat: {
    flex: 1,
    minWidth: 150,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.line,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: colors.muted,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.navy,
    marginTop: 4,
  },
  statUnit: { fontSize: 12, fontWeight: "600", color: colors.muted },
  statNote: { fontSize: 11, lineHeight: 16, marginTop: 2, fontWeight: "600" },
  fieldLabel: {
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 1,
    fontWeight: "800",
    marginBottom: 10,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 14 },
  // Region, country and chart controls share one wrapping row so short chip
  // groups sit side by side instead of each taking a full-width band.
  controlsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 24,
    alignItems: "flex-start",
  },
  controlGroup: { flexShrink: 1 },
  controlGroupGrow: { flexGrow: 1, flexShrink: 1, minWidth: 240 },
  controlGroupEnd: { marginLeft: "auto" },
  chip: {
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: "center",
    backgroundColor: colors.primaryTint,
  },
  chipText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  activeChip: { backgroundColor: colors.primary, borderColor: colors.primary },
  activeChipText: { color: colors.onPrimary },
  activeCountry: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  method: {
    fontSize: 11,
    lineHeight: 18,
    color: colors.muted,
    marginVertical: 12,
  },
  error: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.redText,
    backgroundColor: colors.redSoft,
    padding: 12,
    borderRadius: 10,
  },
  empty: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
    paddingVertical: 28,
  },
  chartGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    marginTop: 10,
    alignItems: "flex-start",
  },
  ranking: { flex: 1, minWidth: 240, paddingVertical: 14 },
  panelTitle: { color: colors.navy, fontSize: 16, fontWeight: "800" },
  caption: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  tierSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  tierPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierText: { fontSize: 11, fontWeight: "700", color: colors.text },
  tierHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  tierHeadingText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 0.5,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    minHeight: 52,
  },
  selectedRow: { backgroundColor: colors.primarySoft },
  rank: { width: 25, fontSize: 14, color: colors.muted, fontWeight: "700" },
  rankCopy: { flex: 1 },
  rankLabel: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  countryName: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    flexShrink: 1,
  },
  score: { fontSize: 12, fontWeight: "800", color: colors.navy },
  track: {
    height: 8,
    backgroundColor: colors.lineSoft,
    borderRadius: 4,
    marginTop: 8,
    overflow: "hidden",
  },
  bar: { height: 8, borderRadius: 4 },
  barSelected: { borderWidth: 1, borderColor: colors.navy },
  heatmap: { paddingVertical: 14 },
  matrix: { minWidth: 635, marginTop: 16 },
  matrixRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  matrixName: {
    width: 155,
    minHeight: 44,
    justifyContent: "center",
    color: colors.muted,
    fontSize: 11,
    paddingTop: 6,
  },
  columnHeading: {
    width: 88,
    textAlign: "center",
    fontSize: 11,
    color: colors.muted,
  },
  heatCell: {
    width: 88,
    minHeight: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  heatValue: { fontSize: 12, fontWeight: "700", color: colors.text },
  detailHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 20,
    marginTop: 20,
    gap: 10,
  },
  detailScore: { fontSize: 28, fontWeight: "800", color: colors.navy },
  outOf: { fontSize: 13, color: colors.muted },
  channelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  channelCard: {
    flex: 1,
    minWidth: 125,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.primaryTint,
  },
  channelSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  channelAccent: { height: 4, width: 28, borderRadius: 2, marginBottom: 12 },
  channelLabel: { fontSize: 12, fontWeight: "700", color: colors.text },
  channelValue: {
    fontSize: 25,
    fontWeight: "800",
    color: colors.navy,
    marginTop: 8,
  },
  deviceTable: {
    marginTop: 18,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.line,
  },
  failureCallout: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.redSoft,
    borderWidth: 1,
    borderColor: colors.red,
  },
  failureTitle: { fontSize: 13, fontWeight: "800", color: colors.redText },
  failureText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.redText,
    marginTop: 4,
  },
  deviceGrid: { marginTop: 12 },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  deviceRowFailing: { backgroundColor: colors.redSoft, borderRadius: 8 },
  deviceHead: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: colors.muted,
    textTransform: "uppercase",
  },
  deviceCell: { fontSize: 12, fontWeight: "600", color: colors.text },
  deviceName: { flex: 2, minWidth: 110 },
  deviceKind: { flex: 1, minWidth: 54 },
  deviceNum: { flex: 1, minWidth: 54, textAlign: "right" },
  deviceStatus: { flex: 1, minWidth: 60, textAlign: "right" },
  deviceFailingText: { color: colors.redText, fontWeight: "800" },
  deviceOkText: { color: colors.greenText, fontWeight: "800" },
  breakdown: {
    marginTop: 18,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.line,
  },
  componentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  componentLabel: {
    width: 170,
    fontSize: 12,
    color: colors.text,
    fontWeight: "600",
  },
  componentTrack: { flex: 1, marginTop: 0 },
  componentValue: {
    width: 44,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "800",
    color: colors.navy,
  },
});
