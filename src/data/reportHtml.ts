import type { BarDatum, Report } from "./reportData";

const escape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const COLORS = {
  navy: "#0F2B57",
  good: "#12B76A",
  watch: "#F79009",
  risk: "#F04438",
  sky: "#60A5FA",
  track: "#EEF3FB",
  text: "#3C4C6D",
  muted: "#64769B",
} as const;
const SOFT = {
  good: "#ECFDF3",
  watch: "#FFFAEB",
  risk: "#FEF3F2",
  neutral: "#F5F9FF",
};

function bars(title: string, note: string, data: BarDatum[], max?: number) {
  const scale = max ?? Math.max(...data.map((item) => item.value), 1);
  const rows = data
    .map((item) => {
      const width = Math.max(1, Math.min(100, (item.value / scale) * 100));
      const color = item.highlight
        ? COLORS.navy
        : item.tone
          ? COLORS[item.tone]
          : COLORS.sky;
      return `<div class="bar"><span class="bar-label${item.highlight ? " strong" : ""}">${escape(item.label)}</span><span class="bar-track"><span class="bar-fill" style="width:${width.toFixed(1)}%;background:${color}"></span></span><span class="bar-value">${escape(item.display)}</span></div>`;
    })
    .join("");
  return `<section class="chart"><h3>${escape(title)}</h3><p class="note">${escape(note)}</p>${rows}</section>`;
}

/**
 * A self-contained HTML document for one report. It is opened in its own window and printed, so the
 * saved PDF holds only the report and not the dashboard around it. Bars are plain styled boxes, which
 * print reliably; background colours are forced on so the charts keep their colour on paper.
 */
export function reportToHtml(report: Report): string {
  const kpis = report.kpis
    .map(
      (kpi) =>
        `<div class="kpi" style="border-top-color:${kpi.tone === "neutral" ? COLORS.navy : COLORS[kpi.tone]}"><div class="kpi-label">${escape(kpi.label.toUpperCase())}</div><div class="kpi-value">${escape(kpi.value)}</div>${kpi.delta ? `<div class="kpi-delta">${escape(kpi.delta)}</div>` : ""}</div>`,
    )
    .join("");
  const callouts = report.callouts
    .map(
      (item) =>
        `<div class="callout" style="background:${SOFT[item.tone]};border-left-color:${COLORS[item.tone]}"><strong>${escape(item.headline)}</strong><br>${escape(item.detail)}</div>`,
    )
    .join("");
  const charts = [
    report.ratingBars &&
      bars(
        "Store rating vs peers",
        "Average of App Store and Google Play ratings · scale 0–5",
        report.ratingBars,
        5,
      ),
    report.marketBars &&
      bars(
        "Rating by market",
        "Green 4.0+, amber 3.0–3.99, red below 3.0",
        report.marketBars,
        5,
      ),
    report.feeBars &&
      bars(
        "Total transfer cost",
        "Fee plus exchange-rate margin, % of the amount sent · lower is better",
        report.feeBars,
      ),
    report.sentiment &&
      (() => {
        const { positive, neutral, negative, total } = report.sentiment;
        const share = (value: number) => ((value / total) * 100).toFixed(1);
        return `<section class="chart"><h3>Sentiment split</h3><p class="note">${total.toLocaleString("en-US")} comments · from review star ratings</p><div class="split"><span style="width:${share(positive)}%;background:${COLORS.good}"></span><span style="width:${share(neutral)}%;background:#93A5C8"></span><span style="width:${share(negative)}%;background:${COLORS.risk}"></span></div><p class="legend">Positive ${Math.round(Number(share(positive)))}% (${positive}) · Neutral ${Math.round(Number(share(neutral)))}% (${neutral}) · Negative ${Math.round(Number(share(negative)))}% (${negative})</p></section>`;
      })(),
    report.trend &&
      report.trend.some((month) => month.total > 0) &&
      `<section class="chart"><h3>Monthly net sentiment</h3><p class="note">Positive share minus negative share (pp), with comment volume</p><table class="grid"><tr><th>Month</th>${report.trend.map((month) => `<td>${escape(month.label)}</td>`).join("")}</tr><tr><th>Net (pp)</th>${report.trend.map((month) => `<td>${month.net === null ? "—" : `${month.net > 0 ? "+" : ""}${month.net}`}</td>`).join("")}</tr><tr><th>Comments</th>${report.trend.map((month) => `<td>${month.total}</td>`).join("")}</tr></table></section>`,
    report.themeBars &&
      bars(
        "Negative comments by theme",
        "A comment can appear in more than one theme",
        report.themeBars,
      ),
  ]
    .filter(Boolean)
    .join("");
  const tables = report.tables
    .map(
      (table) =>
        `<section class="chart"><h3>${escape(table.title)}</h3><table class="grid"><tr>${table.headers.map((header) => `<th>${escape(header)}</th>`).join("")}</tr>${table.rows
          .map(
            (row) =>
              `<tr${row.highlight ? ' class="hl"' : ""}>${row.cells.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`,
          )
          .join("")}</table></section>`,
    )
    .join("");
  const quotes = report.quotes.length
    ? `<h2>In customers&#39; words</h2>${report.quotes
        .map(
          (quote) =>
            `<blockquote>“${escape(quote.text)}”<cite>${escape(quote.source)} · ${quote.rating}★${quote.date ? ` · ${escape(quote.date)}` : ""}</cite></blockquote>`,
        )
        .join("")}`
    : "";
  const gaps = report.gaps.length
    ? `<div class="gaps"><strong>NOT INCLUDED</strong>${report.gaps.map((gap) => `<div>• ${escape(gap)}</div>`).join("")}</div>`
    : "";
  const generated = new Date(report.generatedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escape(report.title)}</title><style>
*{box-sizing:border-box}body{margin:0;padding:28px;font-family:Lato,Segoe UI,Arial,sans-serif;color:${COLORS.text};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.mast{background:${COLORS.navy};color:#fff;padding:18px 20px;border-radius:10px}.mast h1{margin:0;font-size:22px}.mast p{margin:4px 0 0;font-size:12px;color:#CBDCF4}
h2{margin:22px 0 8px;font-size:12px;letter-spacing:.5px;text-transform:uppercase;color:${COLORS.navy}}h3{margin:0;font-size:13px;color:${COLORS.navy}}
.kpis{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}.kpi{flex:1 1 150px;border:1px solid #E4EAF6;border-top:3px solid ${COLORS.navy};border-radius:10px;padding:10px 12px}
.kpi-label{font-size:9px;letter-spacing:.6px;color:${COLORS.muted};font-weight:700}.kpi-value{font-size:24px;font-weight:800;color:${COLORS.navy};margin-top:4px}.kpi-delta{font-size:11px;margin-top:2px}
.callout{padding:10px 12px;border-left:4px solid;border-radius:6px;margin-top:8px;font-size:12px;line-height:1.5}
.chart{border:1px solid #E4EAF6;border-radius:10px;padding:12px;margin-top:10px;break-inside:avoid}.note{margin:2px 0 8px;font-size:10px;color:${COLORS.muted}}
.bar{display:flex;align-items:center;gap:8px;margin:4px 0;font-size:11px}.bar-label{width:130px;text-align:right}.bar-label.strong{font-weight:800;color:${COLORS.navy}}
.bar-track{flex:1;height:12px;background:${COLORS.track};border-radius:4px;overflow:hidden}.bar-fill{display:block;height:100%}.bar-value{width:80px;font-weight:800;color:${COLORS.navy}}
.split{display:flex;height:22px;border-radius:4px;overflow:hidden}.split span{display:block;height:100%}.legend{font-size:11px;margin:6px 0 0}
table.grid{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px}table.grid th,table.grid td{padding:6px 8px;border-bottom:1px solid #EEF3FB;text-align:left}table.grid th{font-size:9px;letter-spacing:.4px;color:${COLORS.muted}}tr.hl{background:#F5F9FF;font-weight:800;color:${COLORS.navy}}
blockquote{margin:8px 0;padding-left:10px;border-left:3px solid ${COLORS.sky};font-size:12px;line-height:1.5}cite{display:block;font-style:normal;font-size:9px;color:${COLORS.muted};margin-top:2px}
.gaps{margin-top:14px;padding:10px 12px;background:#FFFAEB;border:1px solid #FEDF89;border-radius:8px;font-size:11px;color:#B54708}.foot{margin-top:14px;font-size:9px;color:#93A5C8;line-height:1.5}
@page{margin:14mm}
</style></head><body>
<div class="mast"><h1>${escape(report.title)}</h1><p>${escape(report.subtitle)}</p><p>Live data · generated ${escape(generated)}</p></div>
${kpis ? `<div class="kpis">${kpis}</div>` : ""}
${callouts ? `<h2>Key callouts</h2>${callouts}` : ""}
${charts ? `<h2>Charts</h2>${charts}` : ""}
${tables}${quotes}${gaps}
<p class="foot">Figures come from live store ratings, collected customer reviews, public share quotes and a public transfer-fee feed. Nothing is estimated; a missing source is listed above.</p>
</body></html>`;
}
