/** Expected failures. The central error handler maps these to the HTTP error envelope. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AppError';
  }
}

export const notFoundError = (what: string): AppError =>
  new AppError(404, 'NOT_FOUND', `${what} not found`);
