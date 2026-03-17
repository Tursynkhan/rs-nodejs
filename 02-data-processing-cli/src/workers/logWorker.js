const fs = require("node:fs");
const { parentPort, workerData } = require("node:worker_threads");

function processLine(line, partial) {
  if (!line.trim()) {
    return;
  }

  const parts = line.split(" ");
  if (parts.length < 7) {
    return;
  }

  const level = parts[1];
  const statusCode = Number(parts[3]);
  const responseTime = Number(parts[4]);
  const requestPath = parts[6];

  partial.total += 1;
  partial.responseTimeSum += Number.isFinite(responseTime) ? responseTime : 0;

  partial.levels[level] = (partial.levels[level] || 0) + 1;

  const statusClass = Number.isFinite(statusCode)
    ? `${Math.floor(statusCode / 100)}xx`
    : "unknown";
  partial.status[statusClass] = (partial.status[statusClass] || 0) + 1;

  partial.paths[requestPath] = (partial.paths[requestPath] || 0) + 1;
}

async function run() {
  const { inputPath, start, end } = workerData;
  const partial = {
    total: 0,
    levels: {},
    status: {},
    paths: {},
    responseTimeSum: 0,
  };

  if (end <= start) {
    parentPort.postMessage(partial);
    return;
  }

  const stream = fs.createReadStream(inputPath, {
    start,
    end: end - 1,
    encoding: "utf8",
  });

  let leftover = "";

  for await (const chunk of stream) {
    const text = leftover + chunk;
    const lines = text.split(/\r?\n/);
    leftover = lines.pop() || "";

    for (const line of lines) {
      processLine(line, partial);
    }
  }

  if (leftover) {
    processLine(leftover, partial);
  }

  parentPort.postMessage(partial);
}

run().catch((error) => {
  throw error;
});
