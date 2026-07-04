import pkg from 'pg';
import dotenv from 'dotenv';
import dns from 'dns';

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

dotenv.config();

const { Client } = pkg;
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('DATABASE_URL não configurada no .env');
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false, sslmode: 'require' },
});

async function reset() {
  await client.connect();
  console.log('Conectado. Limpando dados...\n');

  const tables = [
    'planejamento_compras',
    'lancamentos_financeiros',
    'movimentacoes_produtos',
    'movimentacoes_materiais',
    'itens_pedido',
    'pedidos',
    'estoque_produtos',
    'fichas_tecnicas',
    'produtos',
    'materiais',
    'fornecedores',
    'clientes',
  ];

  for (const table of tables) {
    try {
      await client.query(`DELETE FROM ${table}`);
      console.log(`  ✔ ${table}`);
    } catch (err) {
      console.log(`  ✘ ${table}: ${err.message}`);
    }
  }

  console.log('\nReset concluído!');
  await client.end();
}

reset().catch(err => { console.error(err); process.exit(1); });
