import { PRICE_DECIMALS, QUANTITY_DECIMALS } from './types';

/** Сумма в чешских кронах: «1 234,56 Kč». */
export function formatMoney(value: number): string {
  return `${value.toLocaleString('cs-CZ', {
    minimumFractionDigits: PRICE_DECIMALS,
    maximumFractionDigits: PRICE_DECIMALS,
  })} Kč`;
}

/** Количество без лишних нулей: «10,5», «0,987», «12». */
export function formatQuantity(value: number, unit?: string): string {
  const text = value.toLocaleString('cs-CZ', { maximumFractionDigits: QUANTITY_DECIMALS });

  return unit ? `${text} ${unit}` : text;
}

/** гггг-мм-дд → дд.мм.гггг. Пустую или кривую строку отдаёт как есть. */
export function formatDate(value: string): string {
  const [yyyy, mm, dd] = value.split('-');
  if (!yyyy || !mm || !dd) return value;

  return `${dd}.${mm}.${yyyy}`;
}

/** гггг-мм-дд → дд/мм/гггг для DatePicker. */
export function isoToPicker(value: string): string {
  const [yyyy, mm, dd] = value.split('-');
  if (!yyyy || !mm || !dd) return '';

  return `${dd}/${mm}/${yyyy}`;
}

/** дд/мм/гггг (DatePicker) → гггг-мм-дд (бэкенд). Кривой ввод — пусто. */
export function pickerToIso(value: string): string {
  const [dd, mm, yyyy] = value.split('/');
  if (!dd || !mm || yyyy?.length !== 4) return '';

  return `${yyyy}-${mm}-${dd}`;
}

/** Сегодня в формате DatePicker. */
export function todayPicker(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');

  return `${dd}/${mm}/${now.getFullYear()}`;
}

/**
 * Разбирает число из поля ввода: запятая как разделитель допустима, знаков
 * после запятой — не больше decimals. Иначе null: бэкенд такое не примет,
 * и форма не должна давать это отправить.
 */
export function parseDecimal(value: string, decimals: number): number | null {
  const normalized = value.trim().replace(',', '.');
  if (normalized === '') return null;

  const pattern = new RegExp(`^\\d+(\\.\\d{0,${decimals}})?$`);
  if (!pattern.test(normalized)) return null;

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

/** Число из бэкенда → строка для поля ввода (пустая для нуля). */
export function decimalToInput(value: number): string {
  return value ? String(value) : '';
}

/** Сумма строки, как её посчитает бэкенд: до копейки, половина — вверх. */
export function lineTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100 + Number.EPSILON) / 100;
}
