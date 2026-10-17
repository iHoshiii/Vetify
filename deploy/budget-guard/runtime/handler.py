import json
import os
from datetime import datetime, timezone
from decimal import Decimal

from operations import snapshot, stop, targets


def make_clients():
    import boto3
    from botocore.config import Config
    config = Config(connect_timeout=3, read_timeout=5, retries={'max_attempts': 2})
    names = ['budgets', 'ssm', 'cloudformation', 'lambda', 'events', 'apigatewayv2', 'cloudfront']
    return {name: boto3.client(name, region_name='ap-southeast-2', config=config) for name in names}


def read_state(client, parameter):
    try:
        value = client.get_parameter(Name=parameter)['Parameter']['Value']
        return json.loads(value)
    except client.exceptions.ParameterNotFound:
        return None


def evaluate(event, clients, now):
    account = os.environ['ACCOUNT_ID']
    parameter = os.environ['STATE_PARAMETER']
    name = os.environ['BUDGET_NAME']
    state = read_state(clients['ssm'], parameter)
    budget = clients['budgets'].describe_budget(AccountId=account, BudgetName=name)['Budget']
    start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    planned = budget.get('PlannedBudgetLimits', {}).get(str(int(start.timestamp())))
    limit = planned or budget['BudgetLimit']
    spent = budget['CalculatedSpend']['ActualSpend']
    if limit['Unit'] != 'USD' or spent['Unit'] != 'USD':
        raise ValueError('Expected a USD cost budget')
    threshold = Decimal(limit['Amount']) * Decimal(os.environ.get('STOP_PERCENT', '80')) / 100
    if threshold <= 0:
        raise ValueError('Budget threshold must be positive')
    expired = budget['TimePeriod']['End'] <= now
    reached = Decimal(spent['Amount']) >= threshold
    required = bool(state and state.get('shutdown')) or reached or expired
    result = {'shutdown_required': required, 'spent': spent['Amount'], 'threshold': str(threshold)}
    if event.get('dry_run'):
        resources = targets(clients)
        snapshot(clients, resources, start.strftime('%Y-%m'))
        return {**result, 'target_counts': {
            'functions': len(resources['functions']), 'rules': len(resources['rules']),
            'apis': len(resources['apis']), 'distributions': 1,
        }}
    if not required:
        return result
    if not state or not state.get('shutdown'):
        state = snapshot(clients, targets(clients), start.strftime('%Y-%m'))
        value = json.dumps(state, separators=(',', ':'))
        if len(value.encode()) > 4096:
            raise ValueError('Shutdown recovery state exceeds the standard parameter limit')
        clients['ssm'].put_parameter(Name=parameter, Value=value, Type='String', Overwrite=True)
    stop(clients, state)
    return {**result, 'shutdown_applied': True}


def lambda_handler(event, context):
    result = evaluate(event, make_clients(), datetime.now(timezone.utc))
    print(json.dumps(result))
    return result
