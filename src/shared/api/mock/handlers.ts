/**
 * Моковый «бэкенд»: разбирает путь и метод и отвечает данными из ./data.
 *
 * Полностью заменяет сетевой слой: `apiFetch` из `../client` делегирует сюда,
 * сохраняя прежнюю сигнатуру. Мутации меняют те же массивы, что и чтение,
 * поэтому «создал продукт → увидел в списке» работает как на настоящем бэке.
 */

import type { FacilityType } from '@/features/objects/types';
import type { ObjectGroupInput } from '@/features/objects/types';
import type { CreateProductRequest, UpdateProductRequest } from '@/features/products/types';
import type { CreateDietRequest, UpdateDietRequest } from '@/features/diets/types';
import type { RecipeRequest } from '@/features/ttk/types';
import type {
  CreateEmployeeRequest,
  EmployeeDocuments,
  UpdateEmployeeRequest,
} from '@/features/staff/types';
import type {
  CreateMenuRequest,
  UpdateSlotRequest,
  FillScheduleRequest,
} from '@/features/menu/types';
import type { UpdatePortionHeadcountRequest } from '@/features/portions/types';
import type {
  ReceiptRequest,
  ReceiptItemInput,
  WriteOffRequest,
  TransferRequest,
} from '@/features/warehouse/types';
import type {
  CreateOrganizationRequest,
  Invitation,
  Organization,
} from '@/features/organizations/types';
import {
  allowViolationForDay,
  allBatches,
  buildAccounts,
  buildSchedule,
  buildScheduleDay,
  confirmSpread,
  copyPortionsDay,
  dietName,
  diets,
  dishDistributionFor,
  employees,
  fillScheduleFromMenu,
  findDiet,
  findEmployee,
  findObject,
  menus,
  nextReceiptId,
  nextTransferId,
  nextWriteOffId,
  objects,
  organizations,
  organizationInvitations,
  organizationMembers,
  organizationRoles,
  portionsFor,
  productSpreadFor,
  productPrices,
  products,
  receipts,
  recipeSummary,
  recipes,
  round,
  seededInt,
  setHeadcount,
  setScheduleSlot,
  staffRoles,
  todayIso,
  transfers,
  writeOffs,
} from './data';

/** Параметры, которые кладёт в вызов `apiFetch`. */
export interface MockRequestOptions {
  method?: string;
  body?: unknown;
}

const LATENCY_MS = 120;

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
}

function fail(message: string): never {
  throw new Error(message);
}

let idSeq = 0;
function genId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSeq}`;
}

function documentsFor(id: string): EmployeeDocuments {
  const digits = (seed: string, length: number): string =>
    String(seededInt(`docs:${id}:${seed}`, 10 ** (length - 1), 10 ** length - 1));
  return {
    snils: digits('snils', 11),
    inn: digits('inn', 12),
    passportSeries: `45 ${String(seededInt(`ps:${id}`, 10, 99))}`,
    passportNumber: digits('pn', 6),
    otherDoc: '',
  };
}

function toObjectGroups(inputs: ObjectGroupInput[]) {
  return inputs.map((input, index) => ({
    id: `grp-${Date.now().toString(36)}-${index}`,
    name: input.name,
    diets: input.dietIds.map((dietId) => ({ id: dietId, name: dietName(dietId) })),
  }));
}

function buildReceiptItem(input: ReceiptItemInput, receiptId: string, index: number) {
  const product = products.find((p) => p.id === input.productId);
  return {
    id: input.id || `${receiptId}-item-${index}`,
    productId: input.productId,
    productName: product?.name ?? input.productId,
    unit: product?.unit ?? 'kg',
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    total: round(input.quantity * input.unitPrice, 2),
    packaging: input.packaging,
    manufacturer: input.manufacturer,
    supplier: input.supplier,
    productionDate: input.productionDate,
    documentType: input.documentType,
    documentNumber: input.documentNumber,
    organoleptic: input.organoleptic,
    storageConditions: input.storageConditions,
    expiryDate: input.expiryDate,
    note: input.note ?? '',
  };
}

function receiptTotal(items: { quantity: number; unitPrice: number }[]): number {
  return round(
    items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    2
  );
}

/* ───────────────────────── ресурсы ───────────────────────── */

function productsResource(
  method: string,
  rest: string[],
  query: URLSearchParams,
  body: unknown
): unknown {
  if (rest.length === 0) {
    if (method === 'GET') return { products: [...products], total: products.length };
    if (method === 'POST') {
      const input = body as CreateProductRequest;
      const product = { id: genId('p'), name: input.name, unit: input.unit };
      products.push(product);
      return { product };
    }
    return fail(`products: неподдерживаемый метод ${method}`);
  }

  const id = rest[0];
  const target = products.find((p) => p.id === id);
  if (!target) return fail(`Продукт ${id} не найден`);

  if (method === 'PATCH') {
    const input = body as UpdateProductRequest;
    target.name = input.name;
    target.unit = input.unit;
    return { product: target };
  }
  if (method === 'DELETE') {
    void query.get('mode');
    products.splice(products.indexOf(target), 1);
    return undefined;
  }
  return fail(`products/${id}: неподдерживаемый метод ${method}`);
}

function objectsResource(method: string, rest: string[], body: unknown): unknown {
  if (rest.length === 0) {
    if (method === 'GET') return { objects: [...objects] };
    if (method === 'POST') {
      const input = body as {
        name: string;
        type: FacilityType;
        groups: ObjectGroupInput[];
        parentObjectId?: string;
      };
      const object = {
        id: genId('obj'),
        parentObjectId: input.parentObjectId ?? '',
        name: input.name,
        type: input.type,
        groups: toObjectGroups(input.groups),
      };
      objects.push(object);
      return { id: object.id };
    }
    return fail(`objects: неподдерживаемый метод ${method}`);
  }

  const id = rest[0];
  const target = objects.find((o) => o.id === id);
  if (!target) return fail(`Объект ${id} не найден`);

  if (method === 'PATCH') {
    const input = body as { name: string; type: FacilityType; groups: ObjectGroupInput[] };
    target.name = input.name;
    target.type = input.type;
    target.groups = toObjectGroups(input.groups);
    return undefined;
  }
  if (method === 'DELETE') {
    const removeIds = new Set([
      id,
      ...objects.filter((o) => o.parentObjectId === id).map((o) => o.id),
    ]);
    for (let i = objects.length - 1; i >= 0; i -= 1) {
      if (removeIds.has(objects[i].id)) objects.splice(i, 1);
    }
    return undefined;
  }
  return fail(`objects/${id}: неподдерживаемый метод ${method}`);
}

function dietsResource(method: string, rest: string[], body: unknown): unknown {
  if (rest.length === 0) {
    if (method === 'GET') return { diets: [...diets] };
    if (method === 'POST') {
      const input = body as CreateDietRequest;
      const diet = { id: genId('diet'), ...input };
      diets.push(diet);
      return { diet };
    }
    return fail('diets: неподдерживаемый метод');
  }

  const id = rest[0];
  const target = diets.find((d) => d.id === id);
  if (!target) return fail(`Диета ${id} не найдена`);

  if (method === 'PATCH') {
    Object.assign(target, body as UpdateDietRequest);
    return { diet: target };
  }
  if (method === 'DELETE') {
    diets.splice(diets.indexOf(target), 1);
    return undefined;
  }
  return fail(`diets/${id}: неподдерживаемый метод`);
}

function ttkResource(method: string, rest: string[], body: unknown): unknown {
  if (rest.length === 0) {
    if (method === 'GET') return { recipes: recipes.map(recipeSummary) };
    if (method === 'POST') {
      const input = body as RecipeRequest;
      const recipe = {
        id: genId('rec'),
        name: input.name,
        collectionName: input.collectionName,
        yieldNet: input.yieldNet,
        yieldLoss: input.yieldLoss,
        technology: input.technology,
        protein: input.protein,
        fat: input.fat,
        carbs: input.carbs,
        kcal: input.kcal,
        ingredients: input.ingredients.map((ingredient, index) => {
          const product = products.find((p) => p.id === ingredient.productId);
          const unitPrice = productPrices.get(ingredient.productId) ?? 0;
          return {
            id: `${genId('ing')}-${index}`,
            productId: ingredient.productId,
            productName: product?.name ?? ingredient.productId,
            unit: product?.unit ?? 'kg',
            gross: ingredient.gross,
            net: ingredient.net,
            unitPrice,
            total: round(unitPrice * ingredient.net, 2),
          };
        }),
        price: 0,
      };
      recipe.price = round(
        recipe.ingredients.reduce((sum, item) => sum + item.total, 0),
        2
      );
      recipes.push(recipe);
      return { id: recipe.id };
    }
    return fail('ttk: неподдерживаемый метод');
  }

  const id = rest[0];
  const target = recipes.find((r) => r.id === id);
  if (!target) return fail(`Карта ${id} не найдена`);

  if (method === 'GET') return { recipe: target };
  if (method === 'PATCH') {
    const input = body as RecipeRequest;
    target.name = input.name;
    target.collectionName = input.collectionName;
    target.yieldNet = input.yieldNet;
    target.yieldLoss = input.yieldLoss;
    target.technology = input.technology;
    target.protein = input.protein;
    target.fat = input.fat;
    target.carbs = input.carbs;
    target.kcal = input.kcal;
    target.ingredients = input.ingredients.map((ingredient, index) => {
      const product = products.find((p) => p.id === ingredient.productId);
      const unitPrice = productPrices.get(ingredient.productId) ?? 0;
      return {
        id: `${id}-ing-${index}`,
        productId: ingredient.productId,
        productName: product?.name ?? ingredient.productId,
        unit: product?.unit ?? 'kg',
        gross: ingredient.gross,
        net: ingredient.net,
        unitPrice,
        total: round(unitPrice * ingredient.net, 2),
      };
    });
    target.price = round(
      target.ingredients.reduce((sum, item) => sum + item.total, 0),
      2
    );
    return undefined;
  }
  if (method === 'DELETE') {
    recipes.splice(recipes.indexOf(target), 1);
    return undefined;
  }
  return fail(`ttk/${id}: неподдерживаемый метод`);
}

function staffResource(
  method: string,
  rest: string[],
  query: URLSearchParams,
  body: unknown
): unknown {
  if (rest.length === 0) {
    if (method === 'GET') {
      const search = (query.get('search') ?? '').trim().toLowerCase();
      const filtered = employees.filter((employee) =>
        `${employee.firstName} ${employee.lastName} ${employee.email}`
          .toLowerCase()
          .includes(search)
      );
      return { employees: filtered, total: filtered.length };
    }
    if (method === 'POST') {
      const input = body as CreateEmployeeRequest;
      const employee = {
        id: genId('emp'),
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        orgEmail: input.orgEmail,
        roleId: input.roleId,
        status: 'EMPLOYEE_STATUS_INVITED' as const,
        registeredAt: '0',
        createdAt: String(Date.now()),
      };
      employees.push(employee);
      return { employee };
    }
    return fail('staff: неподдерживаемый метод');
  }

  const id = rest[0];

  if (rest[1] === 'invitation' && method === 'POST') {
    const employee = findEmployee(id);
    if (!employee) return fail(`Сотрудник ${id} не найден`);
    employee.status = 'EMPLOYEE_STATUS_INVITED';
    return { employee };
  }

  const target = findEmployee(id);
  if (!target) return fail(`Сотрудник ${id} не найден`);

  if (method === 'GET') {
    return { employee: target, documents: documentsFor(target.id) };
  }
  if (method === 'PATCH') {
    const patch = body as UpdateEmployeeRequest;
    if (patch.firstName !== undefined) target.firstName = patch.firstName;
    if (patch.lastName !== undefined) target.lastName = patch.lastName;
    if (patch.email !== undefined) target.email = patch.email;
    if (patch.orgEmail !== undefined) target.orgEmail = patch.orgEmail;
    if (patch.roleId !== undefined) target.roleId = patch.roleId;
    return { employee: target, documents: patch.documents ?? documentsFor(target.id) };
  }
  if (method === 'DELETE') {
    employees.splice(employees.indexOf(target), 1);
    return {};
  }
  return fail(`staff/${id}: неподдерживаемый метод`);
}

function menuScheduleResource(
  method: string,
  rest: string[],
  query: URLSearchParams,
  body: unknown
): unknown {
  if (rest.length === 0) {
    if (method !== 'GET') return fail('menu-schedule: неподдерживаемый метод');
    const objectId = query.get('objectId') ?? '';
    const dietId = query.get('dietId') ?? '';
    const from = query.get('from') ?? '';
    const to = query.get('to') ?? '';
    const diet = findDiet(dietId) ?? diets[0];
    return { days: buildSchedule(objectId, diet?.id ?? dietId, from, to) };
  }

  if (rest[0] === 'slot' && method === 'PUT') {
    const input = body as UpdateSlotRequest;
    setScheduleSlot(input.objectId, input.dietId, input.date, input.mealId, input.recipeIds);
    return { day: buildScheduleDay(input.objectId, input.dietId, input.date) };
  }
  if (rest[0] === 'allow' && method === 'POST') {
    const input = body as { objectId: string; dietId: string; date: string };
    allowViolationForDay(input.objectId, input.dietId, input.date);
    return {};
  }
  if (rest[0] === 'fill' && method === 'POST') {
    const input = body as FillScheduleRequest;
    const menu = menus.find((m) => m.id === input.menuId);
    if (!menu) return fail(`Меню ${input.menuId} не найдено`);
    fillScheduleFromMenu(
      input.objectId,
      input.dietId,
      menu,
      input.from,
      input.to,
      input.keepThrough
    );
    return {};
  }
  return fail('menu-schedule: неизвестный ресурс');
}

function menusResource(method: string, body: unknown): unknown {
  if (method === 'GET') return { menus: [...menus] };
  if (method === 'POST') {
    const input = body as CreateMenuRequest;
    const from = new Date(`${input.from}T00:00:00`);
    const to = new Date(`${input.to}T00:00:00`);
    const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
    const menu = { id: genId('menu'), name: input.name, days };
    menus.unshift(menu);
    return { id: menu.id };
  }
  return fail('menus: неподдерживаемый метод');
}

function portionsResource(
  method: string,
  rest: string[],
  query: URLSearchParams,
  body: unknown
): unknown {
  if (rest.length === 0 && method === 'GET') {
    const date = query.get('date') ?? todayIso();
    return { date, entries: portionsFor(date) };
  }
  if (rest[0] === 'dishes' && method === 'GET') {
    const date = query.get('date') ?? todayIso();
    const objectId = query.get('objectId');
    const rows = dishDistributionFor(date, objectId);
    // Численность одной группы не зависит от блюда, поэтому в итог берём
    // каждую группу-диету один раз, а не сумму по всем строкам-блюдам.
    const seen = new Set<string>();
    let totalPortions = 0;
    for (const row of rows) {
      const key = `${row.objectName}|${row.subObjectName}|${row.departmentName}|${row.tableName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      totalPortions += row.portions;
    }
    return { date, rows, totalPortions };
  }
  if (rest[0] === 'headcount' && method === 'PATCH') {
    const input = body as UpdatePortionHeadcountRequest;
    setHeadcount(input.date, input.objectId, input.groupId, input.dietId, input.headcount);
    return { date: input.date, entries: portionsFor(input.date) };
  }
  if (rest[0] === 'copy' && method === 'POST') {
    const input = body as { from: string; to: string };
    copyPortionsDay(input.from, input.to);
    return { date: input.to, entries: portionsFor(input.to) };
  }
  return fail('portions: неизвестный ресурс');
}

function productsSpreadResource(
  method: string,
  rest: string[],
  query: URLSearchParams,
  body: unknown
): unknown {
  if (rest.length === 0 && method === 'GET') {
    const date = query.get('date') ?? todayIso();
    const objectId = query.get('objectId');
    const { items, confirmed } = productSpreadFor(date, objectId);
    return {
      date,
      objectId: objectId ?? undefined,
      items,
      confirmed,
    };
  }
  if (rest[0] === 'confirm' && method === 'POST') {
    const input = body as { date: string; objectId?: string };
    confirmSpread(input.date, input.objectId ?? null);
    return undefined;
  }
  return fail('products-spread: неизвестный ресурс');
}

function warehouseResource(
  method: string,
  rest: string[],
  query: URLSearchParams,
  body: unknown
): unknown {
  const resource = rest[0];

  if (resource === 'batches') {
    const objectId = query.get('objectId') ?? '';
    const batches = allBatches().filter((batch) => {
      const receipt = receipts.find((r) => r.id === batch.receiptId);
      return receipt?.objectId === objectId;
    });
    return { batches };
  }

  if (resource === 'receipts') {
    if (rest.length === 1) {
      if (method === 'GET') {
        const objectId = query.get('objectId') ?? '';
        const search = (query.get('search') ?? '').trim().toLowerCase();
        const list = receipts
          .filter((receipt) => receipt.objectId === objectId)
          .filter((receipt) => receipt.invoiceNumber.toLowerCase().includes(search))
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((receipt) => ({
            id: receipt.id,
            objectId: receipt.objectId,
            date: receipt.date,
            invoiceNumber: receipt.invoiceNumber,
            itemsCount: receipt.items.length,
            total: receipt.total,
          }));
        return { receipts: list, nextCursor: '' };
      }
      if (method === 'POST') {
        const input = body as ReceiptRequest;
        const id = nextReceiptId();
        const items = input.items.map((item, index) => buildReceiptItem(item, id, index));
        const receipt = {
          id,
          objectId: input.objectId,
          date: input.date,
          invoiceNumber: input.invoiceNumber,
          items,
          total: receiptTotal(items),
        };
        receipts.push(receipt);
        return { id };
      }
    }
    if (rest.length === 2) {
      const target = receipts.find((r) => r.id === rest[1]);
      if (!target) return fail(`Накладная ${rest[1]} не найдена`);
      if (method === 'GET') return { receipt: target };
      if (method === 'PATCH') {
        const input = body as ReceiptRequest;
        target.objectId = input.objectId;
        target.date = input.date;
        target.invoiceNumber = input.invoiceNumber;
        target.items = input.items.map((item, index) => buildReceiptItem(item, target.id, index));
        target.total = receiptTotal(target.items);
        return undefined;
      }
    }
    return fail('warehouse/receipts: неподдерживаемый метод');
  }

  if (resource === 'write-offs') {
    if (rest.length === 1) {
      if (method === 'GET') {
        const objectId = query.get('objectId') ?? '';
        const kind = query.get('kind');
        const search = (query.get('search') ?? '').trim().toLowerCase();
        const list = writeOffs
          .filter((writeOff) => writeOff.objectId === objectId)
          .filter((writeOff) => !kind || writeOff.kind === kind)
          .filter((writeOff) => writeOff.reason.toLowerCase().includes(search))
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((writeOff) => ({
            id: writeOff.id,
            objectId: writeOff.objectId,
            date: writeOff.date,
            reason: writeOff.reason,
            itemsCount: writeOff.items.length,
            total: writeOff.total,
            kind: writeOff.kind,
          }));
        return { writeOffs: list, nextCursor: '' };
      }
      if (method === 'POST') {
        const input = body as WriteOffRequest;
        const id = nextWriteOffId();
        const items = input.items.map((item, index) => {
          const batch = allBatches().find((b) => b.id === item.batchId);
          return {
            id: `${id}-item-${index}`,
            batchId: item.batchId,
            receiptId: batch?.receiptId ?? '',
            invoiceNumber: batch?.invoiceNumber ?? '',
            productId: batch?.productId ?? '',
            productName: batch?.productName ?? '—',
            unit: batch?.unit ?? 'kg',
            unitPrice: batch?.unitPrice ?? 0,
            quantity: item.quantity,
            total: round((batch?.unitPrice ?? 0) * item.quantity, 2),
          };
        });
        writeOffs.push({
          id,
          objectId: input.objectId,
          date: input.date,
          reason: input.reason,
          items,
          total: round(
            items.reduce((sum, item) => sum + item.total, 0),
            2
          ),
          kind: 'manual',
        });
        return { id };
      }
    }
    if (rest.length === 2) {
      const target = writeOffs.find((w) => w.id === rest[1]);
      if (!target) return fail(`Списание ${rest[1]} не найдено`);
      if (method === 'GET') return { writeOff: target };
      if (method === 'PATCH') {
        const input = body as WriteOffRequest;
        target.date = input.date;
        target.reason = input.reason;
        const items = input.items.map((item, index) => {
          const batch = allBatches().find((b) => b.id === item.batchId);
          return {
            id: `${target.id}-item-${index}`,
            batchId: item.batchId,
            receiptId: batch?.receiptId ?? '',
            invoiceNumber: batch?.invoiceNumber ?? '',
            productId: batch?.productId ?? '',
            productName: batch?.productName ?? '—',
            unit: batch?.unit ?? 'kg',
            unitPrice: batch?.unitPrice ?? 0,
            quantity: item.quantity,
            total: round((batch?.unitPrice ?? 0) * item.quantity, 2),
          };
        });
        target.items = items;
        target.total = round(
          items.reduce((sum, item) => sum + item.total, 0),
          2
        );
        return undefined;
      }
    }
    return fail('warehouse/write-offs: неподдерживаемый метод');
  }

  if (resource === 'transfers') {
    if (rest.length === 1) {
      if (method === 'GET') {
        const search = (query.get('search') ?? '').trim().toLowerCase();
        const list = transfers
          .filter(
            (transfer) =>
              !search ||
              `${transfer.fromObjectId} ${transfer.toObjectId}`.toLowerCase().includes(search) ||
              (findObject(transfer.fromObjectId)?.name ?? '').toLowerCase().includes(search) ||
              (findObject(transfer.toObjectId)?.name ?? '').toLowerCase().includes(search)
          )
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((transfer) => ({
            id: transfer.id,
            fromObjectId: transfer.fromObjectId,
            toObjectId: transfer.toObjectId,
            date: transfer.date,
            itemsCount: transfer.items.length,
          }));
        return { transfers: list, nextCursor: '' };
      }
      if (method === 'POST') {
        const input = body as TransferRequest;
        const id = nextTransferId();
        const items = input.items.map((item, index) => {
          const batch = allBatches().find((b) => b.id === item.batchId);
          return {
            id: `${id}-item-${index}`,
            batchId: item.batchId,
            receiptId: batch?.receiptId ?? '',
            invoiceNumber: batch?.invoiceNumber ?? '',
            productId: batch?.productId ?? '',
            productName: batch?.productName ?? '—',
            unit: batch?.unit ?? 'kg',
            quantity: item.quantity,
          };
        });
        transfers.push({
          id,
          fromObjectId: input.fromObjectId,
          toObjectId: input.toObjectId,
          date: input.date,
          items,
        });
        return { id };
      }
    }
    if (rest.length === 2) {
      const target = transfers.find((t) => t.id === rest[1]);
      if (!target) return fail(`Перемещение ${rest[1]} не найдено`);
      if (method === 'GET') return { transfer: target };
      if (method === 'PATCH') {
        const input = body as TransferRequest;
        target.fromObjectId = input.fromObjectId;
        target.toObjectId = input.toObjectId;
        target.date = input.date;
        target.items = input.items.map((item, index) => {
          const batch = allBatches().find((b) => b.id === item.batchId);
          return {
            id: `${target.id}-item-${index}`,
            batchId: item.batchId,
            receiptId: batch?.receiptId ?? '',
            invoiceNumber: batch?.invoiceNumber ?? '',
            productId: batch?.productId ?? '',
            productName: batch?.productName ?? '—',
            unit: batch?.unit ?? 'kg',
            quantity: item.quantity,
          };
        });
        return undefined;
      }
    }
    return fail('warehouse/transfers: неподдерживаемый метод');
  }

  return fail(`warehouse/${resource}: неизвестный ресурс`);
}

function adminResource(method: string, rest: string[], body: unknown): unknown {
  if (rest[0] === 'organization-roles' && method === 'GET') {
    return { roles: organizationRoles, total: organizationRoles.length };
  }

  if (rest[0] !== 'organizations') return fail(`admin/${rest[0]}: неизвестный ресурс`);

  if (rest.length === 1) {
    if (method === 'GET') return { organizations: [...organizations], total: organizations.length };
    if (method === 'POST') {
      const input = body as CreateOrganizationRequest;
      const organization: Organization = {
        id: genId('org'),
        name: input.name,
        description: '',
        memberCount: 1,
        disabled: false,
        createdAt: String(Date.now()),
      };
      organizations.push(organization);
      const invitation: Invitation = {
        id: genId('inv'),
        invitee: input.adminEmail,
        status: 'INVITATION_STATUS_PENDING',
        createdAt: String(Date.now()),
        expiresAt: String(Date.now() + 86400000 * 7),
        roles: organizationRoles.filter((role) =>
          (input.adminRoleIds ?? ['orole-admin']).includes(role.id)
        ),
      };
      organizationInvitations.set(organization.id, [invitation]);
      organizationMembers.set(organization.id, []);
      return { organization, invitation };
    }
    return fail('admin/organizations: неподдерживаемый метод');
  }

  const id = rest[1];
  const organization = organizations.find((o) => o.id === id);
  if (!organization) return fail(`Организация ${id} не найдена`);

  if (rest.length === 2) {
    if (method === 'DELETE') {
      organizations.splice(organizations.indexOf(organization), 1);
      organizationMembers.delete(id);
      organizationInvitations.delete(id);
      return {};
    }
    return fail(`admin/organizations/${id}: неподдерживаемый метод`);
  }

  const sub = rest[2];

  if (sub === 'disabled' && method === 'PATCH') {
    organization.disabled = Boolean((body as { disabled: boolean }).disabled);
    return { organization };
  }

  if (sub === 'members') {
    const members = organizationMembers.get(id) ?? [];
    if (rest.length === 3) {
      if (method === 'GET') return { members, total: members.length };
    }
    if (rest.length === 4 && method === 'DELETE') {
      const userId = rest[3];
      const next = members.filter((member) => member.userId !== userId);
      organizationMembers.set(id, next);
      return {};
    }
  }

  if (sub === 'invitations') {
    const invitations = organizationInvitations.get(id) ?? [];
    if (rest.length === 3) {
      if (method === 'GET') return { invitations, total: invitations.length };
      if (method === 'POST') {
        const input = body as { email: string; roleIds: string[] };
        const invitation: Invitation = {
          id: genId('inv'),
          invitee: input.email,
          status: 'INVITATION_STATUS_PENDING',
          createdAt: String(Date.now()),
          expiresAt: String(Date.now() + 86400000 * 7),
          roles: organizationRoles.filter((role) => input.roleIds.includes(role.id)),
        };
        organizationInvitations.set(id, [invitation, ...invitations]);
        return { invitation };
      }
    }
    if (rest.length === 4 && method === 'DELETE') {
      const invitationId = rest[3];
      const removed = invitations.find((invitation) => invitation.id === invitationId);
      organizationInvitations.set(
        id,
        invitations.filter((invitation) => invitation.id !== invitationId)
      );
      return { invitation: removed ?? invitations[0] };
    }
  }

  return fail(`admin/organizations/${id}/${sub}: неизвестный ресурс`);
}

/* ───────────────────────── диспетчер ───────────────────────── */

export async function mockApiFetch<T>(path: string, options: MockRequestOptions = {}): Promise<T> {
  await delay();

  const [pathname, search] = path.split('?');
  const query = new URLSearchParams(search ?? '');
  const method = (options.method ?? 'GET').toUpperCase();
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/');
  const body = options.body;

  if (segments[0] !== 'v1') return fail(`Мок не знает путь ${path}`) as T;

  const [, resource, ...rest] = segments;

  switch (resource) {
    case 'products':
      return productsResource(method, rest, query, body) as T;
    case 'objects':
      return objectsResource(method, rest, body) as T;
    case 'diets':
      return dietsResource(method, rest, body) as T;
    case 'ttk':
      return ttkResource(method, rest, body) as T;
    case 'staff':
      return staffResource(method, rest, query, body) as T;
    case 'staff-roles':
      return { roles: staffRoles } as T;
    case 'menu-schedule':
      return menuScheduleResource(method, rest, query, body) as T;
    case 'menus':
      return menusResource(method, body) as T;
    case 'portions':
      return portionsResource(method, rest, query, body) as T;
    case 'products-spread':
      return productsSpreadResource(method, rest, query, body) as T;
    case 'accounts':
      return { accounts: buildAccounts() } as T;
    case 'warehouse':
      return warehouseResource(method, rest, query, body) as T;
    case 'admin':
      return adminResource(method, rest, body) as T;
    default:
      return fail(`Мок не знает ресурс /v1/${resource}`) as T;
  }
}
