import * as core from '@actions/core';
import * as helper from '../src/io-helper';
import * as pgutils from '../src/pgutils';
import * as pg from 'pg';
import { run } from '../src/run';

jest.mock('pg', () => {
    const mClient = {
        connect: jest.fn(),
        query: jest.fn(),
        end: jest.fn()
    };
    return { Client: jest.fn(() => mClient) };
});

import { describe, expect } from '@jest/globals';
import { ColumnInfo } from '../src/pgutils';


let getInputsMock: jest.SpiedFunction<typeof helper.getInputs>;
let setOutputMock: jest.SpiedFunction<typeof core.setOutput>;
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>;
let getTableSchemaMock: jest.SpiedFunction<typeof pgutils.getTableSchema>;

const columnInfos = [
    { column_name: 'id', data_type: 'int', is_nullable: 'NO' } as ColumnInfo,
    { column_name: 'name', data_type: 'varchar(255)', is_nullable: 'YES' } as ColumnInfo
] as ColumnInfo[];
describe('run.ts', () => {
    let client: pg.Client;

    afterEach(() => {
        jest.clearAllMocks();
    });
    beforeEach(() => {
        jest.clearAllMocks();
        client = new pg.Client();

        getInputsMock = jest.spyOn(helper, 'getInputs').mockImplementation();
        setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation();
        setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation();
        getTableSchemaMock = jest.spyOn(pgutils, 'getTableSchema').mockImplementation();
    });

    it('should work with 1 column', async () => {
        getInputsMock.mockImplementation(() => {
            return {
                input: JSON.stringify([{ id: 1, name: 'test' }]),
                columnToMatch: 'id',
                tableSchema: 'public',
                tableName: 'table'
            } as helper.ActionInputs;
        });

        getTableSchemaMock.mockImplementation(() => new Promise((resolve) => resolve(columnInfos)));

        (client.query as any).mockImplementation(() => new Promise(resolve => resolve({ rowCount: 1 })));

        await run();
        expect(getInputsMock).toBeCalled();
        expect(client.query).toBeCalled();
        expect(getTableSchemaMock).toBeCalledWith(client, 'public', 'table');
        expect(setOutputMock).toHaveBeenNthCalledWith(1, 'count', 1);
    });

    it('should work with many columns', async () => {
        getInputsMock.mockImplementation(() => {
            return {
                input: JSON.stringify([{ id: 1, name: 'test' }]),
                columnToMatch: 'id,name',
                tableSchema: 'public',
                tableName: 'table'
            } as helper.ActionInputs;
        });

        getTableSchemaMock.mockImplementation(() => new Promise((resolve) => resolve(columnInfos)));
        (client.query as any).mockImplementation(() => new Promise(resolve => resolve({ rowCount: 0 })));

        await run();
        expect(getInputsMock).toBeCalled();
        expect(client.query).toBeCalled();
        expect(getTableSchemaMock).toBeCalledWith(client, 'public', 'table');
        expect(setOutputMock).toHaveBeenNthCalledWith(1, 'count', 0);
    });

    it('should error', async () => {
        getInputsMock.mockImplementation(() => {
            throw Error('unexpected input');
        });

        await run();
        expect(getInputsMock).toBeCalled();
        expect(setOutputMock).not.toBeCalled();
        expect(setFailedMock).toBeCalled();
    });
});

