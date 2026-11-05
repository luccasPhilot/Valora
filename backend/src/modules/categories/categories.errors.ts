import { AppError } from '../../shared/errors.js';

export class CategoryNameTakenError extends AppError {
  readonly code = 'CATEGORY_NAME_TAKEN';
  readonly statusCode = 409;
}

export class CategoryInUseError extends AppError {
  readonly code = 'CATEGORY_IN_USE';
  readonly statusCode = 409;
}
