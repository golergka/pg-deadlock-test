import { IDatabaseClient } from './pg'
export async function up(pg: IDatabaseClient) {
	await pg.query(`
    CREATE TABLE test_table (
        id INT NOT NULL PRIMARY KEY,
        value INT NOT NULL
    )
    `)
}

export async function down(pg: IDatabaseClient) {
	await pg.query(`
    DROP TABLE test_table
    `)
}
