import { useState } from 'react';
import {
  Button,
  Card,
  Dialog,
  Flex,
  Icon,
  Label,
  Select,
  Text,
  TextInput,
  useToaster,
} from '@gravity-ui/uikit';
import { ArrowUpFromSquare, Magnifier, Plus, Printer } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { useCollections, useCreateRecipe, useRecipes, type RecipeSort } from './api';
import type { Recipe } from './types';
import { RecipeDialog } from './recipe-dialog';
import { ImportCollectionsDialog } from './import-dialog';

const ALL_COLLECTIONS = 'all';

/** Раздел ТТК: панель фильтров и плитка карт в две колонки, как в макете. */
export function TtkRoute() {
  const { current } = useOrganizations();
  const [search, setSearch] = useState('');
  const [collectionId, setCollectionId] = useState(ALL_COLLECTIONS);
  const [sort, setSort] = useState<RecipeSort>('name');
  const [opened, setOpened] = useState<Recipe | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const collections = useCollections();
  const { data, isPending, isError, error, refetch } = useRecipes({
    search,
    collectionId: collectionId === ALL_COLLECTIONS ? '' : collectionId,
    sort,
  });

  return (
    <Flex direction="column" gap={3} style={{ padding: 16 }}>
      <Flex alignItems="center" justifyContent="space-between" gap={2} wrap>
        <Flex alignItems="center" gap={2} wrap>
          <TextInput
            placeholder="Поиск по имени"
            value={search}
            onUpdate={setSearch}
            hasClear
            startContent={<Icon data={Magnifier} size={14} />}
            style={{ width: 220 }}
          />
          <Select
            width={200}
            value={[collectionId]}
            onUpdate={(value) => setCollectionId(value[0] ?? ALL_COLLECTIONS)}
            options={[
              { value: ALL_COLLECTIONS, content: 'ТТК сборники: Все' },
              ...(collections.data?.collections ?? []).map((collection) => ({
                value: collection.id,
                content: collection.name,
              })),
            ]}
          />
          <Select
            width={190}
            value={[sort]}
            onUpdate={(value) => setSort((value[0] ?? 'name') as RecipeSort)}
            options={[
              { value: 'name', content: 'Сортировка: По имени' },
              { value: 'price', content: 'Сортировка: По цене' },
              { value: 'kcal', content: 'Сортировка: По калориям' },
            ]}
          />
        </Flex>

        <Flex alignItems="center" gap={2}>
          <Button view="outlined" onClick={() => window.print()} title="Печать">
            <Icon data={Printer} size={16} />
          </Button>
          <Button view="outlined" onClick={() => setImportOpen(true)}>
            <Icon data={ArrowUpFromSquare} size={16} />
            Импорт сборника
          </Button>
          <Button view="action" onClick={() => setCreateOpen(true)}>
            <Icon data={Plus} size={16} />
            Создать ТТК
          </Button>
        </Flex>
      </Flex>

      {current === null && <NoOrganizationSelectedState />}
      {current !== null && isPending && <LoadingState />}
      {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
      {data && data.recipes.length === 0 && (
        <EmptyState text={search ? `Ничего не нашли по запросу «${search}»` : 'Карт пока нет'} />
      )}

      {data && data.recipes.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
            gap: 8,
          }}
        >
          {data.recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onOpen={() => setOpened(recipe)} />
          ))}
        </div>
      )}

      <RecipeDialog recipe={opened} onClose={() => setOpened(null)} />
      <ImportCollectionsDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <CreateRecipeDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </Flex>
  );
}

function RecipeCard({ recipe, onOpen }: { recipe: Recipe; onOpen: () => void }) {
  return (
    <Card view="filled" style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={onOpen}>
      <Flex alignItems="center" gap={2}>
        <Text variant="body-2">{recipe.name}</Text>
        {recipe.collectionName && (
          <Text variant="body-1" color="secondary" ellipsis>
            <Label theme="normal">{recipe.collectionName}</Label>
          </Text>
        )}
      </Flex>
      <Text variant="body-1" color="secondary">
        {recipe.price} ₽ • {recipe.kcal} кКал • {recipe.meals}
      </Text>
    </Card>
  );
}

/**
 * Создание карты. Отдельного экрана в макете я не сверял — форма собрана
 * из полей, которые видны в открытой карте.
 */
function CreateRecipeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateRecipe();
  const collections = useCollections();
  const toaster = useToaster();
  const [form, setForm] = useState({
    name: '',
    collectionId: '',
    portionYield: '',
    price: '',
    kcal: '',
    meals: '',
    temperature: '',
    shelfLife: '',
    recipe: '',
  });

  const set = (patch: Partial<typeof form>) => setForm((value) => ({ ...value, ...patch }));

  const submit = () => {
    create.mutate(
      {
        ...form,
        price: Number(form.price) || 0,
        kcal: Number(form.kcal) || 0,
      },
      {
        onSuccess: () => {
          toaster.add({ name: 'ttk-created', title: 'ТТК создана', theme: 'success' });
          onClose();
        },
        onError: (e) =>
          toaster.add({ name: 'ttk-create', title: 'Ошибка', content: e.message, theme: 'danger' }),
      }
    );
  };

  return (
    <Dialog open={open} onClose={onClose} size="s">
      <Dialog.Header caption="Создание ТТК" />
      <Dialog.Body>
        <Flex direction="column" gap={3}>
          <TextInput
            label="Название:"
            value={form.name}
            onUpdate={(v) => set({ name: v })}
            autoFocus
          />
          <Select
            label="Сборник:"
            placeholder="Без сборника"
            width="max"
            value={form.collectionId ? [form.collectionId] : []}
            onUpdate={(v) => set({ collectionId: v[0] ?? '' })}
            options={(collections.data?.collections ?? []).map((collection) => ({
              value: collection.id,
              content: collection.name,
            }))}
          />
          <Flex gap={2}>
            <TextInput
              label="Выход порции:"
              placeholder="90/50"
              value={form.portionYield}
              onUpdate={(v) => set({ portionYield: v })}
            />
            <TextInput
              label="Цена, ₽:"
              type="number"
              value={form.price}
              onUpdate={(v) => set({ price: v })}
            />
          </Flex>
          <Flex gap={2}>
            <TextInput
              label="Калорийность:"
              type="number"
              value={form.kcal}
              onUpdate={(v) => set({ kcal: v })}
            />
            <TextInput
              label="Приём пищи:"
              placeholder="Завтрак/Ужин"
              value={form.meals}
              onUpdate={(v) => set({ meals: v })}
            />
          </Flex>
          <TextInput
            label="Температура:"
            placeholder="Отпуск не ниже 65°С"
            value={form.temperature}
            onUpdate={(v) => set({ temperature: v })}
          />
          <TextInput
            label="Срок реализации:"
            placeholder="Не более 2х часов"
            value={form.shelfLife}
            onUpdate={(v) => set({ shelfLife: v })}
          />
          <TextInput label="Рецепт:" value={form.recipe} onUpdate={(v) => set({ recipe: v })} />
        </Flex>
      </Dialog.Body>
      <Dialog.Footer
        onClickButtonCancel={onClose}
        onClickButtonApply={submit}
        textButtonCancel="Отмена"
        textButtonApply="Создать"
        propsButtonApply={{ disabled: !form.name.trim() }}
        loading={create.isPending}
      />
    </Dialog>
  );
}
