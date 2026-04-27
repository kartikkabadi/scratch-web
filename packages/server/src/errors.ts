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
  if (error instanceof Error) {
    return new ScratchWebError("INTERNAL_ERROR", error.message, 500);
  }
  return new ScratchWebError("INTERNAL_ERROR", String(error), 500);
}

