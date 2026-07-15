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

async function clear() {
  await client.connect();
  console.log('Limpando movimentações e pedidos...\n');

  const operations = [
    ['DELETE FROM movimentacoes_produtos', 'movimentacoes_produtos'],
    ['DELETE FROM movimentacoes_materiais', 'movimentacoes_materiais'],
    ['DELETE FROM itens_pedido', 'itens_pedido'],
    ['DELETE FROM lancamentos_financeiros', 'lancamentos_financeiros'],
    ['DELETE FROM pedidos', 'pedidos'],
    ['DELETE FROM planejamento_compras', 'planejamento_compras'],
    ['UPDATE estoque_produtos SET quantidade_disponivel = 0, data_atualizacao = NOW()', 'estoque_produtos (zerado)'],
  ];

  for (const [sql, label] of operations) {
    try {
      await client.query(sql);
      console.log(`  ✔ ${label}`);
    } catch (err) {
      console.log(`  ✘ ${label}: ${err.message}`);
    }
  }

  console.log('\nPronto! Movimentações zeradas e estoque resetado.');
  await client.end();
}

clear().catch(err => { console.error(err); process.exit(1); });
