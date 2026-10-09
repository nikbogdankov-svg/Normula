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
import { sumDishes, formatMetric, type DayTotals } from './norms';
import { formatDateRange } from './dates';
import type { Dish, MealId } from './types';

/** Строка печатной сетки меню: один приём пищи одного дня. */
export interface MenuPrintRow {
  /** Дата и день недели; показывается только в первой строке дня. */
  dayLabel: string;
  /** Подпись приёма пищи или «Итог на день». */
  mealLabel: string;
  /** Текст ячейки блюд: названия через « | »; пусто у пустого приёма. */
  dishesText: string;
  kcal: number;
  price: number;
  /** Строка-итог дня — рисуется жирным. */
  total: boolean;
}

export interface MenuPrintInput {
  /** Дни окна по порядку: индексы 1..N соответствуют экранной сетке. */
  days: number[];
  /** Приёмы пищи в порядке дня (активные приёмы диеты). */
  meals: MealId[];
  dayLabelOf: (day: number) => string;
  mealLabelOf: (mealId: MealId) => string;
  dishesOf: (day: number, mealId: MealId) => Dish[];
  totalsOf: (day: number) => DayTotals;
}

/** Собирает строки печатного меню окна дат из данных экранной сетки. */
export function buildMenuPrintRows(input: MenuPrintInput): MenuPrintRow[] {
  const rows: MenuPrintRow[] = [];

  for (const day of input.days) {
    let isFirstMealOfDay = true;
    for (const mealId of input.meals) {
      const dishes = input.dishesOf(day, mealId);
      const totals = sumDishes(dishes);
      rows.push({
        dayLabel: isFirstMealOfDay ? input.dayLabelOf(day) : '',
        mealLabel: input.mealLabelOf(mealId),
        dishesText: dishes.map((dish) => dish.name).join(' | '),
        kcal: totals.kcal,
        price: totals.price,
        total: false,
      });
      isFirstMealOfDay = false;
    }

    const dayTotals = input.totalsOf(day);
    rows.push({
      dayLabel: '',
      mealLabel: 'Итог на день',
      dishesText: `Б ${formatMetric(dayTotals.protein)} · Ж ${formatMetric(dayTotals.fat)} · У ${formatMetric(dayTotals.carbs)}`,
      kcal: dayTotals.kcal,
      price: dayTotals.price,
      total: true,
    });
  }

  return rows;
}

/** Рисует документ «Меню» в переданный jsPDF (A4, миллиметры). */
export function writeMenuPdf(
  doc: jsPDF,
  data: { displayRange: string; rows: MenuPrintRow[]; objectName: string; dietName: string }
): void {
  const marginTop = 18;
  const marginBottom = 16;
  const bodyMaxY = PDF_PAGE_HEIGHT - marginBottom;

  const columnWidths = [26, 30, 96, 20, 14];
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

  /** Шапка таблицы; возвращает координату низа шапки (там же верх тела). */
  const drawTableHeader = (top: number): number => {
    const height = PDF_LINE_HEIGHT + PDF_CELL_PADDING * 2;
    doc.setFillColor(...PDF_HEADER_FILL);
    doc.rect(PDF_MARGIN, top, PDF_CONTENT_WIDTH, height, 'F');
    doc.setFont('PTSans', 'bold');
    doc.setFontSize(PDF_BODY_SIZE);
    doc.setTextColor(...PDF_TEXT_COLOR);
    drawCellLines(['День'], 0, top);
    drawCellLines(['Приём'], 1, top);
    drawCellLines(['Блюда'], 2, top);
    drawCellLines(['Ккал'], 3, top, true);
    drawCellLines(['Цена'], 4, top, true);
    doc.setFont('PTSans', 'normal');
    drawGridLine(top + height);
    return top + height;
  };

  // Шапка документа: «Меню», период, объект и рацион.
  doc.setFont('PTSans', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PDF_TEXT_COLOR);
  doc.text('Меню', PDF_MARGIN, marginTop);
  doc.text(data.displayRange, PDF_PAGE_WIDTH - PDF_MARGIN, marginTop, { align: 'right' });
  doc.setFont('PTSans', 'normal');
  doc.setFontSize(PDF_BODY_SIZE);
  doc.setTextColor(...PDF_TEXT_COLOR_MUTED);
  doc.text(`${data.objectName} · ${data.dietName}`, PDF_MARGIN, marginTop + 4);

  let y = marginTop + 10;
  let tableTop = y;
  y = drawTableHeader(y);

  for (const row of data.rows) {
    const cellLines = [
      wrapText(doc, row.dayLabel, columnWidths[0] - PDF_CELL_PADDING * 2),
      wrapText(doc, row.mealLabel, columnWidths[1] - PDF_CELL_PADDING * 2),
      wrapText(doc, row.dishesText, columnWidths[2] - PDF_CELL_PADDING * 2),
    ];
    const rowHeight =
      Math.max(...cellLines.map((lines) => lines.length * PDF_LINE_HEIGHT)) + PDF_CELL_PADDING * 2;

    if (y + rowHeight > bodyMaxY) {
      drawVerticalLines(tableTop, y);
      doc.addPage();
      tableTop = y = marginTop;
      y = drawTableHeader(y);
    }

    doc.setFont('PTSans', row.total ? 'bold' : 'normal');
    doc.setFontSize(PDF_BODY_SIZE);
    doc.setTextColor(...PDF_TEXT_COLOR);
    drawCellLines(cellLines[0], 0, y);
    drawCellLines(cellLines[1], 1, y);
    drawCellLines(cellLines[2], 2, y);
    drawCellLines([formatMetric(row.kcal)], 3, y, true);
    drawCellLines([formatMetric(row.price)], 4, y, true);

    y += rowHeight;
    drawGridLine(y);
  }

  drawVerticalLines(tableTop, y);

  // Подвал: ответственный и период.
  if (y + 24 > bodyMaxY) {
    doc.addPage();
    y = marginTop;
  }
  y += 8;
  doc.setFont('PTSans', 'normal');
  doc.setFontSize(PDF_BODY_SIZE);
  doc.setTextColor(...PDF_TEXT_COLOR_MUTED);
  doc.text('Ответственный за питание: ______________________', PDF_MARGIN, y + PDF_LINE_HEIGHT);
  doc.text(data.displayRange, PDF_PAGE_WIDTH - PDF_MARGIN, y + PDF_LINE_HEIGHT, {
    align: 'right',
  });
}

/** Скачивает документ меню как PDF. */
export async function downloadMenuDoc(data: {
  startDate: string;
  cycleDays: number;
  rows: MenuPrintRow[];
  objectName: string;
  dietName: string;
}): Promise<void> {
  const displayRange = formatDateRange(data.startDate, data.cycleDays);
  const doc = await createPdfDoc();
  writeMenuPdf(doc, {
    ...data,
    displayRange,
  });
  doc.save(`Меню_${displayRange.replace(/[ –]+/g, '_')}.pdf`);
}
