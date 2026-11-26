/** Runs async tasks with at most `max` in flight, so ~150 game-log requests don't hit ESPN at once */
export function createLimiter(max: number) {
    let active = 0;
    const queue: (() => void)[] = [];
    const next = () => {
        active--;
        queue.shift()?.();
    };
    return async function limit<T>(fn: () => Promise<T>): Promise<T> {
        if (active >= max) await new Promise<void>((resolve) => queue.push(resolve));
        active++;
        try {
            return await fn();
        } finally {
            next();
        }
    };
}
