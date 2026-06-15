import { Pool } from 'pg';

export const deleteTextTemplate = async (pool: Pick<Pool, 'connect'>, id: string) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      'DELETE FROM offer_text_selections WHERE text_template_id = $1',
      [id]
    );
    await client.query(
      'UPDATE offers SET text_template_id = NULL WHERE text_template_id = $1',
      [id]
    );

    const result = await client.query(
      'DELETE FROM text_templates WHERE id = $1 RETURNING id',
      [id]
    );

    await client.query('COMMIT');
    return result.rowCount || 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
