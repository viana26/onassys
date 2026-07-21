import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MiniFactoryStore } from '../lib/store';
import { Produto, FichaTecnicaItem } from '../types';
import { useSmartArrowKeys } from '../lib/hooks/useSmartArrowKeys';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Utensils,
  Clock, 
  Coins, 
  Bookmark, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  PlusCircle, 
  Layers,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Settings
} from 'lucide-react';
import { sugerirMaximoProduzivel, verificarViabilidadeProducao, normalizarQuantidade } from '../lib/calculos';
import { compressImageToBlob } from '../lib/imageOptimizer';
import { uploadProdutoImage, deleteProdutoImage, isStorageUrl, isBase64Image, base64ToBlob } from '../lib/imageUpload';
import { useSortableData } from '../lib/hooks/useSortableData';
import { SortButton } from './SortButton';
import SelectSearch from './SelectSearch';

interface ProdutosProps {
  store: MiniFactoryStore;
  onUpdate: () => void;
}

export default function Produtos({ store, onUpdate }: ProdutosProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | 'todos'>('todos');
  const [expandedProdutoId, setExpandedProdutoId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [formTab, setFormTab] = useState('dados');

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isFormOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isFormOpen]);
  
  const [nome, setNome] = useState('');
  const [categoriaId, setCategoriaId] = useState<number>(2);
  const [descricao, setDescricao] = useState('');
  const [unidadeProducaoId, setUnidadeProducaoId] = useState<number>(5);
  const [tempoProducao, setTempoProducao] = useState(30);
  const [ativo, setAtivo] = useState(true);

  // New profit and photo attributes
  const [margemLucro, setMargemLucro] = useState(100); // e.g., 100 for 100% margin
  const [precoVenda, setPrecoVenda] = useState(0);
  const [imagem, setImagem] = useState('');
  const [imageCompressing, setImageCompressing] = useState(false);
  const compressedBlobRef = useRef<Blob | null>(null);
  const previewUrlRef = useRef<string>('');

  // Quick-add unidade
  const [showNovaUnidade, setShowNovaUnidade] = useState(false);
  const [novaUnidadeNome, setNovaUnidadeNome] = useState('');
  const [novaUnidadeSigla, setNovaUnidadeSigla] = useState('');
  const [novaUnidadeTipo, setNovaUnidadeTipo] = useState<'massa' | 'volume' | 'unidade'>('massa');
  const [savingUnidade, setSavingUnidade] = useState(false);

  // Custom alert modal
  const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);

  // Ficha técnica temporary builder list in the form
  const [recipeItems, setRecipeItems] = useState<{ material_id: string; quantidade_necessaria: number; unidade_id: number }[]>([]);

  // Calculate dynamic live recipe cost for real-time markup editing
  const liveCustoProducao = (() => {
    let total = 0;
    recipeItems.forEach(item => {
      const mat = store.materiais.find(m => m.id === item.material_id);
      if (mat) {
        const qtyNormalizada = normalizarQuantidade(item.quantidade_necessaria, item.unidade_id, mat.unidade_id, store.unidades);
        total += qtyNormalizada * mat.custo_unitario;
      }
    });
    return Number(total.toFixed(2));
  })();

  // Synchronizers
  const handleMargemChange = (val: number) => {
    setMargemLucro(val);
    const calculated = Number((liveCustoProducao * (1 + val / 100)).toFixed(2));
    setPrecoVenda(calculated);
  };

  const handlePrecoVendaChange = (val: number) => {
    setPrecoVenda(val);
    if (liveCustoProducao > 0) {
      const calculatedMargem = Math.round(((val - liveCustoProducao) / liveCustoProducao) * 100);
      setMargemLucro(calculatedMargem);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImageCompressing(true);

      // Revoke previous preview URL
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);

      const blob = await compressImageToBlob(file, 600, 600, 0.7);
      compressedBlobRef.current = blob;

      const previewUrl = URL.createObjectURL(blob);
      previewUrlRef.current = previewUrl;
      setImagem(previewUrl);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      setCustomAlert({ title: 'Erro na imagem', message: 'Erro ao comprimir imagem. Tente outro arquivo.' });
    } finally {
      setImageCompressing(false);
    }
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  // Sync selling price automatically when live recipe cost changes (unless user manual override)
  React.useEffect(() => {
    const nextPreco = Number((liveCustoProducao * (1 + margemLucro / 100)).toFixed(2));
    setPrecoVenda(nextPreco);
  }, [liveCustoProducao]);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Viability calculator state
  const [viabilityTestQty, setViabilityTestQty] = useState<{ [prodId: string]: number }>({});
  const [viabilityResults, setViabilityResults] = useState<{ [prodId: string]: ReturnType<typeof verificarViabilidadeProducao> }>({});

  const filteredProdutos = useMemo(() => {
    return store.produtos.filter(p => {
      const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (p.descricao || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      if (categoryFilter !== 'todos') {
        return matchesSearch && p.categoria_id === categoryFilter;
      }
      return matchesSearch;
    });
  }, [store.produtos, searchTerm, categoryFilter]);

  const { sortedItems: sortedProdutos, requestSort, sortConfig } = useSortableData(filteredProdutos, 'nome');

  const totalPages = Math.max(1, Math.ceil(sortedProdutos.length / pageSize));
  const paginatedProdutos = sortedProdutos.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSearchChange = (v: string) => {
    setSearchTerm(v);
    setCurrentPage(1);
  };

  const handleCategoryFilter = (v: number | 'todos') => {
    setCategoryFilter(v);
    setCurrentPage(1);
  };

  const cleanupImagePreview = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = '';
    compressedBlobRef.current = null;
  };

  const handleOpenNew = () => {
    cleanupImagePreview();
    setIsFormOpen(true);
    setEditId(null);
    setNome('');
    setCategoriaId(2);
    setDescricao('');
    setUnidadeProducaoId(5);
    setTempoProducao(30);
    setAtivo(true);
    setRecipeItems([]);
    setMargemLucro(100);
    setPrecoVenda(0);
    setImagem('');
  };

  const handleOpenEdit = (p: Produto) => {
    cleanupImagePreview();
    setIsFormOpen(true);
    setEditId(p.id);
    setNome(p.nome);
    setCategoriaId(p.categoria_id);
    setDescricao(p.descricao);
    setUnidadeProducaoId(p.unidade_producao_id);
    setTempoProducao(p.tempo_producao_minutos);
    setAtivo(p.ativo);
    setMargemLucro(p.margem_lucro !== undefined ? p.margem_lucro : 100);
    setPrecoVenda(p.preco_venda !== undefined ? p.preco_venda : 0);
    setImagem(p.imagem || '');

    // Load active recipe items — deduplicate by material_id
    const fichasDoProduto = store.fichas.filter(f => f.produto_id === p.id);
    const grouped = new Map<string, { material_id: string; quantidade_necessaria: number; unidade_id: number }>();
    for (const f of fichasDoProduto) {
      if (grouped.has(f.material_id)) {
        grouped.get(f.material_id)!.quantidade_necessaria += f.quantidade_necessaria;
      } else {
        grouped.set(f.material_id, {
          material_id: f.material_id,
          quantidade_necessaria: f.quantidade_necessaria,
          unidade_id: f.unidade_id
        });
      }
    }
    setRecipeItems(Array.from(grouped.values()));
  };

  const handleAddRecipeRow = () => {
    if (store.materiais.length === 0) {
      setCustomAlert({ title: 'Nenhum insumo', message: 'Por favor, cadastre matérias-primas primeiro!' });
      return;
    }
    const usedIds = recipeItems.map(r => r.material_id).filter(Boolean);
    const unused = store.materiais.find(m => !usedIds.includes(m.id));
    if (!unused) {
      setCustomAlert({ title: 'Limite atingido', message: 'Todos os ingredientes disponíveis já foram adicionados à receita.' });
      return;
    }
    setRecipeItems([
      ...recipeItems,
      {
        material_id: '',
        quantidade_necessaria: 1,
        unidade_id: store.unidades[0]?.id || 1
      }
    ]);
  };

  const handleRemoveRecipeRow = (index: number) => {
    setRecipeItems(recipeItems.filter((_, idx) => idx !== index));
  };

  const handleUpdateRecipeRow = (index: number, fields: Partial<typeof recipeItems[0]>) => {
    const next = [...recipeItems];
    next[index] = { ...next[index], ...fields } as any;

    // Auto align unit selection to the materials predefined default unit if user changes material
    if (fields.material_id) {
      const selectedMat = store.materiais.find(m => m.id === fields.material_id);
      if (selectedMat) {
        next[index].unidade_id = selectedMat.unidade_id;
      }
    }

    setRecipeItems(next);
  };

  const handleCriarUnidade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaUnidadeNome.trim() || !novaUnidadeSigla.trim()) return;
    setSavingUnidade(true);
    const u = await store.addUnidade({
      nome: novaUnidadeNome.trim(),
      sigla: novaUnidadeSigla.trim().toLowerCase(),
      tipo: novaUnidadeTipo,
    });
    setSavingUnidade(false);
    if (u) {
      setUnidadeProducaoId(u.id);
      setShowNovaUnidade(false);
      setNovaUnidadeNome('');
      setNovaUnidadeSigla('');
      setNovaUnidadeTipo('massa');
      onUpdate();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setCustomAlert({ title: 'Campos obrigatórios', message: 'Favor preencher o nome do produto e a unidade de produção.' });
      return;
    }

    const validRecipeItems = recipeItems.filter(r => r.material_id);
    if (validRecipeItems.length === 0) {
      setCustomAlert({ title: 'Ficha técnica vazia', message: 'Adicione pelo menos 1 ingrediente na composição da receita.' });
      return;
    }

    const matIds = validRecipeItems.map(r => r.material_id);
    const hasDuplicate = matIds.some((val, i) => matIds.indexOf(val) !== i);
    if (hasDuplicate) {
      setCustomAlert({ title: 'Ingrediente duplicado', message: 'Você incluiu o mesmo ingrediente mais de uma vez na receita do produto. Junte as quantidades para salvar em linha única.' });
      return;
    }

    let finalImagem = '';

    if (editId) {
      const oldImageUrl = store.produtos.find(p => p.id === editId)?.imagem;

      if (compressedBlobRef.current) {
        const url = await uploadProdutoImage(
          compressedBlobRef.current,
          editId,
          isStorageUrl(oldImageUrl || '') ? oldImageUrl : undefined
        );
        if (url) finalImagem = url;
      } else if (!imagem && isStorageUrl(oldImageUrl || '')) {
        deleteProdutoImage(oldImageUrl!).catch(() => {});
      } else if (isStorageUrl(imagem)) {
        finalImagem = imagem;
      }

      await store.updateProduto(editId, {
        nome,
        categoria_id: categoriaId,
        descricao,
        unidade_producao_id: unidadeProducaoId,
        tempo_producao_minutos: Number(tempoProducao),
        ativo,
        margem_lucro: Number(margemLucro),
        preco_venda: Number(precoVenda),
        imagem: finalImagem
      });

      const oldFichas = store.fichas.filter(f => f.produto_id === editId);
      for (const f of oldFichas) await store.deleteFichaTecnica(f.id);
      for (const item of validRecipeItems) {
        await store.addFichaTecnica({
          produto_id: editId,
          material_id: item.material_id,
          quantidade_necessaria: item.quantidade_necessaria,
          unidade_id: item.unidade_id
        });
      }
    } else {
      const prod = await store.addProduto({
        nome,
        categoria_id: categoriaId,
        descricao,
        unidade_producao_id: unidadeProducaoId,
        tempo_producao_minutos: Number(tempoProducao),
        ativo,
        margem_lucro: Number(margemLucro),
        preco_venda: Number(precoVenda),
        imagem: ''
      });

      for (const item of validRecipeItems) {
        await store.addFichaTecnica({
          produto_id: prod.id,
          material_id: item.material_id,
          quantidade_necessaria: item.quantidade_necessaria,
          unidade_id: item.unidade_id
        });
      }

      if (compressedBlobRef.current) {
        const url = await uploadProdutoImage(compressedBlobRef.current, prod.id);
        if (url) await store.updateProduto(prod.id, { imagem: url });
      }
    }

    cleanupImagePreview();
    setIsFormOpen(false);
    onUpdate();
  };

  // Viability test trigger
  const handleTestViability = (prodId: string) => {
    const qty = viabilityTestQty[prodId] || 1;
    const res = verificarViabilidadeProducao(prodId, qty, store.fichas, store.materiais, store.unidades);
    setViabilityResults({
      ...viabilityResults,
      [prodId]: res
    });
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-amber-700 dark:text-amber-400" />
            <h1 className="text-lg font-semibold text-[#2e2315] dark:text-amber-100">Produtos</h1>
          </div>
          <p className="text-sm text-[#5c4a37]/60 dark:text-amber-100/50 mt-1">Defina quais ingredientes compõem seus salgados, bolos e doces. Calcule custos reais de fabricação e sugira capacidades.</p>
        </div>

        {store.hasPermission('produtos.criar') && (
          <button 
            onClick={handleOpenNew}
            className="bg-amber-700 hover:bg-amber-600 dark:bg-amber-800 dark:hover:bg-amber-750 shadow-sm text-white text-xs font-semibold font-sans py-2 px-4 rounded-xl transition flex items-center gap-1.5 self-start sm:self-center justify-center cursor-pointer"
            data-help="produtos-novo"
          >
            <PlusCircle size={15} /> Novo Produto
          </button>
        )}
      </div>

      {/* Control Filter Panel */}
      <div className="bg-white dark:bg-[#150f09] p-4 rounded-xl border border-amber-100 dark:border-[#22160b] shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-450 dark:text-amber-100/30">
            <Utensils size={16} />
          </span>
          <input 
            type="text" 
            placeholder="Buscar por nome do salgado, bolo..." 
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 h-9 text-xs rounded-xl bg-orange-50/20 dark:bg-[#1e150c]/30 border border-amber-100 dark:border-[#2d1e0d] focus:outline-none focus:border-amber-400 text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto no-scrollbar py-1">
          <button
            key="todos"
            onClick={() => handleCategoryFilter('todos')}
            className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold border transition cursor-pointer ${
              categoryFilter === 'todos'
                ? 'bg-amber-800 dark:bg-amber-700 text-white border-amber-800'
                : 'bg-white dark:bg-[#1d160e] text-gray-500 dark:text-amber-200/50 border-amber-100 dark:border-[#2e1f0e] hover:bg-amber-50 dark:hover:bg-amber-950/20'
            }`}
          >
            Todos
          </button>
          {store.categorias.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategoryFilter(cat.id)}
              className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold border transition cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-amber-800 dark:bg-amber-700 text-white border-amber-800'
                  : 'bg-white dark:bg-[#1d160e] text-gray-500 dark:text-amber-200/50 border-amber-100 dark:border-[#2e1f0e] hover:bg-amber-50 dark:hover:bg-amber-950/20'
              }`}
            >
              {cat.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Main product display */}
      {sortedProdutos.length === 0 ? (
        <div className="bg-white dark:bg-[#150f09] rounded-2xl py-12 border border-amber-100 dark:border-[#22160b] text-center text-gray-500">
          <Utensils size={36} className="mx-auto text-amber-600/30 mb-2" />
          <p className="text-sm font-medium text-amber-950 dark:text-amber-200">Nenhum produto cadastrado nesta categoria.</p>
          <p className="text-xs text-gray-400 dark:text-amber-100/30 mt-1">Crie um novo produto com sua lista de ingredientes clicando em '+ Novo Produto & Receita'.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-[#150f09] rounded-2xl border border-amber-100 dark:border-[#22160b] shadow-sm overflow-x-auto w-full">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 border-b border-amber-100 dark:border-[#22160b]">
                  <th className="text-left px-3 py-2.5 text-[9px] font-bold tracking-wider"><SortButton label="Produto" sortKey="nome" sortConfig={sortConfig} onSort={requestSort} /></th>
                  <th className="text-right px-3 py-2.5 text-[9px] font-bold tracking-wider w-20"><SortButton label="Prep" sortKey="tempo_producao_minutos" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                  <th className="text-right px-3 py-2.5 text-[9px] font-bold tracking-wider w-20"><SortButton label="Custo" sortKey="custo_producao_calculado" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                  <th className="text-right px-3 py-2.5 text-[9px] font-bold tracking-wider w-20"><SortButton label="Preço" sortKey="preco_venda" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                  <th className="text-right px-3 py-2.5 text-[9px] font-bold tracking-wider w-16">Margem</th>
                  <th className="text-right px-3 py-2.5 text-[9px] font-bold tracking-wider w-16">Cap.</th>
                  <th className="text-right px-3 py-2.5 text-[9px] font-bold tracking-wider w-24">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProdutos.map(p => {
                  const maxQtd = sugerirMaximoProduzivel(p.id, store.fichas, store.materiais, store.unidades);
                  return (
                    <tr key={p.id} className="border-b border-amber-50/50 dark:border-[#22160b]/40 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          {p.imagem ? (
                            <img src={p.imagem} alt={p.nome} className="w-9 h-9 rounded-lg object-cover border border-amber-200/50 dark:border-amber-955/50 flex-shrink-0" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-9 h-9 bg-amber-50 dark:bg-amber-950/20 text-amber-600/40 dark:text-amber-200/30 rounded-lg flex items-center justify-center border border-amber-100/50 dark:border-[#22160b]/50 flex-shrink-0">
                              <Utensils size={14} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-amber-950 dark:text-amber-100 whitespace-nowrap">{p.nome}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-amber-950 dark:text-amber-100">{p.tempo_producao_minutos}m</td>
                      <td className="px-3 py-2 text-right font-mono text-gray-600 dark:text-amber-200/65">{formatCurrency(p.custo_producao_calculado)}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        <span className={`${!p.preco_venda || p.preco_venda <= 0 ? 'text-gray-400 dark:text-amber-100/30' : p.preco_venda < p.custo_producao_calculado ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-emerald-700 dark:text-emerald-450 font-bold'}`}>
                          {!p.preco_venda || p.preco_venda <= 0 ? <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded text-[7px] font-bold">—</span> : formatCurrency(p.preco_venda)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {p.preco_venda > 0 && p.custo_producao_calculado > 0 ? (
                          <span className={`text-[10px] font-bold ${p.preco_venda > p.custo_producao_calculado ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {p.preco_venda > p.custo_producao_calculado
                              ? ((1 - p.custo_producao_calculado / p.preco_venda) * 100).toFixed(1) + '%'
                              : 'prej.'}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-amber-100/20">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        <span className={`${maxQtd > 5 ? 'text-amber-900 dark:text-amber-200' : maxQtd > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-red-500'} font-bold`}>
                          {maxQtd}
                        </span>
                        <span className="text-gray-400 dark:text-amber-100/40 text-[9px] ml-0.5">{store.unidadeSigla(p.unidade_producao_id)}</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {store.hasPermission('produtos.excluir') && (
                            <button onClick={() => setDeleteConfirm({ id: p.id, name: p.nome })}
                              className="hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded-lg text-red-600 dark:text-red-405 transition cursor-pointer">
                              <Trash2 size={12} />
                            </button>
                          )}
                          {store.hasPermission('produtos.editar') && (
                            <button onClick={() => handleOpenEdit(p)}
                              className="hover:bg-amber-100 dark:hover:bg-amber-950 p-1.5 rounded-lg text-amber-900 dark:text-amber-200 transition cursor-pointer">
                              <Edit3 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden">
            {paginatedProdutos.map(p => {
              const ingreds = store.fichas.filter(f => f.produto_id === p.id);
              const isExpanded = expandedProdutoId === p.id;
              const maxQtd = sugerirMaximoProduzivel(p.id, store.fichas, store.materiais, store.unidades);

              return (
                <div key={p.id} className="bg-white dark:bg-[#150f09] rounded-xl border border-amber-100 dark:border-[#22160b] shadow-sm flex flex-col justify-between mb-3">
                  <div className="p-2.5 space-y-2">
                    <div className="flex gap-2 items-start">
                      {p.imagem ? (
                        <div className="relative flex-shrink-0">
                          <img src={p.imagem} alt={p.nome} className="w-12 h-12 object-cover rounded-lg border border-amber-200/50 dark:border-amber-955/50" referrerPolicy="no-referrer" />
                          {isBase64Image(p.imagem) && <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[7px] font-bold px-1 py-0.5 rounded-full shadow-md leading-none">⏫</span>}
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 text-amber-600/40 dark:text-amber-200/30 rounded-lg flex items-center justify-center border border-amber-100/50 dark:border-[#22160b]/50 flex-shrink-0">
                          <Utensils size={18} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm font-display text-amber-950 dark:text-amber-100 leading-tight truncate">{p.nome}</h3>
                        {p.descricao && <p className="text-[10px] text-gray-500 dark:text-amber-100/40 line-clamp-1">{p.descricao}</p>}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 bg-gradient-to-br from-amber-50/20 to-orange-50/40 dark:from-amber-950/10 dark:to-orange-950/5 p-1.5 rounded-lg border border-amber-50 dark:border-[#22160b] text-center">
                      <div className="flex-1 min-w-[60px]"><span className="text-[8px] text-gray-400 dark:text-amber-100/40 uppercase font-semibold">Prep</span><p className="text-[10px] font-semibold text-amber-950 dark:text-amber-100 font-mono">{p.tempo_producao_minutos}m</p></div>
                      <div className="flex-1 min-w-[60px]"><span className="text-[8px] text-gray-400 dark:text-amber-100/40 uppercase font-semibold">Custo</span><p className="text-[10px] font-semibold text-gray-600 dark:text-amber-200/65 font-mono truncate" title={formatCurrency(p.custo_producao_calculado)}>{formatCurrency(p.custo_producao_calculado)}</p></div>
                      <div className="flex-1 min-w-[60px]"><span className="text-[8px] text-gray-400 dark:text-amber-100/40 uppercase font-semibold">Preço</span><p className={`text-[10px] font-mono truncate ${!p.preco_venda || p.preco_venda <= 0 ? 'text-gray-400 dark:text-amber-100/30' : p.preco_venda < p.custo_producao_calculado ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-emerald-700 dark:text-emerald-450 font-bold'}`}>{!p.preco_venda || p.preco_venda <= 0 ? <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded text-[7px] font-bold">—</span> : formatCurrency(p.preco_venda)}</p></div>
                      <div className="flex-1 min-w-[60px]"><span className="text-[8px] text-gray-400 dark:text-amber-100/40 uppercase font-semibold">Margem</span><p className={`text-[10px] font-mono truncate ${p.preco_venda > 0 && p.custo_producao_calculado > 0 ? (p.preco_venda > p.custo_producao_calculado ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500') : 'text-gray-300 dark:text-amber-100/20'}`}>{p.preco_venda > 0 && p.custo_producao_calculado > 0 ? (p.preco_venda > p.custo_producao_calculado ? ((1 - p.custo_producao_calculado / p.preco_venda) * 100).toFixed(1) + '%' : 'prej.') : '—'}</p></div>
                      <div className="flex-1 min-w-[60px]"><span className="text-[8px] text-gray-400 dark:text-amber-100/40 uppercase font-semibold">Cap.</span><p className={`text-[10px] font-bold font-mono truncate ${maxQtd > 5 ? 'text-amber-900 dark:text-amber-200' : maxQtd > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-red-500'}`}>{maxQtd} {store.unidadeSigla(p.unidade_producao_id)}</p></div>
                    </div>

                    <div className="border-t border-dashed border-amber-100 dark:border-[#22160b] pt-1.5">
                      <button onClick={() => setExpandedProdutoId(isExpanded ? null : p.id)}
                        className="w-full flex items-center justify-between text-[10px] text-amber-900/85 dark:text-amber-100 font-semibold hover:text-amber-950 dark:hover:text-[#f8f1ea] cursor-pointer">
                        <span className="flex items-center gap-1"><Layers size={12} /> Ficha Técnica ({ingreds.length} {ingreds.length === 1 ? 'item' : 'itens'})</span>
                        <ChevronDown size={12} className={`transform transition ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {isExpanded && (
                        <div className="mt-2 space-y-2 animate-in fade-in">
                          {ingreds.length === 0 ? (
                            <p className="text-[10px] text-gray-400 dark:text-amber-100/30 italic">Nenhum ingrediente configurado.</p>
                          ) : (
                            <div className="space-y-1 max-h-40 overflow-y-auto no-scrollbar">
                              {ingreds.map(ing => {
                                const mat = store.materiais.find(m => m.id === ing.material_id);
                                return (
                                  <div key={ing.id} className="flex items-center justify-between px-2 py-1 rounded bg-orange-50/10 dark:bg-amber-950/10 border border-amber-100/50 dark:border-[#22160b]/50 text-[10px]">
                                    <span className="font-semibold text-amber-900 dark:text-amber-200 truncate mr-2">{mat?.nome || 'Deletado'}</span>
                                    <span className="font-mono text-gray-500 dark:text-amber-100/50 whitespace-nowrap">{ing.quantidade_necessaria} {store.unidadeSigla(ing.unidade_id)} <span className="text-[8px] text-gray-400 dark:text-amber-100/30 ml-1">({formatCurrency(ing.quantidade_necessaria * (mat?.custo_unitario || 0))})</span></span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div className="p-2.5 bg-white dark:bg-[#120c06] border border-amber-100/75 dark:border-[#22160b] rounded-lg space-y-2">
                            <label className="block text-[9px] font-semibold text-amber-950 dark:text-amber-100 uppercase">Simular Produção</label>
                            <div className="flex gap-2">
                              <input type="number" min="1" placeholder="Qtd"
                                value={viabilityTestQty[p.id] || ''}
                                onChange={(e) => setViabilityTestQty({ ...viabilityTestQty, [p.id]: Number(e.target.value) })}
                                className="w-14 px-1.5 py-1 border border-amber-100 dark:border-[#22160b] bg-amber-50/20 dark:bg-amber-950/10 text-[10px] rounded-lg font-mono text-amber-950 dark:text-amber-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                              <button onClick={() => handleTestViability(p.id)}
                                className="flex-1 bg-amber-800 hover:bg-amber-900 dark:bg-amber-800 dark:hover:bg-amber-750 text-white font-semibold text-[9px] px-2 py-1 rounded-lg transition cursor-pointer">Posso Produzir?</button>
                            </div>
                            {viabilityResults[p.id] && (
                              <div className="text-[10px]">
                                {viabilityResults[p.id].viavel ? (
                                  <div className="text-emerald-800 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-[#1c301e] p-1.5 rounded-lg flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-600 flex-shrink-0" /><span>Sim! Dá para produzir.</span></div>
                                ) : (
                                  <div className="text-red-800 bg-red-50 dark:bg-red-950/15 border border-red-100 dark:border-red-900/30 p-1.5 rounded-lg">
                                    <div className="flex items-center gap-1 text-[9px] font-semibold text-red-700 dark:text-red-400"><AlertTriangle size={12} className="text-red-500" /><span>Faltam insumos!</span></div>
                                    <ul className="list-disc list-inside text-[8px] text-red-650/90 dark:text-red-400/90 pl-1 mt-0.5">{viabilityResults[p.id].deficit.map((def, dIdx) => (<li key={dIdx}>{def.materialNome}: faltam <span className="font-bold font-mono">{def.falta}{def.unidade}</span></li>))}</ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-amber-50/20 dark:bg-[#150f09]/40 px-2.5 py-2 border-t border-amber-100 dark:border-[#22160b] flex items-center justify-between gap-1">
                    {store.hasPermission('produtos.excluir') && (
                      <button onClick={() => setDeleteConfirm({ id: p.id, name: p.nome })}
                        className="hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded-lg text-red-600 dark:text-red-405 transition text-[10px] flex items-center gap-1 font-semibold cursor-pointer"><Trash2 size={12} /> Excluir</button>
                    )}
                    {store.hasPermission('produtos.editar') && (
                      <button onClick={() => handleOpenEdit(p)}
                        className="bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-100 font-bold px-2.5 py-1.5 rounded-lg text-[10px] flex items-center gap-1 transition cursor-pointer"><Edit3 size={12} /> Editar</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 py-2 flex-wrap">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-200 dark:border-[#2d1e0d] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-50 dark:hover:bg-amber-950/30 transition cursor-pointer bg-white dark:bg-[#150f09] text-amber-950 dark:text-amber-100"
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <span className="text-xs text-gray-500 dark:text-amber-100/50 font-mono">
                Pág. {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-200 dark:border-[#2d1e0d] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-50 dark:hover:bg-amber-950/30 transition cursor-pointer bg-white dark:bg-[#150f09] text-amber-950 dark:text-amber-100"
              >
                Próximo <ChevronRight size={14} />
              </button>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="ml-2 px-2 py-1.5 rounded-lg text-xs font-semibold border border-amber-200 dark:border-[#2d1e0d] bg-white dark:bg-[#150f09] text-amber-950 dark:text-amber-100 cursor-pointer focus:outline-none"
              >
                <option value={6}>6 / pág</option>
                <option value={10}>10 / pág</option>
                <option value={20}>20 / pág</option>
                <option value={50}>50 / pág</option>
              </select>
          </div>
        </>
      )}

      {/* MODAL: NEW / EDIT PRODUCT + FICHA TECNICA */}
      {isFormOpen && (store.hasPermission('produtos.criar') || store.hasPermission('produtos.editar')) && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => { cleanupImagePreview(); setIsFormOpen(false); }} />
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 text-xs font-sans">
            <div className="bg-white dark:bg-[#120c06] w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl shadow-2xl border border-amber-100 dark:border-[#2d1e0d] flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-amber-100 dark:border-[#2d1e0d] flex-shrink-0">
              <div>
                <h3 className="font-display font-semibold text-base text-amber-950 dark:text-amber-100">
                  {editId ? 'Editar Produto & Ficha' : 'Novo Produto & Ficha Técnica'}
                </h3>
                <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-0.5 font-sans">Preencha os dados e monte a receita.</p>
              </div>
              <button onClick={() => { cleanupImagePreview(); setIsFormOpen(false); }} className="text-gray-400 hover:text-amber-950 dark:hover:text-[#f8f1ea] p-1 cursor-pointer flex-shrink-0">
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-amber-100 dark:border-[#2d1e0d] flex-shrink-0">
              {[
                { key: 'dados', label: '1. Informações Básicas de Venda' },
                { key: 'receita', label: '2. Composição da Receita (Ingredientes)' },
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFormTab(tab.key)}
                  data-help={tab.key === 'receita' ? 'produtos-ficha' : undefined}
                  className={`flex-1 py-2.5 text-[9px] font-bold uppercase tracking-wider transition cursor-pointer ${
                    formTab === tab.key
                      ? 'bg-amber-50/80 dark:bg-amber-950/40 border-b-2 border-amber-700 dark:border-amber-400 text-amber-950 dark:text-amber-100'
                      : 'text-gray-400 dark:text-amber-100/30 hover:text-amber-950 dark:hover:text-amber-200 hover:bg-amber-50/40 dark:hover:bg-amber-950/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <form id="modal-product-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar text-xs font-sans">
              <div className="p-4 sm:p-5 space-y-4">
                
                {/* TAB: INFORMAÇÕES BÁSICAS */}
                {formTab === 'dados' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-amber-900 dark:text-amber-100 font-medium">Nome *</label>
                        <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} data-help="produtos-nome"
                          placeholder="Ex: Coxinha de Frango"
                          className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg focus:outline-none focus:border-amber-400 text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400" required />
                      </div>
                      <div className="space-y-1" data-help="produtos-categoria">
                        <label className="text-amber-900 dark:text-amber-100 font-medium">Categoria *</label>
                        <SelectSearch value={String(categoriaId)} onChange={v => setCategoriaId(Number(v))}
                          options={store.categorias.map(cat => ({value: String(cat.id), label: cat.nome}))}
                          placeholder="Selecione uma categoria"
                          className="w-full" />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 space-y-1 min-w-0" data-help="produtos-unidade">
                        <label className="text-amber-900 dark:text-amber-100 font-medium">Unidade *</label>
                        <div className="flex gap-2">
                          <SelectSearch value={String(unidadeProducaoId)} onChange={v => setUnidadeProducaoId(Number(v))}
                            options={store.unidades.map(u => ({value: String(u.id), label: `${u.nome} (${u.sigla})`}))}
                            placeholder="Selecione uma unidade"
                            className="flex-1" />
                          <button type="button" onClick={() => setShowNovaUnidade(true)}
                            className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-semibold rounded-lg transition shrink-0">+ Nova</button>
                        </div>
                      </div>
                      <div className="w-full sm:w-28 space-y-1 shrink-0" data-help="produtos-tempo">
                        <label className="text-amber-900 dark:text-amber-100 font-medium">Tempo (min)</label>
                        <input type="number" value={tempoProducao} onChange={(e) => setTempoProducao(Number(e.target.value))}
                          {...useSmartArrowKeys(tempoProducao, setTempoProducao)}
                          className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs font-mono bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100" />
                      </div>
                      <div className="w-full sm:w-auto space-y-1 shrink-0">
                        <label className="text-amber-900 dark:text-amber-100 font-medium">Status</label>
                        <div className="flex items-center gap-3 py-1.5">
                          <label className="flex items-center gap-1 cursor-pointer font-bold text-amber-900 dark:text-amber-100">
                            <input type="radio" checked={ativo === true} onChange={() => setAtivo(true)} className="text-amber-700 focus:ring-amber-500" /> Ativo
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer text-gray-500 dark:text-amber-100/40 font-semibold">
                            <input type="radio" checked={ativo === false} onChange={() => setAtivo(false)} className="text-amber-700 focus:ring-amber-500" /> Inativo
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-[30%] shrink-0 space-y-1">
                        <span className="text-amber-900 dark:text-amber-100 font-medium block">Foto</span>
                        <div className="h-[116px] flex flex-col items-center justify-center gap-2 p-2 bg-white dark:bg-[#1c140c] border border-amber-200 dark:border-[#2d1e0d] rounded-lg">
                          {imagem ? (
                            <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-amber-200 dark:border-amber-900/30 flex-shrink-0 bg-white dark:bg-[#1a120b]">
                              <img src={imagem} alt="Preview" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => setImagem('')}
                                className="absolute top-0.5 right-0.5 bg-red-650 hover:bg-red-750 text-white rounded-full p-0.5 shadow-md cursor-pointer"><X size={9} /></button>
                            </div>
                          ) : (
                            <div className="w-20 h-20 rounded-lg bg-amber-50/20 dark:bg-amber-955/20 border border-dashed border-amber-200 dark:border-amber-900/40 flex items-center justify-center text-gray-400 dark:text-amber-100/20 flex-shrink-0">
                              <Utensils size={20} className="stroke-1" />
                            </div>
                          )}
                          <label className="inline-flex items-center justify-center bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-150 font-bold px-2.5 py-1 rounded-lg cursor-pointer text-[9px] uppercase tracking-wider transition text-center w-full">
                            {imageCompressing ? 'Compactando...' : 'Escolher Foto'}
                            <input type="file" accept="image/*" onChange={handleImageChange} disabled={imageCompressing} className="hidden" />
                          </label>
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-amber-900 dark:text-amber-100 font-medium block">Descrição</label>
                        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)}
                          placeholder="Ex: Contém trigo e derivados de leite."
                          className="w-full h-[116px] p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 resize-none" />
                      </div>
                    </div>

                    </div>
                )}

                {/* TAB: FICHA TÉCNICA */}
                {formTab === 'receita' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">Ingredientes</span>
                      <button type="button" onClick={handleAddRecipeRow}
                        className="text-amber-800 dark:text-amber-300 hover:text-amber-950 text-xs font-bold flex items-center gap-1 cursor-pointer">
                        <Plus size={14} /> Adicionar
                      </button>
                    </div>

                    {recipeItems.length === 0 ? (
                      <div className="bg-amber-50/10 dark:bg-amber-950/5 rounded-xl p-4 border border-amber-50 dark:border-[#2d1e0d] text-center text-gray-400 dark:text-amber-100/30">
                        <p className="text-xs">Nenhum ingrediente adicionado.</p>
                        <button type="button" onClick={handleAddRecipeRow}
                          className="mt-2 text-[10px] bg-amber-100 dark:bg-amber-950 hover:bg-amber-200 text-amber-900 dark:text-amber-100 font-bold px-3 py-1.5 rounded-lg cursor-pointer">
                          Inserir Primeiro Ingrediente
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Desktop table */}
                        <div className="hidden md:block max-h-[40vh] overflow-y-auto no-scrollbar">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10">
                              <tr className="bg-amber-50 dark:bg-[#1c140c] border-b border-amber-200 dark:border-[#2d1e0d]">
                                <th className="text-left px-2 py-2 text-[9px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider w-1/2">Ingrediente</th>
                                <th className="text-left px-2 py-2 text-[9px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider w-28">Quantidade</th>
                                <th className="text-right px-2 py-2 text-[9px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider w-20">Custo</th>
                                <th className="text-right px-2 py-2 text-[9px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider w-10"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {recipeItems.map((item, idx) => {
                                const materialRef = store.materiais.find(m => m.id === item.material_id);
                                const usedIds = recipeItems.filter((_, i) => i !== idx).map(r => r.material_id);
                                return (
                                  <tr key={idx} className="border-b border-amber-100/30 dark:border-[#2d1e0d]/30 hover:bg-amber-50/20 dark:hover:bg-[#1c140c]/20">
                                    <td className="px-2 py-1.5">
                                      <SelectSearch value={item.material_id}
                                        onChange={v => handleUpdateRecipeRow(idx, { material_id: v })}
                                        options={store.materiais.filter(m => !usedIds.includes(m.id))
                                          .map(m => ({value: m.id, label: `${m.nome} (${store.unidadeSigla(m.unidade_id)})`}))}
                                        placeholder="Selecione um ingrediente"
                                        className="w-full" />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <div className="flex items-center border border-amber-200 dark:border-[#2d1e0d] rounded overflow-hidden">
                                        <input type="number" step="0.001" min="0.001" placeholder="0,500"
                                          value={item.quantidade_necessaria}
                                          onChange={(e) => handleUpdateRecipeRow(idx, { quantidade_necessaria: Number(e.target.value) })}
                                          {...useSmartArrowKeys(item.quantidade_necessaria, (v) => handleUpdateRecipeRow(idx, { quantidade_necessaria: v }), 0.001)}
                                          className="w-full p-1.5 focus:outline-none font-mono text-xs bg-white dark:bg-[#1a1109] text-amber-950 dark:text-amber-100" required />
                                        <span className="bg-amber-50 dark:bg-amber-950/40 px-2 py-1.5 text-[9px] font-bold text-amber-900 dark:text-amber-200 font-mono whitespace-nowrap">
                                          {store.unidadeSigla(item.unidade_id)}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-2 py-1.5 text-right">
                                      <span className="font-mono text-[10px] font-semibold text-amber-900 dark:text-amber-100">
                                        {formatCurrency(item.quantidade_necessaria * (materialRef?.custo_unitario || 0))}
                                      </span>
                                    </td>
                                    <td className="px-2 py-1.5 text-right">
                                      <button type="button" onClick={() => handleRemoveRecipeRow(idx)}
                                        className="hover:bg-red-100 dark:hover:bg-red-950/40 p-1 rounded text-red-550 dark:text-red-400 cursor-pointer">
                                        <Trash2 size={12} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar pr-1">
                          {recipeItems.map((item, idx) => {
                            const materialRef = store.materiais.find(m => m.id === item.material_id);
                            return (
                              <div key={idx} className="bg-orange-50/15 dark:bg-[#1c140c]/30 p-2.5 rounded-lg border border-amber-100/50 dark:border-[#2d1e0d]/50 space-y-2">
                                <SelectSearch value={item.material_id}
                                  onChange={v => handleUpdateRecipeRow(idx, { material_id: v })}
                                  options={store.materiais.filter(m => {
                                    const usedIds = recipeItems.filter((_, i) => i !== idx).map(r => r.material_id);
                                    return !usedIds.includes(m.id);
                                  }).map(m => ({value: m.id, label: `${m.nome} (${store.unidadeSigla(m.unidade_id)})`}))}
                                  placeholder="Selecione um ingrediente"
                                  className="w-full" />
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 flex items-center border border-amber-200 dark:border-[#2d1e0d] rounded overflow-hidden">
                                      <input type="number" step="0.001" min="0.001" placeholder="0,500"
                                          value={item.quantidade_necessaria}
                                          onChange={(e) => handleUpdateRecipeRow(idx, { quantidade_necessaria: Number(e.target.value) })}
                                          {...useSmartArrowKeys(item.quantidade_necessaria, (v) => handleUpdateRecipeRow(idx, { quantidade_necessaria: v }), 0.001)}
                                          className="w-full p-1.5 focus:outline-none font-mono text-xs bg-white dark:bg-[#1a1109] text-amber-950 dark:text-amber-100" required />
                                        <span className="bg-amber-50 dark:bg-amber-950/40 px-2 py-1.5 text-[10px] font-bold text-amber-900 dark:text-amber-200 font-mono whitespace-nowrap">
                                          {store.unidadeSigla(item.unidade_id)}
                                        </span>
                                      </div>
                                  <span className="font-mono text-[10px] font-semibold text-amber-900 dark:text-amber-100 whitespace-nowrap">
                                    {formatCurrency(item.quantidade_necessaria * (materialRef?.custo_unitario || 0))}
                                  </span>
                                  <button type="button" onClick={() => handleRemoveRecipeRow(idx)}
                                    className="hover:bg-red-100 dark:hover:bg-red-950/40 p-1 rounded text-red-550 dark:text-red-400 cursor-pointer">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

              </div>
            </form>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-amber-100 dark:border-[#2d1e0d] flex-shrink-0 space-y-2">
                <div className="p-3 bg-gradient-to-br from-emerald-50/10 to-teal-50/5 dark:from-emerald-950/5 dark:to-teal-950/5 rounded-xl border border-emerald-100/30 dark:border-emerald-950/20">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-0.5">
                      <span className="text-gray-400 dark:text-amber-100/40 text-[10px] block">Custo Unit.</span>
                      <p className="p-2 border border-dashed border-amber-100 dark:border-amber-950/50 rounded-lg bg-amber-50/10 dark:bg-amber-950/5 text-gray-500 dark:text-amber-200/50 font-mono text-xs h-8 flex items-center">{formatCurrency(liveCustoProducao)}</p>
                    </div>
                    <div className="space-y-0.5" data-help="produtos-markup">
                      <label className="text-amber-900 dark:text-amber-100 text-[10px] block">Markup / % s/ custo</label>
                      <div className="relative">
                        <input type="number" value={margemLucro} onChange={(e) => handleMargemChange(Math.max(0, Number(e.target.value)))}
                          {...useSmartArrowKeys(margemLucro, (v) => handleMargemChange(Math.max(0, v)), 0)}
                          className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs font-mono bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 pr-6" min="0" />
                        <span className="absolute right-2 top-2 text-gray-400 dark:text-amber-100/30 text-[10px]">%</span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-amber-900 dark:text-amber-100 text-[10px] block">Margem de Lucro</span>
                      <p className={`p-2 border border-dashed rounded-lg font-mono text-xs h-8 flex items-center justify-center font-bold ${
                        liveCustoProducao > 0 && precoVenda > 0
                          ? precoVenda > liveCustoProducao
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                          : 'bg-amber-50/10 dark:bg-amber-950/5 border-amber-100 dark:border-amber-950/50 text-gray-400 dark:text-amber-100/30'
                      }`}>
                        {liveCustoProducao > 0 && precoVenda > 0
                          ? precoVenda > liveCustoProducao
                            ? ((1 - liveCustoProducao / precoVenda) * 100).toFixed(1) + '%'
                            : 'prejuízo'
                          : '—'}
                      </p>
                    </div>
                    <div className="space-y-0.5" data-help="produtos-preco">
                      <label className="text-amber-900 dark:text-amber-100 text-[10px] block">Preço Venda</label>
                      <div className="relative">
                        <span className="absolute left-2 top-2 text-gray-400 dark:text-amber-100/30 text-[10px]">R$</span>
                        <input type="number" step="0.01" value={precoVenda} onChange={(e) => handlePrecoVendaChange(Math.max(0, Number(e.target.value)))}
                          {...useSmartArrowKeys(precoVenda, (v) => handlePrecoVendaChange(Math.max(0, v)), 0)}
                          className="w-full p-2 pl-6 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs font-mono bg-white dark:bg-[#1c140c] text-emerald-800 dark:text-emerald-450 font-bold" min="0" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => { cleanupImagePreview(); setIsFormOpen(false); }}
                    className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-2.5 rounded-xl text-center cursor-pointer text-xs">
                    Cancelar
                  </button>
                  <button type="submit" form="modal-product-form"
                    className="flex-1 bg-amber-700 hover:bg-amber-800 dark:bg-amber-800 dark:hover:bg-amber-750 text-white font-bold py-2.5 rounded-xl text-center shadow-md text-xs cursor-pointer">
                    {editId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Custom alert modal */}
      {customAlert && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1208] rounded-2xl max-w-md w-full p-6 border border-amber-100 dark:border-[#2e1a0a]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-amber-950 dark:text-amber-50">{customAlert.title || 'Atenção'}</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-amber-100/70 mb-2">
              {customAlert.message}
            </p>
            <div className="flex justify-end pt-2">
              <button onClick={() => setCustomAlert(null)}
                className="py-2 px-6 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition">
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Quick-add unidade */}
      {showNovaUnidade && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#120c06] max-w-sm w-full rounded-2xl p-6 border border-amber-100 dark:border-[#2d1e0d]">
            <div className="flex items-center gap-2 mb-4">
              <Settings size={18} className="text-amber-600 dark:text-amber-400" />
              <h3 className="font-semibold text-base text-amber-950 dark:text-amber-100">Nova Unidade de Medida</h3>
            </div>
            <form onSubmit={handleCriarUnidade} className="space-y-3">
              <div>
                <label className="text-xs text-amber-950 dark:text-amber-100 font-medium">Nome completo *</label>
                <input type="text" value={novaUnidadeNome} onChange={e => setNovaUnidadeNome(e.target.value)} required
                  placeholder="Ex: Quilograma, Litro, Dúzia"
                  className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20" />
              </div>
              <div className="grid grid-cols-[30%_70%] gap-3">
                <div>
                  <label className="text-xs text-amber-950 dark:text-amber-100 font-medium">Sigla *</label>
                  <input type="text" value={novaUnidadeSigla} onChange={e => setNovaUnidadeSigla(e.target.value)} required
                    placeholder="Ex: kg, L, dz"
                    className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 font-mono placeholder:text-gray-400 dark:placeholder:text-amber-200/20" />
                </div>
                <div>
                  <label className="text-xs text-amber-950 dark:text-amber-100 font-medium">Tipo *</label>
                  <SelectSearch value={novaUnidadeTipo} onChange={v => setNovaUnidadeTipo(v as 'massa' | 'volume' | 'unidade')} options={[{ value: 'massa', label: 'Massa (peso)' }, { value: 'volume', label: 'Volume (líquido)' }, { value: 'unidade', label: 'Unidade (contável)' }]} placeholder="Tipo" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowNovaUnidade(false)}
                  className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-xl text-xs cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={savingUnidade}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-400 text-white font-semibold rounded-xl text-xs cursor-pointer disabled:cursor-not-allowed">
                  {savingUnidade ? 'Criando...' : 'Criar Unidade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1208] rounded-2xl max-w-md w-full p-6 border border-amber-100 dark:border-[#2e1a0a]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-amber-950 dark:text-amber-50">Excluir Produto?</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-amber-100/70 mb-2">
              O produto <strong>"{deleteConfirm.name}"</strong> será excluído permanentemente. Os registros de estoque acabado também serão deletados.
            </p>
            <p className="text-xs text-gray-400 dark:text-amber-100/40 mb-4">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 px-4 border border-gray-200 dark:border-[#2e1a0a] rounded-xl text-gray-600 dark:text-amber-100 font-medium hover:bg-gray-50 dark:hover:bg-[#130b04] transition">
                Cancelar
              </button>
              <button onClick={async () => { store.deleteProduto(deleteConfirm.id); setDeleteConfirm(null); onUpdate(); }}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition">
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
