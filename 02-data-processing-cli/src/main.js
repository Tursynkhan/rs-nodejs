const os = require("node:os");
const { startRepl } = require("./repl");

function main() {
  const state = {
    currentDir: os.homedir(),
  };

  process.stdout.write("Welcome to Data Processing CLI!\n");
  process.stdout.write(`You are currently in ${state.currentDir}\n`);

  startRepl(state);
}

main();
