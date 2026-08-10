/** Кириллица → латиница для локальной части корпоративной почты. */
const CYR_TO_LAT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

/** Транслит + только латиница и цифры. */
export function toEmailSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => CYR_TO_LAT[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Почта в организации из имени и фамилии, как в макете:
 * `i.ivanov@…`. До заполнения ФИО — пустая строка.
 */
export function orgEmail(firstName: string, lastName: string): string {
  if (!firstName.trim() || !lastName.trim()) return '';

  const first = toEmailSlug(firstName);
  const last = toEmailSlug(lastName);
  if (!first || !last) return '';

  return `${first[0]}.${last}@zdorovoyepitanie.ru`;
}
