import { ClientBase } from 'pg';
import format from 'pg-format';

export type ColumnInfo = {
    column_name: string;
    data_type: string;
    is_nullable: string;
    udt_name?: string;
    column_default?: string;
    is_generated?: 'ALWAYS' | 'NEVER';
    identity_generation?: 'ALWAYS' | 'NEVER';
};

export type QueryValue = string | number | string[];
export type QueryValues = QueryValue[];
export type QueryWithValues = { query: string; values?: QueryValues };

export async function columnFeatureSupport(
    db: ClientBase
): Promise<{ identity_generation: boolean; is_generated: boolean }> {
    const result = await db.query(
        `SELECT EXISTS (
			SELECT 1 FROM information_schema.columns WHERE table_name = 'columns' AND table_schema = 'information_schema' AND column_name = 'is_generated'
		) as is_generated,
		EXISTS (
			SELECT 1 FROM information_schema.columns WHERE table_name = 'columns' AND table_schema = 'information_schema' AND column_name = 'identity_generation'
		) as identity_generation;`
    );

    return result.rows[0];
}

export async function getTableSchema(
    db: ClientBase,
    schema: string,
    table: string
): Promise<ColumnInfo[]> {
    const select = ['column_name', 'data_type', 'is_nullable', 'udt_name', 'column_default'];

    const supported = await columnFeatureSupport(db);

    if (supported.identity_generation) {
        select.push('identity_generation');
    }

    if (supported.is_generated) {
        select.push('is_generated');
    }

    const selectString = select.join(', ');
    const result = await db.query(
        `SELECT ${selectString} FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2`,
        [schema, table]
    );

    return result.rows;
}

export function checkItemAgainstSchema(
    item: any,
    columnsInfo: ColumnInfo[],
    index: number
) {
    if (columnsInfo.length === 0) {
        return item;
    }

    const schema = columnsInfo.reduce((acc, { column_name, data_type, is_nullable }) => {
        acc[column_name] = { type: data_type.toUpperCase(), nullable: is_nullable === 'YES' };
        return acc;
    }, {} as any);

    for (const key of Object.keys(item)) {
        if (schema[key] === undefined) {
            throw new Error(`Column '${key}' does not exist in selected table - ${JSON.stringify({
                itemIndex: index
            })}`);
        }
        if (item[key] === null && !(schema[key] as any)?.nullable) {
            throw new Error(`Column '${key}' is not nullable -  ${JSON.stringify({
                itemIndex: index
            })}`);
        }
    }

    return item;
}

export function upsertOne(
    item: any,
    index: number,
    schema: string,
    table: string,
    tableSchema: ColumnInfo[],
    columnsToMatchOn: string[]
): QueryWithValues {
    let values: QueryValues = [];

    item = checkItemAgainstSchema(item, tableSchema, index);

    let valuesLength = values.length + 1;
    const conflictColumns: string[] = [];

    columnsToMatchOn.forEach((column) => {
        conflictColumns.push(format('%I', column));
    });
    const onConflict = ` ON CONFLICT (${conflictColumns.join(',')}) DO UPDATE `;

    const allKeys = Object.keys(item);
    const updateColumns = allKeys.filter((column) => !columnsToMatchOn.includes(column));
    const updates: string[] = [];

    const columnsString = allKeys.map(i => format('%I', i)).join(', ');
    const allValues = allKeys.map(key => {
        const val = item[key];

        if (val === undefined) {
            return null;
        }
        return val;
    });
    const valuesString = allValues.map((_, key) => `$${valuesLength + key}`).join(', ');

    const insertQuery = format(
        `
                INSERT INTO %I.%I(${columnsString}) 
                VALUES(${valuesString})${onConflict}`,
        schema, table
    );
    valuesLength = valuesLength + allValues.length - 1;
    values.push(...allValues);


    for (const column of updateColumns) {
        updates.push(format(
            `%I = $${valuesLength + 1}`,
            column
        ));

        let value = item[column];
        if (value === null || value === undefined) {
            value = null;
        } else {
            value = format('%s', item[column]);
        }

        values.push(value);
        valuesLength = valuesLength + 1;
    }

    let query = `${insertQuery} SET ${updates.join(', ')}`.trim();

    return { query, values } as QueryWithValues;
}
