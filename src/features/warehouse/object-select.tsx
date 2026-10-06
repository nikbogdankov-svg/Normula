import { useEffect, useMemo } from 'react';
import { Select } from '@gravity-ui/uikit';
import { useObjects } from '@/features/objects/api';
import type { ObjectItem } from '@/features/objects/types';

/** Объект в селекте склада. */
export interface ObjectOption {
  value: string;
  content: string;
}

/**
 * Только объекты верхнего уровня: склад один на объект вместе с его
 * подобъектами, и бэкенд подобъект в документах не принимает.
 */
export function objectOptions(objects: ObjectItem[]): ObjectOption[] {
  return objects
    .filter((object) => !object.parentObjectId)
    .map((object) => ({ value: object.id, content: object.name }));
}

/**
 * Выбор объекта для разделов склада. Пока ничего не выбрано, подставляет
 * первый объект организации — иначе списки не с чего грузить.
 */
export function useObjectChoice(value: string, onUpdate: (id: string) => void) {
  const objects = useObjects();
  const options = useMemo(() => objectOptions(objects.data?.objects ?? []), [objects.data]);

  useEffect(() => {
    if (value || options.length === 0) return;
    onUpdate(options[0].value);
  }, [value, options, onUpdate]);

  return { options, objects };
}

export function ObjectSelect({
  value,
  onUpdate,
  options,
  label = 'Объект:',
  width = 280,
  disabled,
}: {
  value: string;
  onUpdate: (id: string) => void;
  options: ObjectOption[];
  label?: string;
  width?: number | 'max';
  disabled?: boolean;
}) {
  return (
    <Select
      size="l"
      width={width}
      label={label}
      placeholder="Выберите объект"
      value={value ? [value] : []}
      options={options}
      onUpdate={(next) => onUpdate(next[0] ?? '')}
      disabled={disabled}
    />
  );
}

/** Название объекта по id для просмотра документов. */
export function objectName(options: ObjectOption[], id: string): string {
  return options.find((option) => option.value === id)?.content ?? '—';
}
