import { useState } from 'react';
import { Button, Flex, Icon, Label, Text, TextInput } from '@gravity-ui/uikit';
import { Magnifier, Pencil, Plus, TrashBin } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { useDiets } from './api';
import type { Diet } from './types';
import { DietDialog } from './diet-dialog';
import { CreateDietDialog } from './create-diet-dialog';
import { MEALS } from '@/features/menu/types';
import './diets-route.css';

const FACILITY_TYPE_LABELS: Record<string, string> = {
  school: 'Школа',
  kindergarten: 'Детский сад',
  hospital: 'Больница',
  warehouse: 'Склад',
};

/** Цвет тэга заведения: дружелюбный к виду организации. */
const FACILITY_THEME: Record<string, 'info' | 'success' | 'danger' | 'warning' | 'utility'> = {
  school: 'info',
  kindergarten: 'success',
  hospital: 'danger',
  warehouse: 'utility',
};

/** Карточка диеты: заведения, приёмы пищи, нормы на день и действия. */
function DietCard({
  diet,
  onEdit,
  onDelete,
}: {
  diet: Diet;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meals = diet.mealIds
    .map((mealId) => MEALS.find((meal) => meal.id === mealId)?.label)
    .filter(Boolean);

  return (
    <div className="diets-card">
      <Flex alignItems="center" justifyContent="space-between" gap={2} style={{ width: '100%' }}>
        <Flex alignItems="center" gap={2} wrap>
          <Text variant="subheader-2">{diet.name}</Text>
          <div className="diets-card__tags">
            {diet.appliesTo.map((type) => (
              <Label key={type} theme={FACILITY_THEME[type]}>
                {FACILITY_TYPE_LABELS[type] ?? type}
              </Label>
            ))}
          </div>
        </Flex>
        <Flex gap={1}>
          <Button
            size="m"
            view="flat"
            title="Редактировать"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
          >
            <Icon data={Pencil} size={18} />
          </Button>
          <Button
            size="m"
            view="flat"
            title="Удалить"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <Icon data={TrashBin} size={18} />
          </Button>
        </Flex>
      </Flex>
      <div className="diets-card__tags">
        {meals.length === 0
          ? null
          : meals.map((label) => (
              <span key={label} className="diets-card__tag">
                {label}
              </span>
            ))}
      </div>
      <Text variant="body-2" style={{ marginTop: 4 }}>
        {diet.pricePerDay} ₽ · {diet.kcal}ккал · Б: {diet.protein}г · Ж: {diet.fat}г · У:{' '}
        {diet.carbs}г
      </Text>
    </div>
  );
}

/** Раздел «Диеты»: справочник рационов питания в виде карточек. */
export function DietsRoute() {
  const { current } = useOrganizations();
  const [editing, setEditing] = useState<Diet | null>(null);
  const [deleting, setDeleting] = useState<Diet | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isPending, isError, error, refetch } = useDiets();

  const diets = data?.diets ?? [];
  const query = search.trim().toLowerCase();
  const filteredDiets = query
    ? diets.filter((diet) => diet.name.toLowerCase().includes(query))
    : diets;

  return (
    <div className="diets-page">
      <Flex
        className="diets-page__toolbar"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
        wrap
      >
        <Flex alignItems="center" gap={2} wrap>
          <TextInput
            size="l"
            placeholder="Поиск по названию диеты"
            value={search}
            onUpdate={setSearch}
            hasClear
            startContent={
              <span style={{ display: 'inline-flex', paddingInlineStart: 4, paddingInlineEnd: 4 }}>
                <Icon data={Magnifier} size={16} />
              </span>
            }
            style={{ width: 280 }}
          />
          <Text variant="body-1" color="secondary">
            {data ? `Всего диет: ${diets.length}` : ''}
          </Text>
        </Flex>
        <Button size="l" view="normal-contrast" onClick={() => setCreateOpen(true)}>
          <Icon data={Plus} size={16} />
          Создать диету
        </Button>
      </Flex>

      <div className="diets-page__scroll">
        <div className="diets-page__list">
          {current === null && <NoOrganizationSelectedState />}
          {current !== null && isPending && <LoadingState />}
          {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
          {data && !isPending && !isError && filteredDiets.length === 0 && (
            <EmptyState
              text={query ? `Ничего не нашли по запросу «${search.trim()}»` : 'Диет пока нет'}
            />
          )}

          {data && filteredDiets.length > 0 && (
            <div className="diets-page__cards">
              {filteredDiets.map((diet) => (
                <DietCard
                  key={diet.id}
                  diet={diet}
                  onEdit={() => setEditing(diet)}
                  onDelete={() => setDeleting(diet)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <DietDialog
        diet={editing}
        initialMode="edit"
        onClose={() => setEditing(null)}
        onDietChange={setEditing}
      />
      <DietDialog
        diet={deleting}
        initialMode="confirm-delete"
        onClose={() => setDeleting(null)}
        onDietChange={setDeleting}
      />
      <CreateDietDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
