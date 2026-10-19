import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseDocument } from 'yaml';

const tags = ['Ref', 'Sub', 'GetAtt'].map((name) => ({
  tag: `!${name}`,
  resolve: (value) => value,
}));
function template(path) {
  const doc = parseDocument(readFileSync(path, 'utf8'), { customTags: tags });
  assert.deepEqual(doc.errors, []);
  assert.deepEqual(doc.warnings, []);
  return doc.toJS();
}

test('the guard checks every fifteen minutes at the approved eighty percent threshold', () => {
  const resources = template('deploy/budget-guard/template.yaml').Resources;
  const guard = resources.Guard.Properties;
  assert.equal(guard.Environment.Variables.STOP_PERCENT, '80');
  assert.equal(guard.Events.Check.Properties.Schedule, 'rate(15 minutes)');
  assert.equal(guard.FunctionName, 'vetify-budget-guard');
  const statements = resources.GuardRole.Properties.Policies[0].PolicyDocument.Statement;
  const concurrency = statements.find((s) => s.Action.includes('lambda:PutFunctionConcurrency'));
  assert.match(concurrency.Resource, /function:vetify-backend-\*$/);
  assert.doesNotMatch(
    JSON.stringify(statements),
    /AdministratorAccess|iam:|s3:Delete|budgets:Modify/
  );
});

test('deployment can read the shutdown flag but cannot remove or overwrite it', () => {
  const resources = template('deploy/github/access-key-bootstrap.yaml').Resources;
  const statements = resources.GitHubAccessKeyPolicy.Properties.PolicyDocument.Statement;
  const flag = statements.filter((s) => JSON.stringify(s.Action).includes('ssm:'));
  assert.equal(flag.length, 1);
  assert.equal(flag[0].Action, 'ssm:GetParameter');
  assert.match(flag[0].Resource, /parameter\/vetify\/monthly-budget-stop$/);
  const script = readFileSync('scripts/deploy-aws.sh', 'utf8');
  assert.ok(script.indexOf('node scripts/check-budget.mjs') < script.indexOf('sam build'));
  assert.equal(script.match(/node scripts\/check-budget.mjs/g).length, 5);
});

test('the budget action can only attach or detach AWSDenyAll for the application identities', () => {
  const policy = template('deploy/budget-guard/template.yaml').Resources.BudgetActionPermissions.Properties;
  assert.deepEqual(policy.Roles, ['AWSBudgetsActionRole']);
  for (const statement of policy.PolicyDocument.Statement) {
    assert.match(statement.Condition.ArnEquals['iam:PolicyARN'], /:iam::aws:policy\/AWSDenyAll$/);
    assert.ok(statement.Action.every((action) => /^iam:(Attach|Detach)(User|Role)Policy$/.test(action)));
    assert.doesNotMatch(JSON.stringify(statement.Resource), /vetify-budget-guard|AWSBudgetsActionRole/);
  }
});
