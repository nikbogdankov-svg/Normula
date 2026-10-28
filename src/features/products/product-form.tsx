import { useEffect, useState } from 'react';
import { Flex, Select, TextInput, type SelectOption } from '@gravity-ui/uikit';
import { useTranslation } from 'react-i18next';
import type { CreateProductRequest, Product } from './types';

type Draft = {
  name: string;
  unit: string;
};

const emptyDraft: Draft = { name: '', unit: '' };

const UNIT_OPTIONS = [
  { value: 'kg', labelKey: 'products.units.kilogram' },
  { value: 'g', labelKey: 'products.units.gram' },
  { value: 'l', labelKey: 'products.units.litre' },
  { value: 'ml', labelKey: 'products.units.millilitre' },
  { value: 'pcs', labelKey: 'products.units.piece' },
  { value: 'pack', labelKey: 'products.units.package' },
  { value: 'box', labelKey: 'products.units.box' },
  { value: 'crate', labelKey: 'products.units.crate' },
];

const LEGACY_UNIT_VALUES: Record<string, string> = {
  кг: 'kg',
  г: 'g',
  л: 'l',
  мл: 'ml',
  шт: 'pcs',
  уп: 'pack',
  кор: 'box',
  ящ: 'crate',
};

function normalizeUnit(unit: string): string {
  return LEGACY_UNIT_VALUES[unit] ?? unit;
}

/** Состояние и разметка минимальной формы создания продукта (имя + единица). */
export function useProductForm(initial?: Product | null, resetKey?: string) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  useEffect(() => {
    if (initial) {
      setDraft({ name: initial.name, unit: normalizeUnit(initial.unit) });
      return;
    }
    setDraft(emptyDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetKey задаёт момент предзаполнения
  }, [resetKey]);

  const patch = (field: keyof Draft, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));

  /** Единица сохраняется как есть: если её нет в списке, добавляем вручную. */
  const unitOptions: SelectOption[] = UNIT_OPTIONS.map(({ value, labelKey }) => ({
    value,
    content: t(labelKey),
  }));
  if (draft.unit && !UNIT_OPTIONS.some(({ value }) => value === draft.unit)) {
    unitOptions.push({ value: draft.unit, content: draft.unit });
  }

  /** Предзаполнить название (например, тем, что пользователь ввёл и не нашёл). */
  const setInitialName = (value: string) => setDraft((current) => ({ ...current, name: value }));

  const getBody = (): CreateProductRequest => ({
    name: draft.name.trim(),
    unit: draft.unit.trim() || 'pcs',
  });

  const fields = (
    <Flex direction="column" gap={2}>
      <TextInput
        size="l"
        label={t('products.nameLabel')}
        placeholder={t('products.namePlaceholder')}
        value={draft.name}
        onUpdate={(value) => patch('name', value)}
        autoFocus
      />
      <Select
        size="l"
        label={t('products.unitLabel')}
        placeholder={t('products.unitPlaceholder')}
        value={draft.unit ? [draft.unit] : []}
        onUpdate={(value) => patch('unit', value[0] ?? '')}
        filterable
        options={unitOptions}
      />
    </Flex>
  );

  return { fields, getBody, setInitialName, canSubmit: Boolean(draft.name.trim()) };
}
