export interface ErrorDetail {
  readonly field?: string;
  readonly message: string;
}

interface AppErrorOptions {
  readonly details?: readonly ErrorDetail[];
  readonly cause?: unknown;
}

export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  readonly details: readonly ErrorDetail[];

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.details = options.details ?? [];
  }
}

export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
}

export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
}

export class ConflictError extends AppError {
  readonly code = 'CONFLICT';
  readonly statusCode = 409;
}

export class OpenFinanceReadOnlyError extends AppError {
  readonly code = 'OPEN_FINANCE_READ_ONLY';
  readonly statusCode = 409;
}

export class NoDuplicatePendingError extends AppError {
  readonly code = 'NO_DUPLICATE_PENDING';
  readonly statusCode = 409;
}

export class TransactionAlreadyLinkedError extends AppError {
  readonly code = 'TRANSACTION_ALREADY_LINKED';
  readonly statusCode = 409;
}

export class TransactionNotCompatibleError extends AppError {
  readonly code = 'TRANSACTION_NOT_COMPATIBLE';
  readonly statusCode = 422;
}

export class SyncInProgressError extends AppError {
  readonly code = 'SYNC_IN_PROGRESS';
  readonly statusCode = 409;
}

export class GoalIsLinkedError extends AppError {
  readonly code = 'GOAL_IS_LINKED';
  readonly statusCode = 409;
}
