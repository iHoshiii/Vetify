import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseDocument } from 'yaml';

const read = (path) => readFileSync(path, 'utf8');
const ci = parseDocument(read('.github/workflows/ci.yml')).toJS();
const deploy = parseDocument(read('.github/workflows/deploy-aws.yml')).toJS();
const bootstrapSource = read('deploy/github/bootstrap.yaml');
const tags = ['Ref', 'Sub', 'GetAtt'].map((name) => ({
  tag: `!${name}`,
  resolve: (value) => value,
}));
tags.push(
  ...['If', 'Equals'].map((name) => ({
    tag: `!${name}`,
    collection: 'seq',
    resolve: (value) => value.toJSON(),
  }))
);
const bootstrap = parseDocument(bootstrapSource, { customTags: tags });
const resources = bootstrap.toJS().Resources;

test('only pushes and merges into main trigger automatic CI and deployment', () => {
  assert.deepEqual(Object.keys(ci.on), ['push']);
  assert.deepEqual(ci.on.push.branches, ['main']);
  for (const job of Object.values(ci.jobs)) {
    assert.equal(job.if, "github.ref == 'refs/heads/main' && github.event_name == 'push'");
  }
  assert.equal(
    deploy.jobs.production.if,
    "github.ref == 'refs/heads/main' && github.event_name == 'push'"
  );
});

test('the local deployment workflow exists and declares the reusable entry point', () => {
  assert.equal(ci.jobs.deploy.uses, './.github/workflows/deploy-aws.yml');
  assert.ok(Object.hasOwn(deploy.on, 'workflow_call'));
  assert.deepEqual(Object.keys(deploy.on), ['workflow_call']);
});

test('production deployment requires all CI gates and a trusted main event', () => {
  assert.deepEqual(ci.jobs.deploy.needs.sort(), ['aws-artifacts', 'checks', 'e2e-tests']);
  assert.match(ci.jobs.deploy.if, /github\.ref == 'refs\/heads\/main'/);
  assert.match(ci.jobs.deploy.if, /github\.event_name == 'push'/);
  assert.doesNotMatch(ci.jobs.deploy.if, /vars\.|workflow_dispatch/);
  assert.equal(ci.jobs.deploy.permissions['id-token'], undefined);
  assert.equal(deploy.permissions['id-token'], undefined);
  assert.equal(ci.jobs.checks.permissions?.['id-token'], undefined);
  assert.equal(deploy.concurrency['cancel-in-progress'], false);
  assert.equal(ci.concurrency['cancel-in-progress'], false);
});

test('deployment requires and uses the configured AWS secrets', () => {
  const names = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_CFN_ROLE_ARN',
    'AWS_ARTIFACT_BUCKET',
  ];
  assert.deepEqual(Object.keys(ci.jobs.deploy.secrets).sort(), [...names].sort());
  assert.deepEqual(Object.keys(deploy.on.workflow_call.secrets).sort(), [...names].sort());
  for (const name of names) {
    assert.equal(ci.jobs.deploy.secrets[name], '${{ secrets.' + name + ' }}');
    assert.equal(deploy.on.workflow_call.secrets[name].required, true);
    if (!name.includes('ACCESS_KEY')) {
      assert.equal(deploy.jobs.production.env[name], '${{ secrets.' + name + ' }}');
    }
  }
  const credentials = deploy.jobs.production.steps.find((step) =>
    step.uses?.startsWith('aws-actions/configure-aws-credentials@')
  );
  assert.equal(credentials.with['aws-access-key-id'], '${{ secrets.AWS_ACCESS_KEY_ID }}');
  assert.equal(credentials.with['aws-secret-access-key'], '${{ secrets.AWS_SECRET_ACCESS_KEY }}');
  assert.equal(credentials.with['allowed-account-ids'], '223703743978');
  assert.equal(credentials.with['role-to-assume'], undefined);
});

test('AWS artifacts include Lambda smoke and use isolated public frontend settings', () => {
  const commands = ci.jobs['aws-artifacts'].steps.map((step) => step.run || '').join('\n');
  assert.match(commands, /npm run build:lambda/);
  assert.match(commands, /npm run test:lambda/);
  assert.match(commands, /--env-file=deploy\/github\/frontend-build\.env/);
  assert.match(commands, /cp -R dist\/client dist\/lambda release\/dist/);
  assert.doesNotMatch(commands, /cp .*\.env(?:\s|$)/m);
  assert.match(commands, /git rev-parse HEAD > release\/revision\.txt/);
  for (const name of ['checks', 'e2e-tests']) assert.ok(ci.jobs[name]);
});

test('GitHub OIDC trusts only this repository main branch and deployment role cannot read secrets', () => {
  assert.deepEqual(bootstrap.errors, []);
  assert.deepEqual(bootstrap.warnings, []);
  const role = resources.GitHubDeployRole.Properties;
  const trust = role.AssumeRolePolicyDocument.Statement[0];
  assert.equal(trust.Action, 'sts:AssumeRoleWithWebIdentity');
  assert.deepEqual(trust.Condition.StringEquals, {
    'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
    'token.actions.githubusercontent.com:sub': 'repo:iHoshiii/Vetify:ref:refs/heads/main',
  });
  assert.doesNotMatch(JSON.stringify(role.Policies), /secretsmanager:|AdministratorAccess/);
  const execution = JSON.stringify(resources.CloudFormationRole.Properties.Policies);
  assert.doesNotMatch(
    execution,
    /iam:(?:CreateRole|PutRolePolicy|AttachRolePolicy)|AdministratorAccess/
  );
});

test('deployment preserves runtime configuration, uploads assets before HTML and invalidates cache', () => {
  const script = read('scripts/deploy-aws.sh');
  assert.ok(script.includes('test "${GITHUB_REF:-}" = refs/heads/main'));
  assert.ok(script.includes('test "${GITHUB_EVENT_NAME:-}" = push'));
  assert.match(script, /ConfigRevision/);
  assert.match(script, /AppSecretArn/);
  assert.match(script, /get-caller-identity/);
  assert.match(script, /test .*RealtimeUrl.*expected_realtime/);
  assert.ok(script.indexOf('aws s3 sync') < script.indexOf('aws s3 cp'));
  assert.match(script, /cloudfront wait invalidation-completed/);
  assert.doesNotMatch(script, /s3 sync[^\n]*--delete|get-secret-value|\.env\.prod/);
});

test('access-key setup grants scoped deployment access without creating an identity provider', () => {
  const doc = parseDocument(read('deploy/github/access-key-bootstrap.yaml'), { customTags: tags });
  assert.deepEqual(doc.errors, []);
  assert.deepEqual(doc.warnings, []);
  const setup = doc.toJS().Resources;
  assert.deepEqual(Object.keys(setup).sort(), ['CloudFormationRole', 'GitHubAccessKeyPolicy']);
  const access = setup.GitHubAccessKeyPolicy.Properties;
  assert.deepEqual(access.Users, ['GitHubUserName']);
  assert.doesNotMatch(JSON.stringify(access.PolicyDocument), /secretsmanager:|AdministratorAccess/);
  const executionStatements =
    setup.CloudFormationRole.Properties.Policies[0].PolicyDocument.Statement;
  const transform = executionStatements.find((s) => s.Action === 'cloudformation:CreateChangeSet');
  assert.equal(transform?.Effect, 'Allow');
  assert.equal(
    transform?.Resource,
    'arn:${AWS::Partition}:cloudformation:${AWS::Region}:aws:transform/Serverless-2016-10-31'
  );
  assert.doesNotMatch(
    JSON.stringify(setup.CloudFormationRole.Properties.Policies),
    /iam:(?:CreateRole|PutRolePolicy|AttachRolePolicy)|AdministratorAccess/
  );
});

test('all externally maintained workflow actions use immutable revisions', () => {
  for (const workflow of [ci, deploy]) {
    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps || []) {
        if (step.uses) assert.match(step.uses, /^[\w-]+\/[\w-]+@[a-f0-9]{40}$/);
      }
    }
  }
});
