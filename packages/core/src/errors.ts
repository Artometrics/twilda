/** Contract v1. Do not rename codes without a note in the PR. */
export class TwildaError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "TwildaError";
    this.code = code;
  }
}
