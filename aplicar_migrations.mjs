import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import dns from 'dns';

// Força o Node.js a priorizar resoluções IPv4 em vez de IPv6 (evita erros ECONNREFUSED em ambientes IPv4)
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

// Carrega variáveis de ambiente do .env
dotenv.config();

const { Client } = pkg;
const dbUrl = process.env.DATABASE_URL;

if (dbUrl) {
  const masked = dbUrl.replace(/:([^:@]+)@/, ':***@');
  console.log(`🔌 Carregado DATABASE_URL (${dbUrl.length} caracteres): ${masked}`);
  
  try {
    const parsed = new URL(dbUrl);
    console.log(`⚙️ Host: ${parsed.hostname} | Porta: ${parsed.port || '5432'} | Usuário: ${parsed.username}`);
  } catch (e) {
    // Ignora se não for formato URL válido
  }
}

if (!dbUrl) {
  console.error('\n❌ Erro: A variável de ambiente DATABASE_URL não foi configurada no arquivo .env.');
  console.log('--------------------------------------------------------------------------------');
  console.log('Para resolver isso, obtenha sua Connection String no painel do Supabase:');
  console.log('1. Vá em Project Settings > Database > Connection String (modo Session ou Direct)');
  console.log('2. Copie o link (URI) no formato postgresql://postgres:[SUA-SENHA]@...');
  console.log('3. Cole-o no seu arquivo local .env como DATABASE_URL=...\n');
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false // Requerido por segurança nas conexões do Supabase SSL
  }
});

async function runMigrations() {
  console.log('--------------------------------------------------');
  console.log('🚀 Mini-Factory: Iniciador de Migrations Supabase');
  console.log('--------------------------------------------------');
  console.log('🔌 Conectando ao Banco de Dados...');
  
  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL com sucesso!');

    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.error(`❌ Pasta de migrations não encontrada: ${migrationsDir}`);
      process.exit(1);
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Garante execução cronológica por timestamp/nome

    if (files.length === 0) {
      console.log('ℹ️ Nenhuma migration (.sql) encontrada na pasta.');
      return;
    }

    console.log(`\n📂 Encontrada(s) ${files.length} migation(s) para processar:`);
    files.forEach(f => console.log(`  - ${f}`));

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log(`\n⏳ Executando: ${file}...`);
      
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Rodando cada script encapsulado em uma transações para segurança
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`✨ Transação COMMIT: Migration ${file} concluída.`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ ROLLBACK: Erro ao injetar script de ${file}:`);
        console.error(`   ${err.message}`);
        throw err;
      }
    }

    console.log('\n======================================================');
    console.log('🎉 SUCESSO: Banco de Dados de Salgados & Bolos está pronto!');
    console.log('======================================================\n');

  } catch (error) {
    console.error('\n💥 Falha crítica na execução das migrations:', error.message || error);
    
    // Tratamento de ajuda amigável para problemas comuns de conexão do Supabase
    if (error.message && error.message.includes('password authentication failed')) {
      console.log('\n🔐 DICA DE SEGURANÇA:');
      console.log('O erro indica senha inválida para o usuário "postgres".');
      console.log('Verifique se a sua senha não contém caracteres especiais não codificados.');
      console.log('Se sua senha possui caracteres como @, !, #, etc., ela precisa estar URL Encoded, ou use uma senha com apenas letras e números.');
    } else if (error.code === 'ECONNREFUSED' || error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
      console.log('\n🌐 DICA DE CONEXÃO IPV4 vs IPV6:');
      console.log('Projetos novos do Supabase (criados a partir de 2024) não possuem IPv4 público direto na porta 5432 por padrão.');
      console.log('Como o nosso container roda em IPv4, a conexão direta pode falhar com ECONNREFUSED ou ETIMEDOUT.');
      console.log('👉 SOLUÇÃO: Use a string de conexão do Connection Pooler (geralmente porta 6543) com modo "Session".');
      console.log('Formato do Connection Pooler:');
      console.log('postgresql://postgres.[SEU_REF_DO_PROJETO]:[SENHA]@aws-0-[REGIAO].pooler.supabase.com:6543/postgres?sslmode=require');
    }
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
