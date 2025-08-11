
from alembic import op
import sqlalchemy as sa

revision = '0001_initial'
down_revision = None

def upgrade():
    op.create_table('admin_users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('username', sa.String(), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(), nullable=False),
    )
    op.create_table('settings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('search_fields', sa.JSON(), nullable=True),
        sa.Column('card_fields', sa.JSON(), nullable=True),
    )
    op.create_table('cache',
        sa.Column('key', sa.String(), primary_key=True),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
    )

def downgrade():
    op.drop_table('cache')
    op.drop_table('settings')
    op.drop_table('admin_users')
