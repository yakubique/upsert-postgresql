import * as core from '@actions/core';
import { describe, expect } from '@jest/globals';
import { ActionInputs, getInputs, Inputs } from '../src/io-helper';

let getInputMock: jest.SpiedFunction<typeof core.getInput>;

describe('io-helper.ts', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        getInputMock = jest.spyOn(core, 'getInput').mockImplementation();
    });

    it('should get proper input', () => {
        getInputMock.mockImplementation((name, _) => {
            switch (name) {
                case Inputs.Input:
                    return 'select "a"';
                case Inputs.Host:
                    return 'localhost';
                case Inputs.Port:
                    return '5432';
                case Inputs.Database:
                    return 'db';
                case Inputs.Username:
                    return 'postgres';
                case Inputs.Password:
                    return 'postgres';
                case Inputs.ToFile:
                    return 'false';
                case Inputs.FromFile:
                    return 'false';
                case Inputs.SSL:
                    return 'false';
                case Inputs.ColumnToMatch:
                    return 'id';
                case Inputs.TableSchema:
                    return 'public';
                case Inputs.TableName:
                    return 'table';
                default:
                    return '';
            }
        });

        const inputs = getInputs();
        expect(inputs).toEqual({
            input: 'select "a"',
            host: 'localhost',
            db: 'db',
            port: 5432,
            username: 'postgres',
            password: 'postgres',
            toFile: false,
            fromFile: false,
            ssl: false,
            columnToMatch: 'id',
            tableSchema: 'public',
            tableName: 'table'
        } as ActionInputs);
    });

    it('should get default port and schema', () => {
        getInputMock.mockImplementation((name, _) => {
            switch (name) {
                case Inputs.Port:
                    return '';
                case Inputs.TableSchema:
                    return '';
                default:
                    return 'alalla';
            }
        });

        const inputs = getInputs();
        expect(inputs.port).toEqual(5432);
        expect(inputs.tableSchema).toEqual('public');
    });
});

