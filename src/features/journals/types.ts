/** Приоритет журнала по ТЗ. */
export type JournalPriority = 'required' | 'optional';

/** Источник данных для автозаполнения. */
export type JournalSource = 'menu' | 'ttk' | 'portions' | 'invoices' | 'warehouse';

/** Описание автоматического журнала [ЖУРН]. */
export interface AutoJournal {
  id: string;
  tag: string;
  title: string;
  description: string;
  priority: JournalPriority;
  sources: JournalSource[];
  autoFields: string[];
  manualFields: string[];
}

export const JOURNAL_SOURCE_LABELS: Record<JournalSource, string> = {
  menu: 'Меню',
  ttk: 'ТТК',
  portions: 'Порционник',
  invoices: 'Накладные',
  warehouse: 'Склад',
};

export const JOURNAL_PRIORITY_LABELS: Record<JournalPriority, string> = {
  required: 'Обязательно',
  optional: 'Желательно',
};

/** Каталог автоматических журналов по разделу 4 ТЗ. */
export const AUTO_JOURNALS: AutoJournal[] = [
  {
    id: 'journ-01',
    tag: 'ЖУРН-01',
    title: 'Накопительная ведомость диетического контроля',
    description: 'Норма–факт за 10–14 дней по питанию.',
    priority: 'required',
    sources: ['menu', 'ttk', 'portions'],
    autoFields: ['Дата', 'Приём пищи', 'Блюда', 'Норма', 'Факт', 'Отклонение'],
    manualFields: [],
  },
  {
    id: 'journ-02',
    tag: 'ЖУРН-02',
    title: 'Бракеражный журнал готовой продукции',
    description: 'Контроль качества готовых блюд перед выдачей.',
    priority: 'required',
    sources: ['menu', 'ttk', 'portions'],
    autoFields: ['Дата', 'Приём пищи', 'Блюда', 'Выход', 'Время'],
    manualFields: ['Оценка', 'Разрешение на выдачу'],
  },
  {
    id: 'journ-03',
    tag: 'ЖУРН-03',
    title: 'Журнал контроля поступления сырья',
    description: 'Бракераж скоропортящейся продукции при приёмке.',
    priority: 'required',
    sources: ['invoices'],
    autoFields: ['Дата', 'Продукт', 'Поставщик', 'Количество', 'Срок годности'],
    manualFields: ['Оценка состояния'],
  },
  {
    id: 'journ-04',
    tag: 'ЖУРН-04',
    title: 'Ведомость обогащения третьих и сладких блюд',
    description: 'Витаминизация блюд по типам и объёму питания.',
    priority: 'required',
    sources: ['menu', 'portions'],
    autoFields: ['Дата', 'Тип блюда', 'Блюдо', 'Число питающихся', 'Доза витаминов'],
    manualFields: [],
  },
  {
    id: 'journ-05',
    tag: 'ЖУРН-05',
    title: 'Ведомость выдачи продуктов со склада',
    description: 'Меню-требование на продукты для приготовления.',
    priority: 'required',
    sources: ['menu', 'ttk', 'warehouse'],
    autoFields: ['Дата', 'Продукт', 'Единица', 'Количество по меню', 'К выдаче'],
    manualFields: ['Подпись кладовщика'],
  },
  {
    id: 'journ-06',
    tag: 'ЖУРН-06',
    title: 'Товарный отчёт по складу',
    description: 'Расход продуктов за выбранный период.',
    priority: 'required',
    sources: ['warehouse', 'invoices'],
    autoFields: ['Период', 'Продукт', 'Остаток на начало', 'Приход', 'Расход', 'Остаток на конец'],
    manualFields: [],
  },
  {
    id: 'journ-07',
    tag: 'ЖУРН-07',
    title: 'Заявка поставщику',
    description: 'Потребность в продуктах на неделю.',
    priority: 'optional',
    sources: ['menu', 'ttk', 'warehouse'],
    autoFields: ['Период', 'Продукт', 'Единица', 'Потребность', 'Остаток', 'К заказу'],
    manualFields: ['Подпись'],
  },
  {
    id: 'journ-08',
    tag: 'ЖУРН-08',
    title: 'Журнал ежедневного отбора проб',
    description: 'Учёт проб готовых блюд для хранения.',
    priority: 'optional',
    sources: ['menu', 'ttk', 'portions'],
    autoFields: ['Дата', 'Блюдо', 'Выход'],
    manualFields: ['Хранение проб'],
  },
];
