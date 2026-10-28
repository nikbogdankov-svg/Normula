import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { TFunction } from 'i18next';
import type { CreateRecipeIngredient } from './types';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface ExtractedDish {
  id: string;
  name: string;
  portionYield: string;
  recipe: string;
  ingredients: CreateRecipeIngredient[];
}

export interface ExtractedCollection {
  id: string;
  fileName: string;
  name: string;
  dishes: ExtractedDish[];
}

const TEXT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'] as const;

export function isExtractableFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return TEXT_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * Читает файл и достаёт из каждой технологической карты:
 * название, выход порции, технологию приготовления и ингредиенты из таблицы.
 */
export async function extractCollectionFromFile(
  file: File,
  index: number,
  t: TFunction
): Promise<ExtractedCollection> {
  const document = await readDocument(file, t);
  const dishes = parseDocument(document, `${index}-${file.name}`);

  return {
    id: `collection-${index}-${file.name}`,
    fileName: file.name,
    name: collectionTitle(file.name),
    dishes,
  };
}

interface ParsedDocument {
  /** Плоский текст для полей и границ карт. */
  text: string;
  /** HTML (docx) — чтобы читать таблицы ингредиентов. */
  html: string;
}

async function readDocument(file: File, t: TFunction): Promise<ParsedDocument> {
  const lower = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (lower.endsWith('.txt')) {
    const text = (await file.text()).replace(/\r\n/g, '\n').trim();
    return { text, html: '' };
  }

  if (lower.endsWith('.docx')) {
    const [raw, html] = await Promise.all([
      mammoth.extractRawText({ arrayBuffer: buffer }),
      mammoth.convertToHtml({ arrayBuffer: buffer }),
    ]);
    return {
      text: normalizeText(raw.value),
      html: html.value,
    };
  }

  if (lower.endsWith('.pdf')) {
    return { text: await extractPdfText(buffer), html: '' };
  }

  if (lower.endsWith('.doc')) {
    const text = extractLegacyDocText(buffer);
    if (!text.trim()) {
      throw new Error(t('ttk.importFileReadFailed', { fileName: file.name }));
    }
    return { text, html: '' };
  }

  throw new Error(t('ttk.importFileUnsupported', { fileName: file.name }));
}

async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    // Группируем по Y, чтобы строки таблицы не склеивались в кашу.
    const rows = new Map<number, { x: number; str: string }[]>();

    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const transform = 'transform' in item ? item.transform : null;
      const x = transform ? Number(transform[4]) : 0;
      const y = transform ? Math.round(Number(transform[5])) : 0;
      const bucket = rows.get(y) ?? [];
      bucket.push({ x, str: item.str });
      rows.set(y, bucket);
    }

    const pageLines = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, cells]) =>
        cells
          .sort((a, b) => a.x - b.x)
          .map((cell) => cell.str.trim())
          .filter(Boolean)
          .join('\t')
      )
      .filter(Boolean);

    if (pageLines.length) pages.push(pageLines.join('\n'));
  }

  return normalizeText(pages.join('\n\n'));
}

function extractLegacyDocText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunks: string[] = [];

  let utf16 = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const code = bytes[i] | (bytes[i + 1] << 8);
    if (code === 0x000a || code === 0x000d || (code >= 0x20 && code < 0xd800)) {
      utf16 += String.fromCharCode(code);
    } else if (utf16.length >= 24) {
      chunks.push(utf16);
      utf16 = '';
    } else {
      utf16 = '';
    }
  }
  if (utf16.length >= 24) chunks.push(utf16);

  return normalizeText(chunks.join('\n'));
}

function normalizeText(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function collectionTitle(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').trim() || fileName;
}

function parseDocument(document: ParsedDocument, seed: string): ExtractedDish[] {
  if (!document.text) return [];

  const htmlTables = document.html ? extractHtmlTables(document.html) : [];
  const sections = splitIntoDishSections(document.text);

  const dishes = sections
    .map((section, index) => sectionToDish(section, htmlTables, index, `${seed}-${index}`))
    .filter((dish): dish is ExtractedDish => dish !== null);

  if (dishes.length > 0) return dishes;

  const fallback = sectionToDish(document.text, htmlTables, 0, `${seed}-0`);
  return fallback ? [fallback] : [];
}

function splitIntoDishSections(text: string): string[] {
  const lines = text.split('\n').map((line) => line.trim());
  const starts: number[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (isDishStart(lines[i], lines[i + 1] ?? '')) starts.push(i);
  }

  if (starts.length <= 1) return starts.length === 1 ? [lines.slice(starts[0]).join('\n')] : [text];

  const sections: string[] = [];
  for (let i = 0; i < starts.length; i += 1) {
    const chunk = lines
      .slice(starts[i], starts[i + 1] ?? lines.length)
      .join('\n')
      .trim();
    if (chunk) sections.push(chunk);
  }
  return sections;
}

function isDishStart(line: string, nextLine: string): boolean {
  if (!line) return false;
  if (/технологическ\w*\s+карт/i.test(line)) return true;
  if (/^тех\s*[-.]?\s*технологическ/i.test(line)) return true;
  if (/наименование\s*(блюда|изделия)\s*[:：]/i.test(line)) return true;
  if (/^№\s*\d+\b/.test(line) && /карт|блюд|издел/i.test(line + ' ' + nextLine)) return true;
  if (
    /^\d{1,3}[.)]\s+\S/.test(line) &&
    line.length <= 120 &&
    /выход|рецептур|технолог/i.test(nextLine)
  ) {
    return true;
  }
  return false;
}

function sectionToDish(
  section: string,
  tables: string[][][],
  tableIndex: number,
  id: string
): ExtractedDish | null {
  const lines = section
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  const name = extractName(lines);
  if (!name) return null;

  const body = lines.join('\n');
  const portionYield = extractPortionYield(body);
  const recipe = extractRecipe(body);

  // Таблица этой карты (по порядку) или все таблицы файла — для docx.
  const preferred = tables[tableIndex] ? [tables[tableIndex]] : tables;
  const ingredients = extractIngredientsFromTables(preferred, name) ||
    extractIngredientsFromTables(tables, name) ||
    extractIngredientsFromText(lines) || [{ name: '', grossPerPortion: '', netPerPortion: '' }];

  return {
    id: `dish-${id}`,
    name,
    portionYield,
    recipe,
    ingredients,
  };
}

function extractName(lines: string[]): string {
  for (const line of lines.slice(0, 12)) {
    const labeled = line.match(
      /(?:наименование|название)\s*(?:блюда|изделия|продукции)?\s*[:：]\s*(.+)$/i
    );
    if (labeled?.[1]) return cleanName(labeled[1]);

    const card = line.match(/технологическ\w*\s+карт\w*(?:\s*№\s*\d+)?\s*[:：-]?\s*(.+)$/i);
    if (card?.[1] && !/^№?\s*\d+$/i.test(card[1].trim())) return cleanName(card[1]);
  }

  // Строка сразу после «Технологическая карта № N».
  for (let i = 0; i < Math.min(lines.length, 8); i += 1) {
    if (/технологическ\w*\s+карт/i.test(lines[i])) {
      const next = lines[i + 1];
      if (next && !/^(рецептур|состав|выход|ингредиент|технолог|наименован)/i.test(next)) {
        return cleanName(next);
      }
    }
  }

  for (const line of lines.slice(0, 6)) {
    if (/технологическ\w*\s+карт/i.test(line)) continue;
    if (/^(рецептур|состав|выход|ингредиент|технолог|температур|срок)/i.test(line)) continue;
    if (line.length >= 3 && line.length <= 140) return cleanName(line);
  }

  return '';
}

function cleanName(value: string): string {
  return value
    .replace(/^[\d.)№\s-]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Выход порции: «90/50», «250 г», «выход: 100». */
function extractPortionYield(text: string): string {
  const patterns = [
    /выход\s*порции\s*[:：]?\s*([^\n;]{1,40})/i,
    /выход\s*(?:готового\s*)?(?:блюда|изделия|порции)?\s*[:：]?\s*([\d.,/\s]+(?:\s*г(?:рамм\w*)?)?)/i,
    /масса\s*(?:готового\s*)?(?:блюда|изделия|порции)\s*[:：]?\s*([\d.,/\s]+(?:\s*г)?)/i,
    /\bвыход\b\s*[:：]\s*([\d.,/]+)/i,
  ];

  for (const pattern of patterns) {
    const value = matchField(text, pattern);
    if (value) return normalizeAmount(value);
  }
  return '';
}

function extractRecipe(text: string): string {
  const patterns = [
    /технология\s+приготовления\s*[:：]?\s*([\s\S]+?)(?=\n\s*(?:требования|органолепт|пищев|показател|оформлен|срок|температур|наименование\s*(?:блюда|изделия)|технологическ\w*\s+карт|\d{1,3}[.)]\s+\S)|$)/i,
    /технологическ\w*\s+процесс\s*[:：]?\s*([\s\S]+?)(?=\n\s*(?:требования|органолепт|пищев|срок|температур|наименование|технологическ\w*\s+карт)|$)/i,
    /описание\s+технологи\w*\s*[:：]?\s*([\s\S]+?)(?=\n\s*(?:требования|органолепт|срок|температур)|$)/i,
  ];

  for (const pattern of patterns) {
    const value = matchField(text, pattern);
    if (value && value.trim().length >= 20) {
      return value
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }
  }

  // Длинные абзацы вне таблицы рецептуры.
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(
      (part) =>
        part.length >= 80 &&
        !/^(рецептур|состав|ингредиент|наименование сырь)/i.test(part) &&
        !/\t\d/.test(part)
    );

  return paragraphs[0] ?? '';
}

function matchField(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function normalizeAmount(value: string): string {
  return value
    .replace(/\s*г(?:рамм\w*)?\s*$/i, '')
    .replace(/\s+/g, '')
    .replace(',', '.')
    .slice(0, 32);
}

/** Таблицы из HTML docx → матрицы ячеек. */
function extractHtmlTables(html: string): string[][][] {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  return [...doc.querySelectorAll('table')].map((table) =>
    [...table.querySelectorAll('tr')].map((row) =>
      [...row.querySelectorAll('th,td')].map((cell) =>
        (cell.textContent ?? '').replace(/\s+/g, ' ').trim()
      )
    )
  );
}

/**
 * Ингредиенты из таблицы: колонки «наименование / брутто / нетто».
 * Берём таблицу, похожую на рецептуру (есть брутто/нетто в шапке или числа в строках).
 */
function extractIngredientsFromTables(
  tables: string[][][],
  dishName: string
): CreateRecipeIngredient[] | null {
  let best: CreateRecipeIngredient[] = [];

  for (const table of tables) {
    if (table.length < 2) continue;
    const parsed = parseIngredientTable(table, dishName);
    if (parsed.length > best.length) best = parsed;
  }

  return best.length > 0 ? best : null;
}

function parseIngredientTable(table: string[][], dishName: string): CreateRecipeIngredient[] {
  const headerIndex = table.findIndex((row) => isIngredientHeader(row));
  const start = headerIndex >= 0 ? headerIndex + 1 : 0;
  const header = headerIndex >= 0 ? table[headerIndex] : [];

  const nameIdx = findColumn(header, [/наименован/i, /продукт/i, /сырь/i, /состав/i]) ?? 0;
  const grossIdx = findColumn(header, [/брутто/i, /gross/i]) ?? (header.length >= 2 ? 1 : -1);
  const netIdx =
    findColumn(header, [/нетто/i, /net/i]) ??
    (header.length >= 3 ? 2 : grossIdx >= 0 ? grossIdx : -1);

  const ingredients: CreateRecipeIngredient[] = [];

  for (const row of table.slice(start)) {
    if (row.every((cell) => !cell)) continue;
    if (isIngredientHeader(row)) continue;

    const joined = row.join(' ').toLowerCase();
    if (/итого|выход|масса\s+готового|на\s+\d+\s+порц/i.test(joined)) {
      // Строка «Выход» иногда полезна как выход порции, но не ингредиент.
      continue;
    }

    const name = (row[nameIdx] ?? row[0] ?? '').trim();
    if (!name || name.length < 2) continue;
    if (cleanName(name).toLowerCase() === cleanName(dishName).toLowerCase()) continue;
    if (/^№?\d+$/.test(name)) continue;

    const numbers = row
      .flatMap((cell) => cell.match(/\d+(?:[.,]\d+)?/g) ?? [])
      .map((value) => value.replace(',', '.'));

    const gross = grossIdx >= 0 && row[grossIdx] ? firstNumber(row[grossIdx]) : (numbers[0] ?? '');
    const net =
      netIdx >= 0 && row[netIdx] ? firstNumber(row[netIdx]) : (numbers[1] ?? numbers[0] ?? '');

    // Строка без чисел — скорее заголовок группы («Соус», «Гарнир»), пропускаем.
    if (!gross && !net && numbers.length === 0) continue;

    ingredients.push({
      name: cleanName(name),
      grossPerPortion: gross,
      netPerPortion: net,
    });
  }

  return ingredients.slice(0, 60);
}

function isIngredientHeader(row: string[]): boolean {
  const line = row.join(' ').toLowerCase();
  return (
    (/наименован|продукт|сырь/.test(line) && /брутто|нетто|масс/.test(line)) ||
    (/брутто/.test(line) && /нетто/.test(line))
  );
}

function findColumn(header: string[], patterns: RegExp[]): number | null {
  for (let i = 0; i < header.length; i += 1) {
    if (patterns.some((pattern) => pattern.test(header[i]))) return i;
  }
  return null;
}

function firstNumber(value: string): string {
  const match = value.match(/\d+(?:[.,]\d+)?/);
  return match ? match[0].replace(',', '.') : '';
}

/** Запасной разбор ингредиентов из текстовых/PDF строк (таб или пробелы). */
function extractIngredientsFromText(lines: string[]): CreateRecipeIngredient[] | null {
  const ingredients: CreateRecipeIngredient[] = [];
  let inTable = false;

  for (const line of lines) {
    if (/наименован.*(брутто|нетто)|брутто.*нетто|рецептур/i.test(line)) {
      inTable = true;
      continue;
    }
    if (/технология\s+приготовления|температура|срок\s*реализации/i.test(line)) {
      inTable = false;
      continue;
    }

    const cells = line.includes('\t') ? line.split('\t').map((cell) => cell.trim()) : null;

    if (cells && cells.length >= 2) {
      const parsed = parseIngredientTable([cells], '');
      ingredients.push(...parsed);
      inTable = true;
      continue;
    }

    if (!inTable && !/\d/.test(line)) continue;

    const spaced = line.match(
      /^(.{2,80}?)\s{2,}(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)(?:\s+\d+(?:[.,]\d+)?){0,6}\s*$/
    );
    if (spaced) {
      ingredients.push({
        name: cleanName(spaced[1]),
        grossPerPortion: spaced[2].replace(',', '.'),
        netPerPortion: spaced[3].replace(',', '.'),
      });
      continue;
    }

    const singleSpaced = line.match(
      /^([А-Яа-яA-Za-zЁё][^0-9]{1,60}?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)(?:\s|$)/
    );
    if (singleSpaced && !/^(выход|срок|температур)/i.test(singleSpaced[1])) {
      ingredients.push({
        name: cleanName(singleSpaced[1]),
        grossPerPortion: singleSpaced[2].replace(',', '.'),
        netPerPortion: singleSpaced[3].replace(',', '.'),
      });
    }
  }

  return ingredients.length > 0 ? ingredients.slice(0, 60) : null;
}
