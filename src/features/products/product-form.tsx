import { useEffect, useState } from 'react';
import { Flex, Select, Text, TextInput } from '@gravity-ui/uikit';
import type { CreateProductRequest, Product, ProductCategory } from './types';

/** Числовой ввод КБЖУ: храним строкой, парсим в submit. */
function NumberField({
  label,
  placeholder,
  value,
  onUpdate,
}: {
  label: string;
  placeholder: string;
  value: string;
  onUpdate: (value: string) => void;
}) {
  return (
    <TextInput
      size="l"
      type="number"
      label={label}
      placeholder={placeholder}
      value={value}
      controlProps={{ min: 0, step: 0.1 }}
      onUpdate={onUpdate}
      style={{ flex: 1 }}
    />
  );
}

function parseDecimal(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

type Draft = {
  name: string;
  categoryId: string;
  kcal: string;
  protein: string;
  fat: string;
  carbs: string;
  vitaminC: string;
};

/** Состояние и разметка формы создания/редактирования продукта. */
export function useProductForm(
  initial?: Product | null,
  resetKey?: string,
  categories: ProductCategory[] = []
) {
  const [draft, setDraft] = useState<Draft>({
    name: '',
    categoryId: '',
    kcal: '',
    protein: '',
    fat: '',
    carbs: '',
    vitaminC: '',
  });

  useEffect(() => {
    if (initial) {
      setDraft({
        name: initial.name,
        categoryId: initial.categoryId,
        kcal: String(initial.kcal),
        protein: String(initial.protein),
        fat: String(initial.fat),
        carbs: String(initial.carbs),
        vitaminC: String(initial.vitaminC ?? ''),
      });
      return;
    }

    setDraft({
      name: '',
      categoryId: '',
      kcal: '',
      protein: '',
      fat: '',
      carbs: '',
      vitaminC: '',
    });
    // Сбрасываем только по ключу сессии формы, не по ссылке на initial.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetKey задаёт момент предзаполнения
  }, [resetKey]);

  const patch = (field: keyof Draft, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const getBody = (): CreateProductRequest => ({
    name: draft.name.trim(),
    categoryId: draft.categoryId,
    kcal: parseDecimal(draft.kcal),
    protein: parseDecimal(draft.protein),
    fat: parseDecimal(draft.fat),
    carbs: parseDecimal(draft.carbs),
    vitaminC: parseDecimal(draft.vitaminC),
  });

  const fields = (
    <Flex direction="column" gap={2}>
      <Flex direction="column" gap={2}>
        <TextInput
          size="l"
          label="Название продукта:"
          placeholder="Например, Мука пшеничная"
          value={draft.name}
          onUpdate={(value) => patch('name', value)}
          autoFocus
        />
        <Select
          size="l"
          label="Категория:"
          width="max"
          value={draft.categoryId ? [draft.categoryId] : []}
          placeholder="Не выбрана"
          options={categories.map((category) => ({
            value: category.id,
            content: category.name,
          }))}
          onUpdate={(value) => patch('categoryId', value[0] ?? '')}
        />
      </Flex>

      <Flex direction="column" gap={2}>
        <Text
          variant="subheader-1"
          className="product-dialog__section-title product-dialog__section-title_form"
        >
          Пищевая ценность на 100 г
        </Text>
        <Flex gap={2}>
          <NumberField
            label="Ккал:"
            placeholder="0"
            value={draft.kcal}
            onUpdate={(value) => patch('kcal', value)}
          />
          <NumberField
            label="Белки, г:"
            placeholder="0"
            value={draft.protein}
            onUpdate={(value) => patch('protein', value)}
          />
        </Flex>
        <Flex gap={2}>
          <NumberField
            label="Жиры, г:"
            placeholder="0"
            value={draft.fat}
            onUpdate={(value) => patch('fat', value)}
          />
          <NumberField
            label="Углеводы, г:"
            placeholder="0"
            value={draft.carbs}
            onUpdate={(value) => patch('carbs', value)}
          />
        </Flex>
        <Flex gap={2}>
          <NumberField
            label="Витамин С, мг:"
            placeholder="0"
            value={draft.vitaminC}
            onUpdate={(value) => patch('vitaminC', value)}
          />
        </Flex>
      </Flex>
    </Flex>
  );

  return { fields, getBody, canSubmit: Boolean(draft.name.trim()) };
}
