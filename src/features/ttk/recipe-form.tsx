import { useEffect, useState } from 'react';
import { Button, Flex, Icon, Text, TextArea, TextInput } from '@gravity-ui/uikit';
import { Plus, TrashBin } from '@gravity-ui/icons';
import { ProductPicker } from '@/features/products/product-picker';
import { decimalToInput, parseDecimal } from '@/features/warehouse/format';
import { useTranslation } from '@/shared/i18n';
import { RECIPE_DECIMALS, type Recipe, type RecipeRequest } from './types';
import './recipe-drawer.css';

/** Код проблемы строки ингредиента; текст берётся из словаря по этому коду. */
type IngredientProblem = 'selectProduct' | 'grossPositive' | 'netRange' | 'duplicate';

const INGREDIENT_PROBLEM_KEYS: Record<IngredientProblem, string> = {
  selectProduct: 'ttk.errorSelectProduct',
  grossPositive: 'ttk.errorGrossPositive',
  netRange: 'ttk.errorNetRange',
  duplicate: 'ttk.errorDuplicateProduct',
};

/** Строка ингредиента в форме: числа — строками, как их ввёл пользователь. */
export interface IngredientDraft {
  productId: string;
  productName: string;
  unit: string;
  gross: string;
  net: string;
}

/** Черновик карты целиком — для разбора файлов, где продукты ещё не связаны. */
export interface RecipeDraft {
  name: string;
  collectionName: string;
  yieldNet: string;
  yieldLoss: string;
  technology: string;
  protein: string;
  fat: string;
  carbs: string;
  kcal: string;
  ingredients: IngredientDraft[];
}

const emptyIngredient = (): IngredientDraft => ({
  productId: '',
  productName: '',
  unit: '',
  gross: '',
  net: '',
});

function ingredientsFromRecipe(recipe: Recipe): IngredientDraft[] {
  if (recipe.ingredients.length === 0) return [emptyIngredient()];

  return recipe.ingredients.map((row) => ({
    productId: row.productId,
    productName: row.productName,
    unit: row.unit,
    gross: decimalToInput(row.gross),
    net: decimalToInput(row.net),
  }));
}

/** Форматирование ввода выхода/потерь: разрешает цифры или одиночный прочерк. */
function formatYieldValue(next: string, prev: string): string {
  const clean = next.replace(/[^\d—–−-]/g, '');
  if (!clean) return '';
  if (/[-—–−]/.test(next)) {
    if (prev === '-' && /\d/.test(clean)) {
      return clean.replace(/\D/g, '');
    }
    return '-';
  }
  return clean.replace(/\D/g, '');
}

/** Целое не меньше нуля; пусто или прочерк — ноль. */
function parseInteger(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '—' || trimmed === '–' || trimmed === '−') {
    return 0;
  }
  if (!/^\d+$/.test(trimmed)) return null;

  return Number(trimmed);
}

/** Число с точностью бэкенда; пусто — ноль. */
function parseOptionalDecimal(value: string): number | null {
  if (value.trim() === '') return 0;

  return parseDecimal(value, RECIPE_DECIMALS);
}

function NumberInput({
  label,
  value,
  onUpdate,
  invalid,
  placeholder = '0',
  endContent,
  flex = 1,
}: {
  label: string;
  value: string;
  onUpdate: (value: string) => void;
  invalid: boolean;
  placeholder?: string;
  endContent?: React.ReactNode;
  flex?: number;
}) {
  return (
    <TextInput
      size="l"
      label={label}
      placeholder={placeholder}
      value={value}
      onUpdate={onUpdate}
      validationState={invalid ? 'invalid' : undefined}
      endContent={endContent}
      style={{ flex }}
    />
  );
}

/** Состояние и разметка формы создания/редактирования ТТК. */
export function useRecipeForm(initial?: Recipe | null, resetKey?: string) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [yieldNet, setYieldNet] = useState('');
  const [yieldLoss, setYieldLoss] = useState('');
  const [technology, setTechnology] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');
  const [kcal, setKcal] = useState('');
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([emptyIngredient()]);

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setCollectionName(initial.collectionName);
      setYieldNet(String(initial.yieldNet) || '');
      setYieldLoss(String(initial.yieldLoss) || '');
      setTechnology(initial.technology);
      setProtein(decimalToInput(initial.protein));
      setFat(decimalToInput(initial.fat));
      setCarbs(decimalToInput(initial.carbs));
      setKcal(decimalToInput(initial.kcal));
      setIngredients(ingredientsFromRecipe(initial));
      return;
    }

    setName('');
    setCollectionName('');
    setYieldNet('');
    setYieldLoss('');
    setTechnology('');
    setProtein('');
    setFat('');
    setCarbs('');
    setKcal('');
    setIngredients([emptyIngredient()]);
    // Сбрасываем только по ключу сессии формы, не по ссылке на initial.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetKey задаёт момент предзаполнения
  }, [resetKey]);

  const updateIngredient = (index: number, patch: Partial<IngredientDraft>) => {
    setIngredients((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeIngredient = (index: number) => {
    setIngredients((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
  };

  // Пустая строка ингредиента (ничего не выбрано и не введено) не считается.
  const activeIngredients = ingredients.filter(
    (row) => row.productId || row.productName.trim() || row.gross.trim() || row.net.trim()
  );

  const ingredientProblem = (row: IngredientDraft): IngredientProblem | null => {
    if (!row.productId) return 'selectProduct';

    const gross = parseDecimal(row.gross, RECIPE_DECIMALS);
    if (gross === null || gross <= 0) return 'grossPositive';

    const net = parseOptionalDecimal(row.net);
    if (net === null || net > gross) return 'netRange';

    if (activeIngredients.some((other) => other !== row && other.productId === row.productId)) {
      return 'duplicate';
    }

    return null;
  };

  const numbers = {
    yieldNet: parseInteger(yieldNet),
    yieldLoss: parseInteger(yieldLoss),
    protein: parseOptionalDecimal(protein),
    fat: parseOptionalDecimal(fat),
    carbs: parseOptionalDecimal(carbs),
    kcal: parseOptionalDecimal(kcal),
  };

  const canSubmit =
    name.trim() !== '' &&
    Object.values(numbers).every((value) => value !== null) &&
    activeIngredients.every((row) => ingredientProblem(row) === null);

  /** Тело запроса; null, пока форма не проходит проверки бэкенда. */
  const getBody = (): RecipeRequest | null => {
    if (!canSubmit) return null;

    return {
      name: name.trim(),
      collectionName: collectionName.trim(),
      yieldNet: numbers.yieldNet ?? 0,
      yieldLoss: numbers.yieldLoss ?? 0,
      technology: technology.trim(),
      protein: numbers.protein ?? 0,
      fat: numbers.fat ?? 0,
      carbs: numbers.carbs ?? 0,
      kcal: numbers.kcal ?? 0,
      ingredients: activeIngredients.map((row) => ({
        productId: row.productId,
        gross: parseDecimal(row.gross, RECIPE_DECIMALS) ?? 0,
        net: parseOptionalDecimal(row.net) ?? 0,
      })),
    };
  };

  /** Черновик как есть, без проверок — для разбора файлов. */
  const getDraft = (): RecipeDraft => ({
    name,
    collectionName,
    yieldNet,
    yieldLoss,
    technology,
    protein,
    fat,
    carbs,
    kcal,
    ingredients: activeIngredients,
  });

  const unitHint = (unit: string) =>
    unit ? (
      <span style={{ color: 'var(--g-color-text-secondary)', paddingInlineEnd: 4 }}>{unit}</span>
    ) : undefined;

  const fields = (
    <Flex direction="column" gap={3}>
      <Flex gap={2} alignItems="center">
        <TextInput
          size="l"
          label={t('ttk.nameLabel')}
          placeholder={t('ttk.namePlaceholder')}
          value={name}
          onUpdate={setName}
          autoFocus
          style={{ flex: 1 }}
        />
        <div
          className="ttk-recipe-drawer__yield-input"
          style={{
            height: 36,
            minHeight: 36,
            maxHeight: 36,
            boxSizing: 'border-box',
            alignSelf: 'center',
          }}
        >
          <Text
            variant="subheader-1"
            color="primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              paddingInline: 12,
              whiteSpace: 'nowrap',
            }}
          >
            {t('ttk.yieldLabel')}
          </Text>
          <div
            style={{
              width: 1,
              backgroundColor: 'var(--g-color-line-generic)',
            }}
          />
          <TextInput
            size="l"
            view="clear"
            placeholder="0"
            value={yieldNet}
            onUpdate={(value) => setYieldNet((prev) => formatYieldValue(value, prev))}
            validationState={numbers.yieldNet === null ? 'invalid' : undefined}
            autoComplete="off"
            style={{ flex: 1, minWidth: 0, paddingInline: 8, height: '100%' }}
            controlProps={{
              style: {
                height: '100%',
                paddingBlock: 0,
              },
            }}
          />
          <div
            style={{
              width: 1,
              backgroundColor: 'var(--g-color-line-generic)',
            }}
          />
          <TextInput
            size="l"
            view="clear"
            placeholder="0"
            value={yieldLoss}
            onUpdate={(value) => setYieldLoss((prev) => formatYieldValue(value, prev))}
            validationState={numbers.yieldLoss === null ? 'invalid' : undefined}
            autoComplete="off"
            style={{ flex: 1, minWidth: 0, paddingInline: 8, height: '100%' }}
            controlProps={{
              style: {
                height: '100%',
                paddingBlock: 0,
              },
            }}
          />
        </div>
      </Flex>

      <TextInput
        size="l"
        label={t('ttk.collectionNameLabel')}
        placeholder={t('ttk.collectionNamePlaceholder')}
        value={collectionName}
        onUpdate={setCollectionName}
        endContent={
          <Flex alignItems="center" style={{ paddingInlineEnd: 4 }}>
            <Text variant="body-1" color="secondary">
              {t('ttk.optional')}
            </Text>
          </Flex>
        }
      />

      <Flex direction="column" gap={2}>
        <Text variant="body-1">{t('ttk.technologySection')}</Text>
        <TextArea
          size="l"
          placeholder={t('ttk.technologyPlaceholder')}
          value={technology}
          onUpdate={setTechnology}
          minRows={3}
        />
      </Flex>

      <Flex direction="column" gap={2}>
        <Text variant="body-1">{t('ttk.nutritionSection')}</Text>
        <Flex gap={2} wrap>
          <NumberInput
            label={t('ttk.proteinLabel')}
            value={protein}
            onUpdate={setProtein}
            invalid={numbers.protein === null}
          />
          <NumberInput
            label={t('ttk.fatLabel')}
            value={fat}
            onUpdate={setFat}
            invalid={numbers.fat === null}
          />
          <NumberInput
            label={t('ttk.carbsLabel')}
            value={carbs}
            onUpdate={setCarbs}
            invalid={numbers.carbs === null}
          />
          <NumberInput
            label={t('ttk.kcalLabel')}
            value={kcal}
            onUpdate={setKcal}
            invalid={numbers.kcal === null}
          />
        </Flex>
      </Flex>

      <Flex direction="column" gap={2}>
        <Text variant="body-1">{t('ttk.ingredientsSection')}</Text>

        {ingredients.map((row, index) => {
          const active = activeIngredients.includes(row);
          const problem = active ? ingredientProblem(row) : null;

          return (
            <Flex key={index} direction="column" gap={1}>
              <Flex gap={2} alignItems="flex-end">
                <div style={{ flex: 2 }}>
                  <ProductPicker
                    value={row.productId}
                    valueLabel={row.productName}
                    placeholder={t('ttk.productNamePlaceholder')}
                    size="l"
                    onChange={(product) =>
                      updateIngredient(index, {
                        productId: product?.id ?? '',
                        productName: product?.name ?? row.productName,
                        unit: product?.unit ?? '',
                      })
                    }
                  />
                </div>
                <NumberInput
                  label={t('ttk.grossLabel')}
                  placeholder="000"
                  value={row.gross}
                  onUpdate={(value) => updateIngredient(index, { gross: value })}
                  invalid={active && problem === 'grossPositive'}
                  endContent={unitHint(row.unit)}
                />
                <NumberInput
                  label={t('ttk.netLabel')}
                  placeholder="000"
                  value={row.net}
                  onUpdate={(value) => updateIngredient(index, { net: value })}
                  invalid={active && problem === 'netRange'}
                  endContent={unitHint(row.unit)}
                />
                <Button
                  view="flat"
                  size="l"
                  onClick={() => removeIngredient(index)}
                  title={t('ttk.removeIngredient')}
                  aria-label={t('ttk.removeIngredient')}
                  disabled={ingredients.length <= 1}
                >
                  <Icon data={TrashBin} size={18} />
                </Button>
              </Flex>
              {problem && (
                <Text variant="body-1" color="danger">
                  {t(INGREDIENT_PROBLEM_KEYS[problem])}
                </Text>
              )}
            </Flex>
          );
        })}

        <Button
          view="normal-contrast"
          size="l"
          onClick={() => setIngredients((rows) => [...rows, emptyIngredient()])}
          style={{ alignSelf: 'flex-start' }}
        >
          <Icon data={Plus} size={16} />
          {t('ttk.addIngredient')}
        </Button>
      </Flex>
    </Flex>
  );

  return { fields, getBody, getDraft, canSubmit };
}
