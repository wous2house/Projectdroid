import { performance } from 'perf_hooks';

const numTasks = 1000;
const numEntries = 10000;

const tasks = Array.from({ length: numTasks }, (_, i) => ({ id: `task-${i}` }));
const timeEntries = Array.from({ length: numEntries }, (_, i) => ({
    taskId: `task-${Math.floor(Math.random() * numTasks)}`,
    durationSeconds: Math.floor(Math.random() * 3600)
}));

const project = { timeEntries };

console.log(`Benchmarking with ${numTasks} tasks and ${numEntries} time entries...`);

function runOriginal() {
    const start = performance.now();
    tasks.forEach(task => {
        const loggedSeconds = (project.timeEntries || []).filter(e => e.taskId === task.id).reduce((sum, e) => sum + e.durationSeconds, 0);
    });
    const end = performance.now();
    return end - start;
}

function runOptimized() {
    const start = performance.now();
    const timeByTask = (project.timeEntries || []).reduce((acc, entry) => {
        acc[entry.taskId] = (acc[entry.taskId] || 0) + entry.durationSeconds;
        return acc;
    }, {});

    tasks.forEach(task => {
        const loggedSeconds = timeByTask[task.id] || 0;
    });
    const end = performance.now();
    return end - start;
}

// Warmup
runOriginal();
runOptimized();

const originalTimes = [];
const optimizedTimes = [];

for (let i = 0; i < 10; i++) {
    originalTimes.push(runOriginal());
    optimizedTimes.push(runOptimized());
}

const avgOriginal = originalTimes.reduce((a, b) => a + b, 0) / originalTimes.length;
const avgOptimized = optimizedTimes.reduce((a, b) => a + b, 0) / optimizedTimes.length;

console.log(`Average Original logic: ${avgOriginal.toFixed(4)} ms`);
console.log(`Average Optimized logic: ${avgOptimized.toFixed(4)} ms`);
console.log(`Improvement: ${((avgOriginal - avgOptimized) / avgOriginal * 100).toFixed(2)}%`);
