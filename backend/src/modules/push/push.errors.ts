import { AppError } from '../../shared/errors.js';

export class PushDisabledError extends AppError {
  readonly code = 'PUSH_DISABLED';
  readonly statusCode = 404;
}
