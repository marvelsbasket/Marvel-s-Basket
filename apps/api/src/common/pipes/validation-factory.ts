import { BadRequestException, ValidationError } from '@nestjs/common';
import { FieldError } from '../interfaces';

/**
 * Recursively formats class-validator validation errors into a clean, flat list of FieldError objects.
 */
export function formatValidationErrors(errors: ValidationError[]): FieldError[] {
  const fieldErrors: FieldError[] = [];

  function extract(currentErrors: ValidationError[], parentField = ''): void {
    for (const error of currentErrors) {
      const field = parentField ? `${parentField}.${error.property}` : error.property;

      if (error.constraints) {
        const messages = Object.values(error.constraints);
        for (const message of messages) {
          fieldErrors.push({ field, message });
        }
      }

      if (error.children && error.children.length > 0) {
        extract(error.children, field);
      }
    }
  }

  extract(errors);
  return fieldErrors;
}

/**
 * Custom exception factory for NestJS ValidationPipe to generate structured validation responses.
 */
export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  const formattedErrors = formatValidationErrors(errors);
  return new BadRequestException({
    message: 'Request validation failed',
    errors: formattedErrors,
  });
}
