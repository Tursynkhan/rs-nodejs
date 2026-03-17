const fs = require("node:fs");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { createHash } = require("node:crypto");
const { parseArgs } = require("../utils/argParser");
const { resolvePath } = require("../utils/pathResolver");
const { InvalidInputError } = require("../utils/errors");

const SUPPORTED_ALGORITHMS = new Set(["sha256", "md5", "sha512"]);

async function getFileHash(filePath, algorithm) {
  const hash = createHash(algorithm);
  const stream = fs.createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest("hex");
}

async function handleHash(state, argv) {
  const args = parseArgs(argv, { booleanFlags: ["save"] });
  const input = args.input;
  const algorithm = args.algorithm || "sha256";

  if (!input || args._.length > 0 || !SUPPORTED_ALGORITHMS.has(algorithm)) {
    if (!SUPPORTED_ALGORITHMS.has(algorithm) && input) {
      throw new Error("Unsupported algorithm");
    }
    throw new InvalidInputError();
  }

  const inputPath = resolvePath(state.currentDir, input);
  const digest = await getFileHash(inputPath, algorithm);

  process.stdout.write(`${algorithm}: ${digest}\n`);

  if (args.save) {
    const outputPath = `${inputPath}.${algorithm}`;
    await pipeline(Readable.from([`${digest}\n`]), fs.createWriteStream(outputPath));
  }
}

module.exports = {
  handleHash,
};
