import { Pool, PoolClient } from 'pg'

const { POSTGRES_URL } = process.env

if (!POSTGRES_URL) {
	throw new Error('POSTGRES_URL is not defined')
}

export const pg = new Pool({
	connectionString: POSTGRES_URL,
	max: 500
})

export async function tx<T>(
	callback: (db: IDatabaseClient) => Promise<T>
): Promise<T> {
	const client = await pg.connect()
	await client.query('BEGIN')

	let result

	try {
		result = await callback(client)
		await client.query('COMMIT')
	} catch (e) {
		await client.query('ROLLBACK')

		throw e
	} finally {
		client.release()
	}

	return result
}

export interface IDatabaseClient {
	query: (query: string, bindings?: any[]) => Promise<{ rows: any[] }>
}
