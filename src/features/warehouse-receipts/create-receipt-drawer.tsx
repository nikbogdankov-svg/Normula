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
import { useDrawerHeight } from '@/features/ttk/use-drawer-height';
import { ProductPicker } from '@/features/products/product-picker';
import { useCreateReceipt, useUpdateReceipt } from '@/features/warehouse/api';
import {
  decimalToInput,
  formatMoney,
  isoToPicker,
  lineTotal,
  parseDecimal,
  pickerToIso,
  todayPicker,
} from '@/features/warehouse/format';
import { ObjectSelect, type ObjectOption } from '@/features/warehouse/object-select';
import {
  PRICE_DECIMALS,
  QUANTITY_DECIMALS,
  type Receipt,
  type ReceiptItem,
  type ReceiptItemInput,
  type ReceiptRequest,
} from '@/features/warehouse/types';
import { useTranslation } from '@/shared/i18n';
import './create-receipt-drawer.css';
import { errorText } from '@/shared/api/error-text';

/**
 * Значения селектов приёмочного контроля. Бэкенд хранит их как текст и
 * списки не проверяет, поэтому список живёт только здесь.
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

const selectOptions = (values: string[]) => values.map((value) => ({ value, content: value }));

/** Компактное текстовое поле строки товара. */
function ItemInput({
  label,
  placeholder,
  value,
  onUpdate,
  flex = 1,
  optional = false,
  invalid = false,
  endContent,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onUpdate: (value: string) => void;
  flex?: number;
  optional?: boolean;
  invalid?: boolean;
  endContent?: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <TextInput
      size="l"
      label={label}
      placeholder={placeholder}
      value={value}
      onUpdate={onUpdate}
      style={{ flex }}
      validationState={invalid ? 'invalid' : undefined}
      endContent={
        endContent ??
        (optional ? (
          <div style={{ marginRight: 4 }}>
            <Text variant="body-1" color="secondary">
              {t('receipt.optional')}
            </Text>
          </div>
        ) : undefined)
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

/** Поле даты через календарь; значение — дд/мм/гггг. */
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
  const { t } = useTranslation();

  return (
    <div style={{ flex }}>
      <DatePicker
        size="l"
        view="normal"
        label={label}
        placeholder={t('receipt.datePlaceholder')}
        value={value ? dateTime({ input: value, format: 'DD/MM/YYYY' }) : null}
        onUpdate={(next) => onUpdate(next ? next.format('DD/MM/YYYY') : '')}
        style={{ width: '100%' }}
      />
    </div>
  );
}

/** Строка формы: числа и даты — строками, как их ввёл пользователь. */
interface DraftItem {
  /** id существующей строки при редактировании; пусто — новая. */
  id: string;
  productId: string;
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
  id: '',
  productId: '',
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

/** Строка накладной с бэкенда → черновик формы. */
function receiptToDraft(item: ReceiptItem): DraftItem {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    unit: item.unit,
    quantity: decimalToInput(item.quantity),
    unitPrice: decimalToInput(item.unitPrice),
    packaging: item.packaging,
    productionDate: isoToPicker(item.productionDate),
    manufacturer: item.manufacturer,
    supplier: item.supplier,
    documentNumber: item.documentNumber,
    documentType: item.documentType,
    organoleptic: item.organoleptic,
    storageConditions: item.storageConditions,
    expiryDate: isoToPicker(item.expiryDate),
    note: item.note,
  };
}

/**
 * Черновик → строка запроса. null, если строку отправлять нельзя: бэкенд
 * требует продукт, количество больше нуля, цену не меньше нуля и все поля
 * бракеража, кроме примечания.
 */
function draftToInput(row: DraftItem): ReceiptItemInput | null {
  const quantity = parseDecimal(row.quantity, QUANTITY_DECIMALS);
  const unitPrice = parseDecimal(row.unitPrice, PRICE_DECIMALS);
  const productionDate = pickerToIso(row.productionDate);
  const expiryDate = pickerToIso(row.expiryDate);

  const required = [
    row.productId,
    row.packaging,
    row.manufacturer,
    row.supplier,
    row.documentType,
    row.documentNumber,
    row.organoleptic,
    row.storageConditions,
    productionDate,
    expiryDate,
  ];
  if (required.some((value) => value.trim() === '')) return null;
  if (quantity === null || quantity <= 0 || unitPrice === null) return null;

  return {
    id: row.id || undefined,
    productId: row.productId,
    quantity,
    unitPrice,
    packaging: row.packaging.trim(),
    manufacturer: row.manufacturer.trim(),
    supplier: row.supplier.trim(),
    productionDate,
    documentType: row.documentType,
    documentNumber: row.documentNumber.trim(),
    organoleptic: row.organoleptic,
    storageConditions: row.storageConditions,
    expiryDate,
    note: row.note.trim(),
  };
}

type ItemStatus = 'done' | 'active' | 'skipped';

/** Статус заполнения строки: готова к отправке / в работе / не заполнена. */
function itemStatus(row: DraftItem, index: number, expandedIndex: number | null): ItemStatus {
  if (draftToInput(row) !== null) return 'done';
  return expandedIndex === index ? 'active' : 'skipped';
}

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

/** Число введено, но бэкенд его не примет (лишние знаки, не число). */
function isBadDecimal(value: string, decimals: number): boolean {
  return value.trim() !== '' && parseDecimal(value, decimals) === null;
}

/** Создание и редактирование накладной в нижнем drawer. */
export function CreateReceiptDrawer({
  open,
  onClose,
  objectId,
  objectOptions,
  initial = null,
}: {
  open: boolean;
  onClose: () => void;
  /** Объект, выбранный на странице — подставляется в новую накладную. */
  objectId: string;
  objectOptions: ObjectOption[];
  initial?: Receipt | null;
}) {
  const height = useDrawerHeight();
  const create = useCreateReceipt();
  const update = useUpdateReceipt();
  const toaster = useToaster();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(todayPicker());
  const [draftObjectId, setDraftObjectId] = useState('');
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }

    if (initial) {
      setInvoiceNumber(initial.invoiceNumber);
      setDate(isoToPicker(initial.date));
      setDraftObjectId(initial.objectId);
      setItems(initial.items.length ? initial.items.map(receiptToDraft) : [emptyItem()]);
    } else {
      setInvoiceNumber('');
      setDate(todayPicker());
      setDraftObjectId(objectId);
      setItems([emptyItem()]);
    }
    setExpandedIndex(0);
    setMounted(true);
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- форма заполняется при открытии
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

  const inputs = items.map(draftToInput);
  const allItemsComplete = inputs.length > 0 && inputs.every((input) => input !== null);
  const isoDate = pickerToIso(date.trim());
  const canSubmit =
    allItemsComplete && invoiceNumber.trim() !== '' && isoDate !== '' && draftObjectId !== '';

  const total = items.reduce((sum, row) => {
    const quantity = parseDecimal(row.quantity, QUANTITY_DECIMALS) ?? 0;
    const unitPrice = parseDecimal(row.unitPrice, PRICE_DECIMALS) ?? 0;
    return sum + lineTotal(quantity, unitPrice);
  }, 0);

  const submit = () => {
    const body: ReceiptRequest = {
      objectId: draftObjectId,
      date: isoDate,
      invoiceNumber: invoiceNumber.trim(),
      items: inputs.filter((input): input is ReceiptItemInput => input !== null),
    };

    const onSuccess = () => {
      toaster.add({
        name: initial ? 'receipt-updated' : 'receipt-created',
        title: initial ? t('receipt.toastUpdated') : t('receipt.toastCreated'),
        theme: 'success',
      });
      requestClose();
    };
    const onError = (e: Error) =>
      toaster.add({
        name: initial ? 'receipt-update' : 'receipt-create',
        title: t('common.error'),
        content: errorText(e),
        theme: 'danger',
      });

    if (initial) {
      update.mutate({ id: initial.id, body }, { onSuccess, onError });
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
              {initial ? t('receipt.editTitle') : t('receipt.addTitle')}{' '}
            </Text>
            <Button view="flat" size="l" onClick={requestClose} aria-label={t('receipt.close')}>
              <Icon data={Xmark} size={20} />
            </Button>
          </div>
        </div>

        <div className="create-receipt-drawer__body">
          <Flex direction="column" gap={3}>
            <Flex gap={2}>
              <TextInput
                size="l"
                label={t('receipt.invoiceNumberLabel')}
                placeholder={t('receipt.invoiceNumberPlaceholder')}
                value={invoiceNumber}
                onUpdate={setInvoiceNumber}
                style={{ flex: 1 }}
              />
              <ItemDate label={t('receipt.dateLabel')} value={date} onUpdate={setDate} flex={1} />
              <div style={{ flex: 1 }}>
                <ObjectSelect
                  value={draftObjectId}
                  onUpdate={setDraftObjectId}
                  options={objectOptions}
                  width="max"
                />
              </div>
            </Flex>

            <Flex direction="column" gap={3}>
              {items.map((row, index) => (
                <div key={row.id || `new-${index}`} className="create-receipt-drawer__item">
                  <Flex gap={2} alignItems="flex-end" className="create-receipt-drawer__item-main">
                    <div style={{ flex: 2 }}>
                      <ProductPicker
                        value={row.productId}
                        valueLabel={row.productName}
                        placeholder={t('receipt.productPlaceholder')}
                        size="l"
                        onChange={(product) =>
                          updateItem(index, {
                            productId: product?.id ?? '',
                            productName: product?.name ?? '',
                            unit: product?.unit ?? '',
                          })
                        }
                      />
                    </div>
                    <ItemInput
                      label={t('receipt.quantityLabel')}
                      placeholder="0"
                      value={row.quantity}
                      onUpdate={(v) => updateItem(index, { quantity: v })}
                      invalid={isBadDecimal(row.quantity, QUANTITY_DECIMALS)}
                      endContent={
                        row.unit ? (
                          <span
                            style={{
                              color: 'var(--g-color-text-secondary)',
                              paddingInlineEnd: 4,
                            }}
                          >
                            {row.unit}
                          </span>
                        ) : undefined
                      }
                    />
                    <ItemInput
                      label={t('receipt.unitPriceLabel')}
                      placeholder="0.00"
                      value={row.unitPrice}
                      onUpdate={(v) => updateItem(index, { unitPrice: v })}
                      invalid={isBadDecimal(row.unitPrice, PRICE_DECIMALS)}
                    />
                    <ItemStatusIcon status={itemStatus(row, index, expandedIndex)} />
                    <Button
                      view="flat"
                      size="l"
                      onClick={() => removeItem(index)}
                      title={t('common.delete')}
                      aria-label={t('receipt.deleteProduct')}
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
                      title={expandedIndex === index ? t('receipt.collapse') : t('receipt.expand')}
                      aria-label={
                        expandedIndex === index
                          ? t('receipt.collapseProduct')
                          : t('receipt.expandProduct')
                      }
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
                            label={t('receipt.manufacturerLabel')}
                            value={row.manufacturer}
                            onUpdate={(v) => updateItem(index, { manufacturer: v })}
                          />
                          <ItemInput
                            label={t('receipt.supplierLabel')}
                            value={row.supplier}
                            onUpdate={(v) => updateItem(index, { supplier: v })}
                          />
                          <ItemInput
                            label={t('receipt.packagingLabel')}
                            value={row.packaging}
                            onUpdate={(v) => updateItem(index, { packaging: v })}
                          />
                        </Flex>
                        <Flex gap={3}>
                          <ItemDate
                            label={t('receipt.productionDateLabel')}
                            value={row.productionDate}
                            onUpdate={(v) => updateItem(index, { productionDate: v })}
                          />
                          <ItemSelect
                            label={t('receipt.documentTypeLabel')}
                            placeholder={t('receipt.documentTypePlaceholder')}
                            value={row.documentType}
                            options={selectOptions(DOCUMENT_TYPE_OPTIONS)}
                            onUpdate={(v) => updateItem(index, { documentType: v })}
                          />
                          <ItemInput
                            label={t('receipt.documentNumberLabel')}
                            value={row.documentNumber}
                            onUpdate={(v) => updateItem(index, { documentNumber: v })}
                          />
                        </Flex>
                        <Flex gap={3}>
                          <ItemDate
                            label={t('receipt.expiryDateLabel')}
                            value={row.expiryDate}
                            onUpdate={(v) => updateItem(index, { expiryDate: v })}
                          />
                          <ItemSelect
                            label={t('receipt.organolepticLabel')}
                            placeholder={t('receipt.organolepticPlaceholder')}
                            value={row.organoleptic}
                            options={selectOptions(ORGANOLEPTIC_OPTIONS)}
                            onUpdate={(v) => updateItem(index, { organoleptic: v })}
                          />
                          <ItemSelect
                            label={t('receipt.storageConditionsLabel')}
                            placeholder={t('receipt.storageConditionsPlaceholder')}
                            value={row.storageConditions}
                            options={selectOptions(STORAGE_CONDITIONS_OPTIONS)}
                            onUpdate={(v) => updateItem(index, { storageConditions: v })}
                          />
                        </Flex>
                        <ItemInput
                          label={t('receipt.noteLabel')}
                          placeholder={t('receipt.notePlaceholder')}
                          value={row.note}
                          onUpdate={(v) => updateItem(index, { note: v })}
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
                {t('receipt.addProduct')}
              </Button>
            </Flex>
          </Flex>
        </div>

        <div className="create-receipt-drawer__footer">
          <div className="create-receipt-drawer__footer-inner">
            <Text variant="subheader-2" style={{ marginInlineEnd: 'auto' }}>
              {t('receipt.total', { value: formatMoney(total) })}
            </Text>
            <Button view="outlined" size="l" onClick={requestClose}>
              {t('common.cancel')}
            </Button>
            <Button
              view={canSubmit ? 'action' : 'normal'}
              size="l"
              onClick={submit}
              disabled={!canSubmit}
              loading={initial ? update.isPending : create.isPending}
            >
              <Icon data={Plus} size={16} />
              {initial ? t('common.save') : t('receipt.submit')}
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
