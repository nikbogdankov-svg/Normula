import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dialog, Divider, Flex, Icon, Text, TextInput } from '@gravity-ui/uikit';
import { FloppyDisk, Magnifier, Plus, TrashBin } from '@gravity-ui/icons';
import { useRecipes } from '@/features/ttk/api';
import { useTranslation } from '@/shared/i18n';
import { formatMetric, sumPrice } from './norms';
import type { Dish } from './types';

/**
 * Блюдо в черновике ячейки: то, что есть и у блюда расписания, и у карты
 * из списка ТТК. БЖУ у списка ТТК нет — после сохранения их отдаст бэкенд.
 */
export type PickedDish = Pick<Dish, 'recipeId' | 'name' | 'kcal' | 'price'>;

/**
 * Выбор блюд из ТТК для одной ячейки меню (дата + приём пищи).
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
  dishes: Dish[];
  /** Суточный лимит цены, ₽. */
  priceLimit: number;
  /** Сумма цен по другим приёмам этого дня (без текущей ячейки). */
  dayPriceWithoutSlot: number;
  onSave: (dishes: PickedDish[]) => void;
  onClose: () => void;
  saving?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<PickedDish[]>([]);
  const wasOpen = useRef(false);
  const recipes = useRecipes();
  const { t } = useTranslation();

  // Синхронизируем черновик только при открытии — иначе ререндер родителя сбрасывает добавления.
  useEffect(() => {
    if (open && !wasOpen.current) {
      setSearch('');
      setDraft(
        dishes.map((dish) => ({
          recipeId: dish.recipeId,
          name: dish.name,
          kcal: dish.kcal,
          price: dish.price,
        }))
      );
    }
    wasOpen.current = open;
  }, [open, dishes]);

  const draftPrice = useMemo(() => sumPrice(draft), [draft]);
  const dayPrice = dayPriceWithoutSlot + draftPrice;
  const overLimit = dayPrice > priceLimit;
  const remaining = priceLimit - dayPrice;

  /** Карты ТТК по поиску, по алфавиту, без уже выбранных. */
  const available = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (recipes.data?.recipes ?? [])
      .filter((recipe) => !query || recipe.name.toLowerCase().includes(query))
      .filter((recipe) => !draft.some((dish) => dish.recipeId === recipe.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [recipes.data?.recipes, draft, search]);

  const add = (recipeId: string) => {
    const recipe = recipes.data?.recipes.find((item) => item.id === recipeId);
    if (!recipe) return;
    setDraft((current) => {
      if (current.some((dish) => dish.recipeId === recipe.id)) return current;
      return [
        ...current,
        { recipeId: recipe.id, name: recipe.name, kcal: recipe.kcal, price: recipe.price },
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
            {draft.length === 0 ? (
              <Text variant="body-1" color="secondary">
                {t('dishPicker.empty')}
              </Text>
            ) : (
              draft.map((dish) => (
                <Flex key={dish.recipeId} alignItems="center" gap={2}>
                  <Flex direction="column" style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="body-2" ellipsis>
                      {dish.name}
                    </Text>
                    <Text variant="body-1" color="secondary">
                      {t('dishPicker.kcalPrice', {
                        kcal: formatMetric(dish.kcal),
                        price: formatMetric(dish.price),
                      })}
                    </Text>
                  </Flex>
                  <Button
                    type="button"
                    view="flat"
                    size="m"
                    onClick={() =>
                      setDraft((current) =>
                        current.filter((currentDish) => currentDish.recipeId !== dish.recipeId)
                      )
                    }
                  >
                    <Icon data={TrashBin} size={16} />
                  </Button>
                </Flex>
              ))
            )}
            <Text variant="subheader-2" color={overLimit ? 'danger' : 'primary'}>
              {overLimit
                ? t('dishPicker.dayPriceOver', {
                    price: formatMetric(dayPrice),
                    limit: formatMetric(priceLimit),
                    over: formatMetric(Math.abs(remaining)),
                  })
                : t('dishPicker.dayPriceLeft', {
                    price: formatMetric(dayPrice),
                    limit: formatMetric(priceLimit),
                    left: formatMetric(remaining),
                  })}
            </Text>
          </Flex>

          <Divider />

          <Flex direction="column" gap={2}>
            <Text variant="subheader-1">{t('dishPicker.addFromTtk')}</Text>
            <TextInput
              size="l"
              placeholder={t('dishPicker.searchPlaceholder')}
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
                {t('dishPicker.loading')}
              </Text>
            )}
            {recipes.isError && (
              <Text variant="body-1" color="danger">
                {t('dishPicker.loadError')}
              </Text>
            )}
            <Flex direction="column" gap={1} style={{ maxHeight: 260, overflow: 'auto' }}>
              {available.map((recipe) => {
                const wouldExceed = dayPriceWithoutSlot + draftPrice + recipe.price > priceLimit;

                return (
                  <Flex key={recipe.id} alignItems="center" gap={2}>
                    <Flex direction="column" style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="body-2" ellipsis>
                        {recipe.name}
                      </Text>
                      <Text variant="body-1" color="secondary">
                        {t('dishPicker.kcalPrice', {
                          kcal: formatMetric(recipe.kcal),
                          price: formatMetric(recipe.price),
                        })}
                        {wouldExceed && t('dishPicker.exceedsLimit')}
                      </Text>
                    </Flex>
                    <Button type="button" view="flat" size="s" onClick={() => add(recipe.id)}>
                      <Icon data={Plus} size={14} />
                      {t('dishPicker.add')}
                    </Button>
                  </Flex>
                );
              })}
              {recipes.data && available.length === 0 && (
                <Text variant="body-1" color="secondary">
                  {search ? t('dishPicker.nothingFound') : t('dishPicker.allAdded')}
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
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            view="action"
            size="l"
            loading={saving}
            onClick={() => onSave(draft)}
          >
            <Icon data={FloppyDisk} size={16} />
            {t('common.save')}
          </Button>
        </Flex>
      </Dialog.Footer>
    </Dialog>
  );
}
