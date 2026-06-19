"""
run_migration.py — Master migration terminal execution script

Usage:
    python scripts/run_migration.py <migration_name>

Example:
    python scripts/run_migration.py 2026_06_18_init_pet_avatar_defaults
"""

import importlib
import sys


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/run_migration.py <migration_module_name>")
        sys.exit(1)

    module_name = sys.argv[1]
    full_module = f"scripts.migrations.{module_name}"

    try:
        migration = importlib.import_module(full_module)
    except ModuleNotFoundError:
        print(f"Migration module '{full_module}' not found.")
        sys.exit(1)

    if not hasattr(migration, "up"):
        print(f"Migration module '{full_module}' has no 'up()' function.")
        sys.exit(1)

    print(f"Running migration: {module_name}")
    migration.up()
    print("Migration complete.")


if __name__ == "__main__":
    main()
