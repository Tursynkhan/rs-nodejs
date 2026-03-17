class InvalidInputError extends Error {
  constructor(message = "Invalid input") {
    super(message);
    this.name = "InvalidInputError";
  }
}

function isInvalidInputError(error) {
  return error instanceof InvalidInputError;
}

module.exports = {
  InvalidInputError,
  isInvalidInputError,
};
