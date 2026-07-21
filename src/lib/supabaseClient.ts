import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createClient('https://placeholder.supabase.co', 'placeholder');

export const supabaseAdmin: SupabaseClient = supabaseUrl && supabaseServiceRoleKey 
    ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } })
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
        const { data, error } = await supabase.rpc('verificar_admin_ativo_existe');
        if (error) throw error;
        return data === true;
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

export async function signUp(email: string, password: string, nome: string): Promise<{ success: boolean; needsConfirmation?: boolean; userId?: string; error?: string }> {
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

        const userId = data.user?.id;

        if (data.user && !data.session) {
            return { success: true, needsConfirmation: true, userId };
        }

        return { success: true, userId };
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

