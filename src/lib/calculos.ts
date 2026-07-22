import { Material, FichaTecnicaItem, Produto, EstoqueProduto, Unidade } from '../types';

export function formatarNumero(valor: number, decimais: number = 2): string {
  if (Number.isInteger(valor)) return valor.toString();
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimais,
  });
}

export function normalizarQuantidade(
  qtdFicha: number,
  unidadeFichaId: number,
  unidadeMaterialId: number,
  unidades: Unidade[]
): number {
  const uf = unidades.find(u => u.id === unidadeFichaId)?.sigla?.toLowerCase() || '';
  const um = unidades.find(u => u.id === unidadeMaterialId)?.sigla?.toLowerCase() || '';

  if (uf === um) return qtdFicha;

  if (uf === 'g' && um === 'kg') return Number((qtdFicha / 1000).toFixed(3));
  if (uf === 'kg' && um === 'g') return Number((qtdFicha * 1000).toFixed(3));

  if (uf === 'ml' && um === 'l') return Number((qtdFicha / 1000).toFixed(3));
  if (uf === 'l' && um === 'ml') return Number((qtdFicha * 1000).toFixed(3));

  return qtdFicha;
}

export function calcularCustoProducao(
  produtoId: string,
  fichas: FichaTecnicaItem[],
  materiais: Material[],
  unidades: Unidade[]
): number {
  const ingredientes = fichas.filter((f) => f.produto_id === produtoId);
  if (ingredientes.length === 0) return 0;

  let custoTotal = 0;
  for (const ing of ingredientes) {
    const mat = materiais.find((m) => m.id === ing.material_id);
    if (mat) {
      const qtdNormalizada = normalizarQuantidade(ing.quantidade_necessaria, ing.unidade_id, mat.unidade_id, unidades);
      custoTotal += qtdNormalizada * mat.custo_unitario;
    }
  }
  return Number(custoTotal.toFixed(2));
}

/**
 * Checks if there are enough raw materials to produce a given quantity of a product.
 * Returns viability and list of missing materials.
 */
export function verificarViabilidadeProducao(
  produtoId: string,
  quantidade: number,
  fichas: FichaTecnicaItem[],
  materiais: Material[],
  unidades: Unidade[]
): {
  viavel: boolean;
  deficit: { materialId: string; materialNome: string; falta: number; unidade: string }[];
} {
  const ingredientes = fichas.filter((f) => f.produto_id === produtoId);
  const deficit: { materialId: string; materialNome: string; falta: number; unidade: string }[] = [];

  for (const ing of ingredientes) {
    const mat = materiais.find((m) => m.id === ing.material_id);
    if (!mat) continue;

    const qtdNormalizada = normalizarQuantidade(ing.quantidade_necessaria, ing.unidade_id, mat.unidade_id, unidades);
    const totalNecessario = qtdNormalizada * quantidade;

    if (mat.quantidade_atual < totalNecessario) {
      const faltaEstoqueUnidade = totalNecessario - mat.quantidade_atual;
      const unidadeNome = unidades.find(u => u.id === mat.unidade_id)?.sigla || '?';
      deficit.push({
        materialId: mat.id,
        materialNome: mat.nome,
        falta: Number(faltaEstoqueUnidade.toFixed(3)),
        unidade: unidadeNome,
      });
    }
  }

  return {
    viavel: deficit.length === 0,
    deficit,
  };
}

/**
 * Evaluates the absolute maximum doable production of a product based on current raw material stock.
 */
export function sugerirMaximoProduzivel(
  produtoId: string,
  fichas: FichaTecnicaItem[],
  materiais: Material[],
  unidades: Unidade[]
): number {
  const ingredientes = fichas.filter((f) => f.produto_id === produtoId);
  if (ingredientes.length === 0) return 0;

  let maxProduzivel = Infinity;

  for (const ing of ingredientes) {
    const mat = materiais.find((m) => m.id === ing.material_id);
    if (!mat) continue;

    const qtdNormalizada = normalizarQuantidade(ing.quantidade_necessaria, ing.unidade_id, mat.unidade_id, unidades);
    if (qtdNormalizada <= 0) continue;

    const possivelComMaterial = mat.quantidade_atual / qtdNormalizada;
    if (possivelComMaterial < maxProduzivel) {
      maxProduzivel = possivelComMaterial;
    }
  }

  const result = maxProduzivel === Infinity ? 0 : Math.floor(maxProduzivel);
  return result < 0 ? 0 : result;
}

/**
 * Intelligent alert system check for a full order.
 * For each ordered item:
 * 1. checks how much is available in finished goods store (`quantidade_disponivel`).
 * 2. If below quantity requested, gets the remaining amount needed (`faltaFisico`).
 * 3. Checks if raw ingredients are sufficient to construct the remaining amount (`faltaFisico`).
 * 4. Aggregates all ingredient requirements to check for double-counting across different list items.
 */
export interface AlertaItemPedido {
  produtoId: string;
  produtoNome: string;
  quantidadeSolicitada: number;
  disponivelEstoque: number; // physically ready
  faltaFisico: number;        // negative of above
  ingredientesDeficit: { materialNome: string; falta: number; unidade: string }[];
}

export function analisarEstoqueParaPedido(
  itens: { produtoId: string; produtoNome: string; quantidadeSolicitada: number }[],
  estoqueProdutos: EstoqueProduto[],
  fichas: FichaTecnicaItem[],
  materiais: Material[],
  unidades: Unidade[]
): {
  tudoDisponivelEmEstoquePronto: boolean;
  podeProduzirRestante: boolean;
  itensAnalise: AlertaItemPedido[];
  resumoFaltasMateriais: { materialNome: string; falta: number; unidade: string }[];
} {
  const itensAnalise: AlertaItemPedido[] = [];
  let tudoDisponivelEmEstoquePronto = true;

  const materiaisSimulados = materiais.map((m) => ({ ...m }));
  const materialFaltasAcumuladas: { [materialId: string]: { nome: string; falta: number; unidade: string } } = {};

  for (const item of itens) {
    const estoque = estoqueProdutos.find((e) => e.produto_id === item.produtoId);
    const disponivel = estoque ? estoque.quantidade_disponivel : 0;
    const faltaFisico = Math.max(0, item.quantidadeSolicitada - disponivel);

    if (faltaFisico > 0) {
      tudoDisponivelEmEstoquePronto = false;
    }

    const ingredientesDefic: { materialNome: string; falta: number; unidade: string }[] = [];

    if (faltaFisico > 0) {
      const ingredientesFicha = fichas.filter((f) => f.produto_id === item.produtoId);
      for (const ing of ingredientesFicha) {
        const matSimulado = materiaisSimulados.find((m) => m.id === ing.material_id);
        if (!matSimulado) continue;

        const qtdNormalizada = normalizarQuantidade(ing.quantidade_necessaria, ing.unidade_id, matSimulado.unidade_id, unidades);
        const totalSimuladoNecessario = qtdNormalizada * faltaFisico;

        if (matSimulado.quantidade_atual >= totalSimuladoNecessario) {
          matSimulado.quantidade_atual -= totalSimuladoNecessario;
        } else {
          const faltaParaEsteIngrediente = totalSimuladoNecessario - matSimulado.quantidade_atual;
          matSimulado.quantidade_atual = 0;
          const unidadeNome = unidades.find(u => u.id === matSimulado.unidade_id)?.sigla || '?';

          ingredientesDefic.push({
            materialNome: matSimulado.nome,
            falta: Number(faltaParaEsteIngrediente.toFixed(3)),
            unidade: unidadeNome,
          });

          if (!materialFaltasAcumuladas[matSimulado.id]) {
            materialFaltasAcumuladas[matSimulado.id] = {
              nome: matSimulado.nome,
              falta: 0,
              unidade: unidadeNome,
            };
          }
          materialFaltasAcumuladas[matSimulado.id].falta += faltaParaEsteIngrediente;
        }
      }
    }

    itensAnalise.push({
      produtoId: item.produtoId,
      produtoNome: item.produtoNome,
      quantidadeSolicitada: item.quantidadeSolicitada,
      disponivelEstoque: disponivel,
      faltaFisico,
      ingredientesDeficit: ingredientesDefic,
    });
  }

  const resumoFaltasMateriais = Object.values(materialFaltasAcumuladas).map((f) => ({
    materialNome: f.nome,
    falta: Number(f.falta.toFixed(3)),
    unidade: f.unidade,
  }));

  const podeProduzirRestante = resumoFaltasMateriais.length === 0;

  return {
    tudoDisponivelEmEstoquePronto,
    podeProduzirRestante,
    itensAnalise,
    resumoFaltasMateriais,
  };
}
