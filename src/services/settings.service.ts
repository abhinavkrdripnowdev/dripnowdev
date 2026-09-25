import { Knex } from 'knex';
import { db } from '../config/database';
export async function platformSettings(connection: Knex = db): Promise<Record<string, number>> {
  const rows = await connection('platform_settings').select('*');
  return Object.fromEntries(rows.map(row => [row.key, Number(row.value)]));
}
