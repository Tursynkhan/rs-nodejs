const fs = require("node:fs");
const fsp = require("node:fs/promises");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { createDecipheriv, pbkdf2: pbkdf2Cb } = require("node:crypto");
const { promisify } = require("node:util");
const { parseArgs } = require("../utils/argParser");
const { resolvePath } = require("../utils/pathResolver");
const { InvalidInputError } = require("../utils/errors");

const pbkdf2 = promisify(pbkdf2Cb);

async function readHeaderAndTag(inputPath) {
  const stats = await fsp.stat(inputPath);
  if (stats.size < 44) {
    throw new Error("Invalid encrypted file");
  }

  const handle = await fsp.open(inputPath, "r");

  try {
    const header = Buffer.alloc(28);
    const tag = Buffer.alloc(16);

    await handle.read(header, 0, 28, 0);
    await handle.read(tag, 0, 16, stats.size - 16);

    return {
      salt: header.subarray(0, 16),
      iv: header.subarray(16, 28),
      authTag: tag,
      fileSize: stats.size,
    };
  } finally {
    await handle.close();
  }
}

async function handleDecrypt(state, argv) {
  const args = parseArgs(argv);
  const input = args.input;
  const output = args.output;
  const password = args.password;

  if (!input || !output || !password || args._.length > 0) {
    throw new InvalidInputError();
  }

  const inputPath = resolvePath(state.currentDir, input);
  const outputPath = resolvePath(state.currentDir, output);

  const { salt, iv, authTag, fileSize } = await readHeaderAndTag(inputPath);
  const key = await pbkdf2(password, salt, 100000, 32, "sha256");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const encryptedBodyStream = fileSize > 44
    ? fs.createReadStream(inputPath, { start: 28, end: fileSize - 17 })
    : Readable.from([]);

  await pipeline(
    encryptedBodyStream,
    decipher,
    fs.createWriteStream(outputPath),
  );
}

module.exports = {
  handleDecrypt,
};
