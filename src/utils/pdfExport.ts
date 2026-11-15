import { EvaluationReport } from '../types';

/**
 * Generates and downloads an Executive 1-Page Summary PDF/HTML document
 */
export function downloadSummaryPDF(report: EvaluationReport, candidateName = 'Candidate') {
  const safeCompanySlug = (report.targetCompany || 'interview').toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const tierLabel =
    report.overallScore >= 88
      ? 'Strong Pass'
      : report.overallScore >= 75
      ? 'Qualified Pass'
      : report.overallScore >= 60
      ? 'Developing Signal'
      : 'Needs Practice';
  const topPercentile = Math.max(1, 100 - (report.percentileRank || 80));

  const questionRowsHtml = (report.questionFeedbacks || [])
    .map(
      (fb, idx) => `
      <li style="margin-bottom: 10px; background: #f8f9ff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
        <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700; color:#0b1c30;">
          <span>Q${idx + 1}. ${fb.category || 'Topic'}: ${fb.questionText || ''}</span>
          <span style="color:#3525cd;">${fb.score}/100</span>
        </div>
        ${
          fb.candidateResponse
            ? `<div style="font-size:11px; color:#464555; margin-top:4px;"><strong>Candidate Spoken Reply:</strong> &ldquo;${fb.candidateResponse}&rdquo;</div>`
            : ''
        }
      </li>`
    )
    .join('');

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PrepPilot AI - Executive Summary #${report.id}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #0b1c30;
      background: #ffffff;
      line-height: 1.5;
      margin: 0;
      padding: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #3525cd;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .brand {
      font-size: 24px;
      font-weight: 800;
      color: #0b1c30;
      letter-spacing: -0.5px;
    }
    .brand span { color: #4f46e5; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: #eff4ff;
      color: #3525cd;
      font-size: 11px;
      font-weight: 700;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }
    .score-card {
      background: #f8f9ff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
    }
    .score-number {
      font-size: 44px;
      font-weight: 800;
      color: #3525cd;
      line-height: 1;
      margin: 8px 0;
    }
    .cat-bar {
      margin-bottom: 10px;
    }
    .cat-header {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .progress-bg {
      background: #e5eeff;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      background: #3525cd;
      height: 100%;
      border-radius: 4px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #0b1c30;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
      border-left: 3px solid #3525cd;
      padding-left: 8px;
    }
    .summary-text {
      font-size: 13px;
      color: #464555;
      background: #f8f9ff;
      padding: 14px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-bottom: 24px;
    }
    .drills-list {
      list-style: none;
      padding: 0;
      margin: 0 0 20px 0;
    }
    .drills-list li {
      font-size: 12px;
      padding: 8px 12px;
      background: #eff4ff;
      border: 1px solid #c7d2fe;
      border-radius: 6px;
      margin-bottom: 6px;
      color: #0b1c30;
    }
    .footer {
      margin-top: 30px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #777587;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">PrepPilot<span>AI</span></div>
      <div style="font-size: 12px; color: #565e74; margin-top: 2px;">
        Transcript-Grounded Interview Assessment &bull; ${report.calibratedBenchmark || `${report.targetCompany} Verbal Bar`}
      </div>
    </div>
    <div style="text-align: right;">
      <span class="badge">Session #${report.id.slice(0, 8)}</span>
      <div style="font-size: 11px; color: #565e74; margin-top: 4px;">Completed: ${report.completedAt}</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="score-card">
      <div style="font-size: 11px; font-weight: 700; color: #565e74; text-transform: uppercase;">Candidate Dossier</div>
      <div style="font-size: 16px; font-weight: 800; color: #0b1c30; margin-top: 4px;">${candidateName}</div>
      <div style="font-size: 12px; color: #565e74;">Target: <strong>${report.targetRole}</strong> @ <strong>${report.targetCompany}</strong></div>
      <div style="font-size: 12px; color: #565e74; margin-top: 2px;">Interviewer: ${report.interviewerPersona || 'AI Interviewer'} &bull; Duration: ${report.durationFormatted}</div>
      
      <div class="score-number">${report.overallScore}<span style="font-size: 20px; color: #777587;">/100</span></div>
      <span class="badge" style="background: #e6f4ea; color: #137333;">${tierLabel} &bull; Top ${topPercentile}% Percentile</span>
    </div>

    <div class="score-card">
      <div style="font-size: 11px; font-weight: 700; color: #565e74; text-transform: uppercase; margin-bottom: 12px;">Rubric Category Breakdown</div>
      
      <div class="cat-bar">
        <div class="cat-header"><span>Technical Depth (35%)</span><span>${report.categoryScores.technicalCorrectness}%</span></div>
        <div class="progress-bg"><div class="progress-fill" style="width: ${report.categoryScores.technicalCorrectness}%;"></div></div>
      </div>

      <div class="cat-bar">
        <div class="cat-header"><span>Tradeoff Analysis (25%)</span><span>${report.categoryScores.tradeoffAnalysis}%</span></div>
        <div class="progress-bg"><div class="progress-fill" style="width: ${report.categoryScores.tradeoffAnalysis}%;"></div></div>
      </div>

      <div class="cat-bar">
        <div class="cat-header"><span>Communication & STAR (20%)</span><span>${report.categoryScores.communicationStructure}%</span></div>
        <div class="progress-bg"><div class="progress-fill" style="width: ${report.categoryScores.communicationStructure}%;"></div></div>
      </div>

      <div class="cat-bar">
        <div class="cat-header"><span>Problem Decomposition (20%)</span><span>${report.categoryScores.problemDecomposition}%</span></div>
        <div class="progress-bg"><div class="progress-fill" style="width: ${report.categoryScores.problemDecomposition}%;"></div></div>
      </div>
    </div>
  </div>

  <div class="section-title">Executive AI Assessment Summary</div>
  <div class="summary-text">
    <div style="font-size: 11px; font-weight: 700; color: #3525cd; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.4px;">
      Evaluation Basis: 100% Candidate Spoken Responses Only (AI Prompts Excluded)
    </div>
    ${report.overallSummary}
  </div>

  ${
    questionRowsHtml
      ? `<div class="section-title">Topic-by-Topic Transcript Breakdown</div>
         <ul style="list-style:none; padding:0; margin:0 0 20px 0;">${questionRowsHtml}</ul>`
      : ''
  }

  <div class="section-title">Prescribed Adaptive Drills</div>
  <ul class="drills-list">
    ${(report.recommendedDrills || []).map((drill) => `<li>&bull; <strong>${drill}</strong></li>`).join('')}
  </ul>

  <div class="footer">
    <div>Calibrated on ${report.calibratedBenchmark || `${report.targetCompany} Role Rubric`} &bull; PrepPilot AI</div>
    <div>Confidential Candidate Record &bull; Persisted in Private Enclave</div>
  </div>
</body>
</html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `preppilot_executive_summary_${safeCompanySlug}_${report.id.slice(0, 8)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
