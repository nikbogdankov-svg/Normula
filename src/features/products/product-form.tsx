import { useEffect, useState } from 'react';
import { Flex, TextInput } from '@gravity-ui/uikit';
import type { CreateProductRequest, Product } from './types';

type Draft = {
  name: string;
  unit: string;
};

const emptyDraft: Draft = { name: '', unit: '' };

/** Состояние и разметка минимальной формы создания продукта (имя + единица). */
export function useProductForm(initial?: Product | null, resetKey?: string) {
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
        label="Название продукта:"
        placeholder="Например, Тофу соевый"
        value={draft.name}
        onUpdate={(value) => patch('name', value)}
        autoFocus
      />
      <TextInput
        size="l"
        label="Единица закупки:"
        placeholder="кг, л, шт"
        value={draft.unit}
        onUpdate={(value) => patch('unit', value)}
      />
    </Flex>
  );

  return { fields, getBody, setInitialName, canSubmit: Boolean(draft.name.trim()) };
}
