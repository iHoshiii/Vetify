import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function assertBudgetOpen(run = execFileSync) {
  let value;
  try {
    value = run(
      'aws',
      [
        'ssm',
        'get-parameter',
        '--name',
        '/vetify/monthly-budget-stop',
        '--query',
        'Parameter.Value',
        '--output',
        'text',
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
  } catch (error) {
    if (String(error.stderr).includes('(ParameterNotFound)')) return;
    throw new Error('Cannot verify the budget shutdown state. Deployment stopped.', {
      cause: error,
    });
  }
  const state = JSON.parse(value);
  if (state?.shutdown !== false) {
    throw new Error('Monthly budget shutdown is active or invalid. Restore it before deploying.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    assertBudgetOpen();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
