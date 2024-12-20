// db.ts

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'realtor-boost',
  password: '456789',
  port: 8001,
});

// const pool = new Pool({
//   user: 'postgres',
//   host: 'localhost',
//   database: 'realtorboost',
//   password: '@123Web',
//   port: 5432,
// });
export const query = (text: string, params: any[]) => pool.query(text, params);
export default pool;
