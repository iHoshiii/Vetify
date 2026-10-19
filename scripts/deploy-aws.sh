#!/usr/bin/env bash
set -euo pipefail

: "${AWS_ARTIFACT_BUCKET:?Missing AWS artifact bucket}"
: "${AWS_CFN_ROLE_ARN:?Missing CloudFormation execution role}"
test "${GITHUB_REF:-}" = refs/heads/main
test "${GITHUB_EVENT_NAME:-}" = push
test "$(cat release/revision.txt)" = "$GITHUB_SHA"
test "$(aws sts get-caller-identity --query Account --output text)" = 223703743978
node scripts/check-budget.mjs

backend=$(aws cloudformation describe-stacks --stack-name vetify-backend)
frontend=$(aws cloudformation describe-stacks --stack-name vetify-frontend)
parameter() { jq -er --arg key "$2" '.Stacks[0].Parameters[] | select(.ParameterKey == $key) | .ParameterValue' <<< "$1"; }
output() { jq -er --arg key "$2" '.Stacks[0].Outputs[] | select(.OutputKey == $key) | .OutputValue' <<< "$1"; }
secret_arn=$(parameter "$backend" AppSecretArn)
config_revision=$(parameter "$backend" ConfigRevision)
shared_auth_enabled=$(jq -r '.Stacks[0].Parameters | map(select(.ParameterKey == "SharedAuthEnabled")) | .[0].ParameterValue // "false"' <<< "$backend")
certificate_arn=$(parameter "$frontend" CertificateArn)
test "$(parameter "$frontend" DomainName)" = vetify.page
expected_realtime=$(sed -n 's/^VITE_REALTIME_URL=//p' release/deploy/github/frontend-build.env)
test -n "$expected_realtime"
test "$(output "$backend" RealtimeUrl)" = "$expected_realtime"

sam build --template-file release/deploy/serverless/template.yaml --build-dir .aws-sam/github-build
node scripts/check-budget.mjs
sam deploy --template-file .aws-sam/github-build/template.yaml \
  --stack-name vetify-backend --s3-bucket "$AWS_ARTIFACT_BUCKET" --s3-prefix vetify-ci \
  --role-arn "$AWS_CFN_ROLE_ARN" --capabilities CAPABILITY_IAM \
  --parameter-overrides "AppSecretArn=$secret_arn" ClientOrigin=https://vetify.page "ConfigRevision=$config_revision" "SharedAuthEnabled=$shared_auth_enabled" \
  --no-confirm-changeset --no-fail-on-empty-changeset

backend=$(aws cloudformation describe-stacks --stack-name vetify-backend)
test "$(output "$backend" RealtimeUrl)" = "$expected_realtime"
api_url=$(output "$backend" HttpApiUrl)
api_hostname=${api_url#https://}
[[ "$api_hostname" =~ ^[a-z0-9]+\.execute-api\.ap-southeast-2\.amazonaws\.com$ ]]
curl --fail --silent --show-error --retry 3 --retry-all-errors --max-time 40 \
  "$api_url/api/v1/health" | jq -e '.status == "ok" and .db == "connected"' > /dev/null

bucket=$(output "$frontend" WebsiteBucketName)
distribution=$(output "$frontend" DistributionId)
test "$bucket" = vetify-main-web-223703743978-ap-southeast-2
node scripts/check-budget.mjs
aws s3 sync release/dist/client "s3://$bucket" --exclude '*.html' \
  --cache-control public,max-age=3600 --no-progress --only-show-errors
aws s3 cp release/dist/client "s3://$bucket" --recursive --exclude '*' --include '*.html' --exclude index.html \
  --content-type text/html --cache-control no-cache --no-progress --only-show-errors
node scripts/check-budget.mjs
aws cloudformation deploy --template-file release/deploy/frontend/template.yaml \
  --stack-name vetify-frontend --role-arn "$AWS_CFN_ROLE_ARN" \
  --parameter-overrides "ApiHostname=$api_hostname" "CertificateArn=$certificate_arn" DomainName=vetify.page UseCustomDomain=true \
  --no-fail-on-empty-changeset
node scripts/check-budget.mjs
aws s3 cp release/dist/client/index.html "s3://$bucket/index.html" \
  --content-type text/html --cache-control no-cache --no-progress --only-show-errors
invalidation=$(aws cloudfront create-invalidation --distribution-id "$distribution" \
  --paths '/*' --query Invalidation.Id --output text)
aws cloudfront wait invalidation-completed --distribution-id "$distribution" --id "$invalidation"
printf 'Deployed main Vetify revision %s to https://vetify.page\n' "$GITHUB_SHA"
