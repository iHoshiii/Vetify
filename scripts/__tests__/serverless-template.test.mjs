import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { parseDocument } from 'yaml';

const source = readFileSync('deploy/serverless/template.yaml', 'utf8');
const customTags = ['Ref', 'Sub'].map((name) => ({
  tag: `!${name}`,
  resolve: (value) => ({ [name === 'Sub' ? 'Fn::Sub' : name]: value }),
}));
const document = parseDocument(source, { customTags });
const template = document.toJS();

test('only the HTTP Lambda can invoke the approved regional Bedrock models', () => {
  const policy = template.Resources.BackendFunction.Properties.Policies[1];
  assert.equal(policy.Statement[0].Action, 'bedrock:InvokeModel');
  assert.deepEqual(
    policy.Statement[0].Resource.map((value) => value['Fn::Sub']),
    [
      'arn:${AWS::Partition}:bedrock:${AWS::Region}::foundation-model/amazon.nova-lite-v1:0',
      'arn:${AWS::Partition}:bedrock:${AWS::Region}::foundation-model/amazon.nova-micro-v1:0',
    ]
  );
  const variables = template.Globals.Function.Environment.Variables;
  assert.deepEqual(variables.BEDROCK_REGION, { Ref: 'AWS::Region' });
  assert.equal(variables.GEMINI_API_KEY, undefined);
  for (const name of [
    'WebSocketFunction',
    'RealtimeMaintenanceFunction',
    'ClinicRefreshFunction',
  ]) {
    assert.doesNotMatch(
      JSON.stringify(template.Resources[name].Properties.Policies ?? []),
      /bedrock:/
    );
  }
});

test('gateway routes and permissions target the built handler and this API only', () => {
  assert.deepEqual(document.errors, []);
  assert.doesNotMatch(source, /&ConnectionPolicies|\*ConnectionPolicies/);
  const resources = template.Resources;
  const routes = Object.values(resources).filter(
    (resource) => resource.Type === 'AWS::ApiGatewayV2::Route'
  );
  assert.deepEqual(routes.map((route) => route.Properties.RouteKey).sort(), [
    '$connect',
    '$default',
    '$disconnect',
  ]);
  for (const route of routes) assert.deepEqual(route.Properties.ApiId, { Ref: 'RealtimeApi' });
  assert.equal(resources.RealtimeApi.Properties.ProtocolType, 'WEBSOCKET');
  assert.equal(resources.WebSocketFunction.Properties.Handler, 'websocket.handler');
  assert.equal(resources.GatewayPermission.Properties.Principal, 'apigateway.amazonaws.com');
  assert.match(resources.GatewayPermission.Properties.SourceArn['Fn::Sub'], /\$\{RealtimeApi\}/);
  const policy = resources.ConnectionPolicy.Properties.PolicyDocument.Statement[0];
  assert.equal(policy.Action, 'execute-api:ManageConnections');
  assert.match(policy.Resource['Fn::Sub'], /\$\{RealtimeApi\}\/prod\/\*\/@connections\/\*/);
});

test('durable cleanup is scheduled and deployable code excludes private configuration', () => {
  assert.equal(
    template.Resources.RealtimeMaintenanceFunction.Properties.Events.Sweep.Properties.Schedule,
    'rate(1 minute)'
  );
  assert.equal(template.Globals.Function.Runtime, 'nodejs24.x');
  assert.equal(template.Globals.Function.CodeUri, '../../dist/lambda/');
  assert.equal(template.Resources.AppLogGroup.Properties.RetentionInDays, 7);
  for (const name of ['http.js', 'websocket.js', 'maintenance.js', 'package-lock.json'])
    assert.ok(existsSync(`dist/lambda/${name}`), name);
  assert.ok(!existsSync('dist/lambda/book-pdf.worker.js'));
  for (const name of ['.env', 'env.prod', '.env.production'])
    assert.ok(!existsSync(`dist/lambda/${name}`), name);
  assert.match(
    template.Globals.Function.Environment.Variables.MONGODB_URI['Fn::Sub'],
    /resolve:secretsmanager:/
  );
});
