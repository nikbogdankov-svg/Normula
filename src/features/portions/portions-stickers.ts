import type { jsPDF } from 'jspdf';
import {
  createPdfDoc,
  PDF_GRID_COLOR,
  PDF_PAGE_HEIGHT,
  PDF_PAGE_WIDTH,
  PDF_TEXT_COLOR,
  wrapText,
} from '@/shared/print';
import { i18n } from '@/shared/i18n';
import type { Recipe } from '@/features/ttk/types';

/**
 * Наклейка на термос: блюдо×отделение из раздачи + состав и КБЖУ из ТТК.
 * Печатается сеткой 2×4 на лист A4 (8 наклеек); срок годности вводит
 * пользователь на форме печати.
 */

export interface StickerRow {
  dishName: string;
  /** Объект верхнего уровня (больница). */
  objectName: string;
  /** Подобъект (корпус) или объект, если подобъекта нет. */
  subObjectName: string;
  departmentName: string;
  tableName: string;
  portions: number;
  /** Чистый выход порции, граммы. */
  yieldNet: number;
  /** Карта ТТК по имени блюда; null — карты нет, печатаем без состава. */
  recipe: Recipe | null;
}

/** Формат даты изготовления на наклейке: «09.10.2026». */
function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
}

/** Состав из ингредиентов карты: «Рис, Соль, Вода». */
function compositionOf(recipe: Recipe | null): string {
  return recipe ? recipe.ingredients.map((ingredient) => ingredient.productName).join(', ') : '';
}

/** Форматирует число без лишних нулей, с запятой как десятичным разделителем. */
function formatValue(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',');
}

const STICKER_MARGIN = 6;
const STICKER_GAP_X = 6;
const STICKER_GAP_Y = 3;
const STICKER_COLS = 2;
const STICKER_ROWS = 4;
const PADDING = 2.4;
const PADDING_TOP = 4;
/** Отступ снизу наклейки для блока «Дата / Срок». */
const PADDING_BOTTOM = 4;
/** Дополнительный воздух между верхней строкой и названием блюда. */
const SPACE_BEFORE_TITLE = 3;
/** Размер и межстрочный интервал всего, кроме названия блюда. */
const BODY_SIZE = 9;
const BODY_LINE_HEIGHT = 4.6;

type Slot = { x: number; y: number; width: number; height: number };

function stickerSlots(): Slot[] {
  const columns = STICKER_COLS;
  const rows = STICKER_ROWS;
  const width = (PDF_PAGE_WIDTH - STICKER_MARGIN * 2 - STICKER_GAP_X * (columns - 1)) / columns;
  const height = (PDF_PAGE_HEIGHT - STICKER_MARGIN * 2 - STICKER_GAP_Y * (rows - 1)) / rows;
  const slots: Slot[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      slots.push({
        x: STICKER_MARGIN + col * (width + STICKER_GAP_X),
        y: STICKER_MARGIN + row * (height + STICKER_GAP_Y),
        width,
        height,
      });
    }
  }
  return slots;
}

/** Рисует одну наклейку в слоте; текст, не влезающий в высоту, обрезается. */
function drawSticker(
  doc: jsPDF,
  slot: Slot,
  data: StickerRow,
  manufactureDate: string,
  expiry: string
): void {
  const left = slot.x + PADDING;
  const right = slot.x + slot.width - PADDING;
  const width = right - left;

  // Рамка наклейки.
  doc.setDrawColor(...PDF_GRID_COLOR);
  doc.rect(slot.x, slot.y, slot.width, slot.height);

  let y = slot.y + PADDING_TOP;

  // Объект/подобъект и отделение — первый блок.
  doc.setFont('PTSans', 'normal');
  doc.setFontSize(BODY_SIZE);
  doc.setTextColor(...PDF_TEXT_COLOR);
  doc.text(data.subObjectName, left, y);
  doc.text(data.departmentName, right, y, { align: 'right' });
  y += BODY_LINE_HEIGHT + SPACE_BEFORE_TITLE;

  // Название блюда — жирным, крупным, с переносом.
  doc.setFont('PTSans', 'bold');
  doc.setFontSize(13);
  const dishLines = wrapText(doc, data.dishName, width);
  doc.text(dishLines, left, y);
  y += dishLines.length * 5 + 1.6;

  // Всё, кроме названия, — один размер и один цвет.
  doc.setFont('PTSans', 'normal');
  doc.setFontSize(BODY_SIZE);
  doc.setTextColor(...PDF_TEXT_COLOR);

  // Масса одной порции и число порций (с общим весом в кг).
  const kg = (data.portions * data.yieldNet) / 1000;
  doc.text(i18n.t('portions.stickerWeight', { grams: formatValue(data.yieldNet) }), left, y);
  doc.text(
    i18n.t('portions.stickerPortionsKg', {
      portions: data.portions,
      kg: formatValue(kg),
    }),
    right,
    y,
    { align: 'right' }
  );
  y += BODY_LINE_HEIGHT;

  // Состав — перенос по ширине.
  const composition = compositionOf(data.recipe);
  if (composition) {
    const compositionLines = wrapText(
      doc,
      i18n.t('portions.stickerComposition', { composition }),
      width
    );
    doc.text(compositionLines, left, y);
    y += compositionLines.length * 3.6 + 1.2;
  }

  // КБЖУ из карты.
  if (data.recipe) {
    const kbju = i18n.t('portions.stickerKbju', {
      protein: formatValue(data.recipe.protein),
      fat: formatValue(data.recipe.fat),
      carbs: formatValue(data.recipe.carbs),
      kcal: formatValue(data.recipe.kcal),
    });
    doc.text(wrapText(doc, kbju, width), left, y);
    y += BODY_LINE_HEIGHT;
  }

  // Дата и срок — прижаты к нижнему краю: дата выше, срок под ней.
  const bottom = slot.y + slot.height - PADDING_BOTTOM;
  doc.text(
    i18n.t('portions.stickerDate', { date: manufactureDate }),
    left,
    bottom - BODY_LINE_HEIGHT
  );
  doc.text(i18n.t('portions.stickerExpiry', { expiry }), left, bottom);
}

/** Рисует листы A4 с наклейками в переданный jsPDF. */
export function writeStickersPdf(
  doc: jsPDF,
  data: { rows: StickerRow[]; manufactureDate: string; expiry: string }
): void {
  const slots = stickerSlots();
  data.rows.forEach((row, index) => {
    if (index > 0 && index % slots.length === 0) {
      doc.addPage();
    }
    drawSticker(doc, slots[index % slots.length], row, data.manufactureDate, data.expiry);
  });
  // Печатаемое в слотах лишнего не остаётся: если наклеек меньше 8 — пустые
  // слоты рисуются рамкой, чтобы лист было легко резать.
}

/** Скачивает наклейки на термос как PDF. */
export async function downloadStickersDoc(data: {
  rows: StickerRow[];
  manufactureDate: string;
  expiry: string;
}): Promise<void> {
  const doc = await createPdfDoc();
  writeStickersPdf(doc, data);
  doc.save(i18n.t('portions.stickerFileName', { date: formatDate(data.manufactureDate) }));
}
