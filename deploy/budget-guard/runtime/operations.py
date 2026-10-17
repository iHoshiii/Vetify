import json


def targets(clients):
    backend = clients['cloudformation'].list_stack_resources(StackName='vetify-backend')
    frontend = clients['cloudformation'].describe_stacks(StackName='vetify-frontend')
    resources = backend['StackResourceSummaries']
    select = lambda kind: [r['PhysicalResourceId'] for r in resources if r['ResourceType'] == kind]
    outputs = frontend['Stacks'][0]['Outputs']
    distribution = next(o['OutputValue'] for o in outputs if o['OutputKey'] == 'DistributionId')
    return {
        'functions': select('AWS::Lambda::Function'),
        'rules': select('AWS::Events::Rule'),
        'apis': select('AWS::ApiGatewayV2::Api'),
        'distribution': distribution,
    }


def snapshot(clients, resources, month):
    state = {'shutdown': True, 'month': month, 'resources': resources}
    state['concurrency'] = {
        name: clients['lambda'].get_function_concurrency(FunctionName=name).get('ReservedConcurrentExecutions')
        for name in resources['functions']
    }
    state['rule_states'] = {
        name: clients['events'].describe_rule(Name=name)['State'] for name in resources['rules']
    }
    state['api_disabled'] = {
        api: clients['apigatewayv2'].get_api(ApiId=api).get('DisableExecuteApiEndpoint', False)
        for api in resources['apis']
    }
    config = clients['cloudfront'].get_distribution_config(Id=resources['distribution'])
    state['distribution_enabled'] = config['DistributionConfig']['Enabled']
    return state


def stop(clients, state):
    resources = state['resources']
    failures = []

    def attempt(name, operation, **arguments):
        try:
            operation(**arguments)
        except Exception as error:
            failures.append(name)
            print(json.dumps({'operation': name, 'error_type': type(error).__name__}))

    for name in resources['functions']:
        attempt(name, clients['lambda'].put_function_concurrency, FunctionName=name, ReservedConcurrentExecutions=0)
    for name in resources['rules']:
        attempt(name, clients['events'].disable_rule, Name=name)
    for api in resources['apis']:
        attempt(api, clients['apigatewayv2'].update_api, ApiId=api, DisableExecuteApiEndpoint=True)

    def disable_distribution():
        response = clients['cloudfront'].get_distribution_config(Id=resources['distribution'])
        config = response['DistributionConfig']
        if config['Enabled']:
            config['Enabled'] = False
            clients['cloudfront'].update_distribution(
                Id=resources['distribution'], IfMatch=response['ETag'], DistributionConfig=config
            )

    attempt('cloudfront', disable_distribution)
    if failures:
        raise RuntimeError('Shutdown incomplete; the next scheduled check will retry: ' + ', '.join(failures))
