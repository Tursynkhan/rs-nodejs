const fs = require("node:fs");
const { Transform } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { randomBytes, createCipheriv, pbkdf2: pbkdf2Cb } = require("node:crypto");
const { promisify } = require("node:util");
const { parseArgs } = require("../utils/argParser");
const { resolvePath } = require("../utils/pathResolver");
const { InvalidInputError } = require("../utils/errors");

const pbkdf2 = promisify(pbkdf2Cb);

class EnvelopeTransform extends Transform {
  constructor(header, getAuthTag) {
    super();
    this.header = header;
    this.getAuthTag = getAuthTag;
    this.headerWritten = false;
  }

  _transform(chunk, encoding, callback) {
    if (!this.headerWritten) {
      this.push(this.header);
      this.headerWritten = true;
    }

    this.push(chunk);
    callback();
  }

  _flush(callback) {
    try {
      if (!this.headerWritten) {
        this.push(this.header);
      }

      this.push(this.getAuthTag());
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

async function handleEncrypt(state, argv) {
  const args = parseArgs(argv);
  const input = args.input;
  const output = args.output;
  const password = args.password;

  if (!input || !output || !password || args._.length > 0) {
    throw new InvalidInputError();
  }

  const inputPath = resolvePath(state.currentDir, input);
  const outputPath = resolvePath(state.currentDir, output);

  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await pbkdf2(password, salt, 100000, 32, "sha256");

  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const envelope = new EnvelopeTransform(Buffer.concat([salt, iv]), () => cipher.getAuthTag());

  await pipeline(
    fs.createReadStream(inputPath),
    cipher,
    envelope,
    fs.createWriteStream(outputPath),
  );
}

module.exports = {
  handleEncrypt,
};
