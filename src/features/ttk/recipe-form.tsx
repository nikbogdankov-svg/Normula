import { useEffect, useState } from 'react';
import { Button, Flex, Icon, Text, TextArea, TextInput } from '@gravity-ui/uikit';
import { Plus, TrashBin } from '@gravity-ui/icons';
import type { CreateRecipeIngredient, CreateRecipeRequest, Recipe } from './types';
import { ProductPicker } from '@/features/products/product-picker';

const emptyIngredient = (): CreateRecipeIngredient => ({
  name: '',
  productId: undefined,
  grossPerPortion: '',
  netPerPortion: '',
});

function ingredientsFromRecipe(recipe: Recipe): CreateRecipeIngredient[] {
  if (recipe.ingredients.length === 0) return [emptyIngredient()];

  return recipe.ingredients.map((row) => ({
    name: row.name,
    productId: row.productId ?? undefined,
    grossPerPortion: row.grossPerPortion,
    netPerPortion: row.netPerPortion,
  }));
}

/** Состояние и разметка формы создания/редактирования ТТК. */
export function useRecipeForm(initial?: Recipe | null, resetKey?: string) {
  const [name, setName] = useState('');
  const [portionYield, setPortionYield] = useState('');
  const [recipe, setRecipe] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');
  const [kcal, setKcal] = useState('');
  const [ingredients, setIngredients] = useState<CreateRecipeIngredient[]>([emptyIngredient()]);

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setPortionYield(initial.portionYield);
      setRecipe(initial.recipe);
      setProtein(initial.nutrition?.protein ?? '');
      setFat(initial.nutrition?.fat ?? '');
      setCarbs(initial.nutrition?.carbs ?? '');
      setKcal(initial.nutrition?.kcal ?? '');
      setIngredients(ingredientsFromRecipe(initial));
      return;
    }

    setName('');
    setPortionYield('');
    setRecipe('');
    setProtein('');
    setFat('');
    setCarbs('');
    setKcal('');
    setIngredients([emptyIngredient()]);
    // Сбрасываем только по ключу сессии формы, не по ссылке на initial.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetKey задаёт момент предзаполнения
  }, [resetKey]);

  const updateIngredient = (index: number, patch: Partial<CreateRecipeIngredient>) => {
    setIngredients((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const updateIngredientProduct = (index: number, product: { id: string; name: string } | null) => {
    setIngredients((rows) =>
      rows.map((row, i) =>
        i === index
          ? { ...row, productId: product?.id ?? undefined, name: product?.name ?? row.name }
          : row
      )
    );
  };

  const removeIngredient = (index: number) => {
    setIngredients((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
  };

  const getBody = (): CreateRecipeRequest => ({
    name: name.trim(),
    portionYield: portionYield.trim(),
    recipe: recipe.trim(),
    ingredients: ingredients.filter((row) => row.name.trim()),
    nutrition: {
      protein: protein.trim(),
      fat: fat.trim(),
      carbs: carbs.trim(),
      kcal: kcal.trim(),
    },
  });

  const fields = (
    <Flex direction="column" gap={2}>
      <Flex gap={2}>
        <TextInput
          size="l"
          label="Название изделия:"
          placeholder="Название блюда"
          value={name}
          onUpdate={setName}
          autoFocus
          style={{ flex: 1 }}
        />
        <TextInput
          size="l"
          label="Выход порции:"
          placeholder="00/00"
          value={portionYield}
          onUpdate={setPortionYield}
          style={{ flex: 1 }}
        />
      </Flex>

      <Flex direction="column" gap={2}>
        <Text variant="body-1">Технология приготовления</Text>
        <TextArea
          size="l"
          placeholder="Опишите технологию приготовления"
          value={recipe}
          onUpdate={setRecipe}
          minRows={3}
        />
      </Flex>

      <Flex direction="column" gap={2}>
        <Text variant="body-1">Пищевая ценность</Text>
        <Flex gap={2} wrap>
          <TextInput
            size="l"
            label="Белки, г:"
            placeholder="0"
            value={protein}
            onUpdate={setProtein}
            style={{ flex: 1 }}
          />
          <TextInput
            size="l"
            label="Жиры, г:"
            placeholder="0"
            value={fat}
            onUpdate={setFat}
            style={{ flex: 1 }}
          />
          <TextInput
            size="l"
            label="Углеводы, г:"
            placeholder="0"
            value={carbs}
            onUpdate={setCarbs}
            style={{ flex: 1 }}
          />
          <TextInput
            size="l"
            label="Калории, ккал:"
            placeholder="0"
            value={kcal}
            onUpdate={setKcal}
            style={{ flex: 1 }}
          />
        </Flex>
      </Flex>

      <Flex direction="column" gap={2}>
        <Text variant="subheader-1">Ингредиенты</Text>

        {ingredients.map((row, index) => (
          <Flex key={index} gap={2} alignItems="flex-end">
            <div style={{ flex: 2 }}>
              <ProductPicker
                value={row.productId}
                valueLabel={row.name}
                placeholder="Название продукта"
                size="l"
                onChange={(product) => updateIngredientProduct(index, product)}
              />
            </div>
            <TextInput
              size="l"
              label="Брутто на 1 порц, г:"
              placeholder="000"
              value={row.grossPerPortion}
              onUpdate={(value) => updateIngredient(index, { grossPerPortion: value })}
              style={{ flex: 1 }}
            />
            <TextInput
              size="l"
              label="Нетто на 1 порц, г:"
              placeholder="000"
              value={row.netPerPortion}
              onUpdate={(value) => updateIngredient(index, { netPerPortion: value })}
              style={{ flex: 1 }}
            />
            <Button
              view="flat"
              size="l"
              onClick={() => removeIngredient(index)}
              title="Удалить ингредиент"
              aria-label="Удалить ингредиент"
              disabled={ingredients.length <= 1}
            >
              <Icon data={TrashBin} size={18} />
            </Button>
          </Flex>
        ))}

        <Button
          view="normal-contrast"
          size="l"
          onClick={() => setIngredients((rows) => [...rows, emptyIngredient()])}
          style={{ alignSelf: 'flex-start' }}
        >
          <Icon data={Plus} size={16} />
          Добавить ингредиент
        </Button>
      </Flex>
    </Flex>
  );

  return { fields, getBody, canSubmit: Boolean(name.trim()) };
}
