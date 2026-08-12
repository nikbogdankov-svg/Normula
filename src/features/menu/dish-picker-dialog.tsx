import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Dialog, Divider, Flex, Icon, Text, TextInput } from '@gravity-ui/uikit';
import { FloppyDisk, Magnifier, Plus, TrashBin } from '@gravity-ui/icons';
import { useRecipes } from '@/features/ttk/api';
import { canAddWithinPriceLimit, formatMetric, parseRuNumber, sumDishes } from './norms';
import type { MenuDishRef } from './types';

/**
 * Выбор блюд из ТТК для одной ячейки меню (день + приём пищи).
 * Лимит цены можно превысить — показывается предупреждение.
 */
export function DishPickerDialog({
  open,
  title,
  dishes,
  priceLimit,
  dayPriceWithoutSlot,
  onSave,
  onClose,
  saving,
}: {
  open: boolean;
  title: string;
  dishes: MenuDishRef[];
  /** Суточный лимит цены, ₽. */
  priceLimit: number;
  /** Сумма цен по другим приёмам этого дня (без текущей ячейки). */
  dayPriceWithoutSlot: number;
  onSave: (dishes: MenuDishRef[], force?: boolean) => void;
  onClose: () => void;
  saving?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<MenuDishRef[]>([]);
  const wasOpen = useRef(false);
  const recipes = useRecipes({ search, collectionId: '', sort: 'name' });

  // Синхронизируем черновик только при открытии — иначе ререндер родителя сбрасывает добавления.
  useEffect(() => {
    if (open && !wasOpen.current) {
      setSearch('');
      setDraft(dishes.map((dish) => ({ ...dish })));
    }
    wasOpen.current = open;
  }, [open, dishes]);

  const draftPrice = useMemo(() => sumDishes(draft).price, [draft]);
  const dayPrice = dayPriceWithoutSlot + draftPrice;
  const overLimit = dayPrice > priceLimit;
  const remaining = priceLimit - dayPrice;

  const available = useMemo(
    () =>
      (recipes.data?.recipes ?? []).filter(
        (recipe) => !draft.some((dish) => dish.recipeId === recipe.id)
      ),
    [recipes.data?.recipes, draft]
  );

  const add = (recipeId: string) => {
    const recipe = recipes.data?.recipes.find((item) => item.id === recipeId);
    if (!recipe) return;
    setDraft((current) => {
      if (current.some((dish) => dish.recipeId === recipe.id)) return current;
      return [
        ...current,
        {
          recipeId: recipe.id,
          name: recipe.name,
          kcal: recipe.kcal,
          price: recipe.price,
          protein: parseRuNumber(recipe.nutrition.protein),
          fat: parseRuNumber(recipe.nutrition.fat),
          carbs: parseRuNumber(recipe.nutrition.carbs),
          portionYield: recipe.portionYield,
        },
      ];
    });
  };

  if (!open) return null;

  return (
    <Dialog open onClose={onClose} size="s">
      <Dialog.Header caption={title} />
      <Dialog.Divider />
      <Dialog.Body>
        <Flex direction="column" gap={4}>
          <Flex direction="column" gap={2}>
            <Text variant="subheader-1">В ячейке</Text>
            {draft.length === 0 ? (
              <Text variant="body-1" color="secondary">
                Блюд пока нет — добавьте из ТТК ниже.
              </Text>
            ) : (
              draft.map((dish) => (
                <Flex key={dish.recipeId} alignItems="center" gap={2}>
                  <Flex direction="column" style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="body-2" ellipsis>
                      {dish.name}
                    </Text>
                    <Text variant="caption-2" color="secondary">
                      {dish.portionYield || '—'} · {dish.kcal} ккал · {dish.price} ₽
                    </Text>
                  </Flex>
                  <Button
                    view="flat"
                    size="m"
                    title="Убрать"
                    onClick={() =>
                      setDraft((current) => current.filter((row) => row.recipeId !== dish.recipeId))
                    }
                  >
                    <Icon data={TrashBin} size={16} />
                  </Button>
                </Flex>
              ))
            )}
            <Text variant="caption-2" color={overLimit ? 'danger' : 'secondary'}>
              Цена дня: {formatMetric(dayPrice)} / {formatMetric(priceLimit)} ₽
              {overLimit
                ? ` · превышение на ${formatMetric(dayPrice - priceLimit)} ₽`
                : ` · остаток ${formatMetric(remaining)} ₽`}
            </Text>
            {overLimit && <Alert theme="warning" title="Превышен лимит цены" />}
          </Flex>

          <Divider />

          <Flex direction="column" gap={2}>
            <Text variant="subheader-1">Добавить из ТТК</Text>
            <TextInput
              size="l"
              placeholder="Поиск блюда"
              value={search}
              onUpdate={setSearch}
              hasClear
              startContent={
                <span
                  style={{ display: 'inline-flex', paddingInlineStart: 4, paddingInlineEnd: 4 }}
                >
                  <Icon data={Magnifier} size={16} />
                </span>
              }
            />
            {recipes.isPending && (
              <Text variant="body-1" color="secondary">
                Загрузка…
              </Text>
            )}
            {recipes.isError && (
              <Text variant="body-1" color="danger">
                Не удалось загрузить ТТК
              </Text>
            )}
            <Flex direction="column" gap={1} style={{ maxHeight: 260, overflow: 'auto' }}>
              {available.map((recipe) => {
                const wouldExceed = !canAddWithinPriceLimit(
                  dayPriceWithoutSlot,
                  draftPrice,
                  recipe.price,
                  priceLimit
                );
                return (
                  <Flex key={recipe.id} alignItems="center" gap={2}>
                    <Flex direction="column" style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="body-2" ellipsis>
                        {recipe.name}
                      </Text>
                      <Text variant="caption-2" color={wouldExceed ? 'danger' : 'secondary'}>
                        {recipe.portionYield || '—'} · {recipe.kcal} ккал · {recipe.price} ₽
                        {wouldExceed && ' · превысит лимит'}
                      </Text>
                    </Flex>
                    <Button
                      type="button"
                      view="flat"
                      size="s"
                      onClick={() => add(recipe.id)}
                    >
                      <Icon data={Plus} size={14} />
                      Добавить
                    </Button>
                  </Flex>
                );
              })}
              {recipes.data && available.length === 0 && (
                <Text variant="body-1" color="secondary">
                  {search ? 'Ничего не найдено' : 'Все подходящие блюда уже в ячейке'}
                </Text>
              )}
            </Flex>
          </Flex>
        </Flex>
      </Dialog.Body>
      <Dialog.Divider />
      <Dialog.Footer>
        <Flex justifyContent="flex-end" gap={2} style={{ width: '100%' }}>
          <Button type="button" view="outlined" size="l" onClick={onClose}>
            Отмена
          </Button>
          {overLimit && (
            <Button
              type="button"
              view="outlined"
              size="l"
              onClick={() => onSave(draft, true)}
            >
              Разрешить
            </Button>
          )}
          <Button type="button" view="action" size="l" loading={saving} onClick={() => onSave(draft)}>
            <Icon data={FloppyDisk} size={16} />
            Сохранить
          </Button>
        </Flex>
      </Dialog.Footer>
    </Dialog>
  );
}
