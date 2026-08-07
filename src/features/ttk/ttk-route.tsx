import { useState } from 'react';
import { Button, Card, Flex, Icon, Label, Select, Text, TextInput } from '@gravity-ui/uikit';
import { ArrowUpFromSquare, Magnifier, Plus, Printer } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { useCollections, useRecipes, type RecipeSort } from './api';
import type { Recipe } from './types';
import { RecipeDialog } from './recipe-dialog';
import { CreateRecipeDialog } from './create-recipe-dialog';
import { ImportCollectionsDialog } from './import-dialog';
import './ttk-route.css';

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
            startContent={
              <span style={{ display: 'inline-flex', paddingInlineStart: 4, paddingInlineEnd: 4 }}>
                <Icon data={Magnifier} size={14} />
              </span>
            }
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
          <Button view="normal-contrast" onClick={() => window.print()} title="Печать">
            <Icon data={Printer} size={16} />
          </Button>
          <Button view="normal-contrast" onClick={() => setImportOpen(true)}>
            <Icon data={ArrowUpFromSquare} size={16} />
            Импорт сборника
          </Button>
          <Button view="normal-contrast" onClick={() => setCreateOpen(true)}>
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

      <RecipeDialog recipe={opened} onClose={() => setOpened(null)} onRecipeChange={setOpened} />
      <ImportCollectionsDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <CreateRecipeDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </Flex>
  );
}

function RecipeCard({ recipe, onOpen }: { recipe: Recipe; onOpen: () => void }) {
  return (
    <Card
      type="action"
      view="filled"
      className="ttk-recipe-card"
      style={{ padding: '10px 12px', cursor: 'pointer' }}
      onClick={onOpen}
    >
      <div className="ttk-recipe-card__title-row">
        <Text variant="body-2" className="ttk-recipe-card__name">
          {recipe.name}
        </Text>
        {recipe.collectionName && (
          <Label theme="normal" className="ttk-recipe-card__tag" title={recipe.collectionName}>
            {recipe.collectionName}
          </Label>
        )}
      </div>
      <Text variant="body-1" color="secondary">
        {recipe.price} ₽ • {recipe.kcal} кКал
      </Text>
    </Card>
  );
}
