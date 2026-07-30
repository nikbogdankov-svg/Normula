import { useRef, useState } from 'react';
import { Button, Dialog, Flex, Icon, Text, TextInput, useToaster } from '@gravity-ui/uikit';
import { ArrowUpFromSquare, File, Pencil, TrashBin } from '@gravity-ui/icons';
import { useImportCollections } from './api';

/** Что принимаем — как написано в макете под дропзоной. */
const ACCEPT = '.pdf,.txt';

/** Импорт сборников рецептур: выбор файлов, переименование, отправка. */
export function ImportCollectionsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const importFiles = useImportCollections();
  const toaster = useToaster();
  const inputRef = useRef<HTMLInputElement>(null);
  const [names, setNames] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [renaming, setRenaming] = useState<number | null>(null);

  const close = () => {
    setNames([]);
    setRenaming(null);
    setDragging(false);
    onClose();
  };

  const add = (files: FileList | null) => {
    if (!files) return;
    setNames((current) => [...current, ...Array.from(files, (file) => file.name)]);
  };

  const submit = () => {
    importFiles.mutate(
      { fileNames: names },
      {
        onSuccess: (result) => {
          toaster.add({
            name: 'ttk-imported',
            title: 'Сборники импортированы',
            content: `Добавлено карт: ${result.imported}`,
            theme: 'success',
          });
          close();
        },
        onError: (e) =>
          toaster.add({ name: 'ttk-import', title: 'Ошибка', content: e.message, theme: 'danger' }),
      }
    );
  };

  return (
    <Dialog open={open} onClose={close} size="s">
      <Dialog.Header caption="Импорт сборников" />
      <Dialog.Body>
        <Flex direction="column" gap={3}>
          <Text variant="body-2">Импортируйте ваши сборники</Text>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              add(e.dataTransfer.files);
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
                {ACCEPT.replace(/,/g, ' ')}
              </Text>
            </Flex>

            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              style={{ display: 'none' }}
              onChange={(e) => {
                add(e.target.files);
                // Сбрасываем значение, иначе повторный выбор того же файла
                // не вызовет onChange.
                e.target.value = '';
              }}
            />
          </div>

          {names.map((name, index) => (
            <Flex key={`${name}-${index}`} alignItems="center" gap={2}>
              {renaming === index ? (
                <TextInput
                  value={name}
                  autoFocus
                  onUpdate={(value) =>
                    setNames((current) => current.map((n, i) => (i === index ? value : n)))
                  }
                  onBlur={() => setRenaming(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setRenaming(null)}
                />
              ) : (
                <Text variant="body-2" ellipsis>
                  {name}
                </Text>
              )}

              <Button
                view="flat"
                size="s"
                onClick={() => setRenaming(index)}
                title="Изменить имя файла"
              >
                <Icon data={Pencil} size={14} />
              </Button>
              <Button
                view="flat"
                size="s"
                onClick={() => setNames((current) => current.filter((_, i) => i !== index))}
                title="Убрать файл"
              >
                <Icon data={TrashBin} size={14} />
              </Button>
            </Flex>
          ))}
        </Flex>
      </Dialog.Body>
      <Dialog.Footer
        onClickButtonCancel={close}
        onClickButtonApply={submit}
        textButtonCancel="Отмена"
        textButtonApply="Импортировать"
        propsButtonApply={{
          disabled: names.length === 0,
          children: (
            <>
              <Icon data={ArrowUpFromSquare} size={16} />
              Импортировать
            </>
          ),
        }}
        loading={importFiles.isPending}
      />
    </Dialog>
  );
}
