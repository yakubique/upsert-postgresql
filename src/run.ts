import { ActionInputs, getInputs } from './io-helper';
import { buildOutput, inputJson } from '@yakubique/atils/dist';
import { Client } from 'pg';
import { getTableSchema, QueryWithValues, upsertOne } from './pgutils';
import * as core from '@actions/core';

enum Outputs {
    count = 'count',
}

export async function run() {
    const setOutputs = buildOutput(Outputs);
    let client;

    try {
        const inputs: ActionInputs = getInputs();
        const input = inputJson(inputs.input, inputs.fromFile);

        client = new Client({
            user: inputs.username,
            password: inputs.password,
            host: inputs.host,
            database: inputs.db,
            port: inputs.port,
            ssl: inputs.ssl
        });
        await client.connect();

        const columnsToMatchOn = inputs.columnToMatch.includes(',') ? inputs.columnToMatch.split(',').map(x => x.trim()) : [inputs.columnToMatch];
        const tableSchema = await getTableSchema(client, inputs.tableSchema, inputs.tableName);

        const queries: QueryWithValues[] = input.map((item: any, index: number) => upsertOne(
            item,
            index,
            inputs.tableSchema,
            inputs.tableName,
            tableSchema,
            columnsToMatchOn
        ));

        let count = 0;

        for (let i = 0; i < queries.length; i++) {
            const item = queries[i];
            const res = await client.query(item.query, item.values as any[]);

            count += res.rowCount || 0;
        }

        setOutputs({
            count
        });

        core.info('Success!');
    } catch (err: any) {
        core.setFailed(err.message);
    } finally {
        await client?.end();
    }
}
