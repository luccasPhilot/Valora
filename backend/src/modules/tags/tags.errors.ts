import { AppError } from '../../shared/errors.js';

export class TagAlreadyExistsError extends AppError {
  readonly code = 'TAG_ALREADY_EXISTS';
  readonly statusCode = 409;
}
