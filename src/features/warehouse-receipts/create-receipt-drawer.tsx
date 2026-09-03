import { useEffect, useState } from 'react';
import { Button, Drawer, Flex, Icon, Select, Text, TextInput, useToaster } from '@gravity-ui/uikit';
import { DatePicker } from '@gravity-ui/date-components';
import { dateTime } from '@gravity-ui/date-utils';
import {
  Plus,
  CircleXmark,
  Xmark,
  TrashBin,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleDashed,
} from '@gravity-ui/icons';
import { useCreateReceipt, useUpdateReceipt } from './api';
import { useDrawerHeight } from '@/features/ttk/use-drawer-height';
import { useKitchen } from '@/features/objects/api';
import type { CreateReceiptRequest, ReceiptItem, WarehouseReceipt } from './types';
import './create-receipt-drawer.css';

/**
 * Возможные значения для селектов приёмочного контроля. Пока держим в одном
 * месте, синхронно с данными в mock-handlers.
 */
const DOCUMENT_TYPE_OPTIONS = [
  'Декларация о соответствии',
  'Ветеринарное свидетельство',
  'Сертификат соответствия',
  'Свидетельство о госрегистрации',
  'Сертификат качества',
  'Фитосанитарный сертификат',
  'Товарная накладная',
  'УПД',
];

const STORAGE_CONDITIONS_OPTIONS = [
  'Сухое проветриваемое помещение',
  'Тёмное прохладное место',
  'Холодильная камера 0…+4 °C',
  'Холодильная камера до +6 °C',
  'Морозильная камера -18 °C',
  'Комнатная температура',
  'Не требует особых условий',
];

const ORGANOLEPTIC_OPTIONS = ['Соответствует', 'Не соответствует', 'Соответствует с замечаниями'];

const UNIT_OPTIONS = ['кг', 'г', 'мг', 'л', 'мл', 'шт', 'уп', 'кор', 'ящ'];

const selectOptions = (values: string[]) => values.map((value) => ({ value, content: value }));

/** Компактное текстовое поле строки товара. */
function ItemInput({
  label,
  placeholder,
  value,
  onUpdate,
  flex = 1,
  optional = false,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onUpdate: (value: string) => void;
  flex?: number;
  optional?: boolean;
}) {
  return (
    <TextInput
      size="l"
      label={label}
      placeholder={placeholder}
      value={value}
      onUpdate={onUpdate}
      style={{ flex }}
      endContent={
        optional ? (
          <div style={{ marginRight: 4 }}>
            <Text variant="body-1" color="secondary">
              необязательно
            </Text>
          </div>
        ) : undefined
      }
    />
  );
}

/** Компактный селект строки товара. */
function ItemSelect({
  label,
  placeholder,
  value,
  options,
  onUpdate,
  flex = 1,
}: {
  label: string;
  placeholder?: string;
  value: string;
  options: Array<{ value: string; content: string }>;
  onUpdate: (value: string) => void;
  flex?: number;
}) {
  return (
    <div style={{ flex }}>
      <Select
        label={label}
        size="l"
        placeholder={placeholder}
        value={value ? [value] : []}
        options={options}
        onUpdate={(next) => onUpdate(next[0] ?? '')}
        width="max"
      />
    </div>
  );
}

/** Поле даты строки товара/накладной через календарь. */
function ItemDate({
  label,
  value,
  onUpdate,
  flex = 1,
}: {
  label: string;
  value: string;
  onUpdate: (value: string) => void;
  flex?: number;
}) {
  return (
    <div style={{ flex }}>
      <DatePicker
        size="l"
        view="normal"
        label={label}
        placeholder="дд/мм/гггг"
        value={value ? dateTime({ input: value, format: 'DD/MM/YYYY' }) : null}
        onUpdate={(next) => onUpdate(next ? next.format('DD/MM/YYYY') : '')}
        style={{ width: '100%' }}
      />
    </div>
  );
}

interface DraftItem {
  productName: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  packaging: string;
  productionDate: string;
  manufacturer: string;
  supplier: string;
  documentNumber: string;
  documentType: string;
  organoleptic: string;
  storageConditions: string;
  expiryDate: string;
  note: string;
}

const emptyItem = (): DraftItem => ({
  productName: '',
  unit: '',
  quantity: '',
  unitPrice: '',
  packaging: '',
  productionDate: '',
  manufacturer: '',
  supplier: '',
  documentNumber: '',
  documentType: '',
  organoleptic: '',
  storageConditions: '',
  expiryDate: '',
  note: '',
});

type ItemStatus = 'done' | 'active' | 'skipped';

/** Статус заполнения строки: всё заполнено / в процессе / оставлен для другой. */
function itemStatus(row: DraftItem, index: number, expandedIndex: number | null): ItemStatus {
  const filled = Boolean(row.productName.trim() && row.quantity.trim() && row.unitPrice.trim());
  if (filled) return 'done';
  return expandedIndex === index ? 'active' : 'skipped';
}

/** Индикатор заполнения строки товара. */
function ItemStatusIcon({ status }: { status: ItemStatus }) {
  const icon =
    status === 'done' ? (
      <Icon data={CircleCheck} size={20} style={{ color: 'var(--g-color-text-positive)' }} />
    ) : status === 'active' ? (
      <Icon data={CircleDashed} size={20} style={{ color: 'var(--g-color-text-misc)' }} />
    ) : (
      <Icon data={CircleXmark} size={20} style={{ color: 'var(--g-color-text-danger)' }} />
    );

  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        flexShrink: 0,
      }}
    >
      {icon}
    </span>
  );
}

/** Сегодня в формате дд/мм/гггг. */
function todayLocal(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${now.getFullYear()}`;
}

/** дд/мм/гггг → гггг-мм-дд (формат хранения/бэка). */
function toIsoDate(value: string): string {
  const [dd, mm, yyyy] = value.split('/');
  if (!dd || !mm || yyyy?.length !== 4) return '';
  return `${yyyy}-${mm}-${dd}`;
}

/** гггг-мм-дд → дд/мм/гггг (для показа в форме). */
function isoToLocal(value?: string): string {
  if (!value) return '';
  const [yyyy, mm, dd] = value.split('-');
  if (!yyyy || !mm || !dd) return value;
  return `${dd}/${mm}/${yyyy}`;
}

/** Строка прихода → черновик строки формы. */
function receiptToDraft(item: ReceiptItem): DraftItem {
  return {
    productName: item.productName,
    unit: item.unit,
    quantity: item.quantity ? String(item.quantity) : '',
    unitPrice: item.unitPrice ? String(item.unitPrice) : '',
    packaging: item.packaging ?? '',
    productionDate: isoToLocal(item.productionDate),
    manufacturer: item.manufacturer ?? '',
    supplier: item.supplier ?? '',
    documentNumber: item.documentNumber ?? '',
    documentType: item.documentType ?? '',
    organoleptic: item.organoleptic ?? '',
    storageConditions: item.storageConditions ?? '',
    expiryDate: isoToLocal(item.expiryDate),
    note: item.note ?? '',
  };
}

/** Создание прихода (накладной) в нижнем drawer. */
export function CreateReceiptDrawer({
  open,
  onClose,
  warehouseId,
  initial = null,
}: {
  open: boolean;
  onClose: () => void;
  warehouseId: string;
  initial?: WarehouseReceipt | null;
}) {
  const height = useDrawerHeight();
  const create = useCreateReceipt();
  const update = useUpdateReceipt();
  const toaster = useToaster();
  const kitchens = useKitchen();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [unitId, setUnitId] = useState('');
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }

    if (initial) {
      setInvoiceNumber(initial.invoiceNumber);
      setDate(isoToLocal(initial.date));
      setUnitId(initial.unitId ?? '');
      setItems(initial.items.length ? initial.items.map(receiptToDraft) : [emptyItem()]);
      setExpandedIndex(0);
    } else {
      setInvoiceNumber('');
      setDate(todayLocal());
      setUnitId('');
      setItems([emptyItem()]);
      setExpandedIndex(0);
    }
    setMounted(true);
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  // После анимации закрытия размонтируем drawer.
  useEffect(() => {
    if (visible || open || !mounted) return;
    const timer = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(timer);
  }, [visible, open, mounted]);

  const requestClose = () => {
    setVisible(false);
    onClose();
  };

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeItem = (index: number) => {
    setItems((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
    setExpandedIndex(null);
  };

  const filledItems = items.filter((row) => row.productName.trim());

  const allItemsComplete =
    items.length > 0 &&
    items.every((row) => row.productName.trim() && row.quantity.trim() && row.unitPrice.trim());

  const getBody = (): CreateReceiptRequest => ({
    date: toIsoDate(date.trim()),
    invoiceNumber: invoiceNumber.trim(),
    warehouseId,
    unitId: unitId || undefined,
    items: filledItems.map((row) => ({
      productName: row.productName,
      unit: row.unit,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unitPrice),
      packaging: row.packaging,
      productionDate: toIsoDate(row.productionDate),
      manufacturer: row.manufacturer,
      supplier: row.supplier,
      documentNumber: row.documentNumber,
      documentType: row.documentType,
      organoleptic: row.organoleptic,
      storageConditions: row.storageConditions,
      expiryDate: toIsoDate(row.expiryDate),
      note: row.note,
    })),
  });

  const submit = () => {
    const onSuccess = () => {
      toaster.add({
        name: initial ? 'receipt-updated' : 'receipt-created',
        title: initial ? 'Приход обновлён' : 'Приход создан',
        theme: 'success',
      });
      requestClose();
    };
    const onError = (e: Error) =>
      toaster.add({
        name: initial ? 'receipt-update' : 'receipt-create',
        title: 'Ошибка',
        content: e.message,
        theme: 'danger',
      });

    const body = getBody();
    if (initial) {
      update.mutate({ id: initial.id, data: body }, { onSuccess, onError });
    } else {
      create.mutate(body, { onSuccess, onError });
    }
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
      className="create-receipt-drawer"
      contentClassName="create-receipt-drawer__panel"
    >
      <div className="create-receipt-drawer__card">
        <div className="create-receipt-drawer__header">
          <div className="create-receipt-drawer__header-inner">
            <Text variant="subheader-3">
              {initial ? 'Редактировать приход' : 'Добавить приход'}{' '}
            </Text>
            <Button view="flat" size="l" onClick={requestClose} aria-label="Закрыть">
              <Icon data={Xmark} size={20} />
            </Button>
          </div>
        </div>

        <div className="create-receipt-drawer__body">
          <Flex direction="column" gap={3}>
            <Flex gap={2}>
              <TextInput
                size="l"
                label="Номер накладной:"
                placeholder="НАК-2026-001"
                value={invoiceNumber}
                onUpdate={setInvoiceNumber}
                style={{ flex: 1 }}
              />
              <ItemDate label="Дата:" value={date} onUpdate={(v) => setDate(v)} flex={1} />
              <div style={{ flex: 1 }}>
                <Select
                  size="l"
                  label="Пищеблок:"
                  placeholder="Выберите пищеблок"
                  value={unitId ? [unitId] : []}
                  options={(kitchens.data?.kitchens ?? []).map((k) => ({
                    value: k.id,
                    content: k.name,
                  }))}
                  onUpdate={(next) => setUnitId(next[0] ?? '')}
                  width="max"
                />
              </div>
            </Flex>

            <Flex direction="column" gap={3}>
              {items.map((row, index) => (
                <div key={index} className="create-receipt-drawer__item">
                  <Flex gap={2} alignItems="flex-end" className="create-receipt-drawer__item-main">
                    <ItemInput
                      label="Название:"
                      placeholder="Название товара"
                      value={row.productName}
                      onUpdate={(v) => updateItem(index, { productName: v })}
                      flex={2}
                    />
                    <ItemSelect
                      label="Ед. изм.:"
                      placeholder="кг/л/шт"
                      value={row.unit}
                      options={selectOptions(UNIT_OPTIONS)}
                      onUpdate={(v) => updateItem(index, { unit: v })}
                    />
                    <ItemInput
                      label="Кол-во:"
                      placeholder="0"
                      value={row.quantity}
                      onUpdate={(v) => updateItem(index, { quantity: v })}
                    />
                    <ItemInput
                      label="Цена, ₽:"
                      placeholder="0.00"
                      value={row.unitPrice}
                      onUpdate={(v) => updateItem(index, { unitPrice: v })}
                    />
                    <ItemStatusIcon status={itemStatus(row, index, expandedIndex)} />
                    <Button
                      view="flat"
                      size="l"
                      onClick={() => removeItem(index)}
                      title="Удалить"
                      aria-label="Удалить товар"
                      disabled={items.length <= 1}
                    >
                      <Icon data={TrashBin} size={18} />
                    </Button>
                    <Button
                      view="flat"
                      size="l"
                      onClick={() =>
                        setExpandedIndex((current) => (current === index ? null : index))
                      }
                      title={expandedIndex === index ? 'Свернуть' : 'Раскрыть'}
                      aria-label={expandedIndex === index ? 'Свернуть товар' : 'Раскрыть товар'}
                      aria-expanded={expandedIndex === index}
                    >
                      <Icon data={expandedIndex === index ? ChevronUp : ChevronDown} size={18} />
                    </Button>
                  </Flex>

                  {expandedIndex === index && (
                    <div className="create-receipt-drawer__item-details">
                      <Flex direction="column" gap={3}>
                        <Flex gap={3}>
                          <ItemInput
                            label="Изготовитель:"
                            value={row.manufacturer}
                            onUpdate={(v) => updateItem(index, { manufacturer: v })}
                            flex={1}
                          />
                          <ItemInput
                            label="Поставщик:"
                            value={row.supplier}
                            onUpdate={(v) => updateItem(index, { supplier: v })}
                            flex={1}
                          />
                          <ItemInput
                            label="Фасовка:"
                            value={row.packaging}
                            onUpdate={(v) => updateItem(index, { packaging: v })}
                            flex={1}
                          />
                        </Flex>
                        <Flex gap={3}>
                          <ItemDate
                            label="Дата выработки:"
                            value={row.productionDate}
                            onUpdate={(v) => updateItem(index, { productionDate: v })}
                            flex={1}
                          />
                          <ItemSelect
                            label="Тип документа:"
                            placeholder="Выберите тип"
                            value={row.documentType}
                            options={selectOptions(DOCUMENT_TYPE_OPTIONS)}
                            onUpdate={(v) => updateItem(index, { documentType: v })}
                            flex={1}
                          />
                          <ItemInput
                            label="Номер документа:"
                            value={row.documentNumber}
                            onUpdate={(v) => updateItem(index, { documentNumber: v })}
                            flex={1}
                          />
                        </Flex>
                        <Flex gap={3}>
                          <ItemDate
                            label="Срок реализации:"
                            value={row.expiryDate}
                            onUpdate={(v) => updateItem(index, { expiryDate: v })}
                            flex={1}
                          />
                          <ItemSelect
                            label="Органолептика:"
                            placeholder="Выберите"
                            value={row.organoleptic}
                            options={selectOptions(ORGANOLEPTIC_OPTIONS)}
                            onUpdate={(v) => updateItem(index, { organoleptic: v })}
                            flex={1}
                          />
                          <ItemSelect
                            label="Условия хранения:"
                            placeholder="Выберите"
                            value={row.storageConditions}
                            options={selectOptions(STORAGE_CONDITIONS_OPTIONS)}
                            onUpdate={(v) => updateItem(index, { storageConditions: v })}
                            flex={1}
                          />
                        </Flex>
                        <ItemInput
                          label="Примечание:"
                          placeholder="Необязательное поле"
                          value={row.note}
                          onUpdate={(v) => updateItem(index, { note: v })}
                          flex={1}
                          optional
                        />
                      </Flex>
                    </div>
                  )}
                </div>
              ))}

              <Button
                view="normal-contrast"
                size="l"
                onClick={() => {
                  setItems((rows) => [...rows, emptyItem()]);
                  setExpandedIndex(items.length);
                }}
                style={{ alignSelf: 'flex-start' }}
              >
                <Icon data={Plus} size={16} />
                Добавить товар
              </Button>
            </Flex>
          </Flex>
        </div>

        <div className="create-receipt-drawer__footer">
          <div className="create-receipt-drawer__footer-inner">
            <Button view="outlined" size="l" onClick={requestClose}>
              Отмена
            </Button>
            <Button
              view={allItemsComplete ? 'action' : 'normal'}
              size="l"
              onClick={submit}
              disabled={!allItemsComplete}
              loading={initial ? update.isPending : create.isPending}
            >
              <Icon data={Plus} size={16} />
              {initial ? 'Сохранить' : 'Создать приход'}
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
