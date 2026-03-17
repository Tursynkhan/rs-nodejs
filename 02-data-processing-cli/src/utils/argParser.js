const { InvalidInputError } = require("./errors");

function parseArgs(argv, options = {}) {
  const booleanFlags = new Set(options.booleanFlags || []);
  const result = { _: [] };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (!token.startsWith("--")) {
      result._.push(token);
      continue;
    }

    const key = token.slice(2);
    if (!key) {
      throw new InvalidInputError();
    }

    if (booleanFlags.has(key)) {
      result[key] = true;
      continue;
    }

    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new InvalidInputError();
    }

    result[key] = value;
    i += 1;
  }

  return result;
}

module.exports = {
  parseArgs,
};
