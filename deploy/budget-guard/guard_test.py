import json
import os
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent / 'runtime'))
import handler
import operations


class MissingParameter(Exception):
    pass


class BudgetGuardTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, {
            'ACCOUNT_ID': '223703743978', 'STATE_PARAMETER': '/vetify/monthly-budget-stop',
            'BUDGET_NAME': 'vetify-monthly', 'STOP_PERCENT': '80',
        })
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.now = datetime(2026, 10, 17, tzinfo=timezone.utc)
        self.clients = {name: MagicMock() for name in [
            'budgets', 'ssm', 'cloudformation', 'lambda', 'events', 'apigatewayv2', 'cloudfront',
        ]}
        self.clients['ssm'].exceptions = SimpleNamespace(ParameterNotFound=MissingParameter)
        self.clients['ssm'].get_parameter.side_effect = MissingParameter()
        self.budget = {
            'BudgetLimit': {'Amount': '25', 'Unit': 'USD'},
            'CalculatedSpend': {'ActualSpend': {'Amount': '19.99', 'Unit': 'USD'}},
            'TimePeriod': {'End': datetime(2027, 6, 1, tzinfo=timezone.utc)},
        }
        self.clients['budgets'].describe_budget.return_value = {'Budget': self.budget}
        self.resources = {
            'functions': ['vetify-backend-http', 'vetify-backend-realtime'],
            'rules': ['vetify-backend-refresh'], 'apis': ['http', 'websocket'],
            'distribution': 'distribution',
        }
        self.state = {'shutdown': True, 'month': '2026-10', 'resources': self.resources}
        self.patches = [
            patch.object(handler, 'targets', return_value=self.resources),
            patch.object(handler, 'snapshot', return_value=self.state),
            patch.object(handler, 'stop'),
        ]
        self.targets, self.snapshot, self.stop = [item.start() for item in self.patches]
        for item in self.patches:
            self.addCleanup(item.stop)

    def evaluate(self, **event):
        return handler.evaluate(event, self.clients, self.now)

    def test_under_budget_never_changes_application_resources(self):
        self.assertFalse(self.evaluate()['shutdown_required'])
        self.clients['ssm'].put_parameter.assert_not_called()
        self.targets.assert_not_called()
        self.stop.assert_not_called()

    def test_exactly_eighty_percent_saves_recovery_state_before_stopping(self):
        self.budget['CalculatedSpend']['ActualSpend']['Amount'] = '20'
        self.assertTrue(self.evaluate()['shutdown_applied'])
        stored = self.clients['ssm'].put_parameter.call_args.kwargs
        self.assertEqual(json.loads(stored['Value']), self.state)
        self.stop.assert_called_once_with(self.clients, self.state)

    def test_planned_one_dollar_month_stops_at_eighty_cents(self):
        self.now = datetime(2027, 4, 1, tzinfo=timezone.utc)
        key = str(int(self.now.timestamp()))
        self.budget['PlannedBudgetLimits'] = {key: {'Amount': '1', 'Unit': 'USD'}}
        self.budget['CalculatedSpend']['ActualSpend']['Amount'] = '0.80'
        self.assertTrue(self.evaluate()['shutdown_applied'])

    def test_dry_run_never_saves_or_stops_even_above_budget(self):
        self.budget['CalculatedSpend']['ActualSpend']['Amount'] = '26'
        self.assertTrue(self.evaluate(dry_run=True)['shutdown_required'])
        self.clients['ssm'].put_parameter.assert_not_called()
        self.stop.assert_not_called()

    def test_existing_shutdown_is_enforced_without_overwriting_original_settings(self):
        self.clients['ssm'].get_parameter.side_effect = None
        self.clients['ssm'].get_parameter.return_value = {'Parameter': {'Value': json.dumps(self.state)}}
        self.assertTrue(self.evaluate()['shutdown_applied'])
        self.snapshot.assert_not_called()
        self.clients['ssm'].put_parameter.assert_not_called()
        self.stop.assert_called_once_with(self.clients, self.state)

    def test_expired_budget_stops_instead_of_leaving_the_app_unprotected(self):
        self.now = datetime(2027, 6, 2, tzinfo=timezone.utc)
        self.assertTrue(self.evaluate()['shutdown_applied'])

    def test_access_failure_does_not_count_as_an_unset_shutdown_flag(self):
        self.clients['ssm'].get_parameter.side_effect = PermissionError('denied')
        with self.assertRaises(PermissionError):
            self.evaluate()
        self.clients['ssm'].put_parameter.assert_not_called()

    def test_snapshot_keeps_original_settings_for_manual_recovery(self):
        self.clients['lambda'].get_function_concurrency.return_value = {}
        self.clients['events'].describe_rule.return_value = {'State': 'ENABLED'}
        self.clients['apigatewayv2'].get_api.return_value = {'DisableExecuteApiEndpoint': False}
        self.clients['cloudfront'].get_distribution_config.return_value = {
            'ETag': 'version', 'DistributionConfig': {'Enabled': True},
        }
        state = operations.snapshot(self.clients, self.resources, '2026-10')
        self.assertIsNone(state['concurrency']['vetify-backend-http'])
        self.assertTrue(state['distribution_enabled'])
        self.assertEqual(state['rule_states']['vetify-backend-refresh'], 'ENABLED')

    def test_one_stop_failure_does_not_prevent_other_resources_being_stopped(self):
        self.clients['lambda'].put_function_concurrency.side_effect = [PermissionError(), None]
        self.clients['cloudfront'].get_distribution_config.return_value = {
            'ETag': 'version', 'DistributionConfig': {'Enabled': True},
        }
        with self.assertRaisesRegex(RuntimeError, 'Shutdown incomplete'):
            operations.stop(self.clients, self.state)
        self.assertEqual(self.clients['lambda'].put_function_concurrency.call_count, 2)
        self.assertEqual(self.clients['apigatewayv2'].update_api.call_count, 2)
        self.clients['events'].disable_rule.assert_called_once()
        self.clients['cloudfront'].update_distribution.assert_called_once()


if __name__ == '__main__':
    unittest.main()
