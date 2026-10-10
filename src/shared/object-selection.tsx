import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'onemore.currentObjectId';

interface ObjectSelectionValue {
  /** Выбранный на какой-либо странице объект (null — выбор ещё не делался). */
  objectId: string | null;
  setObjectId: (objectId: string) => void;
  clearObjectId: () => void;
}

const ObjectSelectionContext = createContext<ObjectSelectionValue | null>(null);

/**
 * Хранит выбранный объект организации (переживает перезагрузку через
 * localStorage). Выбор делается на любой странице и подхватывается остальными:
 * это снимает боль с тем, что на новом разделе всегда показывался первый
 * объект списка.
 */
export function ObjectSelectionProvider({ children }: { children: ReactNode }) {
  const [objectId, setObjectIdState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  );

  const setObjectId = useCallback((next: string) => {
    localStorage.setItem(STORAGE_KEY, next);
    setObjectIdState(next);
  }, []);

  const clearObjectId = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setObjectIdState(null);
  }, []);

  const value = useMemo(
    () => ({ objectId, setObjectId, clearObjectId }),
    [objectId, setObjectId, clearObjectId]
  );

  return (
    <ObjectSelectionContext.Provider value={value}>{children}</ObjectSelectionContext.Provider>
  );
}

export function useObjectSelection(): ObjectSelectionValue {
  const ctx = useContext(ObjectSelectionContext);
  if (!ctx) {
    throw new Error('useObjectSelection: компонент вне <ObjectSelectionProvider>');
  }
  return ctx;
}

/**
 * Выбор объекта на одной странице, синхронизированный с глобальным выбором.
 * Пока ничего не выбрано на странице, подставляет сохранённый объект, если он
 * входит в options, иначе fallback (например первый объект страницы). Выбранный
 * вручную объект записывается в общее хранилище, а «пустые» значения (Все
 * объекты / ещё не выбрано) его не трогают.
 */
export function usePageObjectChoice(
  options: Array<{ value: string }> | undefined,
  fallback: string
) {
  const { objectId: savedObjectId, setObjectId, clearObjectId } = useObjectSelection();
  const [objectId, setObjectIdLocal] = useState<string>(fallback);

  const optionIds = useMemo(() => options?.map((option) => option.value) ?? [], [options]);

  // Пока на странице ещё не сделан свой выбор (сохранённого нет), подставляем
  // сохранённый ранее объект, если он валиден в списке страницы, иначе
  // дефолт страницы (первый объект / sentinel).
  useEffect(() => {
    if (options === undefined || options.length === 0) return;
    setObjectIdLocal((current) => {
      if (savedObjectId && optionIds.includes(savedObjectId) && current === fallback) {
        return savedObjectId;
      }
      return current;
    });
  }, [options, optionIds, savedObjectId, fallback]);

  const updateObjectId = (next: string | null) => {
    setObjectIdLocal(next ?? fallback);
    if (next && optionIds.includes(next)) {
      setObjectId(next);
    } else {
      clearObjectId();
    }
  };

  return { objectId, setObjectIdLocal: updateObjectId };
}
