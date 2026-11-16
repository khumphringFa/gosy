import * as migration_20260922_052125_new from './20260922_052125_new';
import * as migration_20261116_google_subject from './20261116_google_subject';

export const migrations = [
  {
    up: migration_20260922_052125_new.up,
    down: migration_20260922_052125_new.down,
    name: '20260922_052125_new'
  },
  { ...migration_20261116_google_subject, name: '20261116_google_subject' },
];
