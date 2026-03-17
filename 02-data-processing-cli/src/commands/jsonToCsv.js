const fs = require("node:fs");
const { Writable, Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { parseArgs } = require("../utils/argParser");
const { resolvePath } = require("../utils/pathResolver");
const { InvalidInputError } = require("../utils/errors");

class TextCollector extends Writable {
  constructor() {
    super();
    this.chunks = [];
  }

  _write(chunk, encoding, callback) {
    this.chunks.push(chunk.toString("utf8"));
    callback();
  }

  getText() {
    return this.chunks.join("");
  }
}

function escapeCsv(value) {
  const stringValue = String(value ?? "");
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

async function handleJsonToCsv(state, argv) {
  const args = parseArgs(argv);
  const input = args.input;
  const output = args.output;

  if (!input || !output || args._.length > 0) {
    throw new InvalidInputError();
  }

  const inputPath = resolvePath(state.currentDir, input);
  const outputPath = resolvePath(state.currentDir, output);

  const collector = new TextCollector();
  await pipeline(fs.createReadStream(inputPath), collector);

  let parsed;
  try {
    parsed = JSON.parse(collector.getText());
  } catch {
    throw new Error("Invalid JSON");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("JSON must be an array");
  }

  if (parsed.length === 0) {
    await pipeline(Readable.from([""]), fs.createWriteStream(outputPath));
    return;
  }

  if (typeof parsed[0] !== "object" || parsed[0] === null || Array.isArray(parsed[0])) {
    throw new Error("Array values must be objects");
  }

  const headers = Object.keys(parsed[0]);
  const lines = [headers.join(",")];

  for (const item of parsed) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error("Array values must be objects");
    }

    const row = headers.map((header) => escapeCsv(item[header]));
    lines.push(row.join(","));
  }

  const csv = `${lines.join("\n")}\n`;
  await pipeline(Readable.from([csv]), fs.createWriteStream(outputPath));
}

module.exports = {
  handleJsonToCsv,
};
