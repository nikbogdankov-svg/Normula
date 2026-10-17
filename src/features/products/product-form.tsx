import { useEffect, useState } from 'react';
import { Flex, Select, TextInput, type SelectOption } from '@gravity-ui/uikit';
import { useTranslation } from 'react-i18next';
import type { CreateProductRequest, Product } from './types';

type Draft = {
  name: string;
  unit: string;
};

const emptyDraft: Draft = { name: '', unit: '' };

const UNIT_OPTIONS = ['кг', 'г', 'л', 'мл', 'шт', 'уп', 'кор', 'ящ'];

/** Состояние и разметка минимальной формы создания продукта (имя + единица). */
export function useProductForm(initial?: Product | null, resetKey?: string) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  useEffect(() => {
    if (initial) {
      setDraft({ name: initial.name, unit: initial.unit });
      return;
    }
    setDraft(emptyDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetKey задаёт момент предзаполнения
  }, [resetKey]);

  const patch = (field: keyof Draft, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));

  /** Единица сохраняется как есть: если её нет в списке, добавляем вручную. */
  const unitOptions: SelectOption[] = draft.unit
    ? [...UNIT_OPTIONS, draft.unit]
        .filter((unit, index, all) => all.indexOf(unit) === index)
        .map((unit): SelectOption => ({ value: unit, content: unit }))
    : UNIT_OPTIONS.map((unit): SelectOption => ({ value: unit, content: unit }));

  /** Предзаполнить название (например, тем, что пользователь ввёл и не нашёл). */
  const setInitialName = (value: string) => setDraft((current) => ({ ...current, name: value }));

  const getBody = (): CreateProductRequest => ({
    name: draft.name.trim(),
    unit: draft.unit.trim() || 'шт',
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
