import { jsPDF } from 'jspdf';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { EvaluationReport } from '../types';

function sanitizePdfText(value: string | undefined | null): string {
  return String(value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2022/g, '*')
    .replace(/\u00b7/g, '|')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCompanySlug(report: EvaluationReport): string {
  return (report.targetCompany || 'interview').toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

export function getTierLabel(score: number): string {
  if (score >= 88) return 'Strong Pass';
  if (score >= 75) return 'Qualified Pass';
  if (score >= 60) return 'Developing Signal';
  if (score >= 35) return 'Needs Targeted Practice';
  return 'Critical Gap — Foundational Prep Needed';
}

function deriveBasisStats(report: EvaluationReport) {
  const feedbacks = report.questionFeedbacks || [];
  const turns = report.conversationTranscript || [];
  const basis = report.evaluationBasis;

  const candidateTurnsAnalyzed =
    basis?.candidateTurnsAnalyzed ??
    (turns.filter(
      (t) => t.speaker === 'candidate' && t.kind === 'response' && typeof t.topicOrder === 'number'
    ).length ||
      feedbacks.filter((fb) => fb.candidateResponse && !fb.candidateResponse.startsWith('No candidate')).length);

  const aiTurnsExcluded =
    basis?.aiTurnsExcluded ?? turns.filter((t) => t.speaker === 'ai').length;

  const topicsAnswered =
    basis?.topicsAnswered ??
    feedbacks.filter(
      (fb) =>
        fb.candidateResponse &&
        !fb.candidateResponse.startsWith('No candidate') &&
        !fb.candidateResponse.includes('User ended')
    ).length;

  const totalTopics = basis?.totalTopics ?? feedbacks.length;

  const totalCandidateWords =
    basis?.totalCandidateWords ??
    feedbacks.reduce((sum, fb) => {
      const text = [fb.candidateResponse, fb.followUpResponse].filter(Boolean).join(' ');
      if (text.startsWith('No candidate')) return sum;
      return sum + (text ? text.trim().split(/\s+/).filter(Boolean).length : 0);
    }, 0);

  return {
    candidateTurnsAnalyzed,
    aiTurnsExcluded,
    topicsAnswered,
    totalTopics,
    totalCandidateWords,
    scoringMethodLabel:
      basis?.scoringMethodLabel ||
      (report.source === 'gemini'
        ? 'AI Candidate-Only Transcript Rubric Analysis'
        : 'Calibrated Candidate-Only Rubric Engine'),
  };
}

function deriveOverallImprovementPriorities(report: EvaluationReport): string[] {
  const scores = [
    {
      name: 'Technical Depth & System Mechanics',
      score: report.categoryScores.technicalCorrectness,
      tip: 'Anchor answers with concrete architecture components, protocols, complexity bounds, and real production SLIs.',
    },
    {
      name: 'Tradeoff & Failure-Mode Analysis',
      score: report.categoryScores.tradeoffAnalysis,
      tip: 'Explicitly compare at least two design options and explain failure detection, backoff, and rollback safeguards.',
    },
    {
      name: 'Communication & STAR Structure',
      score: report.categoryScores.communicationStructure,
      tip: 'Signpost clearly (Problem -> Architecture -> Tradeoffs -> Metrics, or Situation -> Task -> Action -> Result) with minimal filler.',
    },
    {
      name: 'Problem Decomposition & Scoping',
      score: report.categoryScores.problemDecomposition,
      tip: 'State functional constraints, scale assumptions, and component boundaries before diving into implementation.',
    },
  ].sort((a, b) => a.score - b.score);

  const perTopicSuggestions = (report.questionFeedbacks || [])
    .flatMap((fb) => fb.suggestedImprovements || [])
    .filter(Boolean);

  const priorities = scores
    .filter((c) => c.score < 82)
    .slice(0, 3)
    .map((c) => `Improve ${c.name} (${c.score}/100): ${c.tip}`);

  for (const s of perTopicSuggestions) {
    if (priorities.length >= 6) break;
    if (!priorities.includes(s)) priorities.push(s);
  }

  if (priorities.length === 0) {
    priorities.push(
      `Continue calibrating edge-case reliability and measurable production metrics at ${report.targetCompany}'s bar.`
    );
  }
  return priorities;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}

/* =========================================================================
 * SHARED PDF BUILDER HELPERS
 * ========================================================================= */
class PdfWriter {
  doc: jsPDF;
  pageWidth: number;
  pageHeight: number;
  margin = 16;
  contentWidth: number;
  y = 18;

  constructor(title: string) {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    this.doc.setProperties({ title });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - this.margin * 2;
  }

  ensureSpace(heightNeeded: number) {
    if (this.y + heightNeeded > this.pageHeight - 18) {
      this.doc.addPage();
      this.y = 18;
    }
  }

  drawBanner(subtitle: string, metaRight: string) {
    this.doc.setFillColor(15, 23, 42); // #0f172a
    this.doc.rect(0, 0, this.pageWidth, 28, 'F');
    this.doc.setFillColor(79, 70, 229); // #4f46e5 accent strip
    this.doc.rect(0, 28, this.pageWidth, 2, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(17);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text('PrepPilot AI', this.margin, 12);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(203, 213, 225);
    this.doc.text(sanitizePdfText(subtitle), this.margin, 19.5);

    this.doc.setFontSize(8.5);
    this.doc.setTextColor(199, 210, 254);
    this.doc.text(sanitizePdfText(metaRight), this.pageWidth - this.margin, 15, { align: 'right' });

    this.y = 38;
  }

  drawSectionTitle(title: string) {
    this.ensureSpace(14);
    this.doc.setFillColor(79, 70, 229);
    this.doc.rect(this.margin, this.y - 4, 2.2, 6, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11.5);
    this.doc.setTextColor(11, 28, 48);
    this.doc.text(sanitizePdfText(title.toUpperCase()), this.margin + 5, this.y + 0.5);
    this.y += 7;
  }

  drawParagraph(
    text: string,
    options?: {
      fontSize?: number;
      color?: [number, number, number];
      bold?: boolean;
      indent?: number;
      lineHeight?: number;
    }
  ) {
    const fontSize = options?.fontSize ?? 9.5;
    const indent = options?.indent ?? 0;
    const lineHeight = options?.lineHeight ?? 4.6;
    const [r, g, b] = options?.color ?? [70, 69, 85];

    this.doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(r, g, b);

    const lines = this.doc.splitTextToSize(sanitizePdfText(text), this.contentWidth - indent);
    for (const line of lines) {
      this.ensureSpace(lineHeight + 2);
      this.doc.text(line, this.margin + indent, this.y);
      this.y += lineHeight;
    }
  }

  drawScoreProgressBar(label: string, score: number, weightLabel: string) {
    this.ensureSpace(11);
    const barWidth = this.contentWidth - 4;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(11, 28, 48);
    this.doc.text(sanitizePdfText(`${label} (${weightLabel})`), this.margin, this.y);

    const color: [number, number, number] =
      score >= 75 ? [5, 150, 105] : score >= 50 ? [53, 37, 205] : [186, 26, 26];
    this.doc.setTextColor(color[0], color[1], color[2]);
    this.doc.text(`${score}/100`, this.pageWidth - this.margin, this.y, { align: 'right' });

    this.y += 2;
    this.doc.setFillColor(229, 238, 255);
    this.doc.roundedRect(this.margin, this.y, barWidth, 3.2, 1.5, 1.5, 'F');

    const fillWidth = Math.max(0, Math.min(barWidth, (barWidth * Math.max(0, Math.min(100, score))) / 100));
    if (fillWidth > 0) {
      this.doc.setFillColor(color[0], color[1], color[2]);
      this.doc.roundedRect(this.margin, this.y, fillWidth, 3.2, 1.5, 1.5, 'F');
    }
    this.y += 6.8;
  }

  drawCalloutBox(
    heading: string,
    bodyLines: string[],
    bg: [number, number, number] = [248, 249, 255],
    border: [number, number, number] = [199, 210, 254]
  ) {
    const wrappedBlocks = bodyLines.map((line) =>
      this.doc.splitTextToSize(sanitizePdfText(line), this.contentWidth - 10)
    );
    const totalLines = wrappedBlocks.reduce((acc, lines) => acc + lines.length, 0);
    const boxHeight = 9 + totalLines * 4.4 + Math.max(0, bodyLines.length - 1) * 1.2;

    if (boxHeight < 110) {
      this.ensureSpace(boxHeight + 4);
    } else {
      this.ensureSpace(22);
    }

    const startY = this.y;
    if (boxHeight < 110) {
      this.doc.setFillColor(bg[0], bg[1], bg[2]);
      this.doc.setDrawColor(border[0], border[1], border[2]);
      this.doc.roundedRect(this.margin, startY, this.contentWidth, boxHeight, 2.5, 2.5, 'FD');
    }

    this.y = startY + 5.5;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(53, 37, 205);
    this.doc.text(sanitizePdfText(heading), this.margin + 5, this.y);
    this.y += 4.8;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.8);
    this.doc.setTextColor(30, 41, 59);
    for (const lines of wrappedBlocks) {
      for (const l of lines) {
        if (this.y > this.pageHeight - 18) {
          this.doc.addPage();
          this.y = 18;
        }
        this.doc.text(l, this.margin + 5, this.y);
        this.y += 4.4;
      }
      this.y += 1;
    }
    this.y += 3.5;
  }

  addPageFooters(label: string) {
    const count = this.doc.getNumberOfPages();
    for (let i = 1; i <= count; i++) {
      this.doc.setPage(i);
      this.doc.setDrawColor(226, 232, 240);
      this.doc.line(this.margin, this.pageHeight - 12, this.pageWidth - this.margin, this.pageHeight - 12);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(sanitizePdfText(label), this.margin, this.pageHeight - 7);
      this.doc.text(`Page ${i} of ${count}`, this.pageWidth - this.margin, this.pageHeight - 7, { align: 'right' });
    }
  }
}

/* =========================================================================
 * 1. FULL REPORT DOWNLOADS (PDF & DOCX)
 * ========================================================================= */
export function downloadFullReportPDF(report: EvaluationReport, candidateName = 'Candidate'): string {
  const safeSlug = getCompanySlug(report);
  const filename = `preppilot_full_report_${safeSlug}_${report.id.slice(0, 8)}.pdf`;
  const pdf = new PdfWriter(`PrepPilot AI Evaluation Report - ${candidateName}`);
  const tier = getTierLabel(report.overallScore);
  const basis = deriveBasisStats(report);
  const improvements = deriveOverallImprovementPriorities(report);

  pdf.drawBanner(
    `Full Candidate Evaluation & Coaching Report | ${report.targetRole} @ ${report.targetCompany}`,
    `Session #${report.id.slice(0, 8)} | ${report.completedAt}`
  );

  // Dossier + Candidate-Only Score Summary Box
  pdf.drawCalloutBox(
    `CANDIDATE DOSSIER & SCORE: ${report.overallScore}/100 (${tier})`,
    [
      `Candidate: ${candidateName} | Target: ${report.targetRole} at ${report.targetCompany} (${report.calibratedBenchmark})`,
      `Interviewer Panel: ${report.interviewerPersona || 'AI Interviewer'} | Duration: ${report.durationFormatted} | Percentile: Top ${Math.max(1, 100 - (report.percentileRank || 50))}%`,
      `Candidate-Only Evaluation Basis (${basis.scoringMethodLabel}): ${basis.candidateTurnsAnalyzed} candidate turns scored, ${basis.aiTurnsExcluded} AI prompts excluded, ${basis.topicsAnswered}/${basis.totalTopics} topics answered, ${basis.totalCandidateWords} candidate words analyzed.`,
    ],
    [239, 244, 255],
    [199, 210, 254]
  );

  // Category Score Bars
  pdf.drawSectionTitle('Weighted Rubric Category Breakdown');
  pdf.drawScoreProgressBar('Technical Depth & System Mechanics', report.categoryScores.technicalCorrectness, '35% weight');
  pdf.drawScoreProgressBar('Tradeoff & Failure-Mode Analysis', report.categoryScores.tradeoffAnalysis, '25% weight');
  pdf.drawScoreProgressBar('Communication & STAR Structure', report.categoryScores.communicationStructure, '20% weight');
  pdf.drawScoreProgressBar('Problem Decomposition & Scoping', report.categoryScores.problemDecomposition, '20% weight');
  pdf.y += 2;

  // Executive Assessment
  pdf.drawSectionTitle('Executive Assessment Summary');
  pdf.drawParagraph(report.overallSummary);
  pdf.y += 4;

  // What to Improve Section
  pdf.drawSectionTitle('Priority Areas: What to Improve Next');
  improvements.forEach((imp, i) => {
    pdf.drawParagraph(`${i + 1}. ${imp}`, { indent: 2 });
    pdf.y += 1.2;
  });
  pdf.y += 3;

  // Prescribed Adaptive Drills
  if ((report.recommendedDrills || []).length > 0) {
    pdf.drawSectionTitle('Prescribed Practice Drills');
    report.recommendedDrills.forEach((drill) => {
      pdf.drawParagraph(`* ${drill}`, { indent: 2 });
      pdf.y += 1;
    });
    pdf.y += 3;
  }

  // Question-by-Question Deep Dive
  if ((report.questionFeedbacks || []).length > 0) {
    pdf.drawSectionTitle('Detailed Question-by-Question Analysis');
    report.questionFeedbacks.forEach((fb, idx) => {
      pdf.ensureSpace(24);
      pdf.drawParagraph(
        `Topic ${idx + 1} [${fb.category || 'Topic'}] — Score: ${fb.score}/100`,
        { bold: true, fontSize: 10, color: [53, 37, 205] }
      );
      if (fb.questionText) {
        pdf.drawParagraph(`Prompt Asked: ${fb.questionText}`, { bold: true, fontSize: 9, color: [11, 28, 48] });
      }
      pdf.drawParagraph(
        `Candidate Spoken Answer: "${fb.candidateResponse || 'No candidate response recorded.'}"`,
        { indent: 2, color: [51, 65, 85] }
      );
      if (fb.followUpQuestion) {
        pdf.drawParagraph(`AI Follow-up Context: ${fb.followUpQuestion}`, { indent: 2, color: [100, 116, 139] });
      }
      if (fb.followUpResponse) {
        pdf.drawParagraph(`Candidate Follow-up Reply: "${fb.followUpResponse}"`, { indent: 2, color: [51, 65, 85] });
      }
      (fb.criterionScores || []).forEach((c) => {
        pdf.drawParagraph(`- ${c.criterion} (${c.score}/100): ${c.feedback}`, { indent: 4, fontSize: 8.8 });
      });
      if ((fb.strengths || []).length > 0) {
        pdf.drawParagraph(`Strengths: ${fb.strengths.join(' | ')}`, { indent: 4, fontSize: 8.8, color: [5, 120, 85] });
      }
      if ((fb.missingConcepts || []).length > 0) {
        pdf.drawParagraph(`Missing Concepts / Gaps: ${fb.missingConcepts.join(' | ')}`, {
          indent: 4,
          fontSize: 8.8,
          color: [180, 83, 9],
        });
      }
      if ((fb.suggestedImprovements || []).length > 0) {
        pdf.drawParagraph(`How to Improve: ${fb.suggestedImprovements.join(' | ')}`, {
          indent: 4,
          fontSize: 8.8,
          color: [53, 37, 205],
        });
      }
      if (fb.modelExemplarAnswer) {
        pdf.drawParagraph(`Staff-Level Exemplar Approach: ${fb.modelExemplarAnswer}`, {
          indent: 4,
          fontSize: 8.6,
          color: [71, 85, 105],
        });
      }
      pdf.y += 4;
    });
  }

  // Recorded Transcript Appendix
  if ((report.conversationTranscript || []).length > 0) {
    pdf.drawSectionTitle('Recorded Verbal Transcript Appendix');
    (report.conversationTranscript || []).forEach((turn) => {
      const speakerTag = turn.speaker === 'ai' ? `${turn.speakerName} (AI)` : `${turn.speakerName} (Candidate)`;
      pdf.drawParagraph(
        `[${turn.timestamp}] ${speakerTag} [${turn.kind}]: ${turn.text}`,
        {
          fontSize: 8.6,
          color: turn.speaker === 'ai' ? [71, 85, 105] : [11, 28, 48],
          bold: turn.speaker === 'candidate',
        }
      );
      pdf.y += 1;
    });
  }

  pdf.addPageFooters(`PrepPilot AI | Candidate-Only Evaluation Report | ${candidateName}`);
  const blob = pdf.doc.output('blob');
  triggerBlobDownload(blob, filename);
  return filename;
}

/* =========================================================================
 * 2. EXECUTIVE SUMMARY DOWNLOAD (PDF)
 * ========================================================================= */
export function downloadSummaryPDF(report: EvaluationReport, candidateName = 'Candidate'): string {
  const safeSlug = getCompanySlug(report);
  const filename = `preppilot_executive_summary_${safeSlug}_${report.id.slice(0, 8)}.pdf`;
  const pdf = new PdfWriter(`PrepPilot AI Executive Summary - ${candidateName}`);
  const tier = getTierLabel(report.overallScore);
  const basis = deriveBasisStats(report);
  const improvements = deriveOverallImprovementPriorities(report);

  pdf.drawBanner(
    `Executive Interview Summary | ${report.targetRole} @ ${report.targetCompany}`,
    `Overall Score: ${report.overallScore}/100 | ${report.completedAt}`
  );

  pdf.drawCalloutBox(
    `SCORECARD SNAPSHOT — ${tier.toUpperCase()}`,
    [
      `Candidate: ${candidateName} | Role: ${report.targetRole} @ ${report.targetCompany} (${report.calibratedBenchmark})`,
      `Candidate-Only Basis: ${basis.candidateTurnsAnalyzed} candidate replies (${basis.totalCandidateWords} words across ${basis.topicsAnswered}/${basis.totalTopics} topics). ${basis.aiTurnsExcluded} AI turns excluded.`,
    ],
    [239, 244, 255],
    [199, 210, 254]
  );

  pdf.drawSectionTitle('Category Performance Breakdown');
  pdf.drawScoreProgressBar('Technical Depth & Accuracy', report.categoryScores.technicalCorrectness, '35%');
  pdf.drawScoreProgressBar('Tradeoff & Failure Analysis', report.categoryScores.tradeoffAnalysis, '25%');
  pdf.drawScoreProgressBar('Communication & STAR Structure', report.categoryScores.communicationStructure, '20%');
  pdf.drawScoreProgressBar('Problem Decomposition & Scoping', report.categoryScores.problemDecomposition, '20%');
  pdf.y += 2;

  pdf.drawSectionTitle('Executive Assessment');
  pdf.drawParagraph(report.overallSummary);
  pdf.y += 4;

  pdf.drawSectionTitle('Actionable Improvement Plan');
  improvements.forEach((imp, idx) => {
    pdf.drawParagraph(`${idx + 1}. ${imp}`, { indent: 2 });
    pdf.y += 1.2;
  });
  pdf.y += 3;

  pdf.drawSectionTitle('Topic Scores & Key Gaps');
  (report.questionFeedbacks || []).forEach((fb, idx) => {
    pdf.drawParagraph(
      `Q${idx + 1} (${fb.category || 'Topic'}): ${fb.score}/100 — Gap: ${(fb.missingConcepts || ['None noted'])[0]}`,
      { indent: 2, bold: true, fontSize: 9, color: [11, 28, 48] }
    );
    if ((fb.suggestedImprovements || [])[0]) {
      pdf.drawParagraph(`Fix: ${fb.suggestedImprovements[0]}`, { indent: 5, fontSize: 8.6, color: [53, 37, 205] });
    }
    pdf.y += 1.2;
  });

  if ((report.recommendedDrills || []).length > 0) {
    pdf.y += 2;
    pdf.drawSectionTitle('Recommended Drills');
    report.recommendedDrills.forEach((d) => {
      pdf.drawParagraph(`* ${d}`, { indent: 2 });
      pdf.y += 1;
    });
  }

  pdf.addPageFooters(`PrepPilot AI | Executive Summary | ${candidateName}`);
  const blob = pdf.doc.output('blob');
  triggerBlobDownload(blob, filename);
  return filename;
}

/* =========================================================================
 * 3. CONVERSATION TRANSCRIPT DOWNLOAD (PDF)
 * ========================================================================= */
export function downloadTranscriptPDF(report: EvaluationReport, candidateName = 'Candidate'): string {
  const safeSlug = getCompanySlug(report);
  const filename = `preppilot_transcript_${safeSlug}_${report.id.slice(0, 8)}.pdf`;
  const pdf = new PdfWriter(`PrepPilot AI Interview Transcript - ${candidateName}`);
  const basis = deriveBasisStats(report);
  const turns = report.conversationTranscript || [];

  pdf.drawBanner(
    `Verbatim Verbal Interview Transcript | ${report.targetRole} @ ${report.targetCompany}`,
    `Session #${report.id.slice(0, 8)} | ${report.durationFormatted}`
  );

  pdf.drawCalloutBox(
    'SESSION & CANDIDATE-ONLY AUDIT METADATA',
    [
      `Candidate: ${candidateName} | AI Interviewer: ${report.interviewerPersona || 'AI Interviewer'} | Completed: ${report.completedAt}`,
      `Recorded Turns: ${turns.length} total (${basis.candidateTurnsAnalyzed} candidate topic answers scored, ${basis.aiTurnsExcluded} AI interviewer turns excluded from scoring)`,
      `Overall Candidate Score: ${report.overallScore}/100 (${getTierLabel(report.overallScore)})`,
    ],
    [248, 249, 255],
    [203, 213, 225]
  );

  pdf.drawSectionTitle('Chronological Interview Dialogue');
  if (turns.length === 0) {
    pdf.drawParagraph('No verbatim transcript turns were recorded for this session.');
  } else {
    turns.forEach((turn) => {
      const isAi = turn.speaker === 'ai';
      const header = `[${turn.timestamp}] ${isAi ? `${turn.speakerName} (AI Interviewer)` : `${turn.speakerName} (Candidate)`} — ${turn.kind.toUpperCase()}${turn.topicTitle ? ` (${turn.topicTitle})` : ''}`;
      pdf.ensureSpace(14);
      pdf.drawParagraph(header, {
        bold: true,
        fontSize: 8.8,
        color: isAi ? [53, 37, 205] : [5, 120, 85],
      });
      pdf.drawParagraph(turn.text, {
        indent: 3,
        fontSize: 9.2,
        color: [15, 23, 42],
      });
      pdf.y += 2.5;
    });
  }

  pdf.addPageFooters(`PrepPilot AI | Official Session Transcript | ${candidateName}`);
  const blob = pdf.doc.output('blob');
  triggerBlobDownload(blob, filename);
  return filename;
}

/* =========================================================================
 * 4. DOCX GENERATORS (FULL REPORT, EXECUTIVE SUMMARY, TRANSCRIPT)
 * ========================================================================= */
function makeCell(text: string, bold = false, fillHex?: string, colorHex = '0B1C30') {
  return new TableCell({
    shading: fillHex ? { type: ShadingType.CLEAR, fill: fillHex } : undefined,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
    },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, color: colorHex, size: 20, font: 'Calibri' })],
      }),
    ],
  });
}

function makeHeading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 100 },
    children: [new TextRun({ text, bold: true, color: '3525CD', size: 26, font: 'Calibri' })],
  });
}

function makeBody(text: string, options?: { bold?: boolean; color?: string; italics?: boolean }) {
  return new Paragraph({
    spacing: { after: 90 },
    children: [
      new TextRun({
        text,
        bold: options?.bold,
        italics: options?.italics,
        color: options?.color || '1E293B',
        size: 21,
        font: 'Calibri',
      }),
    ],
  });
}

function makeScoreTable(report: EvaluationReport): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          makeCell('Rubric Category', true, 'EFF4FF', '3525CD'),
          makeCell('Weight', true, 'EFF4FF', '3525CD'),
          makeCell('Score', true, 'EFF4FF', '3525CD'),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Technical Depth & System Mechanics'),
          makeCell('35%'),
          makeCell(`${report.categoryScores.technicalCorrectness}/100`, true),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Tradeoff & Failure-Mode Analysis'),
          makeCell('25%'),
          makeCell(`${report.categoryScores.tradeoffAnalysis}/100`, true),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Communication & STAR Structure'),
          makeCell('20%'),
          makeCell(`${report.categoryScores.communicationStructure}/100`, true),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Problem Decomposition & Scoping'),
          makeCell('20%'),
          makeCell(`${report.categoryScores.problemDecomposition}/100`, true),
        ],
      }),
      new TableRow({
        children: [
          makeCell('Overall Weighted Readiness Score', true, 'F8F9FF'),
          makeCell('100%', true, 'F8F9FF'),
          makeCell(`${report.overallScore}/100 (${getTierLabel(report.overallScore)})`, true, 'F8F9FF', '3525CD'),
        ],
      }),
    ],
  });
}

export async function downloadFullReportDOCX(
  report: EvaluationReport,
  candidateName = 'Candidate'
): Promise<string> {
  const safeSlug = getCompanySlug(report);
  const filename = `preppilot_full_report_${safeSlug}_${report.id.slice(0, 8)}.docx`;
  const basis = deriveBasisStats(report);
  const improvements = deriveOverallImprovementPriorities(report);

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 60 },
      children: [new TextRun({ text: 'PrepPilot AI — Candidate Evaluation Report', bold: true, size: 34, color: '0B1C30', font: 'Calibri' })],
    }),
    makeBody(
      `${candidateName} | ${report.targetRole} @ ${report.targetCompany} (${report.calibratedBenchmark}) | Completed: ${report.completedAt} | Duration: ${report.durationFormatted}`,
      { color: '565E74' }
    ),
    makeBody(
      `Candidate-Only Evaluation Basis (${basis.scoringMethodLabel}): ${basis.candidateTurnsAnalyzed} candidate answers scored (${basis.totalCandidateWords} words across ${basis.topicsAnswered}/${basis.totalTopics} topics); ${basis.aiTurnsExcluded} AI interviewer prompts excluded.`,
      { bold: true, color: '3525CD' }
    ),
    makeHeading('1. Weighted Scorecard Breakdown'),
    makeScoreTable(report),
    makeHeading('2. Executive Assessment Summary'),
    makeBody(report.overallSummary),
    makeHeading('3. Priority Areas: What to Improve Next'),
    ...improvements.map((imp, idx) => makeBody(`${idx + 1}. ${imp}`)),
    makeHeading('4. Prescribed Practice Drills'),
    ...(report.recommendedDrills || []).map((drill) => makeBody(`• ${drill}`)),
    makeHeading('5. Question-by-Question Analysis'),
  ];

  (report.questionFeedbacks || []).forEach((fb, idx) => {
    children.push(
      makeBody(`Topic ${idx + 1}: ${fb.category || 'Topic'} — Score: ${fb.score}/100`, {
        bold: true,
        color: '3525CD',
      })
    );
    if (fb.questionText) children.push(makeBody(`Prompt Asked: ${fb.questionText}`, { bold: true }));
    children.push(makeBody(`Candidate Spoken Answer: "${fb.candidateResponse || 'No candidate response recorded.'}"`));
    if (fb.followUpQuestion) children.push(makeBody(`AI Follow-up Context: ${fb.followUpQuestion}`, { italics: true, color: '565E74' }));
    if (fb.followUpResponse) children.push(makeBody(`Candidate Follow-up Reply: "${fb.followUpResponse}"`));
    (fb.criterionScores || []).forEach((c) => {
      children.push(makeBody(`- ${c.criterion} (${c.score}/100): ${c.feedback}`));
    });
    if ((fb.strengths || []).length > 0) {
      children.push(makeBody(`Strengths: ${fb.strengths.join(' | ')}`, { color: '047857' }));
    }
    if ((fb.missingConcepts || []).length > 0) {
      children.push(makeBody(`Missing Concepts: ${fb.missingConcepts.join(' | ')}`, { color: 'B45309' }));
    }
    if ((fb.suggestedImprovements || []).length > 0) {
      children.push(makeBody(`How to Improve: ${fb.suggestedImprovements.join(' | ')}`, { color: '3525CD' }));
    }
    if (fb.modelExemplarAnswer) {
      children.push(makeBody(`Staff-Level Exemplar: ${fb.modelExemplarAnswer}`, { color: '475569' }));
    }
  });

  if ((report.conversationTranscript || []).length > 0) {
    children.push(makeHeading('6. Verbatim Interview Transcript'));
    (report.conversationTranscript || []).forEach((turn) => {
      const tag = turn.speaker === 'ai' ? `${turn.speakerName} (AI)` : `${turn.speakerName} (Candidate)`;
      children.push(
        makeBody(`[${turn.timestamp}] ${tag} [${turn.kind}]: ${turn.text}`, {
          bold: turn.speaker === 'candidate',
          color: turn.speaker === 'ai' ? '475569' : '0B1C30',
        })
      );
    });
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, filename);
  return filename;
}

export async function downloadSummaryDOCX(
  report: EvaluationReport,
  candidateName = 'Candidate'
): Promise<string> {
  const safeSlug = getCompanySlug(report);
  const filename = `preppilot_executive_summary_${safeSlug}_${report.id.slice(0, 8)}.docx`;
  const basis = deriveBasisStats(report);
  const improvements = deriveOverallImprovementPriorities(report);

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: 'PrepPilot AI — Executive Interview Summary',
                bold: true,
                size: 34,
                color: '0B1C30',
                font: 'Calibri',
              }),
            ],
          }),
          makeBody(
            `${candidateName} | ${report.targetRole} @ ${report.targetCompany} | Score: ${report.overallScore}/100 (${getTierLabel(report.overallScore)}) | ${report.completedAt}`,
            { color: '565E74' }
          ),
          makeBody(
            `Evaluation Basis: 100% Candidate Spoken Responses (${basis.candidateTurnsAnalyzed} candidate replies, ${basis.totalCandidateWords} words across ${basis.topicsAnswered}/${basis.totalTopics} topics; ${basis.aiTurnsExcluded} AI prompts excluded).`,
            { bold: true, color: '3525CD' }
          ),
          makeHeading('Scorecard Snapshot'),
          makeScoreTable(report),
          makeHeading('Executive Assessment'),
          makeBody(report.overallSummary),
          makeHeading('What to Improve Next'),
          ...improvements.map((imp, idx) => makeBody(`${idx + 1}. ${imp}`)),
          makeHeading('Prescribed Drills'),
          ...(report.recommendedDrills || []).map((d) => makeBody(`• ${d}`)),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, filename);
  return filename;
}

export async function downloadTranscriptDOCX(
  report: EvaluationReport,
  candidateName = 'Candidate'
): Promise<string> {
  const safeSlug = getCompanySlug(report);
  const filename = `preppilot_transcript_${safeSlug}_${report.id.slice(0, 8)}.docx`;
  const basis = deriveBasisStats(report);
  const turns = report.conversationTranscript || [];

  const transcriptRows =
    turns.length === 0
      ? [makeBody('No recorded dialogue turns for this session.')]
      : turns.flatMap((turn) => {
          const isAi = turn.speaker === 'ai';
          return [
            makeBody(
              `[${turn.timestamp}] ${isAi ? `${turn.speakerName} (AI Interviewer)` : `${turn.speakerName} (Candidate)`} — ${turn.kind.toUpperCase()}${turn.topicTitle ? ` (${turn.topicTitle})` : ''}`,
              { bold: true, color: isAi ? '3525CD' : '047857' }
            ),
            makeBody(turn.text),
          ];
        });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: 'PrepPilot AI — Verbatim Interview Transcript',
                bold: true,
                size: 34,
                color: '0B1C30',
                font: 'Calibri',
              }),
            ],
          }),
          makeBody(
            `Candidate: ${candidateName} | Track: ${report.targetRole} @ ${report.targetCompany} | Panel: ${report.interviewerPersona || 'AI Interviewer'} | Duration: ${report.durationFormatted}`,
            { color: '565E74' }
          ),
          makeBody(
            `Candidate-Only Audit: ${basis.candidateTurnsAnalyzed} candidate replies scored (${basis.totalCandidateWords} words); ${basis.aiTurnsExcluded} AI interviewer prompts excluded.`,
            { bold: true, color: '3525CD' }
          ),
          makeHeading('Chronological Dialogue'),
          ...transcriptRows,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, filename);
  return filename;
}
