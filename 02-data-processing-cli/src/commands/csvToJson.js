const fs = require("node:fs");
const { Transform } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { parseArgs } = require("../utils/argParser");
const { resolvePath } = require("../utils/pathResolver");
const { InvalidInputError } = require("../utils/errors");

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

class CsvToJsonTransform extends Transform {
  constructor() {
    super();
    this.leftover = "";
    this.headers = null;
    this.started = false;
    this.hasRows = false;
  }

  _transform(chunk, encoding, callback) {
    try {
      const data = this.leftover + chunk.toString("utf8");
      const lines = data.split(/\r?\n/);
      this.leftover = lines.pop() || "";

      for (const line of lines) {
        this.processLine(line);
      }

      callback();
    } catch (error) {
      callback(error);
    }
  }

  processLine(line) {
    if (!this.headers) {
      this.headers = parseCsvLine(line);
      this.started = true;
      this.push("[\n");
      return;
    }

    if (!line.trim()) {
      return;
    }

    const values = parseCsvLine(line);
    const entry = {};

    for (let i = 0; i < this.headers.length; i += 1) {
      entry[this.headers[i]] = values[i] ?? "";
    }

    if (this.hasRows) {
      this.push(",\n");
    }

    this.push(`  ${JSON.stringify(entry)}`);
    this.hasRows = true;
  }

  _flush(callback) {
    try {
      if (this.leftover.length > 0) {
        this.processLine(this.leftover);
      }

      if (!this.started) {
        this.push("[\n");
      }

      this.push("\n]\n");
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

async function handleCsvToJson(state, argv) {
  const args = parseArgs(argv);
  const input = args.input;
  const output = args.output;

  if (!input || !output || args._.length > 0) {
    throw new InvalidInputError();
  }

  const inputPath = resolvePath(state.currentDir, input);
  const outputPath = resolvePath(state.currentDir, output);

  await pipeline(
    fs.createReadStream(inputPath),
    new CsvToJsonTransform(),
    fs.createWriteStream(outputPath),
  );
}

module.exports = {
  handleCsvToJson,
};
