type DemoUserType = 'patient' | 'provider';

type DemoTables = {
  users: Array<{ id: number; name: string; usertype: DemoUserType }>;
  waitingrooms: Array<{ id: number; patientid: number; createdat: string }>;
  chatrooms: Array<{ id: number; providerid: number; patientid: number; isactive: boolean; createdat: string; endedat: string | null }>;
  messages: Array<{ id: number; senderid: number; content: string; chatroomid: number; sentat: string }>;
};

type FilterOperator = 'eq' | 'in';

type Filter = {
  field: string;
  operator: FilterOperator;
  value: unknown;
};

type OrderBy = {
  field: string;
  ascending: boolean;
};

type ChannelCallback = (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => void;

type ChannelSubscription = {
  event: string;
  schema: string;
  table: keyof DemoTables;
  filter?: string;
  callback: ChannelCallback;
};

type StoredState = {
  tables: DemoTables;
  counters: {
    waitingrooms: number;
    chatrooms: number;
    messages: number;
  };
};

const STORAGE_KEY = 'teleconsult-demo-db-v1';

const initialState: StoredState = {
  tables: {
    users: [
      { id: 1, name: 'Dr. Sarah Wilson', usertype: 'provider' },
      { id: 2, name: 'John Patient', usertype: 'patient' },
    ],
    waitingrooms: [],
    chatrooms: [],
    messages: [],
  },
  counters: {
    waitingrooms: 0,
    chatrooms: 0,
    messages: 0,
  },
};

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const toNumberIfNumeric = (value: unknown) => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }

  return value;
};

const valuesEqual = (left: unknown, right: unknown) => toNumberIfNumeric(left) === toNumberIfNumeric(right);

const parseChannelFilter = (filter?: string) => {
  if (!filter) {
    return null;
  }

  const match = filter.match(/^([a-zA-Z0-9_]+)=eq\.(.+)$/);
  if (!match) {
    return null;
  }

  const [, field, rawValue] = match;
  return { field, value: toNumberIfNumeric(rawValue) };
};

const getState = (): StoredState => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
    return deepClone(initialState);
  }

  try {
    const parsed = JSON.parse(raw) as StoredState;
    if (!parsed?.tables || !parsed?.counters) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
      return deepClone(initialState);
    }
    return parsed;
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
    return deepClone(initialState);
  }
};

const saveState = (state: StoredState) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

class DemoChannel {
  public readonly name: string;

  private readonly subscriptions: ChannelSubscription[] = [];

  constructor(name: string) {
    this.name = name;
  }

  on(
    _eventType: 'postgres_changes',
    config: { event: string; schema: string; table: keyof DemoTables; filter?: string },
    callback: ChannelCallback,
  ) {
    this.subscriptions.push({
      event: config.event,
      schema: config.schema,
      table: config.table,
      filter: config.filter,
      callback,
    });

    return this;
  }

  subscribe() {
    return this;
  }

  _emit(change: { event: string; table: keyof DemoTables; row?: Record<string, unknown>; oldRow?: Record<string, unknown> }) {
    this.subscriptions.forEach((subscription) => {
      if (subscription.schema !== 'public') {
        return;
      }
      if (subscription.table !== change.table) {
        return;
      }
      if (subscription.event !== '*' && subscription.event !== change.event) {
        return;
      }

      const parsedFilter = parseChannelFilter(subscription.filter);
      if (parsedFilter && change.row) {
        const rowValue = (change.row as Record<string, unknown>)[parsedFilter.field];
        if (!valuesEqual(rowValue, parsedFilter.value)) {
          return;
        }
      }

      subscription.callback({ new: change.row, old: change.oldRow });
    });
  }
}

class QueryBuilder<TTable extends keyof DemoTables> {
  private readonly table: TTable;

  private readonly client: DemoSupabaseClient;

  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';

  private selectColumns: string | null = '*';

  private filters: Filter[] = [];

  private orderBy: OrderBy | null = null;

  private limitValue: number | null = null;

  private singleRow = false;

  private insertRows: Array<Record<string, unknown>> = [];

  private updatePatch: Record<string, unknown> = {};

  constructor(client: DemoSupabaseClient, table: TTable) {
    this.client = client;
    this.table = table;
  }

  select(columns = '*') {
    this.action = 'select';
    this.selectColumns = columns;
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters.push({ field, operator: 'eq', value });
    return this;
  }

  in(field: string, values: unknown[]) {
    this.filters.push({ field, operator: 'in', value: values });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderBy = { field, ascending: options?.ascending ?? true };
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  single() {
    this.singleRow = true;
    return this;
  }

  insert(rows: Array<Record<string, unknown>>) {
    this.action = 'insert';
    this.insertRows = rows;
    return this;
  }

  update(patch: Record<string, unknown>) {
    this.action = 'update';
    this.updatePatch = patch;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  match(values: Record<string, unknown>) {
    Object.entries(values).forEach(([field, value]) => {
      this.eq(field, value);
    });
    return this;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute() {
    try {
      if (this.action === 'select') {
        return this.executeSelect();
      }
      if (this.action === 'insert') {
        return this.executeInsert();
      }
      if (this.action === 'update') {
        return this.executeUpdate();
      }
      return this.executeDelete();
    } catch (error: any) {
      return { data: null, error: { message: error?.message ?? 'Demo database error.' } };
    }
  }

  private applyFilters(rows: Array<Record<string, unknown>>) {
    return rows.filter((row) => this.filters.every((filter) => {
      const rowValue = row[filter.field];
      if (filter.operator === 'eq') {
        return valuesEqual(rowValue, filter.value);
      }

      const list = Array.isArray(filter.value) ? filter.value : [];
      return list.some((entry) => valuesEqual(entry, rowValue));
    }));
  }

  private pickColumns(rows: Array<Record<string, unknown>>) {
    if (!this.selectColumns || this.selectColumns.trim() === '*' || this.selectColumns.trim() === '') {
      return rows;
    }

    const columns = this.selectColumns.split(',').map((column) => column.trim());
    return rows.map((row) => {
      const output: Record<string, unknown> = {};
      columns.forEach((column) => {
        if (column in row) {
          output[column] = row[column];
        }
      });
      return output;
    });
  }

  private executeSelect() {
    const state = getState();
    const baseRows = deepClone(state.tables[this.table]) as Array<Record<string, unknown>>;
    let rows = this.applyFilters(baseRows);

    if (this.orderBy) {
      rows = rows.sort((left, right) => {
        const leftValue = left[this.orderBy!.field];
        const rightValue = right[this.orderBy!.field];

        if (leftValue === rightValue) {
          return 0;
        }

        const sorted = String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true });
        return this.orderBy!.ascending ? sorted : -sorted;
      });
    }

    if (typeof this.limitValue === 'number') {
      rows = rows.slice(0, this.limitValue);
    }

    rows = this.pickColumns(rows);

    if (this.singleRow) {
      if (rows.length === 0) {
        return { data: null, error: { message: 'No rows found.' } };
      }
      return { data: rows[0], error: null };
    }

    return { data: rows, error: null };
  }

  private executeInsert() {
    const state = getState();
    const now = new Date().toISOString();
    const rowsToInsert = this.insertRows.map((row) => {
      if (this.table === 'waitingrooms') {
        state.counters.waitingrooms += 1;
        return {
          id: state.counters.waitingrooms,
          patientid: Number(row.patientid),
          createdat: (row.createdat as string) ?? now,
        };
      }

      if (this.table === 'chatrooms') {
        state.counters.chatrooms += 1;
        return {
          id: state.counters.chatrooms,
          providerid: Number(row.providerid),
          patientid: Number(row.patientid),
          isactive: row.isactive ?? true,
          createdat: (row.createdat as string) ?? now,
          endedat: (row.endedat as string | null) ?? null,
        };
      }

      if (this.table === 'messages') {
        state.counters.messages += 1;
        return {
          id: state.counters.messages,
          senderid: Number(row.senderid),
          content: String(row.content ?? ''),
          chatroomid: Number(row.chatroomid),
          sentat: (row.sentat as string) ?? now,
        };
      }

      return row;
    });

    const tableRows = state.tables[this.table] as Array<Record<string, unknown>>;
    tableRows.push(...(rowsToInsert as any[]));
    saveState(state);

    rowsToInsert.forEach((row) => {
      this.client.emit({ event: 'INSERT', table: this.table, row: row as Record<string, unknown> });
    });

    const outputRows = this.pickColumns(deepClone(rowsToInsert as Array<Record<string, unknown>>));

    if (this.singleRow) {
      return { data: outputRows[0] ?? null, error: null };
    }

    return { data: outputRows, error: null };
  }

  private executeUpdate() {
    const state = getState();
    const tableRows = state.tables[this.table] as Array<Record<string, unknown>>;

    const updatedRows: Array<Record<string, unknown>> = [];

    for (let index = 0; index < tableRows.length; index += 1) {
      const row = tableRows[index];
      const matches = this.filters.every((filter) => {
        const rowValue = row[filter.field];
        if (filter.operator === 'eq') {
          return valuesEqual(rowValue, filter.value);
        }

        const list = Array.isArray(filter.value) ? filter.value : [];
        return list.some((entry) => valuesEqual(entry, rowValue));
      });

      if (!matches) {
        continue;
      }

      const oldRow = deepClone(row);
      const merged = { ...row, ...this.updatePatch };
      tableRows[index] = merged;
      updatedRows.push(merged);
      this.client.emit({ event: 'UPDATE', table: this.table, row: deepClone(merged), oldRow });
    }

    saveState(state);

    const outputRows = this.pickColumns(deepClone(updatedRows));

    if (this.singleRow) {
      return { data: outputRows[0] ?? null, error: null };
    }

    return { data: outputRows, error: null };
  }

  private executeDelete() {
    const state = getState();
    const tableRows = state.tables[this.table] as Array<Record<string, unknown>>;
    const keptRows: Array<Record<string, unknown>> = [];
    const deletedRows: Array<Record<string, unknown>> = [];

    tableRows.forEach((row) => {
      const matches = this.filters.every((filter) => {
        const rowValue = row[filter.field];
        if (filter.operator === 'eq') {
          return valuesEqual(rowValue, filter.value);
        }

        const list = Array.isArray(filter.value) ? filter.value : [];
        return list.some((entry) => valuesEqual(entry, rowValue));
      });

      if (matches) {
        deletedRows.push(row);
      } else {
        keptRows.push(row);
      }
    });

    state.tables[this.table] = keptRows as DemoTables[TTable];
    saveState(state);

    deletedRows.forEach((row) => {
      this.client.emit({ event: 'DELETE', table: this.table, oldRow: deepClone(row) });
    });

    if (this.singleRow) {
      return { data: deletedRows[0] ?? null, error: null };
    }

    return { data: deepClone(deletedRows), error: null };
  }
}

class DemoSupabaseClient {
  private channels = new Set<DemoChannel>();

  constructor() {
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      // Cross-tab changes are forwarded as wildcard updates.
      this.emit({ event: '*', table: 'waitingrooms' });
      this.emit({ event: '*', table: 'chatrooms' });
      this.emit({ event: '*', table: 'messages' });
    });
  }

  from<TTable extends keyof DemoTables>(table: TTable) {
    return new QueryBuilder(this, table);
  }

  channel(name: string) {
    const channel = new DemoChannel(name);
    this.channels.add(channel);
    return channel;
  }

  async removeChannel(channel: DemoChannel) {
    this.channels.delete(channel);
    return { data: null, error: null };
  }

  emit(change: { event: string; table: keyof DemoTables; row?: Record<string, unknown>; oldRow?: Record<string, unknown> }) {
    this.channels.forEach((channel) => channel._emit(change));
  }
}

export const createDemoClient = () => new DemoSupabaseClient();
