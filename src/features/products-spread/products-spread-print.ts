import type { jsPDF } from 'jspdf';
import {
  createPdfDoc,
  PDF_BODY_SIZE,
  PDF_CELL_PADDING,
  PDF_LINE_HEIGHT,
  PDF_MARGIN,
  PDF_PAGE_HEIGHT,
  PDF_PAGE_WIDTH,
  PDF_TEXT_COLOR,
  PDF_TEXT_COLOR_MUTED,
  wrapText,
} from '@/shared/print';
import { i18n } from '@/shared/i18n';
import { MEALS, type ProductSpreadItem } from './types';

/** Строка печатной раскладки: один продукт одного приёма пищи. */
export interface ProductSpreadPrintRow {
  productName: string;
  unit: string;
  quantity: number;
}

/** Секция печатной раскладки: один приём пищи со своими продуктами. */
export interface ProductSpreadPrintSection {
  mealLabel: string;
  rows: ProductSpreadPrintRow[];
}

/** Собирает секции печати из раскладки: для каждого приёма — продукты
 *  с расходом; приёмы без расхода в документ не попадают. */
export function buildProductSpreadPrint(items: ProductSpreadItem[]): {
  sections: ProductSpreadPrintSection[];
  totalProducts: number;
} {
  const dayItems = items.filter((item) => item.total > 0);

  const sections = MEALS.map<[string, ProductSpreadPrintRow[]]>((meal) => [
    i18n.t(meal.labelKey),
    dayItems
      .filter((item) => (item.byMeal[meal.id] ?? 0) > 0)
      .map((item) => ({
        productName: item.productName,
        unit: item.unit,
        quantity: item.byMeal[meal.id] ?? 0,
      })),
  ])
    .filter(([, rows]) => rows.length > 0)
    .map(([mealLabel, rows]) => ({ mealLabel, rows }));

  return { sections, totalProducts: dayItems.length };
}

/** Форматирует количество с единицей: «12,5 кг». */
function formatQuantity(quantity: number, unit: string): string {
  return `${quantity.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${unit}`;
}

const COLUMN_WIDTHS = [34, 116, 36];
const COLUMN_X: number[] = (() => {
  const xs = [PDF_MARGIN];
  for (const width of COLUMN_WIDTHS) xs.push(xs[xs.length - 1] + width);
  return xs;
})();

const cellX = (colIndex: number): number => COLUMN_X[colIndex] + PDF_CELL_PADDING;
const cellRightX = (colIndex: number): number => COLUMN_X[colIndex + 1] - PDF_CELL_PADDING;

/** Рисует документ «Раскладка продуктов» в переданный jsPDF (A4, мм). */
export function writeProductSpreadPdf(
  doc: jsPDF,
  data: {
    displayDate: string;
    objectName: string;
    sections: ProductSpreadPrintSection[];
    totalProducts: number;
  }
): void {
  const marginTop = 18;
  const bodyMaxY = PDF_PAGE_HEIGHT - 16;

  // Шапка документа: «Раскладка продуктов», дата, объект.
  doc.setFont('PTSans', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PDF_TEXT_COLOR);
  doc.text(i18n.t('spread.printTitle'), PDF_MARGIN, marginTop);
  doc.text(data.displayDate, PDF_PAGE_WIDTH - PDF_MARGIN, marginTop, { align: 'right' });
  doc.setFont('PTSans', 'normal');
  doc.setFontSize(PDF_BODY_SIZE);
  doc.setTextColor(...PDF_TEXT_COLOR_MUTED);
  doc.text(data.objectName, PDF_MARGIN, marginTop + 4);

  let y = marginTop + 10;

  for (const section of data.sections) {
    // Заголовок приёма с итогом по числу позиций.
    if (y + PDF_LINE_HEIGHT * 2 > bodyMaxY) {
      doc.addPage();
      y = marginTop;
    }
    doc.setFont('PTSans', 'bold');
    doc.setFontSize(PDF_BODY_SIZE);
    doc.setTextColor(...PDF_TEXT_COLOR);
    doc.text(section.mealLabel, PDF_MARGIN, y + PDF_LINE_HEIGHT);
    doc.setFont('PTSans', 'normal');
    doc.setTextColor(...PDF_TEXT_COLOR_MUTED);
    doc.text(
      i18n.t('spread.printPositions', { count: section.rows.length }),
      PDF_PAGE_WIDTH - PDF_MARGIN,
      y + PDF_LINE_HEIGHT,
      {
        align: 'right',
      }
    );
    y += PDF_LINE_HEIGHT + 2;

    for (const row of section.rows) {
      const lines = wrapText(doc, row.productName, COLUMN_WIDTHS[1] - PDF_CELL_PADDING * 2);
      const rowHeight = lines.length * PDF_LINE_HEIGHT + PDF_CELL_PADDING * 2;

      if (y + rowHeight > bodyMaxY) {
        doc.addPage();
        y = marginTop;
      }

      doc.setFont('PTSans', 'normal');
      doc.setFontSize(PDF_BODY_SIZE);
      doc.setTextColor(...PDF_TEXT_COLOR);
      doc.text(lines, cellX(1), y + PDF_CELL_PADDING + PDF_LINE_HEIGHT);
      doc.text(
        [formatQuantity(row.quantity, row.unit)],
        cellRightX(2),
        y + PDF_CELL_PADDING + PDF_LINE_HEIGHT,
        {
          align: 'right',
        }
      );

      y += rowHeight;
    }
    y += 2;
  }

  // Общий итог на день.
  if (y + PDF_LINE_HEIGHT * 2 > bodyMaxY) {
    doc.addPage();
    y = marginTop;
  }
  doc.setFont('PTSans', 'bold');
  doc.setFontSize(PDF_BODY_SIZE);
  doc.setTextColor(...PDF_TEXT_COLOR);
  doc.text(
    i18n.t('spread.printTotalDay', { count: data.totalProducts }),
    PDF_MARGIN,
    y + PDF_LINE_HEIGHT
  );
}

/** Скачивает раскладку продуктов на день как PDF. */
export async function downloadProductSpreadDoc(data: {
  displayDate: string;
  objectName: string;
  sections: ProductSpreadPrintSection[];
  totalProducts: number;
}): Promise<void> {
  const doc = await createPdfDoc();
  writeProductSpreadPdf(doc, data);
  doc.save(i18n.t('spread.printFileName', { date: data.displayDate.replace(/\./g, '-') }));
}
