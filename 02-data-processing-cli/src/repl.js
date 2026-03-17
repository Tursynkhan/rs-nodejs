const readline = require("node:readline");
const { up, cd, ls } = require("./navigation");
const { handleCsvToJson } = require("./commands/csvToJson");
const { handleJsonToCsv } = require("./commands/jsonToCsv");
const { handleCount } = require("./commands/count");
const { handleHash } = require("./commands/hash");
const { handleHashCompare } = require("./commands/hashCompare");
const { handleEncrypt } = require("./commands/encrypt");
const { handleDecrypt } = require("./commands/decrypt");
const { handleLogStats } = require("./commands/logStats");
const { InvalidInputError, isInvalidInputError } = require("./utils/errors");

const COMMAND_HANDLERS = {
  "csv-to-json": handleCsvToJson,
  "json-to-csv": handleJsonToCsv,
  count: handleCount,
  hash: handleHash,
  "hash-compare": handleHashCompare,
  encrypt: handleEncrypt,
  decrypt: handleDecrypt,
  "log-stats": handleLogStats,
};

function tokenize(input) {
  const tokens = [];
  const regex = /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|\S+/g;
  const matches = input.match(regex) || [];

  for (const token of matches) {
    if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'"))
    ) {
      tokens.push(token.slice(1, -1));
    } else {
      tokens.push(token);
    }
  }

  return tokens;
}

function printCurrentDirectory(state) {
  process.stdout.write(`You are currently in ${state.currentDir}\n`);
}

async function executeCommand(state, line) {
  if (!line.trim()) {
    return false;
  }

  const tokens = tokenize(line.trim());
  const [command, ...args] = tokens;

  if (!command) {
    throw new InvalidInputError();
  }

  if (command === "up") {
    if (args.length !== 0) {
      throw new InvalidInputError();
    }
    await up(state);
    return true;
  }

  if (command === "cd") {
    if (args.length !== 1) {
      throw new InvalidInputError();
    }
    await cd(state, args[0]);
    return true;
  }

  if (command === "ls") {
    if (args.length !== 0) {
      throw new InvalidInputError();
    }
    await ls(state);
    return true;
  }

  const handler = COMMAND_HANDLERS[command];
  if (!handler) {
    throw new InvalidInputError();
  }

  await handler(state, args);
  return true;
}

function startRepl(state) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  rl.prompt();

  rl.on("line", async (line) => {
    if (line.trim() === ".exit") {
      rl.close();
      return;
    }

    try {
      const success = await executeCommand(state, line);
      if (success) {
        printCurrentDirectory(state);
      }
    } catch (error) {
      if (isInvalidInputError(error)) {
        process.stdout.write("Invalid input\n");
      } else {
        process.stdout.write("Operation failed\n");
      }
    }

    rl.prompt();
  });

  rl.on("SIGINT", () => {
    rl.close();
  });

  rl.on("close", () => {
    process.stdout.write("Thank you for using Data Processing CLI!\n");
    process.exit(0);
  });
}

module.exports = {
  startRepl,
};
