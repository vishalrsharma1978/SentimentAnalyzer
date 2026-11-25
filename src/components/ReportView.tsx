import { Ionicons } from "@expo/vector-icons";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
} from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import type {
  BarDatum,
  Callout,
  Kpi,
  MonthPoint,
  Report,
} from "../data/reportData";
import { colors, fonts } from "../theme";
import { SafeView } from "./SafeView";

const toneColor = {
  good: colors.green,
  watch: colors.orange,
  risk: colors.red,
  neutral: colors.navy,
} as const;
const toneSoft = {
  good: colors.greenSoft,
  watch: colors.orangeSoft,
  risk: colors.redSoft,
  neutral: colors.primaryTint,
} as const;
const toneText = {
  good: colors.greenText,
  watch: colors.orangeText,
  risk: colors.redText,
  neutral: colors.navy,
} as const;

function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <SafeView style={[styles.kpi, { borderTopColor: toneColor[kpi.tone] }]}>
      <Text style={styles.kpiLabel}>{kpi.label.toUpperCase()}</Text>
      <Text style={styles.kpiValue}>{kpi.value}</Text>
      {kpi.delta && (
        <Text style={[styles.kpiDelta, { color: toneText[kpi.tone] }]}>
          {kpi.delta}
        </Text>
      )}
    </SafeView>
  );
}

function CalloutRow({ callout }: { callout: Callout }) {
  return (
    <SafeView
      style={[
        styles.callout,
        {
          backgroundColor: toneSoft[callout.tone],
          borderLeftColor: toneColor[callout.tone],
        },
      ]}
    >
      <Text style={[styles.calloutHeadline, { color: toneText[callout.tone] }]}>
        {callout.headline}
      </Text>
      <Text style={styles.calloutDetail}>{callout.detail}</Text>
    </SafeView>
  );
}

const ROW = 24;
const LABEL_WIDTH = 132;
const VALUE_WIDTH = 64;

/** Horizontal bars, longest first. `max` fixes the scale so a rating chart runs 0–5. */
function BarChart({
  title,
  note,
  data,
  width,
  max,
}: {
  title: string;
  note?: string;
  data: BarDatum[];
  width: number;
  max?: number;
}) {
  const scale = max ?? Math.max(...data.map((item) => item.value), 1);
  const track = Math.max(80, width - LABEL_WIDTH - VALUE_WIDTH - 8);
  return (
    <SafeView style={styles.chart}>
      <Text style={styles.chartTitle}>{title}</Text>
      {note && <Text style={styles.chartNote}>{note}</Text>}
      <Svg
        width={width}
        height={data.length * ROW + 4}
        accessibilityLabel={title}
      >
        {data.map((item, index) => {
          const y = index * ROW + 2;
          const length = Math.max(2, (item.value / scale) * track);
          const fill = item.highlight
            ? colors.navy
            : item.tone
              ? toneColor[item.tone]
              : colors.sky;
          return (
            <G key={`${item.label}-${index}`}>
              <SvgText
                x={LABEL_WIDTH - 8}
                y={y + 14}
                fontSize="10"
                fontWeight={item.highlight ? "800" : "400"}
                fill={colors.text}
                textAnchor="end"
              >
                {item.label.length > 20
                  ? `${item.label.slice(0, 19)}…`
                  : item.label}
              </SvgText>
              <Rect
                x={LABEL_WIDTH}
                y={y + 3}
                width={track}
                height={ROW - 10}
                rx={4}
                fill={colors.lineSoft}
              />
              <Rect
                x={LABEL_WIDTH}
                y={y + 3}
                width={length}
                height={ROW - 10}
                rx={4}
                fill={fill}
              />
              <SvgText
                x={LABEL_WIDTH + track + 8}
                y={y + 14}
                fontSize="10"
                fontWeight="800"
                fill={colors.navy}
              >
                {item.display}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </SafeView>
  );
}

/** One stacked bar showing the positive / neutral / negative split. */
function SentimentSplit({
  split,
  width,
}: {
  split: NonNullable<Report["sentiment"]>;
  width: number;
}) {
  const share = (value: number) => (value / split.total) * 100;
  const parts = [
    { key: "Positive", value: split.positive, color: colors.green },
    { key: "Neutral", value: split.neutral, color: colors.faint },
    { key: "Negative", value: split.negative, color: colors.red },
  ];
  const barWidth = Math.max(120, width - 4);
  let offset = 0;
  return (
    <SafeView style={styles.chart}>
      <Text style={styles.chartTitle}>Sentiment split</Text>
      <Text style={styles.chartNote}>
        {split.total.toLocaleString("en-US")} comments · from review star
        ratings
      </Text>
      <Svg width={barWidth} height={26} accessibilityLabel="Sentiment split">
        {parts.map((part) => {
          const length = (share(part.value) / 100) * barWidth;
          const x = offset;
          offset += length;
          return length > 0 ? (
            <Rect
              key={part.key}
              x={x}
              y={2}
              width={length}
              height={22}
              fill={part.color}
            />
          ) : null;
        })}
      </Svg>
      <SafeView style={styles.legend}>
        {parts.map((part) => (
          <Text key={part.key} style={styles.legendItem}>
            <Text style={{ color: part.color }}>● </Text>
            {part.key} {Math.round(share(part.value))}% ({part.value})
          </Text>
        ))}
      </SafeView>
    </SafeView>
  );
}

/** Net-sentiment line over comment-volume bars, one point per month. */
function TrendChart({ trend, width }: { trend: MonthPoint[]; width: number }) {
  const left = 40;
  const right = width - 16;
  const top = 18;
  const bottom = 118;
  const peak = Math.max(1, ...trend.map((month) => month.total));
  const x = (index: number) =>
    trend.length === 1
      ? (left + right) / 2
      : left + (index / (trend.length - 1)) * (right - left);
  const y = (net: number) => top + ((100 - net) / 200) * (bottom - top);
  const points = trend.flatMap((month, index) =>
    month.net === null ? [] : [{ x: x(index), y: y(month.net), month }],
  );
  const path = points
    .map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`)
    .join(" ");
  return (
    <SafeView style={styles.chart}>
      <Text style={styles.chartTitle}>Monthly net sentiment</Text>
      <Text style={styles.chartNote}>
        Line: positive share minus negative share (pp). Bars: comment volume.
      </Text>
      <Svg
        width={width}
        height={158}
        accessibilityLabel="Monthly net sentiment"
      >
        {[100, 0, -100].map((tick) => (
          <G key={tick}>
            <Line
              x1={left}
              x2={right}
              y1={y(tick)}
              y2={y(tick)}
              stroke={tick === 0 ? colors.faint : colors.line}
              strokeDasharray={tick === 0 ? undefined : "3 4"}
            />
            <SvgText
              x={left - 6}
              y={y(tick) + 3}
              fontSize="8"
              fill={colors.muted}
              textAnchor="end"
            >
              {tick > 0 ? `+${tick}` : String(tick)}
            </SvgText>
          </G>
        ))}
        {trend.map((month, index) => {
          const height = month.total
            ? Math.max(3, (month.total / peak) * 26)
            : 0;
          return (
            <G key={`bar-${month.label}-${index}`}>
              {height > 0 && (
                <Rect
                  x={x(index) - 9}
                  y={bottom + 8 - height + 14}
                  width={18}
                  height={height}
                  rx={3}
                  fill={colors.primarySoft}
                />
              )}
              <SvgText
                x={x(index)}
                y={152}
                fontSize="9"
                fill={colors.text}
                textAnchor="middle"
              >
                {month.label}
              </SvgText>
            </G>
          );
        })}
        {points.length > 1 && (
          <Path d={path} fill="none" stroke={colors.sky} strokeWidth={2.5} />
        )}
        {points.map((point) => (
          <G key={`point-${point.month.label}`}>
            <Circle
              cx={point.x}
              cy={point.y}
              r={4.5}
              fill={(point.month.net ?? 0) >= 0 ? colors.green : colors.red}
              stroke="#fff"
              strokeWidth={1.5}
            />
            <SvgText
              x={point.x}
              y={point.y - 8}
              fontSize="8"
              fontWeight="800"
              fill={colors.navy}
              textAnchor="middle"
            >
              {`${(point.month.net ?? 0) > 0 ? "+" : ""}${point.month.net}`}
            </SvgText>
          </G>
        ))}
      </Svg>
    </SafeView>
  );
}

function DataTable({ table }: { table: Report["tables"][number] }) {
  // Column sizing: "#" stays narrow, the name column (first text column) gets
  // the most room, and every other column keeps a readable minimum. Tables
  // wider than the card scroll horizontally instead of crushing the text.
  const hasRank = table.headers[0] === "#";
  const nameIndex = hasRank ? 1 : 0;
  const columnStyle = (index: number) => {
    if (hasRank && index === 0) return styles.cellRank;
    if (index === nameIndex) return styles.cellName;
    return styles.cell;
  };
  const minTableWidth =
    (hasRank ? 30 : 0) + 130 + (table.headers.length - nameIndex - 1) * 76;
  return (
    <SafeView style={styles.chart}>
      <Text style={styles.chartTitle}>{table.title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.tableScrollContent}
      >
        <SafeView style={[styles.tableBody, { minWidth: minTableWidth }]}>
          <SafeView style={styles.tableHeader}>
            {table.headers.map((header, index) => (
              <Text
                key={header}
                style={[styles.tableHead, columnStyle(index)]}
                numberOfLines={2}
              >
                {header}
              </Text>
            ))}
          </SafeView>
          {table.rows.map((row, rowIndex) => (
            <SafeView
              key={`${table.title}-${rowIndex}`}
              style={[
                styles.tableRow,
                row.highlight && styles.tableRowHighlight,
              ]}
            >
              {row.cells.map((cell, index) => (
                <Text
                  key={`${rowIndex}-${index}`}
                  style={[
                    styles.tableCell,
                    columnStyle(index),
                    row.highlight && styles.tableCellHighlight,
                  ]}
                  numberOfLines={2}
                >
                  {cell}
                </Text>
              ))}
            </SafeView>
          ))}
        </SafeView>
      </ScrollView>
    </SafeView>
  );
}

type ReportViewProps = {
  report: Report;
  onBack: () => void;
  onRefresh: () => void;
  onPrint: (() => void) | null;
  onCopy: () => void;
  copied: boolean;
};

export function ReportView({
  report,
  onBack,
  onRefresh,
  onPrint,
  onCopy,
  copied,
}: ReportViewProps) {
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(280, Math.min(640, windowWidth - 96));
  const generated = new Date(report.generatedAt);
  return (
    <SafeView style={styles.report} testID="report-view">
      <SafeView style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={styles.toolButton}
          testID="report-back"
        >
          <Ionicons name="arrow-back" size={14} color={colors.navy} />
          <Text style={styles.toolText}>All reports</Text>
        </Pressable>
        <SafeView style={styles.toolGroup}>
          <Pressable
            accessibilityRole="button"
            onPress={onRefresh}
            style={styles.toolButton}
            testID="report-refresh"
          >
            <Ionicons name="refresh" size={14} color={colors.navy} />
            <Text style={styles.toolText}>Refresh data</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onCopy}
            style={styles.toolButton}
            testID="report-copy"
          >
            <Ionicons
              name={copied ? "checkmark" : "copy-outline"}
              size={14}
              color={colors.navy}
            />
            <Text style={styles.toolText}>
              {copied ? "Copied" : "Copy summary"}
            </Text>
          </Pressable>
          {onPrint && (
            <Pressable
              accessibilityRole="button"
              onPress={onPrint}
              style={[styles.toolButton, styles.toolPrimary]}
              testID="report-print"
            >
              <Ionicons name="download-outline" size={14} color="#fff" />
              <Text style={[styles.toolText, styles.toolPrimaryText]}>
                Save as PDF
              </Text>
            </Pressable>
          )}
        </SafeView>
      </SafeView>

      <SafeView style={styles.masthead}>
        <Text style={styles.title} testID="report-title">
          {report.title}
        </Text>
        <Text style={styles.subtitle}>{report.subtitle}</Text>
        <Text style={styles.stamp}>
          Live data · generated{" "}
          {generated.toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </Text>
      </SafeView>

      {report.kpis.length > 0 && (
        <SafeView style={styles.kpiGrid} testID="report-kpis">
          {report.kpis.map((kpi) => (
            <KpiCard key={kpi.label} kpi={kpi} />
          ))}
        </SafeView>
      )}

      {report.callouts.length > 0 && (
        <SafeView style={styles.section} testID="report-callouts">
          <Text style={styles.sectionTitle}>Key callouts</Text>
          {report.callouts.map((callout) => (
            <CalloutRow key={callout.headline} callout={callout} />
          ))}
        </SafeView>
      )}

      <SafeView style={styles.section}>
        <Text style={styles.sectionTitle}>Charts</Text>
        {report.ratingBars && (
          <BarChart
            title="Store rating vs peers"
            note="Average of App Store and Google Play ratings · scale 0–5"
            data={report.ratingBars}
            width={chartWidth}
            max={5}
          />
        )}
        {report.marketBars && (
          <BarChart
            title="Rating by market"
            note="Green 4.0+, amber 3.0–3.99, red below 3.0"
            data={report.marketBars}
            width={chartWidth}
            max={5}
          />
        )}
        {report.feeBars && (
          <BarChart
            title="Total transfer cost"
            note="Fee plus exchange-rate margin, % of the amount sent · lower is better"
            data={report.feeBars}
            width={chartWidth}
          />
        )}
        {report.sentiment && (
          <SentimentSplit split={report.sentiment} width={chartWidth} />
        )}
        {report.trend && report.trend.some((month) => month.total > 0) && (
          <TrendChart trend={report.trend} width={chartWidth} />
        )}
        {report.themeBars && (
          <BarChart
            title="Negative comments by theme"
            note="A comment can appear in more than one theme"
            data={report.themeBars}
            width={chartWidth}
          />
        )}
      </SafeView>

      {report.tables.map((table) => (
        <SafeView key={table.title} style={styles.section}>
          <DataTable table={table} />
        </SafeView>
      ))}

      {report.quotes.length > 0 && (
        <SafeView style={styles.section}>
          <Text style={styles.sectionTitle}>In customers&apos; words</Text>
          {report.quotes.map((quote, index) => (
            <SafeView key={`quote-${index}`} style={styles.quote}>
              <Text style={styles.quoteText}>“{quote.text}”</Text>
              <Text style={styles.quoteMeta}>
                {quote.source} · {quote.rating}★
                {quote.date ? ` · ${quote.date}` : ""}
              </Text>
            </SafeView>
          ))}
        </SafeView>
      )}

      {report.gaps.length > 0 && (
        <SafeView style={styles.gaps} testID="report-gaps">
          <Text style={styles.gapsTitle}>NOT INCLUDED</Text>
          {report.gaps.map((gap) => (
            <Text key={gap} style={styles.gapText}>
              • {gap}
            </Text>
          ))}
        </SafeView>
      )}
      <Text style={styles.footnote}>
        Figures come from live store ratings, collected customer reviews, public
        share quotes and a public transfer-fee feed. Nothing is estimated; a
        missing source is listed above.
      </Text>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  report: { gap: 14 },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  toolGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  toolButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  toolPrimary: { backgroundColor: colors.navy, borderColor: colors.navy },
  toolText: { fontSize: 11, fontFamily: fonts.bold, color: colors.navy },
  toolPrimaryText: { color: "#fff" },
  masthead: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.navy,
  },
  title: { fontSize: 20, fontFamily: fonts.black, color: colors.onDark },
  subtitle: { marginTop: 4, fontSize: 12, color: colors.onDarkMuted },
  stamp: { marginTop: 8, fontSize: 10, color: colors.onDarkMuted },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpi: {
    flexGrow: 1,
    flexBasis: 150,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderTopWidth: 3,
    backgroundColor: colors.card,
  },
  kpiLabel: {
    fontSize: 9,
    fontFamily: fonts.black,
    letterSpacing: 0.6,
    color: colors.muted,
  },
  kpiValue: {
    marginTop: 6,
    fontSize: 24,
    fontFamily: fonts.black,
    color: colors.navy,
  },
  kpiDelta: { marginTop: 4, fontSize: 10, fontFamily: fonts.bold },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.black,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.navy,
  },
  callout: {
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
  },
  calloutHeadline: { fontSize: 12, fontFamily: fonts.black },
  calloutDetail: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: colors.text,
  },
  chart: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  chartTitle: { fontSize: 12, fontFamily: fonts.black, color: colors.navy },
  chartNote: {
    marginTop: 2,
    marginBottom: 8,
    fontSize: 9,
    color: colors.muted,
  },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  legendItem: { fontSize: 10, color: colors.text },
  tableHeader: {
    flexDirection: "row",
    marginTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tableHead: {
    fontSize: 9,
    fontFamily: fonts.black,
    letterSpacing: 0.4,
    color: colors.muted,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  tableRowHighlight: { backgroundColor: colors.primaryTint },
  tableCell: { fontSize: 11, color: colors.text },
  tableCellHighlight: { fontFamily: fonts.black, color: colors.navy },
  tableScrollContent: { flexGrow: 1 },
  tableBody: { flexGrow: 1 },
  cellRank: { width: 30 },
  cellName: { flexGrow: 2, flexShrink: 1, flexBasis: 130, paddingRight: 8 },
  cell: { flexGrow: 1, flexShrink: 1, flexBasis: 76, paddingRight: 6 },
  quote: {
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.sky,
  },
  quoteText: { fontSize: 12, lineHeight: 18, color: colors.text },
  quoteMeta: { marginTop: 3, fontSize: 9, color: colors.muted },
  gaps: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.orangeSoft,
    borderWidth: 1,
    borderColor: "#FEDF89",
  },
  gapsTitle: {
    fontSize: 9,
    fontFamily: fonts.black,
    letterSpacing: 0.7,
    color: colors.orangeText,
  },
  gapText: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: colors.orangeText,
  },
  footnote: { fontSize: 9, lineHeight: 14, color: colors.faint },
});
