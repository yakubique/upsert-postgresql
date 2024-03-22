import * as core from '@actions/core';
import { isBlank, getBooleanInput, getOptional } from '@yakubique/atils/dist';

export enum Inputs {
    Input = 'input',
    Host = 'host',
    Port = 'port',
    Database = 'db',
    Username = 'username',
    Password = 'password',
    ToFile = 'to_file',
    FromFile = 'from_file',
    SSL = 'ssl',
    ColumnToMatch = 'column_to_match',
    TableSchema = 'table_schema',
    TableName = 'table_name'
}

export interface ActionInputs {
    input: string;
    host: string;
    db: string;
    port: number;
    username: string;
    password: string;
    toFile: boolean;
    fromFile: boolean;
    ssl: boolean;
    columnToMatch: string;
    tableSchema: string;
    tableName: string;
}

export function getInputs(): ActionInputs {
    const result = {} as ActionInputs;

    result.input = `${core.getInput(Inputs.Input, { required: true })}`;
    result.host = `${core.getInput(Inputs.Host, { required: true })}`;
    result.db = `${core.getInput(Inputs.Database, { required: true })}`;
    result.username = `${core.getInput(Inputs.Username, { required: true })}`;
    result.password = `${core.getInput(Inputs.Password, { required: true })}`;
    result.columnToMatch = `${core.getInput(Inputs.ColumnToMatch, { required: true })}`;
    result.tableName = `${core.getInput(Inputs.TableName, { required: true })}`;

    const port = `${core.getInput(Inputs.Port, { required: false })}`;
    if (isBlank(port)) {
        result.port = 5432;
    } else {
        result.port = parseInt(port, 10);
    }

    result.tableSchema = getOptional(Inputs.TableSchema, 'public', { required: false });

    result.toFile = getBooleanInput(Inputs.ToFile, { required: false });
    result.fromFile = getBooleanInput(Inputs.FromFile, { required: false });
    result.ssl = getBooleanInput(Inputs.SSL, { required: false });

    return result;
}
