const path = require("node:path");

function resolvePath(currentDir, inputPath) {
  if (!inputPath) {
    return null;
  }

  return path.isAbsolute(inputPath)
    ? path.normalize(inputPath)
    : path.resolve(currentDir, inputPath);
}

module.exports = {
  resolvePath,
};
