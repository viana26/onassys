import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createClient('https://placeholder.supabase.co', 'placeholder');

export const supabaseAdmin: SupabaseClient = supabaseUrl && supabaseServiceRoleKey 
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : createClient('https://placeholder.supabase.co', 'placeholder');

export interface Perfil {
    id: string;
    nome: string;
    nivel: string;
    ativo: boolean;
    criado_em: string;
    atualizado_em: string;
}

export function isSupabaseConfigured(): boolean {
    return !!(
        supabaseUrl &&
        supabaseAnonKey &&
        supabaseUrl !== 'https://your-project.supabase.co' &&
        supabaseAnonKey !== 'your-anon-key'
    );
}

export async function verificarAdminExiste(): Promise<boolean> {
    try {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) throw error;
        return (users?.length ?? 0) > 0;
    } catch {
        return false;
    }
}

export async function isSistemaConfigurado(): Promise<boolean> {
    try {
        const { data, error } = await supabase.rpc('is_sistema_configurado');
        if (error) throw error;
        return data as boolean;
    } catch {
        return false;
    }
}

export async function getUserCount(): Promise<number> {
    try {
        const { data, error } = await supabase.rpc('get_user_count');
        if (error) throw error;
        return data as number;
    } catch {
        return 0;
    }
}

export async function isAuthenticated(): Promise<boolean> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return !!session;
    } catch {
        return false;
    }
}

export async function signUp(email: string, password: string, nome: string): Promise<{ success: boolean; needsConfirmation?: boolean; error?: string }> {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    nome
                }
            }
        });

        if (error) {
            if (error.message.includes('already been registered') || error.message.includes('Already registered')) {
                return { success: false, error: 'Este email já está cadastrado no sistema.' };
            }
            return { success: false, error: error.message };
        }

        if (data.user && !data.session) {
            return { success: true, needsConfirmation: true };
        }

        return { success: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro ao criar conta';
        return { success: false, error: message };
    }
}

export async function signIn(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                return { success: false, error: 'Email ou senha incorretos.' };
            }
            return { success: false, error: error.message };
        }

        return { success: true, user: data.user };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro ao fazer login';
        return { success: false, error: message };
    }
}

export async function signOut(): Promise<void> {
    await supabase.auth.signOut();
}

export async function marcarPrimeiroAcessoConcluido(): Promise<void> {
    try {
        await supabase.rpc('concluir_primeiro_acesso');
    } catch (e) {
        console.error('Erro ao marcar primeiro acesso:', e);
    }
}

export function onAuthStateChange(callback: (user: User | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
        callback(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
}

// =====================================================
// FUNÇÕES DE SINCRONIZAÇÃO DE DADOS
// =====================================================

export async function syncFromSupabase(table: string) {
    try {
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        return data;
    } catch (e) {
        console.error(`Erro ao carregar ${table}:`, e);
        return null;
    }
}

export async function insertOrUpdate(table: string, records: unknown[]) {
    if (!records || records.length === 0) return { success: true };
    try {
        const { error } = await supabase.from(table).upsert(records);
        if (error) throw error;
        return { success: true };
    } catch (e) {
        console.error(`Erro ao salvar ${table}:`, e);
        return { success: false, error: e };
    }
}

export async function checkDatabaseEmpty(): Promise<boolean> {
    try {
        const { data, error } = await supabase.rpc('is_database_empty');
        if (error) throw error;
        return data as boolean;
    } catch {
        return true;
    }
}

export async function getLocalStorageData(key: string): Promise<unknown[]> {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

export async function importLocalStorageToSupabase(): Promise<{ success: boolean; message: string }> {
    try {
        const KEYS = {
            MATERIAIS: 'sb_materiais',
            PRODUTOS: 'sb_produtos',
            FICHAS_TECNICAS: 'sb_fichas_tecnicas',
            ESTOQUE_PRODUTOS: 'sb_estoque_produtos',
            CLIENTES: 'sb_clientes',
            PEDIDOS: 'sb_pedidos',
            ITENS_PEDIDO: 'sb_itens_pedido',
            MOVIMENTACOES_MATERIAIS: 'sb_movimentacoes_materiais',
            MOVIMENTACOES_PRODUTOS: 'sb_movimentacoes_produtos'
        };

        const materiais = await getLocalStorageData(KEYS.MATERIAIS);
        const produtos = await getLocalStorageData(KEYS.PRODUTOS);
        const fichas = await getLocalStorageData(KEYS.FICHAS_TECNICAS);
        const estoqueProdutos = await getLocalStorageData(KEYS.ESTOQUE_PRODUTOS);
        const clientes = await getLocalStorageData(KEYS.CLIENTES);
        const pedidos = await getLocalStorageData(KEYS.PEDIDOS);
        const itensPedido = await getLocalStorageData(KEYS.ITENS_PEDIDO);
        const movMateriais = await getLocalStorageData(KEYS.MOVIMENTACOES_MATERIAIS);
        const movProdutos = await getLocalStorageData(KEYS.MOVIMENTACOES_PRODUTOS);

        await insertOrUpdate('materiais', materiais);
        await insertOrUpdate('produtos', produtos);
        await insertOrUpdate('fichas_tecnicas', fichas);
        await insertOrUpdate('estoque_produtos', estoqueProdutos);
        await insertOrUpdate('clientes', clientes);
        await insertOrUpdate('pedidos', pedidos);
        await insertOrUpdate('itens_pedido', itensPedido);
        await insertOrUpdate('movimentacoes_materiais', movMateriais);
        await insertOrUpdate('movimentacoes_produtos', movProdutos);

        return { 
            success: true, 
            message: `Sincronizados: ${materiais.length} materiais, ${produtos.length} produtos, etc.` 
        };
    } catch (e) {
        return { success: false, message: `Erro: ${e}` };
    }
}