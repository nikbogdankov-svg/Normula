import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button, Flex, Icon, Text, TextArea, TextInput } from '@gravity-ui/uikit';
import { Plus, TrashBin } from '@gravity-ui/icons';
import { ProductPicker } from '@/features/products/product-picker';
import { decimalToInput, parseDecimal } from '@/features/warehouse/format';
import { RECIPE_DECIMALS, type Recipe, type RecipeRequest } from './types';

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
  cardName: string;
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

/** Целое не меньше нуля; пусто — ноль. */
function parseInteger(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  if (!/^\d+$/.test(trimmed)) return null;

  return Number(trimmed);
}

/** Число с точностью бэкенда; пусто — ноль. */
function parseOptionalDecimal(value: string): number | null {
  if (value.trim() === '') return 0;

  return parseDecimal(value, RECIPE_DECIMALS);
}

/** Разбирает «90/50» на выход и потери; пустая часть — ноль. */
function parseYieldInput(value: string): { yieldNet: number | null; yieldLoss: number | null } {
  const [first = '', second = ''] = value.split('/');

  return { yieldNet: parseInteger(first), yieldLoss: parseInteger(second) };
}

/** Максимум цифр в каждой части маски выхода, например «99/99». */
const YIELD_DIGITS_PER_SIDE = 2;

/**
 * Поле выхода порции в виде маски «90/50»: слеш всегда на месте, пустые части
 * серые и выглядят как placeholder. Реальный инпут прозрачен (видна только
 * каретка), поверх него рисуем серые части и введённые цифры.
 */
function YieldMaskInput({
  label,
  value,
  onUpdate,
  invalid,
}: {
  label: string;
  value: string;
  onUpdate: (value: string) => void;
  invalid: boolean;
}) {
  const controlRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    paddingStart: '12px',
    paddingEnd: '12px',
  });

  useLayoutEffect(() => {
    const measure = () => {
      const el = controlRef.current;
      const box = wrapperRef.current;
      if (!el || !box) return;
      const boxRect = box.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      setRect((prev) => {
        const next = {
          left: elRect.left - boxRect.left,
          top: elRect.top - boxRect.top,
          width: elRect.width,
          height: elRect.height,
          paddingStart: cs.paddingInlineStart,
          paddingEnd: cs.paddingInlineEnd,
        };
        return prev &&
          prev.left === next.left &&
          prev.top === next.top &&
          prev.width === next.width &&
          prev.height === next.height &&
          prev.paddingStart === next.paddingStart &&
          prev.paddingEnd === next.paddingEnd
          ? prev
          : next;
      });
    };

    measure();
    // Gravity применяет сдвиг под лейбл асинхронно (ResizeObserver),
    // поэтому промеряем ещё кадр, пока не осядет раскладка.
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(() => {
        measure();
        loop();
      });
    };
    loop();
    const timer = window.setTimeout(() => cancelAnimationFrame(raf), 1000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, []);

  const [left = '', right = ''] = value.split('/');
  const digits = left + right;

  const handleUpdate = (raw: string) => {
    const clean = raw.replace(/\D/g, '');
    let next: string;
    if (clean === '') {
      next = '';
    } else if (clean.length < digits.length && digits.startsWith(clean)) {
      next = digits.slice(0, -1);
    } else if (digits.startsWith(clean)) {
      next = digits;
    } else {
      next = clean.slice(0, YIELD_DIGITS_PER_SIDE * 2);
    }
    onUpdate(`${next.slice(0, YIELD_DIGITS_PER_SIDE)}/${next.slice(YIELD_DIGITS_PER_SIDE)}`);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: 240, display: 'flex' }}>
      <TextInput
        size="l"
        label={label}
        value={value}
        onUpdate={handleUpdate}
        validationState={invalid ? 'invalid' : undefined}
        controlRef={controlRef}
        controlProps={{
          inputMode: 'numeric',
          autoComplete: 'off',
          style: { color: 'transparent', caretColor: 'var(--g-color-text-primary)' },
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          display: 'flex',
          alignItems: 'center',
          paddingInline: `${rect.paddingStart} ${rect.paddingEnd}`,
          pointerEvents: 'none',
          fontFamily: 'var(--g-text-body-font-family)',
          fontWeight: 'var(--g-text-body-font-weight)',
          fontSize: 'var(--g-text-body-short-font-size)',
          lineHeight: 'var(--g-text-body-short-line-height)',
          color: 'var(--g-color-text-primary)',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: left ? undefined : 'var(--g-color-text-hint)' }}>{left || '0'}</span>
        <span style={{ color: 'var(--g-color-text-hint)' }}>/</span>
        <span style={{ color: right ? undefined : 'var(--g-color-text-hint)' }}>
          {right || '0'}
        </span>
      </div>
    </div>
  );
}

/** Поле ввода, подсвечивающее значение, которое бэкенд не примет. */
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
  const [name, setName] = useState('');
  const [cardName, setCardName] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [yieldValue, setYieldValue] = useState('');
  const [technology, setTechnology] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');
  const [kcal, setKcal] = useState('');
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([emptyIngredient()]);

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setCardName(initial.cardName);
      setCollectionName(initial.collectionName);
      setYieldValue(
        initial.yieldNet || initial.yieldLoss ? `${initial.yieldNet}/${initial.yieldLoss}` : ''
      );
      setTechnology(initial.technology);
      setProtein(decimalToInput(initial.protein));
      setFat(decimalToInput(initial.fat));
      setCarbs(decimalToInput(initial.carbs));
      setKcal(decimalToInput(initial.kcal));
      setIngredients(ingredientsFromRecipe(initial));
      return;
    }

    setName('');
    setCardName('');
    setCollectionName('');
    setYieldValue('');
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

  const ingredientProblem = (row: IngredientDraft): string | null => {
    if (!row.productId) return 'Выберите продукт из справочника';

    const gross = parseDecimal(row.gross, RECIPE_DECIMALS);
    if (gross === null || gross <= 0) return 'Брутто должно быть больше нуля';

    const net = parseOptionalDecimal(row.net);
    if (net === null || net > gross) return 'Нетто от нуля до брутто';

    if (activeIngredients.some((other) => other !== row && other.productId === row.productId)) {
      return 'Этот продукт уже есть в карте';
    }

    return null;
  };

  const numbers = {
    ...parseYieldInput(yieldValue),
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
      cardName: cardName.trim(),
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
  const getDraft = (): RecipeDraft => {
    const [yieldNet = '', yieldLoss = ''] = yieldValue.split('/');

    return {
      name,
      cardName,
      collectionName,
      yieldNet,
      yieldLoss,
      technology,
      protein,
      fat,
      carbs,
      kcal,
      ingredients: activeIngredients,
    };
  };

  const unitHint = (unit: string) =>
    unit ? (
      <span style={{ color: 'var(--g-color-text-secondary)', paddingInlineEnd: 4 }}>{unit}</span>
    ) : undefined;

  const fields = (
    <Flex direction="column" gap={3}>
      <Flex gap={2}>
        <TextInput
          size="l"
          label="Название изделия:"
          placeholder="Название блюда"
          value={name}
          onUpdate={setName}
          autoFocus
          style={{ flex: initial ? 2 : 1 }}
        />
        {initial ? (
          <TextInput
            size="l"
            label="Название ТТК:"
            placeholder="Номер или название карты"
            value={cardName}
            onUpdate={setCardName}
            endContent={
              <Flex alignItems="center" style={{ paddingInlineEnd: 4 }}>
                <Text variant="body-1" color="secondary">
                  опционально
                </Text>
              </Flex>
            }
            style={{ flex: 2 }}
          />
        ) : null}
        <YieldMaskInput
          label="Выход порции:"
          value={yieldValue}
          onUpdate={setYieldValue}
          invalid={numbers.yieldNet === null || numbers.yieldLoss === null}
        />
      </Flex>

      <TextInput
        size="l"
        label="Название сборника:"
        placeholder="Название сборника"
        value={collectionName}
        onUpdate={setCollectionName}
        endContent={
          <Flex alignItems="center" style={{ paddingInlineEnd: 4 }}>
            <Text variant="body-1" color="secondary">
              опционально
            </Text>
          </Flex>
        }
      />

      <Flex direction="column" gap={2}>
        <Text variant="body-1">Технология приготовления</Text>
        <TextArea
          size="l"
          placeholder="Опишите технологию приготовления"
          value={technology}
          onUpdate={setTechnology}
          minRows={3}
        />
      </Flex>

      <Flex direction="column" gap={2}>
        <Text variant="body-1">Пищевая ценность на порцию</Text>
        <Flex gap={2} wrap>
          <NumberInput
            label="Белки, г:"
            value={protein}
            onUpdate={setProtein}
            invalid={numbers.protein === null}
          />
          <NumberInput
            label="Жиры, г:"
            value={fat}
            onUpdate={setFat}
            invalid={numbers.fat === null}
          />
          <NumberInput
            label="Углеводы, г:"
            value={carbs}
            onUpdate={setCarbs}
            invalid={numbers.carbs === null}
          />
          <NumberInput
            label="Калории, ккал:"
            value={kcal}
            onUpdate={setKcal}
            invalid={numbers.kcal === null}
          />
        </Flex>
      </Flex>

      <Flex direction="column" gap={2}>
        <Text variant="body-1">Ингредиенты</Text>

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
                    placeholder="Название продукта"
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
                  label="Брутто на 1 порц:"
                  placeholder="000"
                  value={row.gross}
                  onUpdate={(value) => updateIngredient(index, { gross: value })}
                  invalid={active && problem !== null && problem.startsWith('Брутто')}
                  endContent={unitHint(row.unit)}
                />
                <NumberInput
                  label="Нетто на 1 порц:"
                  placeholder="000"
                  value={row.net}
                  onUpdate={(value) => updateIngredient(index, { net: value })}
                  invalid={active && problem !== null && problem.startsWith('Нетто')}
                  endContent={unitHint(row.unit)}
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
              {problem && (
                <Text variant="body-1" color="danger">
                  {problem}
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
          Добавить ингредиент
        </Button>
      </Flex>
    </Flex>
  );

  return { fields, getBody, getDraft, canSubmit };
}
