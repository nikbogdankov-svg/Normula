import type { jsPDF } from 'jspdf';
import {
  createPdfDoc,
  drawTextCell,
  PDF_BODY_SIZE,
  PDF_CELL_PADDING,
  PDF_CONTENT_WIDTH,
  PDF_GRID_COLOR,
  PDF_HEADER_FILL,
  PDF_LINE_HEIGHT,
  PDF_MARGIN,
  PDF_PAGE_HEIGHT,
  PDF_PAGE_WIDTH,
  PDF_TEXT_COLOR,
  PDF_TEXT_COLOR_MUTED,
  wrapText,
} from '@/shared/print';
import { i18n } from '@/shared/i18n';
import type { AutoJournal } from './types';

/** Колонка печатной формы журнала. `key` — ключ поля (journals.field.*). */
export interface JournalPrintColumn {
  key: string;
  label: string;
}

export interface JournalPrintData {
  /** Заголовок документа — название журнала. */
  title: string;
  /** Метка журнала (ЖУРН-02). */
  tag: string;
  /** Подпись под заголовком: объект · рацион. */
  subtitle: string;
  /** Период документа. */
  period: string;
  columns: JournalPrintColumn[];
  /** Строки, выровненные по columns; пустые — «для заполнения». */
  rows: string[][];
}

/** Относительная ширина колонки по её ключу: широкие — блюдам и разрешению. */
function columnWeight(key: string): number {
  if (key.endsWith('.dishes')) return 2.8;
  if (key.endsWith('.safetyDocument')) return 3.2;
  if (key.endsWith('.issuePermission')) return 2.2;
  if (key.endsWith('.organoleptic')) return 2.6;
  if (key.endsWith('.storageConditions')) return 2.2;
  if (key.endsWith('.arrivalDateTime')) return 2;
  if (key.endsWith('.actualSaleDateTime')) return 1.8;
  if (key.endsWith('.arrivalQuantity')) return 1.8;
  if (key.endsWith('.note')) return 2;
  if (key.endsWith('.productName') || key.endsWith('.manufacturer')) return 1.6;
  if (key.endsWith('.meal')) return 1.6;
  if (key.endsWith('.date')) return 1.3;
  if (key.endsWith('.output')) return 1.2;
  if (key.endsWith('.quality') || key.endsWith('.condition')) return 1.4;
  return 1.2;
}

/** Рисует форму журнала в переданный jsPDF (A4, миллиметры). */
export function writeJournalPdf(doc: jsPDF, data: JournalPrintData): void {
  const marginTop = 18;
  const marginBottom = 20;
  const bodyMaxY = PDF_PAGE_HEIGHT - marginBottom;

  const weights = data.columns.map((column) => columnWeight(column.key));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const columnWidths = weights.map((weight) => (weight / weightSum) * PDF_CONTENT_WIDTH);
  const columnX: number[] = (() => {
    const xs = [PDF_MARGIN];
    for (const width of columnWidths) xs.push(xs[xs.length - 1] + width);
    return xs;
  })();
  const cellX = (colIndex: number): number => columnX[colIndex] + PDF_CELL_PADDING;
  const cellRightX = (colIndex: number): number => columnX[colIndex + 1] - PDF_CELL_PADDING;

  const drawCellLines = (
    lines: string[],
    colIndex: number,
    cellTop: number,
    rightAlign = false
  ) => {
    drawTextCell(doc, lines, cellX(colIndex), cellRightX(colIndex), cellTop, rightAlign);
  };

  const drawGridLine = (y: number) => {
    doc.setDrawColor(...PDF_GRID_COLOR);
    doc.line(PDF_MARGIN, y, PDF_MARGIN + PDF_CONTENT_WIDTH, y);
  };

  const drawVerticalLines = (top: number, bottom: number) => {
    doc.setDrawColor(...PDF_GRID_COLOR);
    for (let i = 1; i < columnX.length - 1; i++) {
      doc.line(columnX[i], top, columnX[i], bottom);
    }
  };

  const drawTableHeader = (top: number): number => {
    const linesMax = Math.max(
      ...data.columns.map(
        (column, index) =>
          wrapText(doc, column.label, columnWidths[index] - PDF_CELL_PADDING * 2).length
      )
    );
    const height = linesMax * PDF_LINE_HEIGHT + PDF_CELL_PADDING * 2;
    doc.setFillColor(...PDF_HEADER_FILL);
    doc.rect(PDF_MARGIN, top, PDF_CONTENT_WIDTH, height, 'F');
    doc.setFont('PTSans', 'bold');
    doc.setFontSize(PDF_BODY_SIZE);
    doc.setTextColor(...PDF_TEXT_COLOR);
    data.columns.forEach((column, index) => {
      drawCellLines(
        wrapText(doc, column.label, columnWidths[index] - PDF_CELL_PADDING * 2),
        index,
        top
      );
    });
    doc.setFont('PTSans', 'normal');
    drawGridLine(top + height);
    return top + height;
  };

  // Шапка документа: название журнала, метка, объект/рацион и период.
  doc.setFont('PTSans', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PDF_TEXT_COLOR);
  doc.text(data.title, PDF_MARGIN, marginTop);
  doc.text(data.tag, PDF_PAGE_WIDTH - PDF_MARGIN, marginTop, { align: 'right' });
  doc.setFont('PTSans', 'normal');
  doc.setFontSize(PDF_BODY_SIZE);
  doc.setTextColor(...PDF_TEXT_COLOR_MUTED);
  doc.text(data.subtitle, PDF_MARGIN, marginTop + 4.5);
  doc.text(data.period, PDF_PAGE_WIDTH - PDF_MARGIN, marginTop + 4.5, { align: 'right' });

  let y = marginTop + 10;
  let tableTop = y;
  y = drawTableHeader(y);

  for (const row of data.rows) {
    const cellLines = data.columns.map((_column, index) =>
      wrapText(doc, row[index] ?? '', columnWidths[index] - PDF_CELL_PADDING * 2)
    );
    const rowHeight =
      Math.max(...cellLines.map((lines) => lines.length * PDF_LINE_HEIGHT)) + PDF_CELL_PADDING * 2;

    if (y + rowHeight > bodyMaxY) {
      drawVerticalLines(tableTop, y);
      doc.addPage();
      tableTop = y = marginTop;
      y = drawTableHeader(y);
    }

    doc.setFont('PTSans', 'normal');
    doc.setFontSize(PDF_BODY_SIZE);
    doc.setTextColor(...PDF_TEXT_COLOR);
    cellLines.forEach((lines, index) => drawCellLines(lines, index, y));

    y += rowHeight;
    drawGridLine(y);
  }

  drawVerticalLines(tableTop, y);

  // Подвал: ответственный и период.
  if (y + 20 > bodyMaxY) {
    doc.addPage();
    y = marginTop;
  }
  y += 8;
  doc.setFont('PTSans', 'normal');
  doc.setFontSize(PDF_BODY_SIZE);
  doc.setTextColor(...PDF_TEXT_COLOR_MUTED);
  doc.text(i18n.t('journals.printResponsible'), PDF_MARGIN, y + PDF_LINE_HEIGHT);
  doc.text(data.period, PDF_PAGE_WIDTH - PDF_MARGIN, y + PDF_LINE_HEIGHT, { align: 'right' });
}

/** Скачивает форму журнала как PDF. */
export async function downloadJournalDoc(data: JournalPrintData): Promise<void> {
  const doc = await createPdfDoc();
  writeJournalPdf(doc, data);
  const fileName = i18n.t('journals.printFileName', {
    tag: data.tag,
    range: data.period.replace(/[^\p{L}\p{N}]+/gu, '_'),
  });
  doc.save(fileName);
}

/** Колонки журнала: автоматические поля, затем заполняемые вручную. */
export function journalColumns(
  journal: AutoJournal,
  labelOf: (key: string) => string
): JournalPrintColumn[] {
  return [...journal.autoFieldKeys, ...journal.manualFieldKeys].map((key) => ({
    key,
    label: labelOf(key),
  }));
}
