export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
    this.name = "HttpError";
  }
}

export const httpError = (status: number, code: string, message: string, details?: unknown) =>
  new HttpError(status, code, message, details);
