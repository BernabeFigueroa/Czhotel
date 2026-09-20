import { pool } from './PostgresPool';

const deviceMapping: Record<number, string> = {
  1: 'ebc2e79856c2a946c7jrhp', // WiFi Smart Switch H1 N
  2: 'eb285aba321fe3b091pkel', // WiFi Smart Switch H2 N
  3: 'eb9bbcd29522d927e7eapc', // WiFi Smart Switch H3 N
  4: 'eb8482480240d1a852dg3o', // WiFi Smart Switch H4 N
  5: 'eb78869a1a965cc445jxa3', // WiFi Smart Switch H5 N
  6: 'eba5cc44a5dd0378cbsyyw', // WiFi Smart Switch H6 N
  7: 'eb866d4b5d03b6c310o5cn', // WiFi Smart Switch H7 N
  8: 'eb36b1c6af1ca09237lsyl', // WiFi Smart Switch H8 N
  9: 'ebe70903e21bca1475fsoz', // WiFi Smart Switch H9 N
  10: 'ebd853b1706edd011fm0bd', // WiFi Smart Switch H10 N
  11: 'eb16152b0bbd0656a6hbyf', // WiFi Smart Switch H11 N
  12: 'eb29e7b3a0e41c69fbln8w', // WiFi Smart Switch H12 N
  13: 'ebaa3ea7f9a34f08abskqy', // WiFi Smart Switch H13 N
  14: 'eb31e1fd41680bbfcccub2', // WiFi Smart Switch H14 N
  15: 'eb7e0462c22005c6f71upw', // WiFi Smart Switch H15 N
  16: 'ebbbce6143704a200e8f5g', // WiFi Smart Switch H16 N
  17: 'eb4d860c54b2006d7bkfbu', // WiFi Smart Switch H17 N
  18: 'eb86e40a8976b0d8fbqzyc'  // WiFi Smart Switch H18 N
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
