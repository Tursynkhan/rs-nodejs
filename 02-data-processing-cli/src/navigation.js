const fs = require("node:fs/promises");
const path = require("node:path");
const { resolvePath } = require("./utils/pathResolver");
const { InvalidInputError } = require("./utils/errors");

async function up(state) {
  const parent = path.dirname(state.currentDir);
  state.currentDir = parent;
}

async function cd(state, target) {
  if (!target) {
    throw new InvalidInputError();
  }

  const resolved = resolvePath(state.currentDir, target);
  const info = await fs.stat(resolved);
  if (!info.isDirectory()) {
    throw new Error("Not a directory");
  }

  state.currentDir = resolved;
}

async function ls(state) {
  const items = await fs.readdir(state.currentDir, { withFileTypes: true });

  items.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) {
      return a.isDirectory() ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });

  for (const item of items) {
    const type = item.isDirectory() ? "folder" : "file";
    process.stdout.write(`${item.name} [${type}]\n`);
  }
}

module.exports = {
  up,
  cd,
  ls,
};
