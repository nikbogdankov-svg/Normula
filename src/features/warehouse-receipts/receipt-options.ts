export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'Декларация о соответствии', labelKey: 'receipt.options.documents.declaration' },
  { value: 'Ветеринарное свидетельство', labelKey: 'receipt.options.documents.veterinary' },
  { value: 'Сертификат соответствия', labelKey: 'receipt.options.documents.conformity' },
  { value: 'Свидетельство о госрегистрации', labelKey: 'receipt.options.documents.registration' },
  { value: 'Сертификат качества', labelKey: 'receipt.options.documents.quality' },
  { value: 'Фитосанитарный сертификат', labelKey: 'receipt.options.documents.phytosanitary' },
  { value: 'Товарная накладная', labelKey: 'receipt.options.documents.deliveryNote' },
  { value: 'УПД', labelKey: 'receipt.options.documents.universalTransfer' },
];

export const STORAGE_CONDITIONS_OPTIONS = [
  { value: 'Сухое проветриваемое помещение', labelKey: 'receipt.options.storage.dryVentilated' },
  { value: 'Тёмное прохладное место', labelKey: 'receipt.options.storage.coolDark' },
  { value: 'Холодильная камера 0…+4 °C', labelKey: 'receipt.options.storage.refrigeratedFour' },
  { value: 'Холодильная камера до +6 °C', labelKey: 'receipt.options.storage.refrigeratedSix' },
  { value: 'Морозильная камера -18 °C', labelKey: 'receipt.options.storage.frozen' },
  { value: 'Комнатная температура', labelKey: 'receipt.options.storage.roomTemperature' },
  { value: 'Не требует особых условий', labelKey: 'receipt.options.storage.noSpecialConditions' },
];

export const ORGANOLEPTIC_OPTIONS = [
  { value: 'Соответствует', labelKey: 'receipt.options.organoleptic.complies' },
  { value: 'Не соответствует', labelKey: 'receipt.options.organoleptic.doesNotComply' },
  {
    value: 'Соответствует с замечаниями',
    labelKey: 'receipt.options.organoleptic.compliesWithRemarks',
  },
];

const OPTION_LABEL_KEYS: Record<string, string> = Object.fromEntries(
  [...DOCUMENT_TYPE_OPTIONS, ...STORAGE_CONDITIONS_OPTIONS, ...ORGANOLEPTIC_OPTIONS].map(
    ({ value, labelKey }) => [value, labelKey]
  )
);

export function receiptOptionLabel(value: string, t: (key: string) => string): string {
  const labelKey = OPTION_LABEL_KEYS[value];
  return labelKey ? t(labelKey) : value;
}

export function receiptSelectOptions(
  options: { value: string; labelKey: string }[],
  t: (key: string) => string
) {
  return options.map(({ value, labelKey }) => ({ value, content: t(labelKey) }));
}
