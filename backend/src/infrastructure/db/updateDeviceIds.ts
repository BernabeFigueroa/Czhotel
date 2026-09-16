import { pool } from './PostgresPool';

const deviceMapping: Record<number, string> = {
  1: 'ebe0b5aeb9b9e39ca6qzzj',
  2: 'eba5791c242f2d8f0eyldp',
  3: 'eb8aaa710219685a89ijfx',
  4: 'eba81db69978c13331t9ab',
  5: 'eb78869a1a965cc445jxa3',
  6: 'eb669c425b04001ef5vteb',
  7: 'eb18faef6977ee5896mkoq',
  8: 'eb36b1c6af1ca09237lsyl',
  9: 'ebe0a8a7572fa9c2eekxvk',
  10: 'eb2a89a4cd961975a7sain',
  11: 'eb537d670d280e6aa8kxrg',
  12: 'eb44d31c8c249aa6bd7k18',
  13: 'ebcc893b7a30062a77ztaq',
  14: 'eb66ce5dfe9f547a2d8rmm',
  15: 'eb851e85be1f0db4201yfc',
  16: 'eb23e9773a0be01258aot2',
  17: 'eb044cf73f4fcc22aesrau',
  18: 'eb43117e7fdcb18899gtlg'
};

async function updateDeviceIds() {
  console.log('🔄 Actualizando mapeo de relés Tuya en Neon para las 18 habitaciones...');
  try {
    for (const [habNum, devId] of Object.entries(deviceMapping)) {
      await pool.query(
        `UPDATE habitaciones 
         SET tuya_device_id = $1, updated_at = NOW() 
         WHERE id = $2`,
        [devId, parseInt(habNum, 10)]
      );
    }
    console.log('✅ Las 18 habitaciones fueron asociadas con sus Device IDs reales.');

    const res = await pool.query('SELECT id, nombre, tuya_device_id, estado_actual FROM habitaciones ORDER BY id ASC');
    console.table(res.rows);
  } catch (err: any) {
    console.error('❌ Error actualizando Device IDs:', err.message);
  } finally {
    await pool.end();
  }
}

updateDeviceIds();
