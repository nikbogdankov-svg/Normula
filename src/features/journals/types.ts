/** Приоритет журнала по ТЗ. */
export type JournalPriority = 'required' | 'optional';

/** Источник данных для автозаполнения. */
export type JournalSource = 'menu' | 'ttk' | 'portions' | 'invoices' | 'warehouse';

/** Описание автоматического журнала [ЖУРН]. */
export interface AutoJournal {
  id: string;
  tagKey: string;
  titleKey: string;
  descriptionKey: string;
  priority: JournalPriority;
  sources: JournalSource[];
  autoFieldKeys: string[];
  manualFieldKeys: string[];
}

export const JOURNAL_SOURCE_KEYS: Record<JournalSource, string> = {
  menu: 'journals.source.menu',
  ttk: 'journals.source.ttk',
  portions: 'journals.source.portions',
  invoices: 'journals.source.invoices',
  warehouse: 'journals.source.warehouse',
};

export const JOURNAL_PRIORITY_KEYS: Record<JournalPriority, string> = {
  required: 'journals.priority.required',
  optional: 'journals.priority.optional',
};

const field = (key: string) => `journals.field.${key}`;

/** Каталог автоматических журналов по разделу 4 ТЗ. */
export const AUTO_JOURNALS: AutoJournal[] = [
  {
    id: 'journ-01',
    tagKey: 'journals.items.journ-01.tag',
    titleKey: 'journals.items.journ-01.title',
    descriptionKey: 'journals.items.journ-01.description',
    priority: 'required',
    sources: ['menu', 'ttk', 'portions'],
    autoFieldKeys: ['date', 'meal', 'dishes', 'norm', 'fact', 'deviation'].map(field),
    manualFieldKeys: [],
  },
  {
    id: 'journ-02',
    tagKey: 'journals.items.journ-02.tag',
    titleKey: 'journals.items.journ-02.title',
    descriptionKey: 'journals.items.journ-02.description',
    priority: 'required',
    sources: ['menu', 'ttk', 'portions'],
    autoFieldKeys: [],
    manualFieldKeys: [
      'arrivalDateTime',
      'productName',
      'packaging',
      'productionDate',
      'manufacturer',
      'supplier',
      'arrivalQuantity',
      'safetyDocument',
      'organoleptic',
      'storageConditions',
      'actualSaleDateTime',
      'responsibleSign',
      'note',
    ].map(field),
  },
  {
    id: 'journ-03',
    tagKey: 'journals.items.journ-03.tag',
    titleKey: 'journals.items.journ-03.title',
    descriptionKey: 'journals.items.journ-03.description',
    priority: 'required',
    sources: ['invoices'],
    autoFieldKeys: ['date', 'product', 'supplier', 'quantity', 'shelfLife'].map(field),
    manualFieldKeys: ['condition'].map(field),
  },
  {
    id: 'journ-04',
    tagKey: 'journals.items.journ-04.tag',
    titleKey: 'journals.items.journ-04.title',
    descriptionKey: 'journals.items.journ-04.description',
    priority: 'required',
    sources: ['menu', 'portions'],
    autoFieldKeys: ['date', 'dishType', 'dish', 'diners', 'vitaminDose'].map(field),
    manualFieldKeys: [],
  },
  {
    id: 'journ-05',
    tagKey: 'journals.items.journ-05.tag',
    titleKey: 'journals.items.journ-05.title',
    descriptionKey: 'journals.items.journ-05.description',
    priority: 'required',
    sources: ['menu', 'ttk', 'warehouse'],
    autoFieldKeys: ['date', 'product', 'unit', 'menuQuantity', 'toIssue'].map(field),
    manualFieldKeys: ['storekeeperSign'].map(field),
  },
  {
    id: 'journ-06',
    tagKey: 'journals.items.journ-06.tag',
    titleKey: 'journals.items.journ-06.title',
    descriptionKey: 'journals.items.journ-06.description',
    priority: 'required',
    sources: ['warehouse', 'invoices'],
    autoFieldKeys: ['period', 'product', 'opening', 'income', 'expense', 'closing'].map(field),
    manualFieldKeys: [],
  },
  {
    id: 'journ-07',
    tagKey: 'journals.items.journ-07.tag',
    titleKey: 'journals.items.journ-07.title',
    descriptionKey: 'journals.items.journ-07.description',
    priority: 'optional',
    sources: ['menu', 'ttk', 'warehouse'],
    autoFieldKeys: ['period', 'product', 'unit', 'need', 'stockBalance', 'toOrder'].map(field),
    manualFieldKeys: ['sign'].map(field),
  },
  {
    id: 'journ-08',
    tagKey: 'journals.items.journ-08.tag',
    titleKey: 'journals.items.journ-08.title',
    descriptionKey: 'journals.items.journ-08.description',
    priority: 'optional',
    sources: ['menu', 'ttk', 'portions'],
    autoFieldKeys: ['date', 'dish', 'output'].map(field),
    manualFieldKeys: ['sampleStorage'].map(field),
  },
];
