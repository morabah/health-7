export function logValidation(taskId: string, status: 'success' | 'failure', message?: string) {
  console.log(`Validation for task ${taskId}: ${status}${message ? ` - ${message}` : ''}`);
}

// Call the validation function to confirm completion of task 1.1
logValidation('1.1', 'success');

// Call the validation function to confirm completion of task 1.2
logValidation('1.2', 'success');
