// js/priceCalculator.js

let pricesData = null;
let couponsData = null;

// Função para carregar os dados JSON
async function loadPriceData() {
    try {
        const [pricesResponse, couponsResponse] = await Promise.all([
            fetch('cursos.json'), // ALTERADO: Agora carrega cursos.json
            fetch('cupons.json')
        ]);

        if (!pricesResponse.ok) throw new Error('Erro ao carregar cursos.json');
        if (!couponsResponse.ok) throw new Error('Erro ao carregar cupons.json');

        pricesData = await pricesResponse.json();
        couponsData = await couponsResponse.json();

        console.log('Dados de cursos, preços e cupons carregados:', { pricesData, couponsData });
        return true;
    } catch (error) {
        console.error('Erro ao carregar dados (cursos/cupons):', error);
        alert('Ocorreu um erro ao carregar os dados. Por favor, tente novamente mais tarde.');
        return false;
    }
}

/**
 * Função interna para encontrar um curso pelo ID (NOVA FUNÇÃO HELPER)
 * @param {string} courseId - ID do curso
 * @returns {Object|undefined} Objeto do curso ou undefined se não encontrado
 */
function _findCourseById(courseId) {
    if (!pricesData || !pricesData.cursos) return undefined;
    return pricesData.cursos.find(c => c.id === courseId);
}

/**
 * Obtém todos os cursos e contraturnos disponíveis
 * @returns {Array} Array com todos os cursos e contraturnos
 */
function getAllCourses() {
    if (!pricesData || !pricesData.cursos) return [];
    return pricesData.cursos; // Agora pricesData.cursos já é um array com todos os objetos completos
}

/**
 * Obtém o preço de um curso específico para um plano específico
 * @param {string} courseId - ID do curso
 * @param {string} planKey - Chave do plano (mensal, bimestral, quadrimestral)
 * @returns {number} Preço do curso para o plano
 */
function getCoursePrice(courseId, planKey) {
    const course = _findCourseById(courseId);
    if (course && course.precos && course.precos[planKey] !== undefined) {
        return course.precos[planKey];
    }
    console.warn(`Preço não encontrado para o curso ${courseId} no plano ${planKey}.`);
    return 0;
}

/**
 * Obtém os detalhes completos de um curso pelo ID
 * @param {string} courseId - ID do curso
 * @returns {Object|null} Objeto com detalhes do curso ou null se não encontrado
 */
function getCourseById(courseId) {
    const course = _findCourseById(courseId);
    return course ? { ...course } : null; // Retorna uma cópia para evitar modificações diretas
}

/**
 * Calcula o total da inscrição com base nos cursos selecionados, plano de pagamento e cupom.
 * @param {Array<string>} selectedCourseIds - Array de IDs dos cursos selecionados
 * @param {string} paymentPlanKey - Chave do plano de pagamento (mensal, bimestral, quadrimestral)
 * @param {string} couponCode - Código do cupom
 * @param {string} paymentMethod - Método de pagamento (Cartão de Crédito, PIX/Boleto, Bolsista Integral)
 * @param {number} apprenticesCount - Número de aprendizes (para desconto de irmãos)
 * @returns {Object} Objeto contendo detalhes do cálculo
 */
function calculateTotal(selectedCourseIds, paymentPlanKey, couponCode, paymentMethod = '', apprenticesCount = 1) {
    if (!pricesData || !couponsData) {
        console.error("Dados de preços ou cupons não carregados.");
        return {
            subtotal: 0,
            discountAmount: 0,
            couponAmount: 0,
            cardFee: 0,
            total: 0,
            coursesDetails: [],
            appliedDiscounts: []
        };
    }

    let subtotal = 0;
    let coursesDetails = [];
    let appliedDiscounts = [];

    // 1. Calcular subtotal e coletar detalhes dos cursos
    if (selectedCourseIds && selectedCourseIds.length > 0) {
        selectedCourseIds.forEach(courseId => {
            const price = getCoursePrice(courseId, paymentPlanKey);
            const courseName = getCourseNameById(courseId); // Usar o nome 'simplificado' do curso para o resumo
            
            subtotal += price;
            coursesDetails.push({
                id: courseId,
                name: courseName,
                price: price,
                planPrice: price // Mantido para compatibilidade, pode ser o mesmo que 'price' aqui
            });
        });
    }

    let currentTotal = subtotal;
    let discountAmount = 0; // Total de descontos aplicados (múltiplos cursos, irmãos, bolsista)
    let couponAmount = 0; // Desconto apenas do cupom
    let cardFee = 0;

    // --- Lógica de descontos (requer a seção "descontos" no cursos.json) ---
    if (pricesData.descontos) {
        // 2 e 3. Aplicar desconto de múltiplos cursos OU desconto de irmãos (não cumulativos)
        if (selectedCourseIds.length > 1 || apprenticesCount > 1) {
            // A prioridade é para múltiplos cursos se houver mais de um selecionado
            if (selectedCourseIds.length > 1 && pricesData.descontos.multiplos_cursos) {
                // Encontra o curso com o menor preço dentre os selecionados
                const pricesOfSelectedCourses = selectedCourseIds.map(id => getCoursePrice(id, paymentPlanKey));
                const lowestPriceAmongSelected = Math.min(...pricesOfSelectedCourses);
                
                const multipleCoursesDiscount = lowestPriceAmongSelected * pricesData.descontos.multiplos_cursos.percentual;
                discountAmount += multipleCoursesDiscount;
                currentTotal -= multipleCoursesDiscount;
                appliedDiscounts.push({
                    type: 'multiplos_cursos',
                    name: pricesData.descontos.multiplos_cursos.nome,
                    amount: multipleCoursesDiscount
                });
            } else if (apprenticesCount > 1 && pricesData.descontos.irmaos) {
                // Se não houver múltiplos cursos selecionados, aplica o desconto de irmãos.
                // A lógica original usava 'lowestPrice' do total de cursos.
                // Para irmãos, geralmente aplica-se a um dos aprendizes, ou ao curso de menor valor.
                // Vou manter a lógica de "lowestPrice" como estava, mas considere o contexto.
                const firstCoursePrice = selectedCourseIds.length > 0 ? getCoursePrice(selectedCourseIds[0], paymentPlanKey) : 0;
                const brotherDiscount = firstCoursePrice * pricesData.descontos.irmaos.percentual; // Exemplo: aplica no primeiro curso
                discountAmount += brotherDiscount;
                currentTotal -= brotherDiscount;
                appliedDiscounts.push({
                    type: 'irmaos',
                    name: pricesData.descontos.irmaos.nome,
                    amount: brotherDiscount
                });
            }
        }
    } else {
        console.warn("Seção 'descontos' não encontrada em cursos.json. Descontos de múltiplos cursos e irmãos não serão aplicados.");
    }

    // 4. Aplicar desconto do cupom
    if (couponCode) {
        const normalizedCouponCode = couponCode.toUpperCase();
        const coupon = couponsData[normalizedCouponCode];

        if (coupon) {
            if (coupon.tipo === 'percentual') {
                couponAmount = currentTotal * coupon.valor;
                if (coupon.maxDesconto && couponAmount > coupon.maxDesconto) {
                    couponAmount = coupon.maxDesconto;
                }
            } else if (coupon.tipo === 'fixo') {
                couponAmount = coupon.valor;
            }
            couponAmount = Math.min(couponAmount, currentTotal); // Garante que o cupom não deixa o valor negativo
            currentTotal -= couponAmount;
        }
    }

    // 5. Aplicar taxa de cartão (se cartão de crédito)
    if (paymentMethod === 'Cartão de Crédito' && pricesData.planos && pricesData.planos[paymentPlanKey]) {
        const plan = pricesData.planos[paymentPlanKey];
        if (plan.taxaCartaoPercentual) {
            cardFee = currentTotal * plan.taxaCartaoPercentual;
            currentTotal += cardFee;
        }
    }

    // 6. Aplicar desconto de bolsista integral (zera o valor)
    if (paymentMethod === 'Bolsista Integral') {
        if (pricesData.descontos && pricesData.descontos.bolsistas100) {
            const scholarshipDiscount = currentTotal; // Zera o total atual
            discountAmount += scholarshipDiscount; // Adiciona ao total de descontos
            currentTotal = 0;
            appliedDiscounts.push({
                type: 'bolsistas100',
                name: pricesData.descontos.bolsistas100.nome,
                amount: scholarshipDiscount
            });
        } else {
            console.warn("Desconto 'bolsistas100' não configurado em cursos.json. Bolsista Integral não aplicará desconto.");
        }
    }

    return {
        subtotal: parseFloat(subtotal.toFixed(2)),
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        couponAmount: parseFloat(couponAmount.toFixed(2)),
        cardFee: parseFloat(cardFee.toFixed(2)),
        total: parseFloat(currentTotal.toFixed(2)),
        coursesDetails: coursesDetails,
        appliedDiscounts: appliedDiscounts,
        paymentPlan: pricesData.planos[paymentPlanKey] // Garante que o plano está acessível
    };
}


/**
 * Obtém o nome de um curso pelo ID
 * @param {string} courseId - ID do curso
 * @returns {string} Nome do curso
 */
function getCourseNameById(courseId) {
    const course = _findCourseById(courseId);
    return course ? course.nome : courseId; // Retorna o nome ou o ID se não encontrar
}

/**
 * Obtém informações sobre um plano de pagamento
 * @param {string} planKey - Chave do plano (mensal, bimestral, quadrimestral)
 * @returns {Object|null} Objeto com informações do plano ou null se não encontrado
 */
function getPaymentPlanInfo(planKey) {
    if (!pricesData || !pricesData.planos || !pricesData.planos[planKey]) return null;
    return pricesData.planos[planKey];
}

/**
 * Verifica se um cupom é válido
 * @param {string} couponCode - Código do cupom
 * @returns {boolean} true se o cupom for válido, false caso contrário
 */
function isValidCoupon(couponCode) {
    if (!couponsData || !couponCode) return false;
    const normalizedCouponCode = couponCode.toUpperCase();
    return !!couponsData[normalizedCouponCode];
}

/**
 * Obtém informações sobre um cupom
 * @param {string} couponCode - Código do cupom
 * @returns {Object|null} Objeto com informações do cupom ou null se não encontrado
 */
function getCouponInfo(couponCode) {
    if (!couponsData || !couponCode) return null;
    const normalizedCouponCode = couponCode.toUpperCase();
    return couponsData[normalizedCouponCode] || null;
}

/**
 * Formata um valor monetário para exibição no padrão brasileiro
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado como "R$ 1.245,67"
 */
function formatCurrency(value) {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'R$ 0,00';
    return numValue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Obtém todos os planos de pagamento disponíveis
 * @returns {Object} Objeto com todos os planos de pagamento
 */
function getAllPaymentPlans() {
    if (!pricesData || !pricesData.planos) return {};
    return pricesData.planos;
}

/**
 * Calcula o desconto percentual de um plano em relação ao mensal
 * @param {string} planKey - Chave do plano
 * @param {string} courseId - ID do curso
 * @returns {number} Percentual de desconto (0 a 1)
 */
function calculatePlanDiscount(planKey, courseId) {
    if (!pricesData || planKey === 'mensal') return 0;
    
    const monthlyPrice = getCoursePrice(courseId, 'mensal');
    const planPrice = getCoursePrice(courseId, planKey);
    
    if (monthlyPrice === 0) return 0;
    
    return (monthlyPrice - planPrice) / monthlyPrice;
}

// Exportar funções para serem acessíveis em script.js
window.priceCalculator = {
    loadPriceData,
    calculateTotal,
    getAllCourses,
    getCoursePrice,
    getCourseNameById,
    getCourseById,
    getPaymentPlanInfo,
    getAllPaymentPlans,
    calculatePlanDiscount,
    isValidCoupon,
    getCouponInfo,
    formatCurrency,
    getPricesData: () => pricesData,
    getCouponsData: () => couponsData
};