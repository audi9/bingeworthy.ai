
from logging.config import fileConfig
import os, sys
from sqlalchemy import engine_from_config, pool
from alembic import context
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from database import metadata
config = context.config
fileConfig(config.config_file_name)
db_url = os.getenv('DATABASE_URL', "sqlite:///./bingeworthy.db")
config.set_main_option('sqlalchemy.url', db_url)
target_metadata = metadata
def run_migrations_offline():
    context.configure(url=db_url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
def run_migrations_online():
    connectable = engine_from_config(config.get_section(config.config_ini_section), prefix='sqlalchemy.', poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
