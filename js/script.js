$(document).ready(function() {
    let currentStep = 1;
    const totalSteps = 5;
    let pricesDataLoaded = false;
    let prefilledData = null;
    let amigoLebreCategoria = null;

    // URLs dos webhooks
    const WEBHOOK_CONSULTA_URL = 'https://criadordigital-n8n-webhook.kttqgl.easypanel.host/webhook/consulta-matricula';
    const WEBHOOK_SUBMISSAO_URL = 'https://criadordigital-n8n-webhook.kttqgl.easypanel.host/webhook/envio-matricula';

    // Inicializa as máscaras para os campos
    function initializeMasks() {
        $('.mask-cpf').mask('000.000.000-00', { reverse: true });
        $('.mask-phone').mask('(00) 0 0000-0000');
        $('.mask-date').mask('00/00/0000');
    }

    // Carrega dados e inicializa o formulário
    async function initForm() {
        pricesDataLoaded = await priceCalculator.loadPriceData();
        if (pricesDataLoaded) {
            initializeMasks();
            await checkMatriculaParam();
            populateCourseSelection();
            showStep(currentStep);
            setupEventListeners();
            updateSummaryAndTotal();
        } else {
            $('#registrationForm').html('<p class="error-message" style="display: block; text-align: center;">Não foi possível carregar os dados do formulário. Por favor, tente novamente mais tarde.</p>');
        }
    }

    // Exibe um passo específico do formulário
    function showStep(stepNum) {
        $('.form-step').removeClass('active');
        let stepId;
        if (stepNum === 1) stepId = '#step-1';
        else if (stepNum === 2) stepId = '#step-2';
        else if (stepNum === 3) stepId = '#step-3';
        else if (stepNum === 4) stepId = '#step-terms';
        else if (stepNum === 5) stepId = '#step-4';
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

    // Popula a seleção de cursos
    function populateCourseSelection() {
        const allCourses = priceCalculator.getAllCourses();
        const cursos = allCourses.filter(c => c.categoria === 'curso');
        const contraturnos = allCourses.filter(c => c.categoria === 'contraturno');

        // Popula cursos
        const $cursosContainer = $('#cursosContainer');
        $cursosContainer.empty();
        cursos.forEach(course => {
            const referencePrice = course.precos.mensal;
            const checkboxHtml = `
                <div class="checkbox-group">
                    <input type="checkbox" class="course-checkbox" value="${course.id}" id="course-${course.id}">
                    <label for="course-${course.id}">
                        ${course.nome} 
                        <span class="course-price">(a partir de ${priceCalculator.formatCurrency(referencePrice)})</span>
                    </label>
                </div>
            `;
            $cursosContainer.append(checkboxHtml);
        });

        // Popula contraturnos
        const $contraturnosContainer = $('#contraturnosContainer');
        $contraturnosContainer.empty();
        contraturnos.forEach(course => {
            const referencePrice = course.precos.mensal;
            const checkboxHtml = `
                <div class="checkbox-group">
                    <input type="checkbox" class="course-checkbox" value="${course.id}" id="course-${course.id}">
                    <label for="course-${course.id}">
                        ${course.nome} 
                        <span class="course-price">(a partir de ${priceCalculator.formatCurrency(referencePrice)})</span>
                    </label>
                </div>
            `;
            $contraturnosContainer.append(checkboxHtml);
        });
    }

    // Função para validar campos
    function validateField(inputElement, validationFn = null, errorMessage = 'Campo obrigatório.') {
        const $input = $(inputElement);
        const $formGroup = $input.closest('.form-group, .checkbox-group');
        const $errorDiv = $formGroup.find('.error-message');
        let isValid = true;

        $input.removeClass('input-error');
        $errorDiv.hide().text('');

        if ($input.is(':checkbox')) {
            if ($input.prop('required') && !$input.is(':checked')) {
                isValid = false;
            }
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

    // Valida seleção de cursos
    function validateCourseSelection() {
        const $checkedCourses = $('.course-checkbox:checked');
        const $errorDiv = $('.courses-selection').siblings('.error-message');
        
        if ($checkedCourses.length === 0) {
            $errorDiv.text('Selecione pelo menos um curso.').show();
            return false;
        } else {
            $errorDiv.hide().text('');
            return true;
        }
    }

    // Valida o passo atual antes de avançar
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

        } else if (currentStep === 4) {
            isValid = validateField($('#aceiteTermos'), null, 'Você deve aceitar os termos e condições.') && isValid;

            const $photoConsentRadios = $('input[name="autorizaFoto"]');
            const $photoConsentErrorDiv = $('.photo-consent-error');
            if ($photoConsentRadios.filter(':checked').length === 0) {
                isValid = false;
                $photoConsentErrorDiv.text('Selecione uma opção para autorização de uso de imagem.').show();
            } else {
                $photoConsentErrorDiv.hide().text('');
            }

        } else if (currentStep === 5) {
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
            aceiteTermos: $('#aceiteTermos').is(':checked'),
            autorizaFoto: $('input[name="autorizaFoto"]:checked').val(),
            cupomCode: $('#cupomCode').val().toUpperCase(),
            amigoLebreCategoria: amigoLebreCategoria
        };

        // Coleta cursos selecionados
        $('.course-checkbox:checked').each(function() {
            formData.cursosSelecionados.push($(this).val());
        });

        // Adiciona os detalhes de preço calculados
        const priceDetails = updateSummaryAndTotal();
        formData.resumoFinanceiro = priceDetails;
        formData.valor_calculado_total = priceDetails.total;

        return formData;
    }

    // Atualiza a seção de resumo e o total
    function updateSummaryAndTotal() {
        if (!pricesDataLoaded) return { total: 0 };

        const selectedCourseIds = [];
        $('.course-checkbox:checked').each(function() {
            selectedCourseIds.push($(this).val());
        });

        const paymentPlan = $('#planoPagamento').val() || 'mensal';
        const couponCode = $('#cupomCode').val();
        const paymentMethod = $('#formaPagamento').val();

        const totals = priceCalculator.calculateTotal(
            selectedCourseIds, 
            paymentPlan, 
            couponCode, 
            paymentMethod,
            1 // Sempre 1 aprendiz
        );

        // Atualiza o resumo do aprendiz
        const apprenticeName = $('#nomeAprendiz').val() || 'Aprendiz';
        const coursesDetails = [];
        selectedCourseIds.forEach(courseId => {
            const courseName = priceCalculator.getCourseNameById(courseId);
            const coursePrice = priceCalculator.getCoursePrice(courseId, paymentPlan);
            coursesDetails.push(`${courseName} (${priceCalculator.formatCurrency(coursePrice)})`);
        });

        const $summaryInfo = $('#summaryAprendizInfo');
        if (coursesDetails.length > 0) {
            $summaryInfo.html(`<strong>${apprenticeName}:</strong><br>${coursesDetails.join('<br>')}`);
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

    // Preenche o formulário com os dados recebidos do webhook
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
            const aprendiz = data.aprendizes[0]; // Pega apenas o primeiro
            $('#nomeAprendiz').val(aprendiz.nome);
            $('#escolaAprendiz').val(aprendiz.escola);
            $('#dataNascimentoAprendiz').val(aprendiz.dataNascimento);
            $('#generoAprendiz').val(aprendiz.genero);
            $('#restricaoAlimentarAprendiz').val(aprendiz.restricaoAlimentar);
            $('#questaoSaudeAprendiz').val(aprendiz.questaoSaude);

            // Seleciona os cursos
            if (aprendiz.cursos && Array.isArray(aprendiz.cursos)) {
                const allCourses = priceCalculator.getAllCourses();
                aprendiz.cursos.forEach(courseName => {
                    const courseObj = allCourses.find(c => c.nome === courseName);
                    if (courseObj) {
                        $(`input[value="${courseObj.id}"]`).prop('checked', true);
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

        if (data.autorizaFoto) {
            $(`input[name="autorizaFoto"][value="${data.autorizaFoto}"]`).prop('checked', true);
        }

        updateSummaryAndTotal();
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
                            }
                        } catch (err) {
                            amigoLebreCategoria = null;
                        }
                    }
                }
                if (currentStep < totalSteps) {
                    showStep(currentStep + 1);
                }
            } else {
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
        $('#registrationForm').on('change', '.course-checkbox, #planoPagamento', function() {
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
        
        $('#registrationForm').on('blur', 'input[required], select[required], textarea[required]', function() {
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

        $('input[name="autorizaFoto"]').on('change', function() {
            const $photoConsentRadios = $('input[name="autorizaFoto"]');
            const $photoConsentErrorDiv = $('.photo-consent-error');
            if ($photoConsentRadios.filter(':checked').length === 0) {
                $photoConsentErrorDiv.text('Selecione uma opção para autorização de uso de imagem.').show();
            } else {
                $photoConsentErrorDiv.hide().text('');
            }
        });
        
        $('#goToPaymentBtn').on('click', function() {
            const paymentLink = $(this).data('payment-link');
            if (paymentLink) {
                window.open(paymentLink, '_blank');
            }
        });

        console.log('Event listeners configurados com sucesso!');
    }

    initForm();
});