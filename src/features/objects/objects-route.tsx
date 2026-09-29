import { useMemo, useState } from 'react';
import { Button, Card, Flex, Icon, Select, Table, Text } from '@gravity-ui/uikit';
import { House, Layers, Pencil, Plus } from '@gravity-ui/icons';
import { useOrganizations } from '@/shared/auth';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  NoOrganizationSelectedState,
} from '@/shared/ui/states';
import { useCateringObjects } from './api';
import { ObjectDrawer, SubObjectDrawer } from './objects-dialog';
import { type CateringObject, type FacilityType, type SubObject } from './types';
import './objects-route.css';

const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  school: 'Школа',
  kindergarten: 'Детский сад',
  hospital: 'Больница',
};

function groupRowClassNames(row: {
  isLastInDepartment: boolean;
  showDepartment: boolean;
  isLastInSubObject: boolean;
}): string[] {
  const classes: string[] = ['objects-group-row_no-divider'];
  // Первая строка отделения — больше отступ сверху.
  if (row.showDepartment) classes.push('objects-group-row_department-start');
  if (row.isLastInDepartment) {
    classes.push('objects-group-row_divider');
    // Между отделениями линия начинается от «Группа / класс»; между
    // подобъектами — на всю ширину (без модификатора «отделение»).
    if (!row.isLastInSubObject) classes.push('objects-group-row_department-divider');
  }
  return classes;
}

/** Строки таблицы отделений одного подобъекта. */
function departmentRows(subObject: SubObject): Array<{
  id: string;
  departmentId: string;
  departmentName: string;
  tableName: string;
  showDepartment: boolean;
  isLastInDepartment: boolean;
}> {
  const result: Array<{
    id: string;
    departmentId: string;
    departmentName: string;
    tableName: string;
    showDepartment: boolean;
    isLastInDepartment: boolean;
  }> = [];
  for (const department of subObject.departments) {
    for (const table of department.tables) {
      const prevRow = result[result.length - 1];
      const showDepartment = !prevRow || prevRow.departmentId !== department.id;
      result.push({
        id: table.id,
        departmentId: department.id,
        departmentName: department.name,
        tableName: table.name,
        showDepartment,
        isLastInDepartment: false,
      });
    }
  }
  for (let i = result.length - 1; i >= 0; i--) {
    result[i].isLastInDepartment =
      !result[i + 1] || result[i + 1].departmentId !== result[i].departmentId;
  }
  return result;
}

/**
 * «Объекты»: справочник объект → подобъект → отделения → столы.
 * Численность на дату — в «Порционнике».
 * У объекта своё меню; у подобъекта — меню объекта либо собственное.
 */
export function ObjectsRoute() {
  const { current } = useOrganizations();
  const objects = useCateringObjects();
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  if (current === null) {
    return (
      <Flex direction="column" style={{ padding: 16 }}>
        <NoOrganizationSelectedState />
      </Flex>
    );
  }

  if (objects.isPending) {
    return (
      <Flex direction="column" style={{ padding: 16 }}>
        <LoadingState />
      </Flex>
    );
  }

  if (objects.isError || !objects.data) {
    return (
      <Flex direction="column" style={{ padding: 16 }}>
        <ErrorState error={objects.error} onRetry={() => void objects.refetch()} />
      </Flex>
    );
  }

  const objectList = objects.data.objects;
  const activeObjectId =
    selectedObjectId && objectList.some((o) => o.id === selectedObjectId)
      ? selectedObjectId
      : (objectList[0]?.id ?? null);
  const subObjects = activeObjectId
    ? (objectList.find((o) => o.id === activeObjectId)?.subObjects ?? [])
    : objectList.flatMap((o) => o.subObjects);

  return (
    <Flex direction="column" gap={3} style={{ padding: 16 }}>
      <SubObjectsCard
        objects={objectList}
        subObjects={subObjects}
        selectedObjectId={activeObjectId}
        onSelectObject={setSelectedObjectId}
      />
    </Flex>
  );
}

/** Секция одного подобъекта: шапка (название + тип) и таблица отделений. */
function SubObjectSection({ subObject, onEdit }: { subObject: SubObject; onEdit: () => void }) {
  const rows = useMemo(() => departmentRows(subObject), [subObject]);

  return (
    <Card view="filled" style={{ padding: 0 }}>
      <Flex
        alignItems="center"
        justifyContent="space-between"
        gap={2}
        style={{ padding: '12px 16px' }}
      >
        <Flex alignItems="center" gap={2}>
          <Icon data={Layers} size={16} />
          <Text variant="body-1" color="secondary">
            Подобъект:
          </Text>
          <Text variant="subheader-2">{subObject.name}</Text>
          <Text variant="body-1" color="secondary">
            {FACILITY_TYPE_LABELS[subObject.type]}
          </Text>
        </Flex>
        <Button view="normal" size="m" onClick={onEdit}>
          <Icon data={Pencil} size={16} />
          Редактировать
        </Button>
      </Flex>
      <div
        style={{
          borderTop: '1px solid var(--g-color-line-generic)',
          paddingTop: 4,
          paddingBottom: 8,
        }}
      >
        {rows.length === 0 ? (
          <EmptyState text="В подобъекте нет групп/классов" />
        ) : (
          <div className="admin-table-wrap">
            <Table
              width="max"
              className="admin-table objects-group-table objects-facility-tables"
              data={rows}
              getRowClassNames={(row) =>
                groupRowClassNames({
                  isLastInDepartment: row.isLastInDepartment,
                  showDepartment: row.showDepartment,
                  isLastInSubObject: true,
                })
              }
              columns={[
                {
                  id: 'departmentName',
                  name: 'Группа / класс',
                  width: '60%',
                  template: (row) => (row.showDepartment ? row.departmentName : null),
                  placeholder: () => null,
                },
                {
                  id: 'tableName',
                  name: 'Рацион',
                  width: '40%',
                },
              ]}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

function SubObjectsCard({
  objects,
  subObjects,
  selectedObjectId,
  onSelectObject,
}: {
  objects: CateringObject[];
  subObjects: SubObject[];
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [addingSubObject, setAddingSubObject] = useState(false);
  const [editingSubObjectId, setEditingSubObjectId] = useState<string | null>(null);

  const selectedObject = objects.find((o) => o.id === selectedObjectId) ?? objects[0] ?? null;
  const editingSubObject =
    selectedObject?.subObjects.find((s) => s.id === editingSubObjectId) ?? null;

  /** Строки первой таблицы: группы/классы самого объекта. */
  const objectRows = useMemo(() => {
    const result: Array<{
      id: string;
      departmentId: string;
      departmentName: string;
      tableName: string;
      showDepartment: boolean;
      isLastInDepartment: boolean;
    }> = [];
    for (const department of selectedObject?.departments ?? []) {
      for (const table of department.tables) {
        const prevRow = result[result.length - 1];
        const showDepartment = !prevRow || prevRow.departmentId !== department.id;
        result.push({
          id: table.id,
          departmentId: department.id,
          departmentName: department.name,
          tableName: table.name,
          showDepartment,
          isLastInDepartment: false,
        });
      }
    }
    for (let i = result.length - 1; i >= 0; i--) {
      result[i].isLastInDepartment =
        !result[i + 1] || result[i + 1].departmentId !== result[i].departmentId;
    }
    return result;
  }, [selectedObject]);

  return (
    <>
      <Flex alignItems="center" justifyContent="space-between" gap={2}>
        {objects.length > 0 && (
          <Select
            size="l"
            width={360}
            label="Объект:"
            value={selectedObjectId ? [selectedObjectId] : []}
            onUpdate={(value) => onSelectObject(value[0] ?? null)}
            placeholder="Все объекты"
            options={objects.map((obj) => ({
              value: obj.id,
              content: obj.name,
            }))}
          />
        )}
        <Button view="normal-contrast" size="l" onClick={() => setCreating(true)}>
          <Icon data={Plus} size={16} />
          Добавить объект
        </Button>
      </Flex>

      <Card view="filled" style={{ padding: 0 }}>
        <Flex
          alignItems="center"
          justifyContent="space-between"
          gap={2}
          style={{ padding: '12px 16px' }}
        >
          <Flex alignItems="center" gap={2}>
            <Icon data={House} size={16} />
            <Text variant="subheader-2">{selectedObject ? selectedObject.name : 'Объект'}</Text>
            {selectedObject && (
              <Text variant="body-1" color="secondary">
                {FACILITY_TYPE_LABELS[selectedObject.type]}
              </Text>
            )}
          </Flex>
          {objects.length > 0 && (
            <Button
              view="normal"
              size="m"
              disabled={selectedObject === null}
              onClick={() => setEditing(true)}
            >
              <Icon data={Pencil} size={16} />
              Редактировать
            </Button>
          )}
        </Flex>

        <div
          style={{
            borderTop: '1px solid var(--g-color-line-generic)',
            paddingTop: 4,
            paddingBottom: 8,
          }}
        >
          {objectRows.length === 0 ? (
            <EmptyState text="У объекта пока нет групп/классов" />
          ) : (
            <div className="admin-table-wrap">
              <Table
                width="max"
                className="admin-table objects-group-table objects-facility-tables"
                data={objectRows}
                getRowClassNames={(row) =>
                  groupRowClassNames({
                    isLastInDepartment: row.isLastInDepartment,
                    showDepartment: row.showDepartment,
                    // У таблицы групп самого объекта колонка «Группа / класс»
                    // стоит первой, поэтому разделители на всю ширину.
                    isLastInSubObject: true,
                  })
                }
                columns={[
                  {
                    id: 'departmentName',
                    name: 'Группа / класс',
                    width: '60%',
                    template: (row) => (row.showDepartment ? row.departmentName : null),
                    placeholder: () => null,
                  },
                  {
                    id: 'tableName',
                    name: 'Рацион',
                    width: '40%',
                  },
                ]}
              />
            </div>
          )}
        </div>
      </Card>

      <Button
        view="normal-contrast"
        size="l"
        disabled={selectedObject === null}
        onClick={() => setAddingSubObject(true)}
        style={{ alignSelf: 'flex-start' }}
      >
        <Icon data={Plus} size={16} />
        Добавить подобъект
      </Button>

      {subObjects.length === 0 ? (
        <Card view="filled" style={{ padding: '12px 16px' }}>
          <EmptyState text="Подобъекты пока не добавлены" />
        </Card>
      ) : (
        subObjects.map((subObject) => (
          <SubObjectSection
            key={subObject.id}
            subObject={subObject}
            onEdit={() => setEditingSubObjectId(subObject.id)}
          />
        ))
      )}

      <ObjectDrawer
        object={editing ? selectedObject : null}
        mode={creating ? 'create' : 'edit'}
        onClose={() => {
          setEditing(false);
          setCreating(false);
        }}
      />
      <SubObjectDrawer
        object={editingSubObject ? selectedObject : addingSubObject ? selectedObject : null}
        subObject={editingSubObject}
        onClose={() => {
          setAddingSubObject(false);
          setEditingSubObjectId(null);
        }}
      />
    </>
  );
}
