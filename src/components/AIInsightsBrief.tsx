import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { Fragment, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import type { CustomerSentiment, LiveCompetitor } from "../data/liveData";
import {
  actionDetail,
  pickQuotes,
  prioritySignalDetail,
  ratingGapDetail,
  sentimentDetail,
} from "../data/insightDetails";
import type { InsightDetail } from "../data/insightDetails";
import { categorizeSentimentReviews } from "../data/sentimentCategories";
import type { SentimentCategory } from "../data/sentimentCategories";
import { SafeView } from "./SafeView";

type AIInsightsBriefProps = {
  reviews: CustomerSentiment[];
  competitors: LiveCompetitor[];
  brand?: string;
  brandRating?: number | null;
  country: string;
  months: number;
  loading: boolean;
  onSelectCategory: (category: SentimentCategory) => void;
  onOpenSources: () => void;
};

const monthCount = (months: number) => Math.min(Math.max(months, 1), 6);

type MonthlySentiment = {
  label: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  netBalance: number | null;
  negativeRate: number | null;
  isCurrentMonth: boolean;
};

function getMonthlySentiment(reviews: CustomerSentiment[], months: number) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - monthCount(months));
  const firstMonth = new Date(cutoff.getFullYear(), cutoff.getMonth(), 1);
  const monthSlots =
    (now.getFullYear() - firstMonth.getFullYear()) * 12 +
    now.getMonth() -
    firstMonth.getMonth() +
    1;
  return Array.from({ length: monthSlots }, (_, index) => {
    const monthStart = new Date(
      firstMonth.getFullYear(),
      firstMonth.getMonth() + index,
      1,
    );
    const nextMonth = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      1,
    );
    const matching = reviews.filter((review) => {
      if (!review.publishedAt) return false;
      const date = new Date(review.publishedAt);
      return (
        !Number.isNaN(date.getTime()) &&
        date >= cutoff &&
        date <= now &&
        date >= monthStart &&
        date < nextMonth
      );
    });
    const positive = matching.filter(
      (review) => review.sentiment === "positive",
    ).length;
    const neutral = matching.filter(
      (review) => review.sentiment === "neutral",
    ).length;
    const negative = matching.filter(
      (review) => review.sentiment === "negative",
    ).length;
    const total = positive + neutral + negative;
    const positiveShare = total ? (positive / total) * 100 : null;
    const negativeShare = total ? (negative / total) * 100 : null;
    return {
      label: monthStart.toLocaleDateString(undefined, { month: "short" }),
      positive,
      neutral,
      negative,
      total,
      netBalance:
        positiveShare !== null && negativeShare !== null
          ? positiveShare - negativeShare
          : null,
      negativeRate: negativeShare,
      isCurrentMonth:
        monthStart.getMonth() === now.getMonth() &&
        monthStart.getFullYear() === now.getFullYear(),
    };
  });
}

function getTrendPaths(months: MonthlySentiment[], chartWidth: number) {
  const left = 58;
  const right = chartWidth - 24;
  const top = 23;
  const bottom = 145;
  const points = months.map((month, index) => {
    const x =
      months.length === 1
        ? (left + right) / 2
        : left + (index / (months.length - 1)) * (right - left);
    const y =
      month.netBalance === null
        ? null
        : top + ((100 - month.netBalance) / 200) * (bottom - top);
    return { x, y };
  });
  const paths: string[] = [];
  let segment: { x: number; y: number }[] = [];
  const saveSegment = () => {
    if (segment.length > 1) {
      paths.push(
        segment
          .map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`)
          .join(" "),
      );
    }
    segment = [];
  };
  points.forEach((point) => {
    if (point.y === null) {
      saveSegment();
    } else {
      segment.push({ x: point.x, y: point.y });
    }
  });
  saveSegment();
  return { points, paths, left, right, bottom };
}

const improvementPlaybook: Record<string, { title: string; detail: string }> = {
  stability: {
    title: "Stability & recovery",
    detail:
      "Reproduce the most common crash and error reports, then verify fixes with release-level crash and recovery metrics.",
  },
  performance: {
    title: "Transfer speed",
    detail:
      "Measure median and 90th-percentile completion time by corridor and payment rail; target the slowest step first.",
  },
  fees: {
    title: "Fee & FX clarity",
    detail:
      "Review whether the recipient amount, exchange rate, and all fees are clear before confirmation; benchmark identical transfers.",
  },
  access: {
    title: "Account access",
    detail:
      "Audit sign-in, verification-code delivery, and account recovery by country; track completion and failure rates.",
  },
  transfers: {
    title: "Transfer visibility",
    detail:
      "Instrument send-to-payout timestamps and status changes, then test notification clarity on the corridors with complaints.",
  },
  support: {
    title: "Support resolution",
    detail:
      "Group repeat contact reasons and publish clear next steps and resolution expectations for the highest-volume issues.",
  },
  other: {
    title: "Unclassified feedback",
    detail:
      "Review these comments to identify a new product or service theme not covered by the current categories.",
  },
};

const corridorDeliveryClaims = [
  {
    provider: "Western Union",
    options: [
      { method: "Mobile wallet", estimate: "May be ready in minutes" },
      { method: "Cash pickup", estimate: "Can be available same day" },
      { method: "Bank transfer", estimate: "May take up to 5 days" },
    ],
    note: "Timing depends on delivery method and how the transfer is paid.",
    source: "Official US → India delivery guidance",
    url: "https://www.westernunion.com/us/en/send-money-to-india.html",
    tone: "#60A5FA",
  },
  {
    provider: "Wise",
    options: [
      {
        method: "Using an existing Wise balance",
        estimate: "Typically arrives in seconds",
      },
    ],
    note: "Wise says bank-funded transfers can be slower; amount and payment method affect timing.",
    source: "Official US → India page",
    url: "https://wise.com/us/send-money/send-money-to-india",
    tone: "#12B76A",
  },
  {
    provider: "MoneyGram",
    options: [
      {
        method: "Eligible transfers",
        estimate: "Transfers in seconds may be available",
      },
    ],
    note: "Not available for every transfer; depends on destination, pay-in, payout, recipient bank, and eligibility.",
    source: "Official US → India corridor page",
    url: "https://www.moneygram.com/us/en/corridor/india",
    tone: "#175CD3",
  },
  {
    provider: "Remitly",
    options: [
      {
        method: "Route quote required",
        estimate: "No numeric estimate on the public page",
      },
    ],
    note: "Remitly advertises delivery-time guarantees; a transaction quote is needed for a numeric estimate.",
    source: "Official US → India page",
    url: "https://www.remitly.com/us/en/money-transfer/send-money-to-india",
    tone: "#7F56D9",
  },
] as const;

function openSource(url: string) {
  void Linking.openURL(url).catch((error: unknown) => {
    console.error(
      "Could not open delivery-time source:",
      error instanceof Error ? error.message : "unknown error",
    );
  });
}

// The evidence behind an insight: what the number means, the breakdown, example comments and a next
// step. Shown under a card when it is opened.
function DetailPanel({
  detail,
  testID,
}: {
  detail: InsightDetail;
  testID: string;
}) {
  return (
    <SafeView style={styles.detailPanel} testID={testID}>
      <Text style={styles.detailExplanation}>{detail.explanation}</Text>
      {detail.rows.map((row) => (
        <SafeView key={`${row.label}-${row.value}`} style={styles.detailRow}>
          <Text style={styles.detailRowLabel}>{row.label}</Text>
          <Text style={styles.detailRowValue}>{row.value}</Text>
        </SafeView>
      ))}
      {detail.quotes.length > 0 && (
        <Text style={styles.detailSubheading}>WHAT CUSTOMERS SAID</Text>
      )}
      {detail.quotes.map((quote, index) => (
        <SafeView key={`quote-${index}`} style={styles.quote}>
          <Text style={styles.quoteText}>“{quote.text}”</Text>
          <Text style={styles.quoteMeta}>
            {quote.source} · {quote.rating}★
            {quote.date ? ` · ${quote.date}` : ""}
          </Text>
        </SafeView>
      ))}
      {detail.nextStep && (
        <SafeView style={styles.nextStep}>
          <Text style={styles.nextStepLabel}>SUGGESTED NEXT STEP</Text>
          <Text style={styles.nextStepText}>{detail.nextStep}</Text>
        </SafeView>
      )}
    </SafeView>
  );
}

function Metric({
  label,
  value,
  note,
  tone,
  open,
  onToggle,
  testID,
}: {
  label: string;
  value: string;
  note: string;
  tone: string;
  open: boolean;
  onToggle: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${label}: ${value}. ${open ? "Hide" : "Show"} details`}
      onPress={onToggle}
      style={[styles.metric, open && styles.metricOpen]}
      testID={testID}
    >
      <SafeView style={[styles.metricAccent, { backgroundColor: tone }]} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricNote}>{note}</Text>
      <SafeView style={styles.metricHint}>
        <Text style={styles.metricHintText}>
          {open ? "Hide details" : "View details"}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={11}
          color="#175CD3"
        />
      </SafeView>
    </Pressable>
  );
}

export function AIInsightsBrief({
  reviews,
  competitors,
  brand = "Western Union",
  brandRating: combinedBrandRating,
  country,
  months,
  loading,
  onSelectCategory,
  onOpenSources,
}: AIInsightsBriefProps) {
  const { width: windowWidth } = useWindowDimensions();
  // One card or action row is open at a time, so the page stays readable.
  const [openCard, setOpenCard] = useState<string | null>(null);
  const toggleCard = (id: string) =>
    setOpenCard((current) => (current === id ? null : id));
  const trendChartWidth = Math.max(360, Math.min(740, windowWidth - 80));
  const categories = categorizeSentimentReviews(reviews);
  const negative = reviews.filter(
    (review) => review.sentiment === "negative",
  ).length;
  const positive = reviews.filter(
    (review) => review.sentiment === "positive",
  ).length;
  const negativeRate = reviews.length
    ? Math.round((negative / reviews.length) * 100)
    : null;
  const priorityCategories = categories
    .filter((category) => category.negative > 0)
    .sort((left, right) => right.negative - left.negative);
  const topPriority = priorityCategories[0];
  // Improvement actions already lists the top negative categories; the
  // capability panel only covers the rest so each category is stated once.
  const actionCategoryIds = new Set(
    priorityCategories.slice(0, 5).map((category) => category.id),
  );
  const capabilityCategories = categories
    .filter(
      (category) =>
        category.reviews.length > 0 && !actionCategoryIds.has(category.id),
    )
    .slice(0, 6);
  const monthlySentiment = getMonthlySentiment(reviews, months);
  const trend = getTrendPaths(monthlySentiment, trendChartWidth);
  const totalDatedReviews = monthlySentiment.reduce(
    (sum, month) => sum + month.total,
    0,
  );
  const datedPositive = monthlySentiment.reduce(
    (sum, month) => sum + month.positive,
    0,
  );
  const datedNegative = monthlySentiment.reduce(
    (sum, month) => sum + month.negative,
    0,
  );
  const periodNetBalance = totalDatedReviews
    ? Math.round(((datedPositive - datedNegative) / totalDatedReviews) * 100)
    : null;
  const latestMonth =
    [...monthlySentiment].reverse().find((month) => month.total > 0) ?? null;
  const latestMonthNet =
    latestMonth?.netBalance === null || latestMonth?.netBalance === undefined
      ? null
      : Math.round(latestMonth.netBalance);
  const latestMonthNegativeRate =
    latestMonth?.negativeRate === null ||
    latestMonth?.negativeRate === undefined
      ? null
      : Math.round(latestMonth.negativeRate);
  const maxMonthlyVolume = Math.max(
    1,
    ...monthlySentiment.map((month) => month.total),
  );
  const sourceNames = [...new Set(reviews.map((review) => review.source))];
  const brandRating =
    combinedBrandRating ??
    competitors.find((competitor) => competitor.name === brand)?.rating;
  const otherRatedCompetitors = competitors.filter(
    (competitor) => competitor.name !== brand && competitor.rating !== null,
  );
  const leadingCompetitor = otherRatedCompetitors.sort(
    (left, right) => (right.rating ?? 0) - (left.rating ?? 0),
  )[0];
  const ratingGap =
    brandRating !== null &&
    brandRating !== undefined &&
    leadingCompetitor?.rating !== null &&
    leadingCompetitor?.rating !== undefined
      ? Number((brandRating - leadingCompetitor.rating).toFixed(1))
      : null;

  return (
    <SafeView style={styles.container}>
      <SafeView style={styles.intro}>
        <SafeView style={styles.introIcon}>
          <Ionicons name="sparkles" size={18} color="#60A5FA" />
        </SafeView>
        <SafeView style={styles.introCopy}>
          <Text style={styles.eyebrow}>
            DECISION SUPPORT · {country.toUpperCase()}
          </Text>
          <Text style={styles.introText}>
            {reviews.length
              ? `${reviews.length} comments · last ${monthCount(months)} ${monthCount(months) === 1 ? "month" : "months"}. Signals to investigate, not confirmed defects.`
              : "Insights appear once live sources return customer comments."}
          </Text>
        </SafeView>
      </SafeView>

      <SafeView style={styles.metricGrid}>
        <Metric
          label="Negative feedback"
          value={negativeRate === null ? "—" : `${negativeRate}%`}
          note={`${negative} of ${reviews.length} collected comments`}
          tone="#B42318"
          open={openCard === "negative"}
          onToggle={() => toggleCard("negative")}
          testID="insight-card-negative"
        />
        <Metric
          label="Positive feedback"
          value={
            reviews.length
              ? `${Math.round((positive / reviews.length) * 100)}%`
              : "—"
          }
          note={`${positive} positive comments in this sample`}
          tone="#027A48"
          open={openCard === "positive"}
          onToggle={() => toggleCard("positive")}
          testID="insight-card-positive"
        />
        <Metric
          label="Highest-priority signal"
          value={topPriority ? String(topPriority.negative) : "—"}
          note={
            topPriority
              ? `${topPriority.label} negative comments`
              : "No categorized negative comments"
          }
          tone="#60A5FA"
          open={openCard === "priority"}
          onToggle={() => toggleCard("priority")}
          testID="insight-card-priority"
        />
        <Metric
          label="App rating gap"
          value={
            ratingGap === null
              ? "—"
              : `${ratingGap > 0 ? "+" : ""}${ratingGap.toFixed(1)}`
          }
          note={
            ratingGap === null
              ? "Live peer rating unavailable"
              : `vs ${leadingCompetitor?.name} · ${leadingCompetitor?.rating?.toFixed(1)} / 5`
          }
          tone="#B54708"
          open={openCard === "gap"}
          onToggle={() => toggleCard("gap")}
          testID="insight-card-gap"
        />
      </SafeView>
      {openCard === "negative" && (
        <DetailPanel
          detail={sentimentDetail(reviews, "negative", categories)}
          testID="insight-detail-negative"
        />
      )}
      {openCard === "positive" && (
        <DetailPanel
          detail={sentimentDetail(reviews, "positive", categories)}
          testID="insight-detail-positive"
        />
      )}
      {openCard === "priority" && (
        <DetailPanel
          detail={prioritySignalDetail(topPriority, negative)}
          testID="insight-detail-priority"
        />
      )}
      {openCard === "gap" && (
        <DetailPanel
          detail={ratingGapDetail(brand, brandRating, competitors)}
          testID="insight-detail-gap"
        />
      )}

      <SafeView style={styles.panel}>
        <SafeView style={styles.panelHeader}>
          <SafeView style={styles.panelTitleGroup}>
            <Ionicons name="analytics-outline" size={17} color="#60A5FA" />
            <Text style={styles.panelTitle}>Executive feedback trend</Text>
          </SafeView>
          <Text style={styles.panelHint}>MONTHLY · DATED COMMENTS ONLY</Text>
        </SafeView>
        {totalDatedReviews > 0 ? (
          <>
            <SafeView style={styles.chartLegend}>
              <Text style={styles.legendItem}>
                <Text style={styles.positiveLegend}>● </Text>Net sentiment
              </Text>
              <Text style={styles.legendItem}>
                <Text style={styles.neutralLegend}>▮ </Text>Comment volume
              </Text>
              <Text style={styles.legendDefinition}>
                Positive share − negative share
              </Text>
            </SafeView>
            <SafeView style={styles.trendSummary}>
              <SafeView
                style={[styles.trendSummaryCard, styles.trendSummaryPrimary]}
              >
                <Text style={styles.trendSummaryLabel}>
                  PERIOD NET SENTIMENT
                </Text>
                <Text
                  style={[
                    styles.trendSummaryValue,
                    periodNetBalance !== null &&
                      (periodNetBalance >= 0
                        ? styles.trendValuePositive
                        : styles.trendValueNegative),
                  ]}
                >
                  {periodNetBalance === null
                    ? "—"
                    : `${periodNetBalance > 0 ? "+" : ""}${periodNetBalance} pp`}
                </Text>
                <Text style={styles.trendSummaryNote}>
                  Positive share minus negative share · all dated comments
                </Text>
              </SafeView>
              <SafeView style={styles.trendSummaryCard}>
                <Text style={styles.trendSummaryLabel}>LATEST MONTH</Text>
                <Text
                  style={[
                    styles.trendSummaryValue,
                    latestMonthNet !== null &&
                      (latestMonthNet >= 0
                        ? styles.trendValuePositive
                        : styles.trendValueNegative),
                  ]}
                >
                  {latestMonthNet === null
                    ? "—"
                    : `${latestMonthNet > 0 ? "+" : ""}${latestMonthNet} pp`}
                </Text>
                <Text style={styles.trendSummaryNote}>
                  {latestMonth
                    ? `${latestMonth.label}${latestMonth.isCurrentMonth ? " · month to date" : ""} · ${latestMonthNegativeRate ?? 0}% negative`
                    : "No dated comments"}
                </Text>
              </SafeView>
              <SafeView style={styles.trendSummaryCard}>
                <Text style={styles.trendSummaryLabel}>DATED SAMPLE</Text>
                <Text style={styles.trendSummaryValue}>
                  {totalDatedReviews.toLocaleString()}
                </Text>
                <Text style={styles.trendSummaryNote}>
                  Across{" "}
                  {monthlySentiment.filter((month) => month.total > 0).length}{" "}
                  months with returned data
                </Text>
              </SafeView>
            </SafeView>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <Svg
                width={trendChartWidth}
                height={254}
                viewBox={`0 0 ${trendChartWidth} 254`}
              >
                {[
                  { value: 100, label: "+100" },
                  { value: 50, label: "+50" },
                  { value: 0, label: "0" },
                  { value: -50, label: "−50" },
                  { value: -100, label: "−100" },
                ].map((tick) => {
                  const y =
                    23 + ((100 - tick.value) / 200) * (trend.bottom - 23);
                  return (
                    <Fragment key={tick.label}>
                      <Line
                        x1={trend.left}
                        x2={trend.right}
                        y1={y}
                        y2={y}
                        stroke={tick.value === 0 ? "#98A2B3" : "#EAECF0"}
                        strokeWidth={tick.value === 0 ? 1.5 : 1}
                        strokeDasharray={tick.value === 0 ? undefined : "3 5"}
                      />
                      <SvgText
                        x={trend.left - 10}
                        y={y + 3}
                        fill="#667085"
                        fontSize="8"
                        textAnchor="end"
                      >
                        {tick.label}
                      </SvgText>
                    </Fragment>
                  );
                })}
                <SvgText
                  x={14}
                  y={15}
                  fill="#667085"
                  fontSize="8"
                  fontWeight="700"
                >
                  NET PP
                </SvgText>
                {trend.paths.map((path, index) => (
                  <Path
                    key={`trend-path-${index}`}
                    d={path}
                    fill="none"
                    stroke="#60A5FA"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {trend.points.map((point, index) => {
                  const month = monthlySentiment[index];
                  const barHeight = month.total
                    ? Math.max(3, (month.total / maxMonthlyVolume) * 30)
                    : 2;
                  const barX = point.x - 12;
                  const barY = 218 - barHeight;
                  const balance = month.netBalance ?? 0;
                  return (
                    <Fragment key={`month-point-${month.label}-${index}`}>
                      {point.y !== null && (
                        <>
                          <Line
                            x1={point.x}
                            x2={point.x}
                            y1={point.y + 6}
                            y2={barY - 5}
                            stroke="#60A5FA"
                            strokeOpacity={0.12}
                            strokeDasharray="2 4"
                          />
                          <Circle
                            cx={point.x}
                            cy={point.y}
                            r={index === trend.points.length - 1 ? 6 : 4.5}
                            fill={balance >= 0 ? "#12B76A" : "#F04438"}
                            stroke="#FFFFFF"
                            strokeWidth={2}
                          />
                          <SvgText
                            x={point.x}
                            y={point.y - 10}
                            fill="#344054"
                            fontSize="8"
                            fontWeight="800"
                            textAnchor="middle"
                          >
                            {`${balance > 0 ? "+" : ""}${Math.round(balance)} pp`}
                          </SvgText>
                        </>
                      )}
                      {month.total > 0 && (
                        <>
                          <Path
                            d={`M ${barX} 218 L ${barX} ${barY + 4} Q ${barX} ${barY} ${barX + 4} ${barY} L ${barX + 20} ${barY} Q ${barX + 24} ${barY} ${barX + 24} ${barY + 4} L ${barX + 24} 218 Z`}
                            fill="#BFDBFE"
                          />
                          <SvgText
                            x={point.x}
                            y={barY - 5}
                            fill="#667085"
                            fontSize="7"
                            fontWeight="700"
                            textAnchor="middle"
                          >
                            {month.total}
                          </SvgText>
                        </>
                      )}
                      <SvgText
                        x={point.x}
                        y={239}
                        fill="#475467"
                        fontSize="9"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {month.label}
                      </SvgText>
                    </Fragment>
                  );
                })}
              </Svg>
            </ScrollView>
            <Text style={styles.chartFootnote}>
              Net sentiment is a descriptive balance, not NPS: positive share
              minus negative share, from −100 to +100 pp. Blue bars show
              returned comment volume. The current month is partial; gaps mean
              no dated comments were returned.
            </Text>
          </>
        ) : (
          <Text style={styles.emptyText}>
            {loading
              ? "Collecting dated reviews…"
              : "No dated comments are available for this period."}
          </Text>
        )}
      </SafeView>

      <SafeView style={styles.panel}>
        <SafeView style={styles.panelHeader}>
          <SafeView style={styles.panelTitleGroup}>
            <Ionicons name="build-outline" size={17} color="#60A5FA" />
            <Text style={styles.panelTitle}>Improvement actions</Text>
          </SafeView>
          <Text style={styles.panelHint}>RANKED BY NEGATIVE MENTIONS</Text>
        </SafeView>
        {priorityCategories.length ? (
          priorityCategories.slice(0, 5).map((category, index) => {
            const action = improvementPlaybook[category.id];
            const share = negative
              ? Math.round((category.negative / negative) * 100)
              : 0;
            return (
              <SafeView key={category.id} style={styles.actionRow}>
                <SafeView style={styles.actionRank}>
                  <Text style={styles.actionRankText}>{index + 1}</Text>
                </SafeView>
                <SafeView style={styles.actionCopy}>
                  <SafeView style={styles.actionHeading}>
                    <Text style={styles.actionTitle}>{action.title}</Text>
                    <Text style={styles.actionCount}>
                      {category.negative} negative · {share}%
                    </Text>
                  </SafeView>
                  <Text style={styles.actionDetail}>{action.detail}</Text>
                  <SafeView style={styles.actionLinks}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{
                        expanded: openCard === `action-${category.id}`,
                      }}
                      onPress={() => toggleCard(`action-${category.id}`)}
                      style={styles.evidenceLink}
                      testID={`insight-action-${category.id}`}
                    >
                      <Text style={styles.detailLinkText}>
                        {openCard === `action-${category.id}`
                          ? "Hide breakdown"
                          : "View breakdown"}
                      </Text>
                      <Ionicons
                        name={
                          openCard === `action-${category.id}`
                            ? "chevron-up"
                            : "chevron-down"
                        }
                        size={11}
                        color="#175CD3"
                      />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onSelectCategory(category)}
                      style={styles.evidenceLink}
                    >
                      <Text style={styles.evidenceLinkText}>
                        Review matching comments
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={12}
                        color="#B42318"
                      />
                    </Pressable>
                  </SafeView>
                  {openCard === `action-${category.id}` && (
                    <DetailPanel
                      detail={{
                        ...actionDetail(category, negative),
                        nextStep: action.detail,
                      }}
                      testID={`insight-detail-action-${category.id}`}
                    />
                  )}
                </SafeView>
              </SafeView>
            );
          })
        ) : (
          <Text style={styles.emptyText}>
            No negative issue category is present in the current sample. Keep
            monitoring feedback as new reviews arrive.
          </Text>
        )}
        <Text style={styles.chartFootnote}>
          Mentions are rule-based categories. A comment can appear in more than
          one category; validate the original comments before prioritizing a
          change.
        </Text>
      </SafeView>

      <SafeView style={styles.panel}>
        <SafeView style={styles.panelHeader}>
          <SafeView style={styles.panelTitleGroup}>
            <Ionicons name="options-outline" size={17} color="#60A5FA" />
            <Text style={styles.panelTitle}>Capability comparison signals</Text>
          </SafeView>
          <Text style={styles.panelHint}>NOT A VERIFIED FEATURE AUDIT</Text>
        </SafeView>
        <Text style={styles.panelDescription}>
          Remaining categories not already listed under Improvement actions.
          Customer comments can reveal areas to investigate; they do not prove a
          feature is missing, and competitor capabilities are not connected to a
          verified feature feed.
        </Text>
        {capabilityCategories.map((category) => {
          const total = category.reviews.length;
          const negativePercent = total
            ? Math.round((category.negative / total) * 100)
            : 0;
          const positivePercent = total
            ? Math.round((category.positive / total) * 100)
            : 0;
          const capabilityId = `capability-${category.id}`;
          const capabilityOpen = openCard === capabilityId;
          return (
            <Fragment key={category.id}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: capabilityOpen }}
                onPress={() => toggleCard(capabilityId)}
                style={styles.capabilityRow}
                testID={`insight-${capabilityId}`}
              >
                <SafeView style={styles.capabilityCopy}>
                  <Text style={styles.capabilityTitle}>{category.label}</Text>
                  <Text style={styles.capabilityDetail}>
                    {category.negative} negative / {total} matching comments
                  </Text>
                  <SafeView style={styles.capabilityMeter}>
                    <SafeView style={styles.capabilityMeterTrack}>
                      <SafeView
                        style={[
                          styles.capabilityMeterFill,
                          { width: `${negativePercent}%` },
                          negativePercent === 0 &&
                            styles.capabilityMeterFillGood,
                        ]}
                      />
                    </SafeView>
                    <Text
                      style={[
                        styles.capabilityMeterValue,
                        negativePercent > 0 &&
                          styles.capabilityMeterValueAttention,
                      ]}
                    >
                      {negativePercent}% negative
                    </Text>
                  </SafeView>
                  <Text style={styles.capabilitySubDetail}>
                    {positivePercent}% positive · {category.neutral} neutral
                  </Text>
                </SafeView>
                <SafeView
                  style={[
                    styles.statusPill,
                    category.negative > 0 && styles.statusPillAttention,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      category.negative > 0 && styles.statusTextAttention,
                    ]}
                  >
                    {category.negative > 0
                      ? "Review signal"
                      : "No negative signal"}
                  </Text>
                </SafeView>
                <Text style={styles.unverified}>Peer data n/a</Text>
              </Pressable>
              {capabilityOpen && (
                <SafeView>
                  <DetailPanel
                    detail={{
                      explanation: `${category.reviews.length} comments mention ${category.label.toLowerCase()}: ${category.negative} negative, ${category.neutral} neutral and ${category.positive} positive. Customer comments can point to an area to investigate; they do not prove a feature is missing.`,
                      rows: [],
                      quotes: pickQuotes(
                        category.reviews,
                        category.negative > 0 ? "negative" : "positive",
                      ),
                      nextStep: null,
                    }}
                    testID={`insight-detail-${capabilityId}`}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => onSelectCategory(category)}
                    style={styles.evidenceLink}
                  >
                    <Text style={styles.evidenceLinkText}>
                      Review matching comments
                    </Text>
                    <Ionicons name="arrow-forward" size={12} color="#B42318" />
                  </Pressable>
                </SafeView>
              )}
            </Fragment>
          );
        })}
        {!capabilityCategories.length && (
          <Text style={styles.emptyText}>
            {categories.length
              ? "Every category with comments already appears under Improvement actions above, so nothing is repeated here."
              : "No capability-related comments are available in this sample."}
          </Text>
        )}
      </SafeView>

      <SafeView style={styles.panel}>
        <SafeView style={styles.panelHeader}>
          <SafeView style={styles.panelTitleGroup}>
            <Ionicons
              name="swap-horizontal-outline"
              size={17}
              color="#60A5FA"
            />
            <Text style={styles.panelTitle}>End-to-end corridor time</Text>
          </SafeView>
          <Text style={styles.panelHint}>US → INDIA · PUBLISHED CLAIMS</Text>
        </SafeView>
        <SafeView style={styles.averageCallout}>
          <SafeView style={styles.averageIcon}>
            <Ionicons name="time-outline" size={18} color="#B54708" />
          </SafeView>
          <SafeView style={styles.averageCopy}>
            <Text style={styles.averageLabel}>
              Observed average transaction time
            </Text>
            <Text style={styles.averageValue}>Not available</Text>
            <Text style={styles.averageNote}>
              No transaction start and payout timestamps are connected.
              Provider-published estimates below are not actual measured
              averages and use different transfer methods.
            </Text>
          </SafeView>
        </SafeView>
        <SafeView style={styles.publishedSpan}>
          <Text style={styles.publishedSpanLabel}>Published claim span</Text>
          <Text style={styles.publishedSpanValue}>Seconds → up to 5 days</Text>
          <Text style={styles.publishedSpanNote}>
            Different eligibility, payment, and payout methods; not a
            like-for-like average.
          </Text>
        </SafeView>
        <SafeView style={styles.comparisonCards}>
          {corridorDeliveryClaims.map((claim) => (
            <SafeView key={claim.provider} style={styles.providerTimingCard}>
              <SafeView style={styles.providerTimingHeader}>
                <SafeView
                  style={[styles.providerMark, { backgroundColor: claim.tone }]}
                />
                <Text style={styles.providerName}>{claim.provider}</Text>
                <Text style={styles.publishedTag}>PUBLISHED</Text>
              </SafeView>
              {claim.options.map((option) => (
                <SafeView key={option.method} style={styles.timingOption}>
                  <Text style={styles.timingMethod}>{option.method}</Text>
                  <Text style={styles.timingEstimate}>{option.estimate}</Text>
                </SafeView>
              ))}
              <Text style={styles.providerTimingNote}>{claim.note}</Text>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Open ${claim.provider} source`}
                onPress={() => openSource(claim.url)}
                style={styles.sourceLink}
              >
                <Text style={styles.sourceLinkText}>{claim.source}</Text>
                <Ionicons name="open-outline" size={11} color="#175CD3" />
              </Pressable>
            </SafeView>
          ))}
        </SafeView>
        <Text style={styles.panelDescription}>
          Provider statements were checked on November 9, 2026. They may change
          and are not guarantees for every transaction. To calculate a true
          average, compare completed transfers for the same amount, funding
          method, payout method, and corridor using
          initiation-to-funds-available timestamps.
        </Text>
        <SafeView style={styles.dataNeeds}>
          <Text style={styles.dataNeedsLabel}>DATA NEEDED</Text>
          <Text style={styles.dataNeedsText}>
            US → India · transfer amount · payment method · payout method ·
            initiatedAt · fundsAvailableAt
          </Text>
        </SafeView>
      </SafeView>

      <SafeView style={styles.panel}>
        <SafeView style={styles.panelHeader}>
          <SafeView style={styles.panelTitleGroup}>
            <Ionicons name="megaphone-outline" size={17} color="#60A5FA" />
            <Text style={styles.panelTitle}>Competitor offering watch</Text>
          </SafeView>
          <Text style={styles.panelHint}>NO LAUNCH FEED</Text>
        </SafeView>
        <Text style={styles.panelDescription}>
          {sourceNames.length
            ? `Review sources connected: ${sourceNames.join(", ")}. These feeds contain customer comments, not verified competitor product announcements.`
            : "No review sources have returned comments yet."}
        </Text>
        <SafeView style={styles.watchNotice}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#175CD3"
          />
          <Text style={styles.watchNoticeText}>
            New competitor offerings cannot be confirmed from app ratings alone.
            Connect official release notes, product pages, or approved news
            monitoring before reporting a launch.
          </Text>
        </SafeView>
        <Pressable
          accessibilityRole="button"
          onPress={onOpenSources}
          style={styles.sourcesButton}
        >
          <Text style={styles.sourcesButtonText}>Review data source setup</Text>
          <Ionicons name="arrow-forward" size={13} color="#B42318" />
        </Pressable>
      </SafeView>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  intro: {
    flexDirection: "row",
    gap: 11,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFFBFA",
  },
  introIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE4E2",
  },
  introCopy: { flex: 1 },
  eyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.9,
    color: "#B42318",
  },
  introText: { marginTop: 4, fontSize: 11, lineHeight: 17, color: "#475467" },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: {
    position: "relative",
    overflow: "hidden",
    flexGrow: 1,
    flexBasis: 140,
    minHeight: 104,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EAECF0",
    backgroundColor: "#FFFFFF",
  },
  metricAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  metricLabel: { fontSize: 9, fontWeight: "800", color: "#667085" },
  metricValue: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "900",
    color: "#101828",
  },
  metricNote: { marginTop: 3, fontSize: 9, lineHeight: 13, color: "#667085" },
  panel: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EAECF0",
    backgroundColor: "#FFFFFF",
  },
  panelHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  panelTitleGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  panelTitle: { fontSize: 13, fontWeight: "900", color: "#101828" },
  panelHint: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: "#98A2B3",
  },
  panelDescription: {
    marginBottom: 10,
    fontSize: 10,
    lineHeight: 16,
    color: "#667085",
  },
  chartLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  legendItem: { fontSize: 9, fontWeight: "700", color: "#475467" },
  positiveLegend: { color: "#60A5FA" },
  neutralLegend: { color: "#D4B900" },
  legendDefinition: { marginLeft: "auto", fontSize: 8, color: "#98A2B3" },
  trendSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 2,
  },
  trendSummaryCard: {
    flexGrow: 1,
    flexBasis: 135,
    minHeight: 72,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EAECF0",
    backgroundColor: "#FFFFFF",
  },
  trendSummaryPrimary: { borderColor: "#FECACA", backgroundColor: "#FFFBFA" },
  trendSummaryLabel: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.6,
    color: "#667085",
  },
  trendSummaryValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "900",
    color: "#101828",
  },
  trendValuePositive: { color: "#027A48" },
  trendValueNegative: { color: "#B42318" },
  trendSummaryNote: {
    marginTop: 2,
    fontSize: 8,
    lineHeight: 12,
    color: "#667085",
  },
  chartFootnote: {
    marginTop: 8,
    fontSize: 9,
    lineHeight: 14,
    color: "#98A2B3",
  },
  emptyText: {
    paddingVertical: 8,
    fontSize: 10,
    lineHeight: 16,
    color: "#667085",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F2F4F7",
  },
  actionRank: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3F2",
  },
  actionRankText: { fontSize: 10, fontWeight: "900", color: "#B42318" },
  actionCopy: { flex: 1 },
  actionHeading: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 5,
  },
  actionTitle: { fontSize: 11, fontWeight: "900", color: "#101828" },
  actionCount: { fontSize: 9, fontWeight: "800", color: "#B42318" },
  actionDetail: {
    marginTop: 5,
    fontSize: 10,
    lineHeight: 15,
    color: "#475467",
  },
  actionLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 16,
  },
  detailLinkText: { fontSize: 9, fontWeight: "900", color: "#175CD3" },
  metricOpen: { borderColor: "#84CAFF", backgroundColor: "#F5FAFF" },
  metricHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  metricHintText: { fontSize: 8, fontWeight: "900", color: "#175CD3" },
  detailPanel: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#B2DDFF",
    backgroundColor: "#F5FAFF",
  },
  detailExplanation: { fontSize: 10, lineHeight: 16, color: "#344054" },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#E0EAF5",
  },
  detailRowLabel: { flex: 1, fontSize: 9, color: "#475467" },
  detailRowValue: { fontSize: 9, fontWeight: "900", color: "#101828" },
  detailSubheading: {
    marginTop: 10,
    marginBottom: 4,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: "#667085",
  },
  quote: {
    marginTop: 6,
    paddingLeft: 9,
    borderLeftWidth: 3,
    borderLeftColor: "#84CAFF",
  },
  quoteText: { fontSize: 10, lineHeight: 15, color: "#344054" },
  quoteMeta: { marginTop: 2, fontSize: 8, color: "#667085" },
  nextStep: {
    marginTop: 10,
    padding: 9,
    borderRadius: 8,
    backgroundColor: "#EFF8FF",
  },
  nextStepLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: "#175CD3",
  },
  nextStepText: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 15,
    color: "#1849A9",
  },
  evidenceLink: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 7,
    minHeight: 24,
  },
  evidenceLinkText: { fontSize: 9, fontWeight: "900", color: "#B42318" },
  capabilityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: "#F2F4F7",
  },
  capabilityCopy: { flex: 1, minWidth: 150 },
  capabilityTitle: { fontSize: 10, fontWeight: "800", color: "#344054" },
  capabilityDetail: { marginTop: 3, fontSize: 8, color: "#667085" },
  capabilityMeter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 6,
  },
  capabilityMeterTrack: {
    flex: 1,
    maxWidth: 140,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F2F4F7",
    overflow: "hidden",
  },
  capabilityMeterFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F04438",
  },
  capabilityMeterFillGood: { backgroundColor: "#12B76A" },
  capabilityMeterValue: { fontSize: 9, fontWeight: "900", color: "#667085" },
  capabilityMeterValueAttention: { color: "#B42318" },
  capabilitySubDetail: { marginTop: 3, fontSize: 8, color: "#98A2B3" },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#F2F4F7",
  },
  statusPillAttention: { backgroundColor: "#FEF3F2" },
  statusText: { fontSize: 8, fontWeight: "800", color: "#667085" },
  statusTextAttention: { color: "#B42318" },
  unverified: { width: 92, textAlign: "right", fontSize: 8, color: "#98A2B3" },
  comparisonCards: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  comparisonCard: {
    flexGrow: 1,
    flexBasis: 150,
    padding: 12,
    borderRadius: 9,
    backgroundColor: "#F9FAFB",
  },
  comparisonLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: "#667085",
  },
  comparisonValue: {
    marginTop: 7,
    fontSize: 15,
    fontWeight: "900",
    color: "#344054",
  },
  comparisonDetail: {
    marginTop: 4,
    fontSize: 9,
    lineHeight: 14,
    color: "#667085",
  },
  averageCallout: {
    flexDirection: "row",
    gap: 10,
    padding: 11,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#FEDF89",
    backgroundColor: "#FFFAEB",
  },
  averageIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF0C7",
  },
  averageCopy: { flex: 1 },
  averageLabel: { fontSize: 9, fontWeight: "800", color: "#7A2E0E" },
  averageValue: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: "900",
    color: "#7A2E0E",
  },
  averageNote: { marginTop: 3, fontSize: 9, lineHeight: 14, color: "#93370D" },
  publishedSpan: {
    marginTop: 9,
    padding: 11,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
  },
  publishedSpanLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.6,
    color: "#667085",
  },
  publishedSpanValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "900",
    color: "#101828",
  },
  publishedSpanNote: {
    marginTop: 3,
    fontSize: 9,
    lineHeight: 14,
    color: "#667085",
  },
  providerTimingCard: {
    flexGrow: 1,
    flexBasis: 225,
    padding: 11,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#EAECF0",
    backgroundColor: "#FFFFFF",
  },
  providerTimingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
  },
  providerMark: { width: 8, height: 8, borderRadius: 4 },
  providerName: { flex: 1, fontSize: 11, fontWeight: "900", color: "#101828" },
  publishedTag: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.4,
    color: "#667085",
  },
  timingOption: {
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: "#F2F4F7",
  },
  timingMethod: { fontSize: 8, fontWeight: "700", color: "#667085" },
  timingEstimate: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
    color: "#344054",
  },
  providerTimingNote: {
    marginTop: 5,
    fontSize: 8,
    lineHeight: 13,
    color: "#667085",
  },
  sourceLink: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 28,
    marginTop: 5,
  },
  sourceLinkText: { fontSize: 8, fontWeight: "800", color: "#175CD3" },
  dataNeeds: { padding: 10, borderRadius: 8, backgroundColor: "#F9FAFB" },
  dataNeedsLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: "#667085",
  },
  dataNeedsText: {
    marginTop: 4,
    fontSize: 9,
    lineHeight: 14,
    color: "#475467",
  },
  watchNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#B2DDFF",
    backgroundColor: "#EFF8FF",
  },
  watchNoticeText: { flex: 1, fontSize: 9, lineHeight: 15, color: "#1849A9" },
  sourcesButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 34,
    marginTop: 8,
    paddingHorizontal: 9,
  },
  sourcesButtonText: { fontSize: 9, fontWeight: "900", color: "#B42318" },
});
