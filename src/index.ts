import {
	executeInOrder,
	executeParallel,
	executeParallelRandom,
	TaskExecutor,
	Task
} from './executors'
import { some, uniq } from 'lodash'
import { DatabaseError } from 'pg-protocol'
import { down, up } from './migration'
import { pg, tx } from './pg'

function range(size: number): number[] {
	return Array.from(Array(size).keys())
}

async function runTest(executor: TaskExecutor) {
	console.log('Running up migration...')
	await up(pg)
	console.log('Up migration done.')

	try {
		const indexes = range(5)
		const deadlockErrors: DatabaseError[] = []
		const setAllTo = async (x: number) => {
			try {
				await tx(async (db) => {
					const tasks: Task[] = indexes.map((i) => () =>
						db.query(
							`
                                INSERT INTO test_table (id, value)
                                VALUES($1, $2)
                                ON CONFLICT (id)
                                DO
                                    UPDATE SET value = $2
                                `,
							[i, x]
						)
					)
					await executor(tasks)
				})
			} catch (e) {
				if (e instanceof DatabaseError && e.code === `40P01`) {
					deadlockErrors.push(e)
				} else {
					throw e
				}
			}
		}

		const competitors = range(100)

		console.log('Running test...')

		await Promise.allSettled(competitors.map(setAllTo))

		if (deadlockErrors.length === 0) {
			console.log('Test done successfully.')
		} else {
			console.log(`Encountered ${deadlockErrors.length} deadlock errors`)
			deadlockErrors.forEach(console.log)
		}

		const {
			rows: endState
		}: { rows: { id: number; value: number }[] } = await pg.query(
			'SELECT * FROM test_table'
		)
		const endValues = endState.map((e) => e.value)
		const uniqValue = uniq(endValues)
		if (uniqValue.length > 1) {
			throw new Error(`Inconsistent end values: ${uniqValue}`)
		}
		console.log(`End value ${uniqValue[0]}`)
	} catch (e) {
		console.log('Test encountered an unexpected error')
		throw e
	} finally {
		console.log('Running down migration...')
		await down(pg)
		console.log('Down migration done.')
	}
}

;(async function main() {
	try {
		console.log('Running test with in-order executor...')
		await runTest(executeInOrder)
		console.log('In-order executor test done.')

		console.log('Running test with parallel executor...')
		await runTest(executeParallel)
		console.log('Parallel executor test done.')

		console.log('Running test with parallel random executor...')
		await runTest(executeParallelRandom)
		console.log('Parallel random executor test done.')

		process.exit(0) // eslint-disable-line no-process-exit
	} catch (e) {
		console.log('Got an error', e)
		process.exit(1) // eslint-disable-line no-process-exit
	}
})()
