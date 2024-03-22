import { describe, expect } from '@jest/globals';
import * as pg from 'pg';
import { checkItemAgainstSchema, columnFeatureSupport, ColumnInfo, getTableSchema, upsertOne } from '../src/pgutils';

const row = { is_generated: true, identity_generation: true };
describe('pgutils.ts', () => {
    it('/ columnFeatureSupport', async () => {
        const db: pg.ClientBase = {
            query: () => new Promise((resolve) => resolve({ rows: [row] }))
        } as any;

        expect(await columnFeatureSupport(db)).toEqual(row);
    });

    it('/ getTableSchema', async () => {
        const db: pg.ClientBase = {
            query: () => new Promise((resolve) => resolve({ rows: [row] }))
        } as any;

        expect(await getTableSchema(db, 'public', 'table')).toEqual([row]);
    });

    describe('/ checkItemAgainstSchema', () => {
        it(' - empty', async () => {
            expect(checkItemAgainstSchema(row, [], 1)).toBe(row);
        });

        it(' - full', async () => {
            const item = { id: 1, name: 'test' };

            expect(checkItemAgainstSchema(
                item,
                [
                    { column_name: 'id', data_type: 'int', is_nullable: 'NO' } as ColumnInfo,
                    { column_name: 'name', data_type: 'varchar(255)', is_nullable: 'YES' } as ColumnInfo
                ],
                1
            )).toBe(item);
        });

        it(' - no column', async () => {
            const item = { id: 1, name: 'test' };

            const t = () => checkItemAgainstSchema(
                item,
                [
                    { column_name: 'id', data_type: 'int', is_nullable: 'NO' } as ColumnInfo
                ],
                1
            );

            expect(t).toThrowError();
        });

        it(' - not nullable', async () => {
            const item = { id: null, name: 'test' };

            const t = () => checkItemAgainstSchema(
                item,
                [
                    { column_name: 'id', data_type: 'int', is_nullable: 'NO' } as ColumnInfo
                ],
                1
            );

            expect(t).toThrowError();
        });
    });

    it('/ upsertOne', () => {
        const item = { id: 1, name: 'test', nullable: undefined };
        const columnsInfo = [
            { column_name: 'id', data_type: 'int', is_nullable: 'NO' } as ColumnInfo,
            { column_name: 'nullable', data_type: 'int', is_nullable: 'YES' } as ColumnInfo,
            { column_name: 'name', data_type: 'varchar(255)', is_nullable: 'YES' } as ColumnInfo
        ];

        expect(upsertOne(
            item,
            1,
            'public',
            'table',
            columnsInfo,
            ['id']
        )).toEqual({
            query: `INSERT INTO public."table"(id, name, nullable) 
                VALUES($1, $2, $3) ON CONFLICT (id) DO UPDATE  SET name = $4, nullable = $5`,
            values: [1, 'test', null, 'test', null]
        });
    });
});
