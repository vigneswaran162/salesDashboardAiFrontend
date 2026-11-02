import { HttpErrorResponse } from '@angular/common/http';

/** Turns an HTTP error into a message suitable for showing to the user. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Cannot reach the server. Make sure the backend is running on port 5000.';
    }
    return error.error?.message || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
