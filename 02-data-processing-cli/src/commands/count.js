const fs = require("node:fs");
const { parseArgs } = require("../utils/argParser");
const { resolvePath } = require("../utils/pathResolver");
const { InvalidInputError } = require("../utils/errors");

async function handleCount(state, argv) {
  const args = parseArgs(argv);
  const input = args.input;

  if (!input || args._.length > 0) {
    throw new InvalidInputError();
  }

  const inputPath = resolvePath(state.currentDir, input);
  const stream = fs.createReadStream(inputPath, { encoding: "utf8" });

  let lines = 0;
  let words = 0;
  let characters = 0;
  let trailingWord = "";
  let hasData = false;
  let endsWithNewline = false;

  for await (const chunk of stream) {
    hasData = true;
    characters += chunk.length;

    const newlineMatches = chunk.match(/\n/g);
    if (newlineMatches) {
      lines += newlineMatches.length;
    }

    endsWithNewline = /\n$/.test(chunk);

    const text = trailingWord + chunk;
    const parts = text.split(/\s+/);

    if (/\s$/.test(text)) {
      words += parts.filter(Boolean).length;
      trailingWord = "";
    } else {
      trailingWord = parts.pop() || "";
      words += parts.filter(Boolean).length;
    }
  }

  if (trailingWord.trim()) {
    words += 1;
  }

  if (hasData && !endsWithNewline) {
    lines += 1;
  }

  process.stdout.write(`Lines: ${lines}\n`);
  process.stdout.write(`Words: ${words}\n`);
  process.stdout.write(`Characters: ${characters}\n`);
}

module.exports = {
  handleCount,
};
