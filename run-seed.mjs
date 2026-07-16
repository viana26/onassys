import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import dns from 'dns';

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
dotenv.config();

const { Client } = pkg;
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('DATABASE_URL não configurada no .env'); process.exit(1); }

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  const seedFile = process.argv[2];
  if (!seedFile) {
    console.error('Uso: node run-seed.mjs <arquivo.sql>');
    console.error('Exemplo: node run-seed.mjs seed_test.sql');
    process.exit(1);
  }
  const filePath = path.join('supabase', seedFile);
  if (!fs.existsSync(filePath)) {
    console.error(`Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }
  const sql = fs.readFileSync(filePath, 'utf8');
  await client.query(sql);
  console.log(`Seed ${seedFile} executado com sucesso.`);
  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
