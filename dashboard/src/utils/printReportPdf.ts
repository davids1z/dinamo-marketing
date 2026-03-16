/**
 * printReportPdf.ts
 * Generates a rich, A4-formatted PDF from report data using the browser's
 * native print dialog. No external PDF libraries needed.
 */

interface Report {
  id: string
  title: string
  period: string
  date: string
  status: string
  pages: number
  size: string
  engagementChange?: number
  followerGrowth?: number
  topPost?: string
  topPostInteractions?: number
  totalReach?: number
  aiSummary?: string
}

/**
 * Format a number with Croatian locale (dots as thousands separator).
 */
function fmtNum(n: number | undefined): string {
  if (n === undefined || n === null) return '--'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

/**
 * Return a colour-coded hex depending on whether the value is positive.
 */
function trendColor(val: number | undefined): string {
  if (val === undefined) return '#64748b'
  return val >= 0 ? '#10b981' : '#ef4444'
}

function trendSign(val: number | undefined): string {
  if (val === undefined) return ''
  return val >= 0 ? '+' : ''
}

/**
 * Build the full HTML document for the report PDF.
 */
function buildReportHtml(report: Report, brandName: string): string {
  const now = new Date()
  const printDate = now.toLocaleDateString('hr-HR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  const engColor = trendColor(report.engagementChange)
  const engSign = trendSign(report.engagementChange)

  const follColor = trendColor(report.followerGrowth)
  const follSign = report.followerGrowth !== undefined && report.followerGrowth >= 0 ? '+' : ''

  const metricsSection = `
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Engagement stopa</div>
        <div class="metric-value" style="color:${engColor}">
          ${engSign}${report.engagementChange?.toFixed(1) ?? '--'}%
        </div>
        <div class="metric-sub">${report.engagementChange !== undefined && report.engagementChange >= 0 ? 'Rast u odnosu na prethodni period' : 'Pad u odnosu na prethodni period'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Novi pratitelji</div>
        <div class="metric-value" style="color:${follColor}">
          ${follSign}${fmtNum(report.followerGrowth)}
        </div>
        <div class="metric-sub">Ukupni organski rast</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Ukupni doseg</div>
        <div class="metric-value" style="color:#3b82f6">
          ${fmtNum(report.totalReach)}
        </div>
        <div class="metric-sub">Jedinstveni korisnici</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Top objava</div>
        <div class="metric-value-sm">${report.topPost || '--'}</div>
        ${report.topPostInteractions ? `<div class="metric-sub">${fmtNum(report.topPostInteractions)} interakcija</div>` : ''}
      </div>
    </div>
  `

  const aiSection = report.aiSummary ? `
    <div class="section">
      <h2 class="section-title">
        <span class="section-icon">✦</span>
        AI sažetak performansi
      </h2>
      <div class="ai-summary">
        <p>${report.aiSummary}</p>
      </div>
    </div>
  ` : ''

  const performanceTable = `
    <div class="section">
      <h2 class="section-title">
        <span class="section-icon">▦</span>
        Pregled ključnih pokazatelja
      </h2>
      <table class="data-table">
        <thead>
          <tr>
            <th>Pokazatelj</th>
            <th>Vrijednost</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Engagement stopa</td>
            <td><strong>${report.engagementChange !== undefined ? Math.abs(report.engagementChange).toFixed(2) + '%' : '--'}</strong></td>
            <td style="color:${engColor}">${engSign}${report.engagementChange?.toFixed(1) ?? '--'}%</td>
          </tr>
          <tr>
            <td>Novi pratitelji</td>
            <td><strong>${fmtNum(report.followerGrowth)}</strong></td>
            <td style="color:${follColor}">${follSign}${fmtNum(report.followerGrowth)}</td>
          </tr>
          <tr>
            <td>Ukupni doseg</td>
            <td><strong>${fmtNum(report.totalReach)}</strong></td>
            <td style="color:#3b82f6">—</td>
          </tr>
          <tr>
            <td>Top objava (interakcije)</td>
            <td><strong>${fmtNum(report.topPostInteractions)}</strong></td>
            <td style="color:#10b981">—</td>
          </tr>
        </tbody>
      </table>
    </div>
  `

  const disclaimer = `
    <div class="disclaimer">
      <p>
        Ovaj izvještaj generiran je automatski na temelju podataka prikupljenih s povezanih platformi.
        Podaci su procijenjeni i mogu se razlikovati od stvarnih vrijednosti u analitičkim alatima platformi.
        Izvještaj je generiran: ${printDate}
      </p>
    </div>
  `

  return `<!DOCTYPE html>
<html lang="hr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${report.title} – ${brandName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.6;
    }

    @page {
      size: A4;
      margin: 18mm 20mm 18mm 20mm;
    }

    /* ── Cover header ── */
    .cover-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding-bottom: 16px;
      border-bottom: 3px solid #0A1A28;
      margin-bottom: 28px;
    }
    .brand-name {
      font-size: 22pt;
      font-weight: 700;
      color: #0A1A28;
      letter-spacing: -0.5px;
    }
    .brand-tagline {
      font-size: 8pt;
      color: #64748b;
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .report-meta {
      text-align: right;
    }
    .report-meta .report-type-badge {
      display: inline-block;
      background: #B8FF00;
      color: #0A1A28;
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      padding: 3px 10px;
      border-radius: 4px;
      margin-bottom: 4px;
    }
    .report-meta .meta-line {
      font-size: 8pt;
      color: #64748b;
      margin-top: 3px;
    }

    /* ── Report title block ── */
    .report-title-block {
      margin-bottom: 24px;
    }
    .report-main-title {
      font-size: 18pt;
      font-weight: 700;
      color: #0A1A28;
      margin-bottom: 4px;
    }
    .report-period {
      font-size: 11pt;
      color: #475569;
      font-weight: 500;
    }

    /* ── Metrics grid ── */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 28px;
    }
    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 12px;
    }
    .metric-label {
      font-size: 7pt;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #94a3b8;
      margin-bottom: 6px;
      font-weight: 600;
    }
    .metric-value {
      font-size: 20pt;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 4px;
    }
    .metric-value-sm {
      font-size: 9pt;
      font-weight: 600;
      color: #1e293b;
      line-height: 1.4;
      margin-bottom: 4px;
    }
    .metric-sub {
      font-size: 7pt;
      color: #94a3b8;
    }

    /* ── Sections ── */
    .section {
      margin-bottom: 24px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #0A1A28;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }
    .section-icon {
      color: #B8FF00;
      font-size: 10pt;
    }

    /* ── AI summary ── */
    .ai-summary {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 4px solid #10b981;
      border-radius: 6px;
      padding: 14px 16px;
      font-size: 9.5pt;
      color: #1e293b;
      line-height: 1.7;
    }

    /* ── Data table ── */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
    }
    .data-table th {
      background: #0A1A28;
      color: #ffffff;
      text-align: left;
      padding: 8px 12px;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .data-table td {
      padding: 9px 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .data-table tbody tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* ── Footer ── */
    .page-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 8px 20mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      font-size: 7pt;
      color: #94a3b8;
    }

    /* ── Disclaimer ── */
    .disclaimer {
      margin-top: 24px;
      padding: 10px 14px;
      background: #fefce8;
      border: 1px solid #fde68a;
      border-radius: 6px;
      font-size: 7.5pt;
      color: #78716c;
      line-height: 1.6;
    }

    /* ── Print tweaks ── */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <!-- Cover header -->
  <div class="cover-header">
    <div>
      <div class="brand-name">${brandName}</div>
      <div class="brand-tagline">Marketing Analytics Platform</div>
    </div>
    <div class="report-meta">
      <div class="report-type-badge">ShiftOneZero</div>
      <div class="meta-line">Generirano: ${printDate}</div>
      <div class="meta-line">Izvještaj ID: ${report.id.replace('local-', 'L')}</div>
    </div>
  </div>

  <!-- Report title -->
  <div class="report-title-block">
    <div class="report-main-title">${report.title}</div>
    <div class="report-period">${report.period}</div>
  </div>

  <!-- Key metrics -->
  ${metricsSection}

  <!-- AI summary -->
  ${aiSection}

  <!-- Data table -->
  ${performanceTable}

  <!-- Disclaimer -->
  ${disclaimer}

  <!-- Footer -->
  <div class="page-footer">
    <span>${brandName} · Marketing Izvještaj · ${report.period}</span>
    <span>ShiftOneZero Marketing Platform · shiftonezero.xyler.ai</span>
  </div>

</body>
</html>`
}

/**
 * Open the browser print dialog with a richly formatted report.
 * The print window is opened as a blank page, the HTML is written into it,
 * and `window.print()` is called once fonts/images have loaded.
 */
export function printReportAsPdf(report: Report, brandName: string): void {
  const html = buildReportHtml(report, brandName)

  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) {
    // Fallback: try to print via a hidden iframe
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden;'
    document.body.appendChild(iframe)
    iframe.contentDocument?.open()
    iframe.contentDocument?.write(html)
    iframe.contentDocument?.close()
    iframe.contentWindow?.focus()
    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 2000)
    }, 800)
    return
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()

  // Wait for Google Fonts to load before printing
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  // Fallback if onload doesn't fire (some browsers)
  setTimeout(() => {
    if (!printWindow.closed) {
      printWindow.print()
    }
  }, 1500)
}
