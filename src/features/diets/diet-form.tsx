import { useEffect, useState } from 'react';
import { Checkbox, Flex, Text, TextInput } from '@gravity-ui/uikit';
import type { FacilityType } from '@/features/objects/types';
import type { CreateDietRequest, Diet } from './types';

const FACILITY_TYPE_OPTIONS: Array<{ value: FacilityType; label: string }> = [
  { value: 'school', label: 'Школа' },
  { value: 'kindergarten', label: 'Детский сад' },
  { value: 'hospital', label: 'Больница' },
];

function parseDecimal(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

type Draft = {
  name: string;
  appliesTo: FacilityType[];
  pricePerDay: string;
  kcal: string;
  protein: string;
  fat: string;
  carbs: string;
};

/** Состояние и разметка формы создания/редактирования диеты. */
export function useDietForm(initial?: Diet | null, resetKey?: string) {
  const [draft, setDraft] = useState<Draft>({
    name: '',
    appliesTo: [],
    pricePerDay: '',
    kcal: '',
    protein: '',
    fat: '',
    carbs: '',
  });

  useEffect(() => {
    setDraft({
      name: initial?.name ?? '',
      appliesTo: initial ? [...initial.appliesTo] : [],
      pricePerDay: initial ? String(initial.pricePerDay) : '',
      kcal: initial ? String(initial.kcal) : '',
      protein: initial ? String(initial.protein) : '',
      fat: initial ? String(initial.fat) : '',
      carbs: initial ? String(initial.carbs) : '',
    });
    // Сбрасываем по ключу сессии формы, не по ссылке на initial.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetKey задаёт момент предзаполнения
  }, [resetKey]);

  const patchName = (name: string) => setDraft((current) => ({ ...current, name }));

  const patchNumber = (
    field: keyof Pick<Draft, 'pricePerDay' | 'kcal' | 'protein' | 'fat' | 'carbs'>,
    value: string
  ) => setDraft((current) => ({ ...current, [field]: value }));

  const toggleType = (type: FacilityType) =>
    setDraft((current) => ({
      ...current,
      appliesTo: current.appliesTo.includes(type)
        ? current.appliesTo.filter((item) => item !== type)
        : [...current.appliesTo, type],
    }));

  const getBody = (): CreateDietRequest => ({
    name: draft.name.trim(),
    appliesTo: draft.appliesTo,
    pricePerDay: parseDecimal(draft.pricePerDay),
    kcal: parseDecimal(draft.kcal),
    protein: parseDecimal(draft.protein),
    fat: parseDecimal(draft.fat),
    carbs: parseDecimal(draft.carbs),
  });

  const fields = (
    <Flex direction="column" gap={3}>
      <TextInput
        size="l"
        label="Название:"
        placeholder="Например, Основной"
        value={draft.name}
        onUpdate={patchName}
        autoFocus
      />
      <Flex direction="column" gap={1}>
        <Text variant="body-2" color="secondary">
          Для каких учреждений доступна диета:
        </Text>
        {FACILITY_TYPE_OPTIONS.map((option) => (
          <Checkbox
            key={option.value}
            size="l"
            checked={draft.appliesTo.includes(option.value)}
            onUpdate={() => toggleType(option.value)}
          >
            {option.label}
          </Checkbox>
        ))}
      </Flex>

      <Flex direction="column" gap={2}>
        <Text variant="subheader-1">Норма на день</Text>
        <TextInput
          size="l"
          type="number"
          label="Цена на день, ₽:"
          placeholder="0"
          value={draft.pricePerDay}
          controlProps={{ min: 0, step: 1 }}
          onUpdate={(value) => patchNumber('pricePerDay', value)}
        />
        <Flex gap={2}>
          <TextInput
            size="l"
            type="number"
            label="Ккал:"
            placeholder="0"
            value={draft.kcal}
            controlProps={{ min: 0, step: 1 }}
            onUpdate={(value) => patchNumber('kcal', value)}
            style={{ flex: 1 }}
          />
          <TextInput
            size="l"
            type="number"
            label="Белки, г:"
            placeholder="0"
            value={draft.protein}
            controlProps={{ min: 0, step: 0.1 }}
            onUpdate={(value) => patchNumber('protein', value)}
            style={{ flex: 1 }}
          />
        </Flex>
        <Flex gap={2}>
          <TextInput
            size="l"
            type="number"
            label="Жиры, г:"
            placeholder="0"
            value={draft.fat}
            controlProps={{ min: 0, step: 0.1 }}
            onUpdate={(value) => patchNumber('fat', value)}
            style={{ flex: 1 }}
          />
          <TextInput
            size="l"
            type="number"
            label="Углеводы, г:"
            placeholder="0"
            value={draft.carbs}
            controlProps={{ min: 0, step: 0.1 }}
            onUpdate={(value) => patchNumber('carbs', value)}
            style={{ flex: 1 }}
          />
        </Flex>
      </Flex>
    </Flex>
  );

  return {
    fields,
    getBody,
    canSubmit:
      Boolean(draft.name.trim()) && draft.appliesTo.length > 0 && draft.pricePerDay.trim() !== '',
  };
}
