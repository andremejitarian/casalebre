$(document).ready(function() {
    let currentStep = 1;
    const totalSteps = 4; // Ajustado para 4, já que o step-terms não está no HTML
    let pricesDataLoaded = false;
    let prefilledData = null;
    let amigoLebreCategoria = null;

    // --- NOVA VARIÁVEL GLOBAL PARA OS DADOS DOS CURSOS ---
    let allCoursesData = [];

    // URLs dos webhooks
    const WEBHOOK_CONSULTA_URL = 'https://criadordigital-n8n-webhook.kttqgl.easypanel.host/webhook/consulta-matriculav2';
    const WEBHOOK_SUBMISSAO_URL = 'https://criadordigital-n8n-webhook.kttqgl.easypanel.host/webhook/envio-matriculav2';

    // Inicializa as máscaras para os campos
    function initializeMasks() {
        $('.mask-cpf').mask('000.000.000-00', { reverse: true });
        $('.mask-phone').mask('(00) 0 0000-0000');
        $('.mask-date').mask('00/00/0000');
    }

    // Carrega dados e inicializa o formulário (MODIFICADO)
    async function initForm() {
        // Assume que priceCalculator.loadPriceData() agora carrega o cursos.json
        // e expõe os dados dos cursos via priceCalculator.getAllCourses()
        pricesDataLoaded = await priceCalculator.loadPriceData(); 
        if (pricesDataLoaded) {
            allCoursesData = priceCalculator.getAllCourses(); // Popula a nova variável global
            initializeMasks();
            // checkMatriculaParam() e populateCourseSelection() são chamados aqui.
            // A ordem é importante: populateCourseSelection() deve ser chamado antes de 
            // checkMatriculaParam() para que os cards existam na DOM antes de tentar marcá-los.
            populateCourseSelection(); 
            await checkMatriculaParam(); 
            setupEventListeners(); 
            updateSummaryAndTotal(); // Garante que o resumo inicial esteja correto
            showStep(currentStep); // Exibe o primeiro passo
        } else {
            $('#registrationForm').html('<p class="error-message" style="display: block; text-align: center;">Não foi possível carregar os dados do formulário. Por favor, tente novamente mais tarde.</p>');
        }
    }

    // Exibe um passo específico do formulário (AJUSTADO PARA OS IDs DO HTML ATUAL)
    function showStep(stepNum) {
        $('.form-step').removeClass('active');
        let stepId;
        if (stepNum === 1) stepId = '#step-1';
        else if (stepNum === 2) stepId = '#step-2';
        else if (stepNum === 3) stepId = '#step-3';
        else if (stepNum === 4) stepId = '#step-4'; // Este é o passo de pagamento/resumo
        else if (stepNum === 'success') stepId = '#step-success';

        $(stepId).addClass('active');
        currentStep = stepNum;

        const isSuccessStep = (stepId === '#step-success');
        const isFinalDataStep = (stepId === '#step-4'); 
        const isWelcomeStep = (stepId === '#step-1');

        $('.btn-prev').toggle(!isWelcomeStep && !isSuccessStep);
        $('.btn-next').toggle(!isFinalDataStep && !isSuccessStep);
        $('.btn-submit').toggle(isFinalDataStep);
        $('#goToPaymentBtn').toggle(false);

        $('html, body').animate({ scrollTop: 0 }, 500);
    }

    // Popula a seleção de cursos (REESCRITO PARA CARDS)
    function populateCourseSelection() {
        const $cursosGridContainer = $('#cursosGridContainer');
        $cursosGridContainer.empty(); // Limpa a mensagem "Carregando cursos..." ou conteúdo antigo

        if (allCoursesData.length === 0) {
            $cursosGridContainer.html('<p class="error-message">Nenhum curso disponível no momento.</p>');
            return;
        }

        allCoursesData.forEach(course => {
            const referencePrice = course.precos.mensal; // Preço de referência para exibição no card
            const cardHtml = `
                <div class="curso-card" data-course-id="${course.id}">
                    <!-- Novo wrapper para o checkbox personalizado -->
                    <div class="curso-checkbox-wrapper">
                        <input type="checkbox" id="curso-${course.id}" name="curso-${course.id}" value="${course.id}" class="curso-checkbox-input">
                        <span class="curso-checkbox-custom"></span>
                    </div>
                    <div class="card-header">
                        <img src="${course.imagem}" alt="${course.nome}" class="card-image">
                    </div>
                    <div class="card-body">
                        <h3 class="card-title">${course.nome}</h3>
                        <p class="card-subtitle">${course.subtitulo}</p>
                        <p class="card-description-short">${course.descricaoCurta}</p>
                        <ul class="card-details">
                            <li><strong>Dia:</strong> <span>${course.detalhes.dia}</span></li>
                            <li><strong>Horário:</strong> <span>${course.detalhes.horario}</span></li>
                            <li><strong>Idade:</strong> <span>${course.detalhes.idade_min} a ${course.detalhes.idade_max} anos</span></li>
                            <li><strong>Professor:</strong> <span>${course.detalhes.professor}</span></li>
                            <li><strong>Preço Mensal:</strong> <span class="course-price">${priceCalculator.formatCurrency(referencePrice)}</span></li>
                            ${course.vagasDisponiveis !== undefined ? `<li><strong>Vagas:</strong> <span>${course.vagasDisponiveis === 0 ? '<span class="esgotado">Esgotado</span>' : course.vagasDisponiveis}</span></li>` : ''}
                            ${course.detalhes.quantidade_minima_alunos !== undefined ? `<li><strong>Mín. Alunos:</strong> <span>${course.detalhes.quantidade_minima_alunos}</span></li>` : ''}
                        </ul>
                        <button type="button" class="btn-ver-mais" data-course-id="${course.id}">Ver Mais Detalhes</button>
                    </div>
                </div>
            `;
            $cursosGridContainer.append(cardHtml);
        });
        
        // No lugar de $cursosContainer.append(checkboxHtml);
        // Não é mais necessário separar em cursos e contraturnos, todos vão para o mesmo grid.
        // O `contraturnosContainer` foi removido do HTML.
    }

    // Função para exibir um modal com detalhes completos do curso (NOVA FUNÇÃO)
    function showCourseDetailsModal(course) {
        let detailsHtml = `
            <h3>${course.nome} - ${course.subtitulo}</h3>
            <p>${course.descricaoCompleta}</p>
            <ul>
                <li><strong>Dia:</strong> ${course.detalhes.dia}</li>
                <li><strong>Horário:</strong> ${course.detalhes.horario}</li>
                <li><strong>Professor:</strong> ${course.detalhes.professor}</li>
                <li><strong>Contato Prof.:</strong> ${course.detalhes.professor_contato_tel}</li>
                <li><strong>Aulas:</strong> ${course.detalhes.aulas_quantidade} (${course.detalhes.aulas_datas})</li>
                <li><strong>Carga Horária:</strong> ${course.detalhes.carga_horaria_total}</li>
                <li><strong>Período:</strong> ${course.detalhes.data_inicio} a ${course.detalhes.data_termino}</li>
                <li><strong>Duração por Aula:</strong> ${course.detalhes.duracao_aula_horas}h</li>
                <li><strong>Material:</strong> ${course.detalhes.material}</li>
                <li><strong>Idade:</strong> ${course.detalhes.idade_min} a ${course.detalhes.idade_max} anos</li>
                <li><strong>Vagas Disponíveis:</strong> ${course.vagasDisponiveis === 0 ? 'Esgotado' : course.vagasDisponiveis}</li>
                <li><strong>Mínimo Alunos:</strong> ${course.detalhes.quantidade_minima_alunos}</li>
                <li><strong>Preço Mensal:</strong> ${priceCalculator.formatCurrency(course.precos.mensal)}</li>
            </ul>
        `;
        // POR ENQUANTO, APENAS UM ALERT. VOCÊ PODE SUBSTITUIR POR UM MODAL COM HTML E CSS.
        alert(detailsHtml);
    }

    // Função para anexar event listeners específicos aos cards de cursos (NOVA FUNÇÃO)
function attachCourseCardEventListeners() {
    // Listener delegado para checkboxes dentro do courses-grid
    $('#cursosGridContainer').on('change', '.curso-checkbox-input', function() { // <-- ALTERADO AQUI
        const courseId = $(this).val();
        const $card = $(this).closest('.curso-card');
        if (this.checked) {
            $card.addClass('selected');
        } else {
            $card.removeClass('selected');
        }
        updateSummaryAndTotal();
        updateSelectedCoursesDisplay();
    });

    // Listener delegado para botões "Ver Mais Detalhes"
    $('#cursosGridContainer').on('click', '.btn-ver-mais', function() {
        const courseId = $(this).data('course-id');
        const course = allCoursesData.find(c => c.id === courseId);
        if (course) {
            showCourseDetailsModal(course);
        }
    });
}

    // Função para validar campos
    function validateField(inputElement, validationFn = null, errorMessage = 'Campo obrigatório.') {
        const $input = $(inputElement);
        const $formGroup = $input.closest('.form-group'); // Alterado para buscar .form-group pai
        const $errorDiv = $formGroup.find('.error-message');
        let isValid = true;

        $input.removeClass('input-error');
        $errorDiv.hide().text('');

        if ($input.is(':checkbox')) {
            // Checkboxes de "Como ficou sabendo" não são validados por aqui, mas sim em validateCurrentStep
            // A validação de checkbox individual para required seria aqui se fosse o caso.
            // Para os cards, o checkbox não é "required" por si só, e sim a seleção de *pelo menos um* curso.
        } else if ($input.prop('required') && $input.val().trim() === '') {
            isValid = false;
        } else if (validationFn && !validationFn($input.val())) {
            isValid = false;
        }

        if (!isValid) {
            $input.addClass('input-error');
            $errorDiv.text(errorMessage).show();
        }
        return isValid;
    }

    // Valida seleção de cursos (AJUSTADO PARA O NOVO ID)
function validateCourseSelection() {
    const $checkedCourses = $('.curso-checkbox-input:checked'); // <-- ALTERADO AQUI
    const $errorDiv = $('#cursosGridContainer').siblings('.error-message');
    
    if ($checkedCourses.length === 0) {
        $errorDiv.text('Selecione pelo menos um curso.').show();
        return false;
    } else {
        $errorDiv.hide().text('');
        return true;
    }
}

    // Valida o passo atual antes de avançar (AJUSTADO)
    function validateCurrentStep() {
        let isValid = true;

        if (currentStep === 1) {
            isValid = true;
        } else if (currentStep === 2) {
            isValid = validateField($('#nomeResponsavel'), null, 'Nome é obrigatório.') && isValid;
            isValid = validateField($('#emailResponsavel'), (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Email inválido.') && isValid;
            isValid = validateField($('#telefoneResponsavel'), (val) => val.replace(/\D/g, '').length === 11, 'Telefone inválido.') && isValid;
            isValid = validateField($('#cpfResponsavel'), (val) => isValidCPF(val), 'CPF inválido.') && isValid;
            isValid = validateField($('#emergenciaQuemChamar'), null, 'Campo obrigatório.') && isValid;

            const $howKnowCheckboxes = $('input[name="comoSoube"]');
            const $howKnowErrorDiv = $('.how-know-error');
            if ($howKnowCheckboxes.filter(':checked').length === 0) {
                isValid = false;
                $howKnowErrorDiv.text('Selecione pelo menos uma opção.').show();
            } else {
                $howKnowErrorDiv.hide().text('');
            }

        } else if (currentStep === 3) {
            isValid = validateCourseSelection();

        // Removido o passo 4 de termos, pois ele não está no HTML atual.
        // A validação para o passo 5 (pagamento) se torna o currentStep === 4
        } else if (currentStep === 4) { // Antigo passo 5, agora passo 4
            // Validação de termos e autorizaFoto foi removida pois não está no HTML fornecido
            // Se você adicionar um passo de termos, ele será o currentStep === 4, e este será o currentStep === 5.

            isValid = validateField($('#planoPagamento'), null, 'Selecione um plano de pagamento.') && isValid;
            isValid = validateField($('#formaPagamento'), null, 'Selecione a forma de pagamento.') && isValid;
            
            if ($('#formaPagamento').val() === 'PIX/Boleto') {
                isValid = validateField($('#diaVencimento'), null, 'Selecione o dia de vencimento.') && isValid;
            }
        }
        return isValid;
    }

    // Coleta todos os dados do formulário
    function collectFormData() {
        const formData = {
            matricula: $('#matricula').val(),
            cursosSelecionados: [],
            planoPagamento: $('#planoPagamento').val(),
            formaPagamento: $('#formaPagamento').val(),
            diaVencimento: ($('#formaPagamento').val() === 'PIX/Boleto') ? $('#diaVencimento').val() : '',
            aceiteTermos: true, // Placeholder, pois o campo não está no HTML
            autorizaFoto: 'nao_se_aplica', // Placeholder, pois o campo não está no HTML
            cupomCode: $('#cupomCode').val().toUpperCase(),
            amigoLebreCategoria: amigoLebreCategoria
        };

        // Coleta cursos selecionados (AJUSTADO)
        $('.curso-checkbox-input:checked').each(function() { // <-- ALTERADO AQUI
        formData.cursosSelecionados.push($(this).val());
        });

        // Adiciona os detalhes de preço calculados
        const priceDetails = updateSummaryAndTotal();
        formData.resumoFinanceiro = priceDetails;
        formData.valor_calculado_total = priceDetails.total;

        return formData;
    }

    // Atualiza a seção de resumo e o total (AJUSTADO)
    function updateSummaryAndTotal() {
        if (!pricesDataLoaded || allCoursesData.length === 0) {
            // Garante que os dados dos cursos foram carregados
            $('#summarySubtotal').text('R$ 0,00');
            $('#summaryDiscount').text('R$ 0,00');
            $('#summaryCoupon').text('R$ 0,00');
            $('#summaryCardFee').text('R$ 0,00');
            $('#summaryTotal').text('R$ 0,00');
            $('#valor_calculado_total').val('0.00');
            return { total: 0, subtotal: 0, discountAmount: 0, couponAmount: 0, cardFee: 0 };
        }

        const selectedCourseIds = [];
        $('.curso-checkbox-input:checked').each(function() { // <-- ALTERADO AQUI
            selectedCourseIds.push($(this).val());
        });

        const paymentPlan = $('#planoPagamento').val() || 'mensal';
        const couponCode = $('#cupomCode').val();
        const paymentMethod = $('#formaPagamento').val();

        // priceCalculator.calculateTotal precisará ser adaptado para usar a nova estrutura de dados
        const totals = priceCalculator.calculateTotal(
            selectedCourseIds, 
            paymentPlan, 
            couponCode, 
            paymentMethod,
            1 // Sempre 1 aprendiz
        );

        // Atualiza o resumo do aprendiz
        // O #nomeAprendiz não está no HTML fornecido, então usamos um placeholder
        const apprenticeName = 'Aprendiz 1'; // Substitua pelo nome real do aprendiz se houver
        const coursesDetails = [];
        selectedCourseIds.forEach(courseId => {
            const course = allCoursesData.find(c => c.id === courseId); // Pega o objeto completo do curso
            if (course) {
                // Monta a string de detalhes com base nos campos do JSON
                const coursePrice = priceCalculator.getCoursePrice(course.id, paymentPlan); // Pega o preço específico
                coursesDetails.push(`
                    <li class="summary-course-item">
                        <strong>${course.nome}</strong> 
                        <br><span>${course.detalhes.dia} - ${course.detalhes.horario}</span>
                        <span class="course-price">${priceCalculator.formatCurrency(coursePrice)}</span>
                    </li>
                `);
            }
        });

        const $summaryInfo = $('#summaryAprendizInfo');
        if (coursesDetails.length > 0) {
            $summaryInfo.html(`
                <strong>${apprenticeName}:</strong>
                <ul class="summary-courses-list">${coursesDetails.join('')}</ul>
            `);
        } else {
            $summaryInfo.html(`<strong>${apprenticeName}:</strong> Nenhum curso selecionado`);
        }

        // Atualiza os valores financeiros
        $('#summarySubtotal').text(priceCalculator.formatCurrency(totals.subtotal));
        $('#summaryDiscount').text(priceCalculator.formatCurrency(totals.discountAmount));
        $('#summaryCoupon').text(priceCalculator.formatCurrency(totals.couponAmount));
        $('#summaryCardFee').text(priceCalculator.formatCurrency(totals.cardFee));
        $('#summaryTotal').text(priceCalculator.formatCurrency(totals.total));

        $('#valor_calculado_total').val(totals.total.toFixed(2));
        
        return totals;
    }

    // Verifica o parâmetro 'matricula' na URL e tenta pré-preencher
    async function checkMatriculaParam() {
        const urlParams = new URLSearchParams(window.location.search);
        const matricula = urlParams.get('matricula');
        if (matricula) {
            $('#matricula').val(matricula);
            console.log('Matrícula pré-preenchida via URL:', matricula);

            try {
                const response = await fetch(`${WEBHOOK_CONSULTA_URL}?matricula=${matricula}`);
                if (!response.ok) {
                    throw new Error(`Erro ao consultar dados de matrícula: ${response.statusText}`);
                }
                const data = await response.json();

                if (data.success && data.data) {
                    prefilledData = data.data;
                    console.log('Dados pré-preenchidos recebidos:', prefilledData);
                    fillFormWithPrefilledData(prefilledData);
                } else {
                    console.warn('Resposta do webhook de consulta de matrícula não indica sucesso ou não contém dados.');
                }
            } catch (error) {
                console.error('Erro ao pré-preencher formulário via webhook:', error);
                alert('Não foi possível carregar dados de rematrícula. Por favor, preencha manualmente.');
            }
        }
    }

    // Preenche o formulário com os dados recebidos do webhook (AJUSTADO)
    function fillFormWithPrefilledData(data) {
        // Dados do Responsável
        if (data.responsavel) {
            $('#nomeResponsavel').val(data.responsavel.nome);
            $('#cpfResponsavel').val(data.responsavel.cpf).trigger('input');
            $('#emailResponsavel').val(data.responsavel.email);
            $('#telefoneResponsavel').val(data.responsavel.telefone).trigger('input');
        }

        if (data.emergenciaQuemChamar) {
            $('#emergenciaQuemChamar').val(data.emergenciaQuemChamar);
        }

        // Como ficou sabendo
        if (data.comoSoube && Array.isArray(data.comoSoube)) {
            $('input[name="comoSoube"]').prop('checked', false);
            data.comoSoube.forEach(source => {
                $(`input[name="comoSoube"][value="${source}"]`).prop('checked', true);
            });
        }

        // Dados do aprendiz (primeiro aprendiz se houver array)
        if (data.aprendizes && Array.isArray(data.aprendizes) && data.aprendizes.length > 0) {
            const aprendiz = data.aprendizes[0];
            // Os campos abaixo não existem no HTML fornecido, então serão ignorados por enquanto.
            // $('#nomeAprendiz').val(aprendiz.nome);
            // $('#escolaAprendiz').val(aprendiz.escola);
            // $('#dataNascimentoAprendiz').val(aprendiz.dataNascimento);
            // $('#generoAprendiz').val(aprendiz.genero);
            // $('#restricaoAlimentarAprendiz').val(aprendiz.restricaoAlimentar);
            // $('#questaoSaudeAprendiz').val(aprendiz.questaoSaude);

            // Seleciona os cursos (AJUSTADO PARA OS NOVOS CARDS)
            if (aprendiz.cursos && Array.isArray(aprendiz.cursos)) {
            aprendiz.cursos.forEach(courseId => { 
            // Altera a forma de encontrar o checkbox para usar o ID
            const $checkbox = $(`#curso-${courseId}`); // O ID ainda é único para o input
            if ($checkbox.length) {
                $checkbox.prop('checked', true); 
                // Certifique-se que o card visualmente também é atualizado
                $checkbox.closest('.curso-card').addClass('selected');
            }
        });
    }
        }

        // Outros dados
        if (data.planoPagamento) {
            $('#planoPagamento').val(data.planoPagamento);
        }

        if (data.formaPagamento) {
            $('#formaPagamento').val(data.formaPagamento).trigger('change');
            if (data.formaPagamento === 'PIX/Boleto' && data.diaVencimento) {
                $('#diaVencimento').val(data.diaVencimento);
            }
        }
        
        if (data.couponCode) {
            $('#cupomCode').val(data.couponCode).trigger('input');
        }

        if (data.autorizaFoto) { // Este campo não está no HTML fornecido, então será ignorado.
            // $(`input[name="autorizaFoto"][value="${data.autorizaFoto}"]`).prop('checked', true);
        }

        updateSummaryAndTotal(); // Chama para garantir que o resumo está atualizado após pré-preenchimento
        updateSelectedCoursesDisplay();
    }

    // Função para processar a submissão do formulário
    async function processFormSubmission() {
        console.log('Iniciando processamento da submissão...');
        
        if (!validateCurrentStep()) {
            alert('Por favor, preencha todos os campos obrigatórios corretamente antes de prosseguir.');
            return;
        }

        const formData = collectFormData();
        console.log('Dados do Formulário para Submissão:', formData);

        const $statusBox = $('#registrationStatusBox');
        const $statusHeading = $('#statusHeading');
        const $statusMessage = $('#statusMessage');
        const $goToPaymentBtn = $('#goToPaymentBtn');

        showStep('success');
        
        $statusBox.removeClass('status-success status-error').addClass('status-processing');
        $statusHeading.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Aguarde...');
        $statusMessage.text('Estamos processando sua inscrição...');
        $goToPaymentBtn.hide();

        try {
            console.log('Enviando dados para:', WEBHOOK_SUBMISSAO_URL);
            
            const response = await fetch(WEBHOOK_SUBMISSAO_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                throw new Error(`Erro ao enviar inscrição: ${response.status} - ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Inscrição enviada com sucesso:', result);

            $statusBox.removeClass('status-processing').addClass('status-success');
            $statusHeading.html('✅ Sucesso!');
            
            if (formData.formaPagamento === 'Bolsista Integral') {
                $statusMessage.text('Sua inscrição como bolsista foi registrada com sucesso. Em breve entraremos em contato para os próximos passos.');
                $goToPaymentBtn.hide();
            } else if (result.link) {
                $statusMessage.text('Sua inscrição foi finalizada com sucesso! Clique abaixo para prosseguir com o pagamento.');
                $goToPaymentBtn.data('payment-link', result.link).show();
            } else {
                $statusMessage.text('Inscrição finalizada com sucesso, mas não foi possível obter o link de pagamento. Por favor, entre em contato com a administração do Quintal das Artes.');
                $goToPaymentBtn.hide();
            }

        } catch (error) {
            console.error('Erro ao enviar inscrição:', error);
            $statusBox.removeClass('status-processing status-success').addClass('status-error');
            $statusHeading.html('❌ Erro!');
            $statusMessage.text('Ocorreu um erro ao finalizar a inscrição. Por favor, tente novamente ou entre em contato.');
            $goToPaymentBtn.hide();
        }
    }

    // Configura todos os event listeners
    function setupEventListeners() {
        console.log('Configurando event listeners...');
        
        // Navegação entre passos
        $('.btn-next').on('click', async function() {
            console.log('Botão próximo clicado, passo atual:', currentStep);
            if (validateCurrentStep()) {
                // Consulta Amigo Lebre ao avançar do passo 2 para 3
                if (currentStep === 2) {
                    const cpf = $('#cpfResponsavel').val().replace(/\D/g, '');
                    if (cpf.length === 11) {
                        try {
                            const response = await fetch(
                                `https://criadordigital-n8n-webhook.kttqgl.easypanel.host/webhook/consulta-amigo-lebre?cpf=${cpf}`
                            );
                            if (response.ok) {
                                const data = await response.json();
                                if (data && data.categoria) {
                                    amigoLebreCategoria = data.categoria;
                                    $('.cupom-feedback').text(`Categoria Amigo Lebre: ${amigoLebreCategoria}`).addClass('success').removeClass('error');
                                } else {
                                    amigoLebreCategoria = null;
                                    $('.cupom-feedback').text('CPF não associado ao Amigo Lebre.').addClass('error').removeClass('success');
                                }
                            } else {
                                amigoLebreCategoria = null;
                                $('.cupom-feedback').text('Erro ao consultar Amigo Lebre.').addClass('error').removeClass('success'); // Feedback para erro
                            }
                        } catch (err) {
                            console.error('Erro na requisição Amigo Lebre:', err);
                            amigoLebreCategoria = null;
                            $('.cupom-feedback').text('Erro na consulta Amigo Lebre.').addClass('error').removeClass('success'); // Feedback para erro de rede
                        }
                    }
                }
                if (currentStep < totalSteps) { // Total de passos ajustado para 4
                    showStep(currentStep + 1);
                }
            } else {
                // Alert é um feedback genérico. Para uma UX melhor, mostre os erros específicos nos campos.
                alert('Por favor, preencha todos os campos obrigatórios corretamente antes de prosseguir.');
            }
        });

        $('.btn-prev').on('click', function() {
            console.log('Botão anterior clicado, passo atual:', currentStep);
            if (currentStep > 1) {
                showStep(currentStep - 1);
            }
        });

        $('.btn-submit').on('click', function(event) {
            console.log('Botão Finalizar Inscrição clicado!');
            event.preventDefault();
            event.stopPropagation();
            processFormSubmission();
        });

        $('#registrationForm').on('submit', function(event) {
            console.log('Form submit event interceptado');
            event.preventDefault();
            event.stopPropagation();
            return false;
        });

        // Disparar cálculo ao mudar seleção de curso, plano ou cupom
        // O evento de change do .curso-checkbox é agora delegado em attachCourseCardEventListeners
        $('#registrationForm').on('change', '#planoPagamento', function() {
            updateSummaryAndTotal();
        });

        // Toggle para Dia de Vencimento
        $('#formaPagamento').on('change', function() {
            if ($(this).val() === 'PIX/Boleto') {
                $('#diaVencimentoGroup').slideDown();
                $('#diaVencimento').prop('required', true);
            } else {
                $('#diaVencimentoGroup').slideUp();
                $('#diaVencimento').prop('required', false);
                $('#diaVencimento').val('');
                validateField($('#diaVencimento'));
            }
            updateSummaryAndTotal();
        });

        $('#cupomCode').on('input', function() {
            const cupomFeedback = $('.cupom-feedback');
            const couponValue = $(this).val().toUpperCase();
            if (couponValue === '') {
                cupomFeedback.text('').removeClass('error success');
            } else if (priceCalculator.getCouponsData()[couponValue]) {
                cupomFeedback.text('Cupom válido!').addClass('success').removeClass('error');
            } else {
                cupomFeedback.text('Cupom inválido.').addClass('error').removeClass('success');
            }
            updateSummaryAndTotal();
        });
        
        // Live validation
        $('#cpfResponsavel').on('blur', function() {
            validateField(this, (val) => isValidCPF(val), 'CPF inválido.');
        });

        $('#emailResponsavel').on('blur', function() {
            validateField(this, (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Email inválido.');
        });
        
        // Validação genérica para inputs required
        $('#registrationForm').on('blur', 'input[required]:not(.curso-checkbox), select[required], textarea[required]', function() {
            validateField(this);
        });

        $('input[name="comoSoube"]').on('change', function() {
            const $howKnowCheckboxes = $('input[name="comoSoube"]');
            const $howKnowErrorDiv = $('.how-know-error');
            if ($howKnowCheckboxes.filter(':checked').length === 0) {
                $howKnowErrorDiv.text('Selecione pelo menos uma opção.').show();
            } else {
                $howKnowErrorDiv.hide().text('');
            }
        });

        // Removido o listener para autorizaFoto, pois o campo não está no HTML fornecido.
        // $('input[name="autorizaFoto"]').on('change', function() { /* ... */ });
        
        $('#goToPaymentBtn').on('click', function() {
            const paymentLink = $(this).data('payment-link');
            if (paymentLink) {
                window.open(paymentLink, '_blank');
            }
        });

        // Anexar event listeners para os cards de cursos
        attachCourseCardEventListeners();

        console.log('Event listeners configurados com sucesso!');
    }

    initForm();


});
