import React, { useState, useRef } from 'react';
import { Save, Upload, Trash2 } from 'lucide-react';
import { DadosEmpresa } from '../types';
import { MiniFactoryStore } from '../lib/store';
import { uploadLogo, deleteLogo } from '../lib/logoUpload';

interface ConfiguracaoProps {
  store: MiniFactoryStore;
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}

function Field({ label, value, onChange, placeholder, maxLength }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-amber-950 dark:text-amber-200">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} maxLength={maxLength}
        className="w-full px-3 py-2 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-xs text-[#2e2315] dark:text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500" />
    </div>
  );
}

export default function Configuracao({ store }: ConfiguracaoProps) {
  const [dados, setDados] = useState<DadosEmpresa>(
    store.dadosEmpresa || {
      nome_empresa: '', cnpj: '', inscricao_municipal: '',
      logradouro: '', numero: '', bairro: '', cidade: '', uf: '', cep: '',
      telefone: '', email: '', logo_url: '',
    }
  );
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof DadosEmpresa, value: string) => {
    setDados(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const ok = await store.salvarDadosEmpresa(dados);
    setSaved(ok);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadLogo(file, dados.logo_url || undefined);
    if (url) handleChange('logo_url', url);
    setUploading(false);
  };

  const handleRemoveLogo = () => {
    if (dados.logo_url) deleteLogo(dados.logo_url);
    handleChange('logo_url', '');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#2e2315] dark:text-amber-50">Configurações</h2>
        <p className="text-sm text-[#5c4a37]/60 dark:text-amber-100/50">Dados da Empresa para relatórios e notas fiscais</p>
      </div>

      <div className="bg-white dark:bg-[#1a1208] rounded-2xl border border-[#ebdcc9] dark:border-[#2e1a0a] p-6 max-w-xl space-y-6">

        {/* Identificação */}
        <div>
          <h3 className="text-sm font-semibold text-[#2e2315] dark:text-amber-50 mb-3">Identificação</h3>
          <div className="space-y-3">
            <Field label="Nome / Razão Social" value={dados.nome_empresa} onChange={v => handleChange('nome_empresa', v)} placeholder="Ex: Mini Fábrica de Salgados LTDA" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="CNPJ / CPF" value={dados.cnpj} onChange={v => handleChange('cnpj', v)} placeholder="00.000.000/0001-00" maxLength={18} />
              <Field label="Inscrição Municipal" value={dados.inscricao_municipal} onChange={v => handleChange('inscricao_municipal', v)} placeholder="Opcional" />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div>
          <h3 className="text-sm font-semibold text-[#2e2315] dark:text-amber-50 mb-3">Endereço</h3>
          <div className="space-y-3">
            <Field label="Logradouro" value={dados.logradouro} onChange={v => handleChange('logradouro', v)} placeholder="Rua, Avenida..." />
            <div className="grid grid-cols-3 gap-3">
              <Field label="Número" value={dados.numero} onChange={v => handleChange('numero', v)} />
              <Field label="Bairro" value={dados.bairro} onChange={v => handleChange('bairro', v)} />
              <Field label="CEP" value={dados.cep} onChange={v => handleChange('cep', v)} placeholder="00000-000" maxLength={10} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cidade" value={dados.cidade} onChange={v => handleChange('cidade', v)} />
              <Field label="UF" value={dados.uf} onChange={v => handleChange('uf', v)} placeholder="SP" maxLength={2} />
            </div>
          </div>
        </div>

        {/* Contato */}
        <div>
          <h3 className="text-sm font-semibold text-[#2e2315] dark:text-amber-50 mb-3">Contato</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone" value={dados.telefone} onChange={v => handleChange('telefone', v)} placeholder="(11) 98888-7777" />
            <Field label="E-mail" value={dados.email} onChange={v => handleChange('email', v)} placeholder="contato@minifabrica.com.br" />
          </div>
        </div>

        {/* Logo */}
        <div>
          <h3 className="text-sm font-semibold text-[#2e2315] dark:text-amber-50 mb-3">Logo</h3>
          <div className="flex items-start gap-4">
            {dados.logo_url ? (
              <div className="relative">
                <img src={dados.logo_url} alt="Logo" className="w-20 h-20 object-contain rounded-lg border border-[#ebdcc9] dark:border-[#2e1a0a]" />
                <button onClick={handleRemoveLogo} className="absolute -top-2 -right-2 bg-red-500 text-white p-0.5 rounded-full"><Trash2 size={12} /></button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-lg border border-dashed border-[#ebdcc9] dark:border-[#2e1a0a] flex items-center justify-center text-gray-400 text-[10px]">Sem logo</div>
            )}
            <div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-800/30 rounded-xl text-xs font-semibold text-amber-950 dark:text-amber-200 transition">
                <Upload size={14} /> {uploading ? 'Enviando...' : 'Upload'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <p className="text-[10px] text-gray-400 mt-1">PNG ou JPG</p>
            </div>
          </div>
        </div>

        <button onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-400 text-white font-semibold rounded-xl transition">
          <Save size={16} /> {saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
