export class ScratchWebError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = "ScratchWebError";
  }
}

export function toScratchWebError(error: unknown): ScratchWebError {
  if (error instanceof ScratchWebError) {
    return error;
  }
  return new ScratchWebError("INTERNAL_ERROR", "Internal server error.", 500);
}
