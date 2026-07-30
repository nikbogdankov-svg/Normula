import { Button, Flex, Icon, Label, Modal, Table, Text } from '@gravity-ui/uikit';
import { Pencil, Xmark } from '@gravity-ui/icons';
import type { Recipe } from './types';

/** Пара «подпись — значение» в шапке карты. */
function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Flex gap={3} alignItems="flex-start">
      <Text variant="body-2" color="secondary" style={{ width: 130, flexShrink: 0 }}>
        {title}
      </Text>
      <Text variant="body-2">{children}</Text>
    </Flex>
  );
}

/** Открытая технологическая карта из макета. */
export function RecipeDialog({ recipe, onClose }: { recipe: Recipe | null; onClose: () => void }) {
  if (!recipe) return null;

  return (
    <Modal open onClose={onClose} contentOverflow="auto">
      <div style={{ width: 780, maxWidth: '90vw', padding: 20 }}>
        <Flex alignItems="center" justifyContent="space-between" gap={2}>
          <Flex alignItems="center" gap={2} wrap>
            <Text variant="subheader-2">{recipe.name}</Text>
            <Label theme="normal">Выход порции: {recipe.portionYield}</Label>
            <Label theme="info">{recipe.price} ₽</Label>
          </Flex>
          <Button view="flat" size="s" onClick={onClose} aria-label="Закрыть">
            <Icon data={Xmark} size={16} />
          </Button>
        </Flex>

        <Flex direction="column" gap={2} style={{ padding: '16px 0' }}>
          <Row title="Сборник:">{recipe.collectionName || '—'}</Row>
          <Row title="Температура:">{recipe.temperature}</Row>
          <Row title="Срок реализации:">{recipe.shelfLife}</Row>
          <Row title="Рецепт:">{recipe.recipe}</Row>
        </Flex>

        <Table
          data={[
            ...recipe.ingredients,
            {
              name: 'Выход',
              grossPerPortion: '',
              netPerPortion: recipe.outputPerPortion,
              grossPer100: '',
              netPer100: recipe.outputPer100,
            },
          ]}
          columns={[
            { id: 'name', name: 'Наименование блюда' },
            { id: 'grossPerPortion', name: '1 порция, Брутто, г', align: 'right' },
            { id: 'netPerPortion', name: '1 порция, Нетто, г', align: 'right' },
            { id: 'grossPer100', name: '100 порций, Брутто, г', align: 'right' },
            { id: 'netPer100', name: '100 порций, Нетто, г', align: 'right' },
          ]}
        />

        <div style={{ paddingTop: 12 }}>
          <Table
            data={[recipe.nutrition]}
            columns={[
              { id: 'protein', name: 'Белки, г', align: 'right' },
              { id: 'fat', name: 'Жиры, г', align: 'right' },
              { id: 'carbs', name: 'Углеводы, г', align: 'right' },
              { id: 'kcal', name: 'Энерг. ценность, ккал', align: 'right' },
              { id: 'vitaminC', name: 'Витамин С, мг', align: 'right' },
            ]}
          />
        </div>

        <Flex justifyContent="flex-end" style={{ paddingTop: 16 }}>
          {/* Редактирование карты в макете отдельным экраном не нарисовано —
              кнопка на месте, но пока ничего не делает. */}
          <Button view="outlined" disabled>
            <Icon data={Pencil} size={16} />
            Редактировать
          </Button>
        </Flex>
      </div>
    </Modal>
  );
}
