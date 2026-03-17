const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { Worker } = require("node:worker_threads");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { parseArgs } = require("../utils/argParser");
const { resolvePath } = require("../utils/pathResolver");
const { InvalidInputError } = require("../utils/errors");

async function findNextLineBoundary(handle, startPosition, fileSize) {
  if (startPosition <= 0) {
    return 0;
  }

  if (startPosition >= fileSize) {
    return fileSize;
  }

  const chunkSize = 64 * 1024;
  const buffer = Buffer.alloc(chunkSize);
  let position = startPosition;

  while (position < fileSize) {
    const length = Math.min(chunkSize, fileSize - position);
    const { bytesRead } = await handle.read(buffer, 0, length, position);

    if (bytesRead <= 0) {
      return fileSize;
    }

    const index = buffer.subarray(0, bytesRead).indexOf(0x0a);
    if (index !== -1) {
      return position + index + 1;
    }

    position += bytesRead;
  }

  return fileSize;
}

function runWorker(workerPath, inputPath, start, end) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, {
      workerData: { inputPath, start, end },
    });

    worker.once("message", resolve);
    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

function mergeStats(partials) {
  const result = {
    total: 0,
    levels: {},
    status: { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 },
    topPaths: [],
    avgResponseTimeMs: 0,
  };

  const pathMap = new Map();
  let responseTimeSum = 0;

  for (const partial of partials) {
    result.total += partial.total;
    responseTimeSum += partial.responseTimeSum;

    for (const [key, value] of Object.entries(partial.levels)) {
      result.levels[key] = (result.levels[key] || 0) + value;
    }

    for (const [key, value] of Object.entries(partial.status)) {
      result.status[key] = (result.status[key] || 0) + value;
    }

    for (const [key, value] of Object.entries(partial.paths)) {
      pathMap.set(key, (pathMap.get(key) || 0) + value);
    }
  }

  result.avgResponseTimeMs = result.total === 0
    ? 0
    : Number((responseTimeSum / result.total).toFixed(2));

  result.topPaths = [...pathMap.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return a[0].localeCompare(b[0]);
    })
    .slice(0, 2)
    .map(([pathName, count]) => ({ path: pathName, count }));

  return result;
}

async function handleLogStats(state, argv) {
  const args = parseArgs(argv);
  const input = args.input;
  const output = args.output;

  if (!input || !output || args._.length > 0) {
    throw new InvalidInputError();
  }

  const inputPath = resolvePath(state.currentDir, input);
  const outputPath = resolvePath(state.currentDir, output);

  const stat = await fsp.stat(inputPath);
  const fileSize = stat.size;
  const workerCount = os.cpus().length;
  const workerPath = path.resolve(__dirname, "../workers/logWorker.js");

  if (fileSize === 0) {
    const empty = {
      total: 0,
      levels: {},
      status: { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 },
      topPaths: [],
      avgResponseTimeMs: 0,
    };
    await pipeline(Readable.from([`${JSON.stringify(empty, null, 2)}\n`]), fs.createWriteStream(outputPath));
    return;
  }

  const chunkSize = Math.floor(fileSize / workerCount) || fileSize;
  const boundaries = [0];
  const handle = await fsp.open(inputPath, "r");

  try {
    for (let i = 1; i < workerCount; i += 1) {
      const rawBoundary = i * chunkSize;
      const boundary = await findNextLineBoundary(handle, rawBoundary, fileSize);
      boundaries.push(boundary);
    }
  } finally {
    await handle.close();
  }

  boundaries.push(fileSize);

  const jobs = [];
  for (let i = 0; i < workerCount; i += 1) {
    jobs.push(runWorker(workerPath, inputPath, boundaries[i], boundaries[i + 1]));
  }

  const partials = await Promise.all(jobs);
  const merged = mergeStats(partials);

  await pipeline(
    Readable.from([`${JSON.stringify(merged, null, 2)}\n`]),
    fs.createWriteStream(outputPath),
  );
}

module.exports = {
  handleLogStats,
};
