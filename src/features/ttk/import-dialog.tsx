import { useEffect, useRef, useState, type RefObject } from 'react';
import { Button, Dialog, Drawer, Flex, Icon, Text, TextInput, useToaster } from '@gravity-ui/uikit';
import {
  ArrowUpFromSquare,
  ChevronDown,
  ChevronUp,
  File,
  Pencil,
  TrashBin,
  Xmark,
} from '@gravity-ui/icons';
import { useImportCollections } from './api';
import type { ExtractedCollection, ExtractedDish } from './extract-collection';
import { useRecipeForm } from './recipe-form';
import { useDrawerHeight } from './use-drawer-height';
import type { Recipe } from './types';
import './recipe-drawer.css';

/** Что принимаем — PDF и DOC/DOCX (+ TXT для простого текста). */
const ACCEPT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'] as const;
const ACCEPT =
  '.pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';
const ACCEPT_LABEL = 'PDF, DOC, DOCX, TXT';

interface SelectedFile {
  id: string;
  file: File;
  /** Имя для отображения / переименования до разбора. */
  label: string;
}

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPT_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function dishToRecipe(dish: ExtractedDish, collectionName: string): Recipe {
  return {
    id: dish.id,
    name: dish.name,
    collectionName,
    collectionId: '',
    portionYield: dish.portionYield,
    price: 0,
    kcal: 0,
    recipe: dish.recipe,
    ingredients: dish.ingredients.map((row) => ({
      name: row.name,
      grossPerPortion: row.grossPerPortion,
      netPerPortion: row.netPerPortion,
      grossPer100: '',
      netPer100: '',
      pricePerKg: '',
    })),
    outputPerPortion: '',
    outputPer100: '',
    nutrition: { protein: '', fat: '', carbs: '', kcal: '', vitaminC: '' },
  };
}

/**
 * Импорт сборников:
 * 1) popup S — выбор файлов;
 * 2) «Импортировать» читает содержимое файлов и открывает drawer;
 * 3) блюда можно раскрыть и поправить до финального импорта.
 */
export function ImportCollectionsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toaster = useToaster();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [collections, setCollections] = useState<ExtractedCollection[]>([]);

  const closePopup = () => {
    setFiles([]);
    setRenamingId(null);
    setDragging(false);
    setParsing(false);
    onClose();
  };

  const closeAll = () => {
    setReviewOpen(false);
    setCollections([]);
    closePopup();
  };

  const add = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const accepted = incoming.filter(isAcceptedFile);
    if (accepted.length < incoming.length) {
      toaster.add({
        name: 'ttk-import-format',
        title: 'Неподдерживаемый формат',
        content: `Можно загружать только ${ACCEPT_LABEL}`,
        theme: 'warning',
      });
    }
    if (accepted.length === 0) return;

    setFiles((current) => [
      ...current,
      ...accepted.map((file, index) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${current.length + index}`,
        file,
        label: file.name,
      })),
    ]);
  };

  const openReview = async () => {
    setParsing(true);
    try {
      // Парсеры тяжёлые (pdf.js) — подгружаем только в момент импорта.
      const { extractCollectionFromFile } = await import('./extract-collection');
      const extracted: ExtractedCollection[] = [];
      for (const [index, item] of files.entries()) {
        const collection = await extractCollectionFromFile(item.file, index);
        extracted.push({
          ...collection,
          // Если пользователь переименовал файл в списке — это станет именем сборника.
          name: item.label.replace(/\.[^.]+$/, '').trim() || collection.name,
          fileName: item.label,
        });
      }

      const empty = extracted.filter((collection) => collection.dishes.length === 0);
      if (empty.length > 0) {
        toaster.add({
          name: 'ttk-import-empty',
          title: 'Не все файлы разобраны',
          content: `Не нашли блюд в: ${empty.map((item) => item.fileName).join(', ')}`,
          theme: 'warning',
        });
      }

      setCollections(extracted.filter((collection) => collection.dishes.length > 0));
      if (extracted.every((collection) => collection.dishes.length === 0)) {
        toaster.add({
          name: 'ttk-import-none',
          title: 'Блюд не найдено',
          content: 'Проверьте, что в файле есть технологические карты или названия блюд.',
          theme: 'danger',
        });
        return;
      }

      setReviewOpen(true);
      setFiles([]);
      setRenamingId(null);
      setDragging(false);
      onClose();
    } catch (error) {
      toaster.add({
        name: 'ttk-import-parse',
        title: 'Ошибка разбора файла',
        content: error instanceof Error ? error.message : 'Неизвестная ошибка',
        theme: 'danger',
      });
    } finally {
      setParsing(false);
    }
  };

  return (
    <>
      <Dialog open={open && !reviewOpen} onClose={closePopup} size="s">
        <Dialog.Header caption="Импорт сборников" />
        <Dialog.Divider />
        <Dialog.Body>
          <Flex direction="column" gap={3}>
            <Text variant="body-2">Импортируйте ваши сборники</Text>
            <DropZone
              dragging={dragging}
              setDragging={setDragging}
              inputRef={inputRef}
              onAdd={add}
            />

            {files.map((item) => (
              <Flex key={item.id} alignItems="center" gap={2}>
                {renamingId === item.id ? (
                  <TextInput
                    value={item.label}
                    autoFocus
                    onUpdate={(value) =>
                      setFiles((current) =>
                        current.map((file) =>
                          file.id === item.id ? { ...file, label: value } : file
                        )
                      )
                    }
                    onBlur={() => setRenamingId(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setRenamingId(null)}
                  />
                ) : (
                  <Text variant="body-2" ellipsis>
                    {item.label}
                  </Text>
                )}

                <Button
                  view="flat"
                  size="s"
                  onClick={() => setRenamingId(item.id)}
                  title="Изменить имя файла"
                >
                  <Icon data={Pencil} size={14} />
                </Button>
                <Button
                  view="flat"
                  size="s"
                  onClick={() =>
                    setFiles((current) => current.filter((file) => file.id !== item.id))
                  }
                  title="Убрать файл"
                >
                  <Icon data={TrashBin} size={14} />
                </Button>
              </Flex>
            ))}
          </Flex>
        </Dialog.Body>
        <Dialog.Divider />
        <Dialog.Footer>
          <Flex justifyContent="flex-end" gap={2} style={{ width: '100%' }}>
            <Button view="outlined" size="l" onClick={closePopup}>
              Отмена
            </Button>
            <Button
              view="action"
              size="l"
              onClick={() => void openReview()}
              disabled={files.length === 0}
              loading={parsing}
            >
              <Icon data={ArrowUpFromSquare} size={16} />
              Импортировать
            </Button>
          </Flex>
        </Dialog.Footer>
      </Dialog>

      <ImportReviewDrawer
        open={reviewOpen}
        collections={collections}
        onCollectionsChange={setCollections}
        onClose={closeAll}
      />
    </>
  );
}

function ImportReviewDrawer({
  open,
  collections,
  onCollectionsChange,
  onClose,
}: {
  open: boolean;
  collections: ExtractedCollection[];
  onCollectionsChange: (collections: ExtractedCollection[]) => void;
  onClose: () => void;
}) {
  const height = useDrawerHeight();
  const importFiles = useImportCollections();
  const toaster = useToaster();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    collectionId: string;
    dish: ExtractedDish;
  } | null>(null);
  const [formKey, setFormKey] = useState(0);

  const editingRecipe =
    editing === null
      ? null
      : dishToRecipe(
          editing.dish,
          collections.find((item) => item.id === editing.collectionId)?.name ?? ''
        );
  const form = useRecipeForm(editingRecipe, String(formKey));

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    setExpandedIds(collections.map((collection) => collection.id));
    setRenamingId(null);
    setEditing(null);
    setMounted(true);
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
    // Разворачиваем список только при открытии drawer, не при правке блюд.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- collections читаем на момент open
  }, [open]);

  useEffect(() => {
    if (visible || open || !mounted) return;
    const timer = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(timer);
  }, [visible, open, mounted]);

  const requestClose = () => {
    setVisible(false);
    onClose();
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const openDish = (collectionId: string, dish: ExtractedDish) => {
    setEditing({ collectionId, dish });
    setFormKey((key) => key + 1);
  };

  const saveDish = () => {
    if (!editing) return;
    const body = form.getBody();
    onCollectionsChange(
      collections.map((collection) => {
        if (collection.id !== editing.collectionId) return collection;
        return {
          ...collection,
          dishes: collection.dishes.map((dish) =>
            dish.id === editing.dish.id
              ? {
                  ...dish,
                  name: body.name,
                  portionYield: body.portionYield,
                  recipe: body.recipe,
                  ingredients: body.ingredients,
                }
              : dish
          ),
        };
      })
    );
    setEditing(null);
  };

  const submit = () => {
    importFiles.mutate(
      { fileNames: collections.map((collection) => collection.fileName) },
      {
        onSuccess: (result) => {
          toaster.add({
            name: 'ttk-imported',
            title: 'Сборники импортированы',
            content: `Добавлено карт: ${result.imported}`,
            theme: 'success',
          });
          requestClose();
        },
        onError: (e) =>
          toaster.add({ name: 'ttk-import', title: 'Ошибка', content: e.message, theme: 'danger' }),
      }
    );
  };

  if (!mounted) return null;

  return (
    <Drawer
      open={visible}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) requestClose();
      }}
      placement="bottom"
      size={height}
      maxSize={typeof window !== 'undefined' ? window.innerHeight : 2000}
      contentOverflow="auto"
      className="ttk-recipe-drawer"
      contentClassName="ttk-recipe-drawer__panel"
    >
      <div className="ttk-recipe-drawer__card">
        <div className="ttk-recipe-drawer__mode" hidden={editing !== null}>
          <div className="ttk-recipe-drawer__header">
            <div className="ttk-recipe-drawer__title-row">
              <Text variant="subheader-2">Импорт сборников</Text>
            </div>
            <Button view="flat" size="l" onClick={requestClose} aria-label="Закрыть">
              <Icon data={Xmark} size={20} />
            </Button>
          </div>

          <div className="ttk-recipe-drawer__body">
            <Flex direction="column" gap={2}>
              {collections.map((collection) => {
                const expanded = expandedIds.includes(collection.id);
                const renaming = renamingId === collection.id;

                return (
                  <div
                    key={collection.id}
                    style={{
                      borderBottom: '1px solid var(--g-color-line-generic)',
                      paddingBottom: 8,
                    }}
                  >
                    <Flex alignItems="center" gap={2} style={{ minWidth: 0 }}>
                      <Button
                        view="flat"
                        size="s"
                        onClick={() => toggleExpanded(collection.id)}
                        aria-label={expanded ? 'Свернуть' : 'Показать блюда'}
                      >
                        <Icon data={expanded ? ChevronUp : ChevronDown} size={16} />
                      </Button>

                      {renaming ? (
                        <TextInput
                          value={collection.name}
                          autoFocus
                          onUpdate={(value) =>
                            onCollectionsChange(
                              collections.map((item) =>
                                item.id === collection.id ? { ...item, name: value } : item
                              )
                            )
                          }
                          onBlur={() => setRenamingId(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setRenamingId(null)}
                          style={{ flex: 1, minWidth: 0 }}
                        />
                      ) : (
                        <Flex
                          alignItems="center"
                          gap={1}
                          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                          onClick={() => toggleExpanded(collection.id)}
                        >
                          <Text variant="body-2" ellipsis>
                            {collection.name}
                          </Text>
                          <Text variant="body-1" color="secondary" style={{ flexShrink: 0 }}>
                            · {collection.dishes.length}
                          </Text>
                        </Flex>
                      )}

                      <Button
                        view="flat"
                        size="s"
                        onClick={() => setRenamingId(collection.id)}
                        title="Изменить название"
                      >
                        <Icon data={Pencil} size={14} />
                      </Button>
                      <Button
                        view="flat"
                        size="s"
                        onClick={() => {
                          onCollectionsChange(
                            collections.filter((item) => item.id !== collection.id)
                          );
                          setExpandedIds((current) => current.filter((id) => id !== collection.id));
                        }}
                        title="Убрать сборник"
                      >
                        <Icon data={TrashBin} size={14} />
                      </Button>
                    </Flex>

                    {expanded && (
                      <Flex direction="column" gap={1} style={{ padding: '8px 8px 4px 40px' }}>
                        {collection.dishes.map((dish) => (
                          <Flex key={dish.id} alignItems="center" gap={2}>
                            <Text
                              variant="body-1"
                              color="secondary"
                              style={{ flex: 1, cursor: 'pointer' }}
                              onClick={() => openDish(collection.id, dish)}
                            >
                              {dish.name}
                            </Text>
                            <Button
                              view="flat"
                              size="s"
                              title="Открыть и изменить"
                              onClick={() => openDish(collection.id, dish)}
                            >
                              <Icon data={Pencil} size={14} />
                            </Button>
                            <Button
                              view="flat"
                              size="s"
                              title="Убрать блюдо"
                              onClick={() => {
                                if (editing?.dish.id === dish.id) setEditing(null);
                                const next = collections
                                  .map((item) =>
                                    item.id === collection.id
                                      ? {
                                          ...item,
                                          dishes: item.dishes.filter((row) => row.id !== dish.id),
                                        }
                                      : item
                                  )
                                  .filter((item) => item.dishes.length > 0);
                                onCollectionsChange(next);
                              }}
                            >
                              <Icon data={TrashBin} size={14} />
                            </Button>
                          </Flex>
                        ))}
                      </Flex>
                    )}
                  </div>
                );
              })}
            </Flex>
          </div>

          <div className="ttk-recipe-drawer__footer">
            <Button view="outlined" size="l" onClick={requestClose}>
              Отмена
            </Button>
            <Button
              view="action"
              size="l"
              onClick={submit}
              disabled={collections.length === 0}
              loading={importFiles.isPending}
            >
              <Icon data={ArrowUpFromSquare} size={16} />
              Импортировать
            </Button>
          </div>
        </div>

        <div className="ttk-recipe-drawer__mode" hidden={editing === null}>
          <div className="ttk-recipe-drawer__header">
            <div className="ttk-recipe-drawer__title-row">
              <Text variant="subheader-2">Редактировать блюдо</Text>
            </div>
            <Button view="flat" size="l" onClick={() => setEditing(null)} aria-label="Закрыть">
              <Icon data={Xmark} size={20} />
            </Button>
          </div>

          <div className="ttk-recipe-drawer__body ttk-recipe-drawer__body_create">
            {form.fields}
          </div>

          <div className="ttk-recipe-drawer__footer">
            <Button view="outlined" size="l" onClick={() => setEditing(null)}>
              Отмена
            </Button>
            <Button view="action" size="l" onClick={saveDish} disabled={!form.canSubmit}>
              <Icon data={Pencil} size={16} />
              Сохранить
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function DropZone({
  dragging,
  setDragging,
  inputRef,
  onAdd,
}: {
  dragging: boolean;
  setDragging: (value: boolean) => void;
  inputRef: RefObject<HTMLInputElement>;
  onAdd: (files: FileList | null) => void;
}) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onAdd(e.dataTransfer.files);
      }}
      style={{
        border: `1px dashed ${
          dragging ? 'var(--g-color-line-brand)' : 'var(--g-color-line-generic)'
        }`,
        background: dragging ? 'var(--g-color-base-selection)' : 'transparent',
        borderRadius: 'var(--g-border-radius-l)',
        padding: 20,
        textAlign: 'center',
      }}
    >
      <Flex direction="column" alignItems="center" gap={1}>
        <Button view="outlined" onClick={() => inputRef.current?.click()}>
          <Icon data={File} size={16} />
          Выберите файл
        </Button>
        <Text variant="body-1" color="secondary">
          или
        </Text>
        <Text variant="body-2">перетащите файл сюда</Text>
        <Text variant="body-1" color="hint">
          {ACCEPT_LABEL}
        </Text>
      </Flex>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        style={{ display: 'none' }}
        onChange={(e) => {
          onAdd(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
