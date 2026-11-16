import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_subject" varchar;
    CREATE UNIQUE INDEX IF NOT EXISTS "users_google_subject_idx" ON "users" ("google_subject");
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "prefix" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN "google_subject";`)
}
