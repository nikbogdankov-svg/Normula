import { jsPDF } from 'jspdf';
import ptSansBoldUrl from './assets/PTSans-Bold.ttf';
import ptSansRegularUrl from './assets/PTSans-Regular.ttf';

export const PDF_PAGE_WIDTH = 210;
export const PDF_PAGE_HEIGHT = 297;
export const PDF_MARGIN = 12;
export const PDF_CELL_PADDING = 1.6;
export const PDF_BODY_SIZE = 9.5;
export const PDF_LINE_HEIGHT = PDF_BODY_SIZE * 1.15 * (25.4 / 72);

export const PDF_CONTENT_WIDTH = PDF_PAGE_WIDTH - PDF_MARGIN * 2;

export const PDF_TEXT_COLOR: [number, number, number] = [0x1a, 0x1a, 0x1a];
export const PDF_TEXT_COLOR_MUTED: [number, number, number] = [0x64, 0x6e, 0x7b];
export const PDF_GRID_COLOR: [number, number, number] = [0xc8, 0xcc, 0xd4];
export const PDF_HEADER_FILL: [number, number, number] = [0xf0, 0xf1, 0xf4];

/** Загружает встроенные шрифты с кириллицей; результат кэшируется на сеанс. */
let ptSansFontsPromise: Promise<{ regular: string; bold: string }> | null = null;

function readAsDataUrl(res: Response): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Не удалось прочитать файл шрифта'));
    res.blob().then((blob) => reader.readAsDataURL(blob));
  });
}

function loadPtSansFonts(): Promise<{ regular: string; bold: string }> {
  ptSansFontsPromise ??= Promise.all([fetch(ptSansRegularUrl), fetch(ptSansBoldUrl)])
    .then(async ([regularRes, boldRes]) => {
      const [regular, bold] = await Promise.all([
        readAsDataUrl(regularRes),
        readAsDataUrl(boldRes),
      ]);
      return { regular: regular.split(',')[1] ?? '', bold: bold.split(',')[1] ?? '' };
    })
    .catch((error) => {
      ptSansFontsPromise = null;
      throw error;
    });
  return ptSansFontsPromise;
}

/** Документ A4 со встроенными шрифтами PT Sans для проверки кириллицы. */
export async function createPdfDoc(): Promise<jsPDF> {
  const fonts = await loadPtSansFonts();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.addFileToVFS('PTSans-Regular.ttf', fonts.regular);
  doc.addFont('PTSans-Regular.ttf', 'PTSans', 'normal');
  doc.addFileToVFS('PTSans-Bold.ttf', fonts.bold);
  doc.addFont('PTSans-Bold.ttf', 'PTSans', 'bold');
  return doc;
}

/** Оборачивает текст на несколько строк под заданную ширину (мм). */
export function wrapText(doc: jsPDF, text: string, width: number): string[] {
  const lines = doc.splitTextToSize(text, width);
  return lines.length ? lines : [''];
}

/** Перенос ключевых строк PDF-таблицы: шапка/строки/направляющая. */
export function drawTextCell(
  doc: jsPDF,
  lines: string[],
  leftX: number,
  rightX: number,
  top: number,
  rightAlign = false
): void {
  let y = top + PDF_CELL_PADDING + PDF_LINE_HEIGHT;
  for (const line of lines) {
    doc.text(line, rightAlign ? rightX : leftX, y, { align: rightAlign ? 'right' : 'left' });
    y += PDF_LINE_HEIGHT;
  }
}
