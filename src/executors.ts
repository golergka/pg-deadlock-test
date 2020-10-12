import { Chance } from 'chance'

export type Task = () => Promise<unknown>

export type TaskExecutor = (tasks: Task[]) => Promise<void>

export const executeInOrder: TaskExecutor = async (
	tasks: Task[]
): Promise<void> => {
	for (const p of tasks) {
		await p()
	}
}

export const executeParallel: TaskExecutor = async (
	tasks: Task[]
): Promise<void> => {
	await Promise.all(tasks.map((t) => t()))
}

const c = new Chance()

export const executeParallelRandom: TaskExecutor = async (
	tasks: Task[]
): Promise<void> => {
	await Promise.all(c.shuffle(tasks).map((t) => t()))
}
