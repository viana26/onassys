import { Material, FichaTecnicaItem, Produto, EstoqueProduto } from '../types';

/**
 * Standardizes quantity conversion from recipe unit to material inventory unit.
 * Handled conversions:
 * - g -> kg (divide recipe by 1000)
 * - mL -> L (divide recipe by 1000)
 * - kg -> g (multiply recipe by 1000)
 * - L -> mL (multiply recipe by 1000)
 */
export function normalizarQuantidade(
  qtdFicha: number,
  unidadeFicha: string,
  unidadeMaterial: string
): number {
  const uf = unidadeFicha.toLowerCase();
  const um = unidadeMaterial.toLowerCase();

  if (uf === um) return qtdFicha;

  // Mass conversions
  if (uf === 'g' && um === 'kg') return qtdFicha / 1000;
  if (uf === 'kg' && um === 'g') return qtdFicha * 1000;

  // Volume conversions
  if (uf === 'ml' && um === 'l') return qtdFicha / 1000;
  if (uf === 'l' && um === 'ml') return qtdFicha * 1000;

  // Default fallback if mismatch but not directly solvable
  return qtdFicha;
}

/**
 * Calculates current raw material cost of producing a single unit of a product
 */
export function calcularCustoProducao(
  produtoId: string,
  fichas: FichaTecnicaItem[],
  materiais: Material[]
): number {
  const ingredientes = fichas.filter((f) => f.produto_id === produtoId);
  if (ingredientes.length === 0) return 0;

  let custoTotal = 0;
  for (const ing of ingredientes) {
    const mat = materiais.find((m) => m.id === ing.material_id);
    if (mat) {
      const qtdNormalizada = normalizarQuantidade(ing.quantidade_necessaria, ing.unidade, mat.unidade);
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
  materiais: Material[]
): {
  viavel: boolean;
  deficit: { materialId: string; materialNome: string; falta: number; unidade: string }[];
} {
  const ingredientes = fichas.filter((f) => f.produto_id === produtoId);
  const deficit: { materialId: string; materialNome: string; falta: number; unidade: string }[] = [];

  for (const ing of ingredientes) {
    const mat = materiais.find((m) => m.id === ing.material_id);
    if (!mat) continue;

    const qtdNormalizada = normalizarQuantidade(ing.quantidade_necessaria, ing.unidade, mat.unidade);
    const totalNecessario = qtdNormalizada * quantidade;

    if (mat.quantidade_atual < totalNecessario) {
      const faltaEstoqueUnidade = totalNecessario - mat.quantidade_atual;
      
      // If the material unit is different, format the showing unit appropriately for display
      deficit.push({
        materialId: mat.id,
        materialNome: mat.nome,
        // Rounded to 3 decimals
        falta: Number(faltaEstoqueUnidade.toFixed(3)),
        unidade: mat.unidade,
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
  materiais: Material[]
): number {
  const ingredientes = fichas.filter((f) => f.produto_id === produtoId);
  if (ingredientes.length === 0) return 0;

  let maxProduzivel = Infinity;

  for (const ing of ingredientes) {
    const mat = materiais.find((m) => m.id === ing.material_id);
    if (!mat) continue;

    const qtdNormalizada = normalizarQuantidade(ing.quantidade_necessaria, ing.unidade, mat.unidade);
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
  materiais: Material[]
): {
  tudoDisponivelEmEstoquePronto: boolean;
  podeProduzirRestante: boolean;
  itensAnalise: AlertaItemPedido[];
  resumoFaltasMateriais: { materialNome: string; falta: number; unidade: string }[];
} {
  // 1. Calculate physical stock missing for each product
  const itensAnalise: AlertaItemPedido[] = [];
  let tudoDisponivelEmEstoquePronto = true;

  // Let's track materials consumed as if we started production of the deficit
  // We make a copy of material quantities to simulate usage across different items
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

        const qtdNormalizada = normalizarQuantidade(ing.quantidade_necessaria, ing.unidade, matSimulado.unidade);
        const totalSimuladoNecessario = qtdNormalizada * faltaFisico;

        if (matSimulado.quantidade_atual >= totalSimuladoNecessario) {
          // Consume simulated stock
          matSimulado.quantidade_atual -= totalSimuladoNecessario;
        } else {
          // We have a deficit
          const faltaParaEsteIngrediente = totalSimuladoNecessario - matSimulado.quantidade_atual;
          // Consume what we can and record deficit
          matSimulado.quantidade_atual = 0;

          ingredientesDefic.push({
            materialNome: matSimulado.nome,
            falta: Number(faltaParaEsteIngrediente.toFixed(3)),
            unidade: matSimulado.unidade,
          });

          // Accumulate for overall summary
          if (!materialFaltasAcumuladas[matSimulado.id]) {
            materialFaltasAcumuladas[matSimulado.id] = {
              nome: matSimulado.nome,
              falta: 0,
              unidade: matSimulado.unidade,
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
