const fs = require("node:fs");
const { Writable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { createHash } = require("node:crypto");
const { parseArgs } = require("../utils/argParser");
const { resolvePath } = require("../utils/pathResolver");
const { InvalidInputError } = require("../utils/errors");

const SUPPORTED_ALGORITHMS = new Set(["sha256", "md5", "sha512"]);

class TextCollector extends Writable {
  constructor() {
    super();
    this.chunks = [];
  }

  _write(chunk, encoding, callback) {
    this.chunks.push(chunk.toString("utf8"));
    callback();
  }

  text() {
    return this.chunks.join("");
  }
}

async function getFileHash(filePath, algorithm) {
  const hash = createHash(algorithm);
  const stream = fs.createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest("hex");
}

async function handleHashCompare(state, argv) {
  const args = parseArgs(argv);
  const input = args.input;
  const hashPathArg = args.hash;
  const algorithm = args.algorithm || "sha256";

  if (!input || !hashPathArg || args._.length > 0) {
    throw new InvalidInputError();
  }

  if (!SUPPORTED_ALGORITHMS.has(algorithm)) {
    throw new Error("Unsupported algorithm");
  }

  const inputPath = resolvePath(state.currentDir, input);
  const hashPath = resolvePath(state.currentDir, hashPathArg);

  const collector = new TextCollector();
  await pipeline(fs.createReadStream(hashPath), collector);

  const expected = collector.text().trim().toLowerCase();
  const actual = (await getFileHash(inputPath, algorithm)).toLowerCase();

  process.stdout.write(`${actual === expected ? "OK" : "MISMATCH"}\n`);
}

module.exports = {
  handleHashCompare,
};
