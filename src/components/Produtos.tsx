import React, { useState } from 'react';
import { MiniFactoryStore } from '../lib/store';
import { Produto, FichaTecnicaItem } from '../types';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles, 
  ChevronRight, 
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
  Info,
  Settings
} from 'lucide-react';
import { sugerirMaximoProduzivel, verificarViabilidadeProducao, normalizarQuantidade } from '../lib/calculos';
import { compressImage } from '../lib/imageOptimizer';
import { uploadProdutoImage, deleteProdutoImage, isStorageUrl, isBase64Image, base64ToBlob } from '../lib/imageUpload';

interface ProdutosProps {
  store: MiniFactoryStore;
  onUpdate: () => void;
}

export default function Produtos({ store, onUpdate }: ProdutosProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | 'todos'>('todos');
  const [expandedProdutoId, setExpandedProdutoId] = useState<string | null>(null);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
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

  // Quick-add unidade
  const [showNovaUnidade, setShowNovaUnidade] = useState(false);
  const [novaUnidadeNome, setNovaUnidadeNome] = useState('');
  const [novaUnidadeSigla, setNovaUnidadeSigla] = useState('');
  const [novaUnidadeTipo, setNovaUnidadeTipo] = useState<'massa' | 'volume' | 'unidade'>('massa');
  const [savingUnidade, setSavingUnidade] = useState(false);

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
      const optimized = await compressImage(file, 600, 600, 0.7);

      if (navigator.onLine && editId) {
        const blob = base64ToBlob(optimized);
        const url = await uploadProdutoImage(
          blob,
          editId,
          isStorageUrl(imagem) ? imagem : undefined
        );
        if (url) {
          setImagem(url);
          setImageCompressing(false);
          return;
        }
      }

      setImagem(optimized);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      alert('Erro ao comprimir imagem. Tente outro arquivo.');
    } finally {
      setImageCompressing(false);
    }
  };

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

  const filteredProdutos = store.produtos.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.descricao || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (categoryFilter !== 'todos') {
      return matchesSearch && p.categoria_id === categoryFilter;
    }
    return matchesSearch;
  });

  const handleOpenNew = () => {
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

    // Load active recipe items
    const activeRecipe = store.fichas
      .filter(f => f.produto_id === p.id)
      .map(f => ({
        material_id: f.material_id,
        quantidade_necessaria: f.quantidade_necessaria,
        unidade_id: f.unidade_id
      }));
    setRecipeItems(activeRecipe);
  };

  const handleAddRecipeRow = () => {
    if (store.materiais.length === 0) {
      alert('Por favor, cadastre matérias-primas primeiro!');
      return;
    }
    const defaultMat = store.materiais[0];
    setRecipeItems([
      ...recipeItems,
      {
        material_id: defaultMat.id,
        quantidade_necessaria: 1,
        unidade_id: defaultMat.unidade_id
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
      alert('Favor preencher o nome do produto e a unidade de produção.');
      return;
    }

    const matIds = recipeItems.map(r => r.material_id);
    const hasDuplicate = matIds.some((val, i) => matIds.indexOf(val) !== i);
    if (hasDuplicate) {
      alert('Atenção: Você incluiu o mesmo ingrediente mais de uma vez na receita do produto. Junte as quantidades para salvar em linha única.');
      return;
    }

    let finalImagem = imagem;

    if (editId) {
      const oldProd = store.produtos.find(p => p.id === editId);
      const oldImageUrl = oldProd?.imagem;
      const imageChanged = imagem !== oldImageUrl;

      if (imageChanged && oldImageUrl && isStorageUrl(oldImageUrl)) {
        if (imagem && isBase64Image(imagem) && navigator.onLine) {
          const blob = base64ToBlob(imagem);
          const url = await uploadProdutoImage(blob, editId, oldImageUrl);
          if (url) finalImagem = url;
        } else if (!imagem) {
          deleteProdutoImage(oldImageUrl).catch(() => {});
        }
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
      for (const item of recipeItems) {
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
        imagem: finalImagem
      });

      for (const item of recipeItems) {
        await store.addFichaTecnica({
          produto_id: prod.id,
          material_id: item.material_id,
          quantidade_necessaria: item.quantidade_necessaria,
          unidade_id: item.unidade_id
        });
      }

      if (imagem && isBase64Image(imagem) && navigator.onLine) {
        const blob = base64ToBlob(imagem);
        const url = await uploadProdutoImage(blob, prod.id);
        if (url) store.updateProduto(prod.id, { imagem: url });
      }
    }

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
          <span className="text-amber-800 dark:text-amber-300 text-xs font-semibold font-mono tracking-wider uppercase">Módulo de Receitas</span>
          <h1 className="text-2xl font-semibold font-display tracking-tight text-amber-950 dark:text-[#f8f1ea]">Produtos e Fichas Técnicas</h1>
          <p className="text-sm text-amber-900/60 dark:text-amber-100/60 mt-1">Defina quais ingredientes compõem seus salgados, bolos e doces. Calcule custos reais de fabricação e sugira capacidades.</p>
        </div>

        {store.hasPermission('produtos.criar') && (
          <button 
            onClick={handleOpenNew}
            className="bg-amber-700 hover:bg-amber-600 dark:bg-amber-800 dark:hover:bg-amber-750 shadow-sm text-white text-xs font-semibold font-sans py-2.5 px-4 rounded-xl transition flex items-center gap-1.5 self-start sm:self-center justify-center font-medium cursor-pointer"
          >
            <PlusCircle size={16} /> Novo Produto & Receita
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
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-orange-50/20 dark:bg-[#1e150c]/30 border border-amber-100 dark:border-[#2d1e0d] focus:outline-none focus:border-amber-400 text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto no-scrollbar py-1">
          <button
            key="todos"
            onClick={() => setCategoryFilter('todos')}
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
              onClick={() => setCategoryFilter(cat.id)}
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
      {filteredProdutos.length === 0 ? (
        <div className="bg-white dark:bg-[#150f09] rounded-2xl py-12 border border-amber-100 dark:border-[#22160b] text-center text-gray-500">
          <Utensils size={36} className="mx-auto text-amber-600/30 mb-2" />
          <p className="text-sm font-medium text-amber-950 dark:text-amber-200">Nenhum produto cadastrado nesta categoria.</p>
          <p className="text-xs text-gray-400 dark:text-amber-100/30 mt-1">Crie um novo produto com sua lista de ingredientes clicando em '+ Novo Produto & Receita'.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="products-cards-grid">
          {filteredProdutos.map(p => {
            const ingreds = store.fichas.filter(f => f.produto_id === p.id);
            const isExpanded = expandedProdutoId === p.id;
            const maxQtd = sugerirMaximoProduzivel(p.id, store.fichas, store.materiais, store.unidades);

            return (
              <div 
                key={p.id} 
                className="bg-white dark:bg-[#150f09] rounded-2xl border border-amber-100 dark:border-[#22160b] shadow-sm overflow-hidden flex flex-col justify-between"
              >
                {/* Header info */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex gap-4 items-start">
                    {p.imagem ? (
                      <div className="relative flex-shrink-0">
                        <img 
                          src={p.imagem} 
                          alt={p.nome} 
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-amber-200/50 dark:border-amber-955/50"
                          referrerPolicy="no-referrer"
                        />
                        {isBase64Image(p.imagem) && (
                          <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full shadow-md" title="Imagem pendente de upload">
                            ⏫
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-50 dark:bg-amber-950/20 text-amber-600/40 dark:text-amber-200/30 rounded-xl flex items-center justify-center border border-amber-100/50 dark:border-[#22160b]/50 flex-shrink-0">
                        <Utensils size={24} />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <span className="text-[9px] bg-amber-50 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-100 dark:border-[#382613] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
                            {store.categoriaNome(p.categoria_id)}
                          </span>
                          <h3 className="font-semibold text-base sm:text-lg font-display text-amber-950 dark:text-amber-100 mt-1.5 flex items-center gap-1 leading-tight">
                            {p.nome}
                          </h3>
                        </div>

                        <div className="text-right space-y-1 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase block text-center
                            ${p.ativo ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-semibold' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}
                          `}>
                            {p.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                          <p className="text-[9px] text-gray-400 dark:text-amber-100/30 font-mono">Rend: {store.unidadeNome(p.unidade_producao_id)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-amber-100/40 line-clamp-2 mt-1">{p.descricao || 'Sem descrição cadastrada.'}</p>
                    </div>
                  </div>

                  {/* Custo, Margem, Preço de Venda & Max outputs suggestions */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gradient-to-br from-amber-50/20 to-orange-50/40 dark:from-amber-950/10 dark:to-orange-950/5 p-3 rounded-xl border border-amber-50 dark:border-[#22160b] font-sans text-center">
                    <div>
                      <span className="text-[9px] text-gray-400 dark:text-amber-100/40 uppercase font-semibold flex items-center justify-center gap-0.5 whitespace-nowrap">
                        <Clock size={10} className="flex-shrink-0" /> Prep
                      </span>
                      <p className="text-[10px] sm:text-xs font-semibold text-amber-950 dark:text-amber-100 font-mono mt-0.5 whitespace-nowrap">
                        {p.tempo_producao_minutos} m
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 dark:text-amber-100/40 uppercase font-semibold flex items-center justify-center gap-0.5 whitespace-nowrap">
                        <Coins size={10} className="flex-shrink-0" /> Custo Unit
                      </span>
                      <p className="text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-amber-200/65 font-mono mt-0.5 truncate" title={formatCurrency(p.custo_producao_calculado)}>
                        {formatCurrency(p.custo_producao_calculado)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 dark:text-amber-100/40 uppercase font-semibold flex items-center justify-center gap-0.5 whitespace-nowrap">
                        💰 Preço / Lucro
                      </span>
                      <p className={`text-[10px] sm:text-xs font-mono mt-0.5 truncate ${
                        !p.preco_venda || p.preco_venda <= 0
                          ? 'text-gray-400 dark:text-amber-100/30'
                          : p.preco_venda < p.custo_producao_calculado
                            ? 'text-red-600 dark:text-red-400 font-semibold'
                            : 'text-emerald-700 dark:text-emerald-450 font-bold'
                      }`}>
                        {!p.preco_venda || p.preco_venda <= 0 ? (
                          <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded text-[8px] font-bold">Sem Preço</span>
                        ) : (
                          <>
                            {formatCurrency(p.preco_venda)}
                            {p.preco_venda < p.custo_producao_calculado ? (
                              <span className="text-[8px] text-red-600 dark:text-red-400 ml-0.5 font-bold">(Prejuízo)</span>
                            ) : p.margem_lucro !== undefined && p.margem_lucro > 0 ? (
                              <span className="text-[8px] text-emerald-600 dark:text-emerald-400 ml-0.5 font-bold">({p.margem_lucro}%)</span>
                            ) : null}
                          </>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 dark:text-amber-100/40 uppercase font-semibold flex items-center justify-center gap-0.5 whitespace-nowrap">
                        <Sparkles size={10} className="flex-shrink-0" /> Cap. Cozinha
                      </span>
                      <p className={`text-[10px] sm:text-xs font-bold font-mono mt-0.5 truncate
                        ${maxQtd > 5 ? 'text-amber-900 dark:text-amber-200' : maxQtd > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-red-500 font-medium'}
                      `} title={`${maxQtd} ${store.unidadeSigla(p.unidade_producao_id)}`}>
                        {maxQtd} {store.unidadeSigla(p.unidade_producao_id)}
                      </p>
                    </div>
                  </div>

                  {/* Accordeon for Ingredients (Ficha Técnica) */}
                  <div className="border-t border-dashed border-amber-100 dark:border-[#22160b] pt-3">
                    <button 
                      onClick={() => setExpandedProdutoId(isExpanded ? null : p.id)}
                      className="w-full flex items-center justify-between text-xs text-amber-900/85 dark:text-amber-100 font-semibold hover:text-amber-950 dark:hover:text-[#f8f1ea] cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5 font-sans">
                        <Layers size={14} /> Ficha Técnica ({ingreds.length} ingredientes)
                      </span>
                      <ChevronDown size={14} className={`transform transition ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-2 animate-in fade-in" id={`recipe-${p.id}`}>
                        {ingreds.length === 0 ? (
                           <p className="text-[10px] text-gray-400 dark:text-amber-100/30 italic">Nenhum ingrediente configurado. Favorite editar o produto para listar ingredientes.</p>
                        ) : (
                          <div className="space-y-1.5" id="ingredients-mobile-accordion">
                            {ingreds.map(ing => {
                              const mat = store.materiais.find(m => m.id === ing.material_id);
                              return (
                                <div key={ing.id} className="flex items-center justify-between p-2 rounded-lg bg-orange-50/10 dark:bg-amber-950/10 border border-amber-100/50 dark:border-[#22160b]/50 text-[11px] font-sans">
                                  <span className="font-semibold text-amber-900 dark:text-amber-200">{mat?.nome || 'Ingrediente Deletado'}</span>
                                  <span className="font-mono text-gray-500 dark:text-amber-100/50">
                                    {ing.quantidade_necessaria} {store.unidadeSigla(ing.unidade_id)} 
                                    <span className="text-[9px] text-gray-400 dark:text-amber-100/30 ml-1 font-mono">
                                      ({formatCurrency((ing.quantidade_necessaria * (mat?.custo_unitario || 0)))} )
                                    </span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Interactive Viability Sandbox Test */}
                        <div className="mt-4 p-3 bg-white dark:bg-[#120c06] border border-amber-100/75 dark:border-[#22160b] rounded-xl space-y-3">
                          <label className="block text-[10px] font-semibold text-amber-950 dark:text-amber-100 uppercase font-sans">
                            Simular Viabilidade de Produção
                          </label>
                          <div className="flex gap-2">
                            <input 
                              type="number"
                              min="1"
                              placeholder="Qtd"
                              value={viabilityTestQty[p.id] || ''}
                              onChange={(e) => setViabilityTestQty({ ...viabilityTestQty, [p.id]: Number(e.target.value) })}
                              className="w-16 px-2 py-1 border border-amber-100 dark:border-[#22160b] bg-amber-50/20 dark:bg-amber-950/10 text-xs rounded-lg font-mono text-amber-950 dark:text-amber-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button 
                              onClick={() => handleTestViability(p.id)}
                              className="flex-1 bg-amber-800 hover:bg-amber-900 dark:bg-amber-800 dark:hover:bg-amber-750 text-white font-semibold text-[10px] px-3 py-1 rounded-lg transition cursor-pointer font-sans"
                            >
                              Posso Produzir?
                            </button>
                          </div>

                          {viabilityResults[p.id] && (
                            <div className="text-[11px] animate-in slide-in-from-top-1">
                              {viabilityResults[p.id].viavel ? (
                                <div className="text-emerald-800 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-[#1c301e] p-2 rounded-lg flex items-center gap-1.5 text-[10px]">
                                  <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                                  <span className="font-sans">Sim! Há ingredientes em estoque para produzir {viabilityTestQty[p.id] || 1} unidades.</span>
                                </div>
                              ) : (
                                <div className="text-red-800 bg-red-50 dark:bg-red-950/15 border border-red-100 dark:border-red-900/30 p-2 rounded-lg space-y-1">
                                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-red-700 dark:text-red-400 font-sans">
                                    <AlertTriangle size={14} className="text-red-500 font-semibold" />
                                    <span>Não há ingredientes suficientes!</span>
                                  </div>
                                  <ul className="list-disc list-inside text-[9px] text-red-650/90 dark:text-red-400/90 pl-1 font-sans">
                                    {viabilityResults[p.id].deficit.map((def, dIdx) => (
                                      <li key={dIdx}>
                                        {def.materialNome}: faltam <span className="font-bold font-mono">{def.falta}{def.unidade}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer buttons row */}
                <div className="bg-amber-50/20 dark:bg-[#150f09]/40 px-4 py-3 border-t border-amber-100 dark:border-[#22160b] flex items-center justify-between gap-3">
                  {store.hasPermission('produtos.excluir') && (
                    <button 
                      onClick={() => setDeleteConfirm({ id: p.id, name: p.nome })}
                      className="hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded-lg text-red-600 dark:text-red-405 transition text-xs flex items-center gap-1 font-semibold cursor-pointer font-sans"
                    >
                      <Trash2 size={14} /> Excluir
                    </button>
                  )}
                  {store.hasPermission('produtos.editar') && (
                    <button 
                      onClick={() => handleOpenEdit(p)}
                      className="bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-100 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition cursor-pointer font-sans"
                    >
                      <Edit3 size={13} /> Editar Produto / Ficha
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: NEW / EDIT PRODUCT + FICHA TECNICA */}
      {isFormOpen && (store.hasPermission('produtos.criar') || store.hasPermission('produtos.editar')) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 text-xs font-sans animate-fade-in" id="modal-product-form">
          <div className="bg-white dark:bg-[#120c06] w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom border-t border-amber-100 dark:border-[#2d1e0d]">
            <div className="p-6 border-b border-amber-100 dark:border-[#2d1e0d] flex items-center justify-between sticky top-0 bg-white dark:bg-[#120c06] z-10">
              <div>
                <h3 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">
                  {editId ? 'Editar Produto & Ficha' : 'Novo Produto & Ficha Técnica'}
                </h3>
                <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-1 font-sans">Insira os dados cadastrais e monte os ingredientes necessários para preparar este produto.</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-amber-950 dark:hover:text-[#f8f1ea] p-1 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs font-sans">
              
              {/* Cadastro Básico Row */}
              <div className="space-y-3">
                <h4 className="font-display font-semibold text-amber-900 dark:text-amber-200 border-b border-amber-100 dark:border-[#2d1e0d] pb-1 uppercase tracking-wider text-[10px]">1. Informações Básicas de Venda</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-amber-900 dark:text-amber-100 font-medium font-sans">Nome do Salgado, Bolo ou Doce *</label>
                    <input 
                      type="text" 
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Coxinha de Frango c/ Catupiry grande"
                      className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg focus:outline-none focus:border-amber-400 dark:focus:border-amber-550 text-xs font-sans bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-amber-900 dark:text-amber-100 font-medium font-sans">Categoria *</label>
                    <select 
                      value={categoriaId}
                      onChange={(e) => setCategoriaId(Number(e.target.value))}
                      className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg focus:outline-none focus:border-amber-400 text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 font-sans"
                    >
                      {store.categorias.map(cat => (
                        <option key={cat.id} value={cat.id} className="dark:bg-[#1c140c]">{cat.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-amber-900 dark:text-amber-100 font-medium font-sans">Unidade de Produção *</label>
                    <div className="flex gap-2">
                      <select 
                        value={unidadeProducaoId}
                        onChange={(e) => setUnidadeProducaoId(Number(e.target.value))}
                        className="flex-1 p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg focus:outline-none focus:border-amber-400 text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 font-sans"
                        required
                      >
                        {store.unidades.map(u => (
                          <option key={u.id} value={u.id} className="dark:bg-[#1c140c]">{u.nome} ({u.sigla})</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => setShowNovaUnidade(true)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition shrink-0 whitespace-nowrap">
                        + Nova
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-amber-900 dark:text-amber-100 font-medium font-sans text-xs">Tempo de Produção (min)</label>
                    <input 
                      type="number" 
                      value={tempoProducao}
                      onChange={(e) => setTempoProducao(Number(e.target.value))}
                      className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg focus:outline-none focus:border-amber-400 text-xs font-mono bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-amber-900 dark:text-amber-100 font-medium font-sans">Status no Cardápio</label>
                    <div className="flex items-center gap-4 py-1.5">
                      <label className="flex items-center gap-1 cursor-pointer font-bold text-amber-900 dark:text-amber-100 font-sans">
                        <input 
                          type="radio" 
                          checked={ativo === true}
                          onChange={() => setAtivo(true)}
                          className="text-amber-700 focus:ring-amber-500"
                        /> Ativo
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer text-gray-500 dark:text-amber-100/40 font-semibold font-sans">
                        <input 
                          type="radio" 
                          checked={ativo === false}
                          onChange={() => setAtivo(false)}
                          className="text-amber-700 focus:ring-amber-500"
                        /> Inativo
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-amber-900 dark:text-amber-100 font-medium font-sans">Descrição Técnica (Lanchonetes, Clientes, Alergênicos...)</label>
                  <textarea 
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Ex: Contém trigo e derivados de leite. Recheado com peito desfiado e temperos naturais."
                    className="w-full h-16 p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg focus:outline-none focus:border-amber-400 dark:focus:border-amber-550 text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400"
                  />
                </div>

                {/* FOTO DO PRODUTO (COMPLEX IMAGE OPTIMIZATION CARDS) */}
                <div className="space-y-1">
                  <label className="text-amber-900 dark:text-amber-100 font-medium font-sans block">Foto do Produto (Compactação Automática para Supabase)</label>
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-amber-50/15 dark:bg-[#17100a]/40 rounded-xl border border-amber-100/50 dark:border-[#22160b]/40">
                    {imagem ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-amber-200 dark:border-amber-900/30 flex-shrink-0 bg-white dark:bg-[#1a120b] shadow-sm animate-in fade-in zoom-in-95">
                        <img src={imagem} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => setImagem('')}
                          className="absolute top-1 right-1 bg-red-650 hover:bg-red-750 text-white rounded-full p-1 shadow-md cursor-pointer transition"
                          title="Remover Imagem"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-amber-50/20 dark:bg-amber-955/20 border border-dashed border-amber-200 dark:border-amber-900/40 flex flex-col items-center justify-center text-gray-400 dark:text-amber-100/20 flex-shrink-0">
                        <Utensils size={20} className="stroke-1" />
                        <span className="text-[8px] text-center font-bold font-mono mt-1 uppercase tracking-wider">Sem Foto</span>
                      </div>
                    )}
                    
                    <div className="flex-1 space-y-1 w-full text-center sm:text-left">
                      <label className="inline-flex items-center justify-center bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-150 font-bold px-3 py-1.5 rounded-lg border border-amber-200/50 dark:border-amber-900/50 cursor-pointer text-[10px] uppercase tracking-wider font-sans transition">
                        {imageCompressing ? 'Compactando Imagem...' : 'Escolher Foto do Produto'}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageChange}
                          disabled={imageCompressing}
                          className="hidden" 
                        />
                      </label>
                      <p className="text-[10px] text-gray-400 dark:text-amber-100/30 font-sans leading-tight">
                        O compressor de imagem no navegador reduzirá e redimensionará automaticamente arquivos grandes para menos de 60KB, mantendo a performance do banco e preparando-se para o Supabase Storage.
                      </p>
                    </div>
                  </div>
                </div>

                {/* CALCULADORA DE PREÇO E MARGEM DE LUCRO */}
                <div className="p-3.5 bg-gradient-to-br from-emerald-50/10 to-teal-50/5 dark:from-emerald-950/5 dark:to-teal-950/5 rounded-xl border border-emerald-100/30 dark:border-emerald-950/20 space-y-3 animate-in fade-in slide-in-from-top-1">
                  <h5 className="font-display font-bold text-emerald-800 dark:text-emerald-450 uppercase tracking-widest text-[9px] flex items-center gap-1">
                    💸 Precificação & Margem de Lucro
                  </h5>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-0.5">
                      <span className="text-gray-400 dark:text-amber-100/40 font-medium font-sans text-[10px] block">Custo Unitário (Ficha Técnica)</span>
                      <p className="p-2 border border-dashed border-amber-100 dark:border-amber-950/50 rounded-lg bg-amber-50/10 dark:bg-amber-950/5 text-gray-500 dark:text-amber-200/50 font-mono font-semibold text-xs h-9 flex items-center">
                        {formatCurrency(liveCustoProducao)}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-amber-900 dark:text-amber-100 font-medium font-sans text-[10px] flex items-center gap-1">
                        Margem de Lucro Desejada (%) *
                      </label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={margemLucro}
                          onChange={(e) => handleMargemChange(Math.max(0, Number(e.target.value)))}
                          placeholder="Ex: 100 para 100% de lucro"
                          className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg focus:outline-none focus:border-amber-400 text-xs font-mono bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 pr-7"
                          required
                          min="0"
                        />
                        <span className="absolute right-2.5 top-2 text-gray-400 dark:text-amber-100/30 font-mono font-medium text-[10px]">%</span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-amber-900 dark:text-amber-100 font-medium font-sans text-[10px] block">Preço de Venda Final *</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2.5 text-gray-400 dark:text-amber-100/30 font-sans text-[10px]">R$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          value={precoVenda}
                          onChange={(e) => handlePrecoVendaChange(Math.max(0, Number(e.target.value)))}
                          placeholder="0.00"
                          className="w-full p-2 pl-7 border border-amber-200 dark:border-[#2d1e0d] rounded-lg focus:outline-none focus:border-amber-400 text-xs font-mono bg-white dark:bg-[#1c140c] text-emerald-800 dark:text-emerald-450 font-bold"
                          required
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-[9px] text-gray-400 dark:text-amber-100/30 italic font-sans leading-tight">
                    Preencher o percentual de lucro calcula o preço de venda e vice-versa. O cálculo tem base dinâmica no custo da receita cadastrada.
                  </p>
                </div>
              </div>

              {/* Ficha técnica ingredients composer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-amber-100 dark:border-[#2d1e0d] pb-1">
                  <h4 className="font-display font-semibold text-amber-900 dark:text-amber-200 uppercase tracking-wider text-[10px]">2. Composição da Receita (Ingredientes)</h4>
                  <button 
                    type="button" 
                    onClick={handleAddRecipeRow}
                    className="text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-[#f8f1ea] text-xs font-bold flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <Plus size={14} /> Adicionar Ingrediente
                  </button>
                </div>

                {recipeItems.length === 0 ? (
                  <div className="bg-amber-50/10 dark:bg-amber-950/5 rounded-xl p-4 border border-amber-50 dark:border-[#2d1e0d] text-center text-gray-400 dark:text-amber-100/30 font-sans">
                    <p className="text-xs">Nenhum ingrediente adicionado para faturar custo de composição.</p>
                    <button 
                      type="button" 
                      onClick={handleAddRecipeRow}
                      className="mt-2 text-[10px] bg-amber-100 dark:bg-amber-950 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-100 font-bold px-3 py-1.5 rounded-lg border border-amber-100 dark:border-[#3a2714] cursor-pointer"
                    >
                      Inserir Primeiro Ingrediente
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recipeItems.map((item, idx) => {
                      const materialRef = store.materiais.find(m => m.id === item.material_id);
                      return (
                        <div key={idx} className="flex flex-col sm:flex-row gap-3 items-center bg-orange-50/15 dark:bg-[#1c140c]/30 p-3 rounded-lg border border-amber-100/50 dark:border-[#2d1e0d]/50 font-sans">
                          {/* Choose material element dropdown */}
                          <div className="w-full sm:flex-1 space-y-0.5">
                            <label className="text-[9px] font-semibold uppercase text-amber-900/60 dark:text-amber-200/50">Material / Insumo</label>
                            <select 
                              value={item.material_id}
                              onChange={(e) => handleUpdateRecipeRow(idx, { material_id: e.target.value })}
                              className="w-full p-1.5 border border-amber-200 dark:border-[#2d1e0d] rounded text-xs bg-white dark:bg-[#1a1109] text-amber-950 dark:text-amber-100"
                            >
                              {store.materiais.map(m => (
                                <option key={m.id} value={m.id} className="dark:bg-[#1a1109]">{m.nome} (Estoque: {m.quantidade_atual}{store.unidadeSigla(m.unidade_id)})</option>
                              ))}
                            </select>
                          </div>

                          {/* Ingredient unit quantity inside recipe */}
                          <div className="w-full sm:w-36 space-y-0.5">
                            <label className="text-[9px] font-semibold uppercase text-amber-900/60 dark:text-amber-200/50">Quantidade Necessária</label>
                            <div className="flex items-center border border-amber-200 dark:border-[#2d1e0d] rounded overflow-hidden">
                              <input 
                                type="number" 
                                step="any"
                                min="0.0001"
                                placeholder="0.5"
                                value={item.quantidade_necessaria}
                                onChange={(e) => handleUpdateRecipeRow(idx, { quantidade_necessaria: Number(e.target.value) })}
                                className="w-full p-1.5 focus:outline-none font-mono text-xs bg-white dark:bg-[#1a1109] text-amber-950 dark:text-amber-100"
                                required
                              />
                              <span className="bg-amber-50 dark:bg-amber-950/40 px-2 py-1.5 text-[10px] font-bold text-amber-900 dark:text-amber-200 font-mono whitespace-nowrap">
                                {store.unidadeSigla(item.unidade_id)}
                              </span>
                            </div>
                          </div>

                          {/* Price preview */}
                          <div className="w-full sm:w-28 text-center sm:text-right pt-2 sm:pt-0">
                            <span className="text-[9px] text-gray-400 dark:text-amber-100/35 block uppercase font-medium">Subtotal Estimado</span>
                            <span className="font-mono text-xs font-semibold text-amber-900 dark:text-amber-100">
                              {formatCurrency((item.quantidade_necessaria * (materialRef?.custo_unitario || 0)))}
                            </span>
                          </div>

                          {/* Delete ingredient button */}
                          <div className="pt-2 sm:pt-4">
                            <button 
                              type="button" 
                              onClick={() => handleRemoveRecipeRow(idx)}
                              className="hover:bg-red-100 dark:hover:bg-red-950/40 p-1.5 rounded text-red-550 dark:text-red-400 cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Composition cost preview summary */}
              {recipeItems.length > 0 && (
                <div className="p-3 bg-emerald-50 dark:bg-[#1a3a22]/30 rounded-xl border border-emerald-100 dark:border-[#244c2f]/40 flex items-center justify-between text-xs" id="recipe-summary-box">
                  <span className="font-semibold text-emerald-950 dark:text-emerald-200 flex items-center gap-1 font-sans">
                    <Info size={14} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" /> Custo Unitário Projetado da Ficha Técnica:
                  </span>
                  <span className="font-bold font-mono text-emerald-800 dark:text-emerald-400 text-base">
                    {formatCurrency(recipeItems.reduce((acc, item) => {
                      const mat = store.materiais.find(m => m.id === item.material_id);
                      return acc + (item.quantidade_necessaria * (mat?.custo_unitario || 0));
                    }, 0))}
                  </span>
                </div>
              )}

              {/* Bottom control anchors */}
              <div className="flex items-center gap-3 pt-3 border-t border-amber-150 dark:border-[#2d1e0d]">
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-2.5 rounded-xl text-center cursor-pointer font-sans"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-amber-700 hover:bg-amber-800 dark:bg-amber-800 dark:hover:bg-amber-750 text-white font-bold py-2.5 rounded-xl text-center shadow-md text-xs font-sans cursor-pointer"
                >
                  Confirmar Cadastro
                </button>
              </div>

            </form>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-amber-950 dark:text-amber-100 font-medium">Sigla *</label>
                  <input type="text" value={novaUnidadeSigla} onChange={e => setNovaUnidadeSigla(e.target.value)} required
                    placeholder="Ex: kg, L, dz"
                    className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 font-mono placeholder:text-gray-400 dark:placeholder:text-amber-200/20" />
                </div>
                <div>
                  <label className="text-xs text-amber-950 dark:text-amber-100 font-medium">Tipo *</label>
                  <select value={novaUnidadeTipo} onChange={e => setNovaUnidadeTipo(e.target.value as 'massa' | 'volume' | 'unidade')}
                    className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100">
                    <option value="massa" className="dark:bg-[#1c140c]">Massa (peso)</option>
                    <option value="volume" className="dark:bg-[#1c140c]">Volume (líquido)</option>
                    <option value="unidade" className="dark:bg-[#1c140c]">Unidade (contável)</option>
                  </select>
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
