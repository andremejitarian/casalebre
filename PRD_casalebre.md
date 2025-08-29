# PRD – Inscrição em cursos de artes

## Visão Geral

O projeto "Inscrição em cursos de artes" é uma plataforma web para inscrição de pessoas interessadas nos cursos oferecidos pela Casa Lebre. O sistema permite o cadastro do aprendiz, seleção de cursos, aplicação de cupons de desconto, cálculo automático de valores e integração com métodos de pagamento.

## Objetivos

- Facilitar o processo de inscrição online para pessoas interessadas nos cursos da Casa Lebre.
- Automatizar o cálculo de valores, descontos e taxas conforme plano e forma de pagamento.
- Permitir o uso de cupons promocionais.
- Integrar o formulário com webhooks para consulta e envio de matrículas.
- Garantir uma experiência amigável, responsiva e segura.

## Funcionalidades Principais

1. **Formulário Multi-etapas**
   - Boas-vindas e introdução.
   - Cadastro dos dados do aprendiz (pessoa que irá cursar o curso de artes).
   - Consulta automática do CPF do aprendiz via fetch (n8n) ao avançar para a próxima etapa, verificando se o CPF pertence ao programa 'Amigo Lebre' e qual a categoria de associado.
   - Seleção de cursos.
   - Aceite dos termos e condições.

2. **Seleção de Plano e Forma de Pagamento**
   - Planos: Mensal, Bimestral (com desconto), Quadrimestral (com maior desconto).
   - Formas: Cartão de Crédito, PIX/Boleto, Bolsista Integral.
   - Seleção do dia de vencimento para PIX/Boleto.

3. **Cálculo Automático de Preços**
   - Cálculo do subtotal conforme cursos e plano.
   - Aplicação de descontos (irmãos, múltiplos cursos, filhos de professores, bolsistas).
   - Aplicação de cupons (percentual ou valor fixo).
   - Cálculo de taxa de cartão de crédito.
   - Exibição do resumo financeiro detalhado.

4. **Validação de Dados**
   - Máscaras para CPF, telefone e data.
   - Validação de campos obrigatórios.
   - Validação de CPF.

5. **Cupom de Desconto**
   - Campo para inserção de cupom.
   - Feedback visual sobre validade e valor do cupom.

6. **Resumo e Confirmação**
   - Exibição do resumo dos dados e valores antes da finalização.
   - Tela de sucesso após envio.

7. **Integração com Webhooks**
   - Consulta de matrícula existente.
   - Envio dos dados de inscrição para processamento externo.

8. **Design Responsivo**
   - Layout adaptado para dispositivos móveis e desktop.
   - Uso de fontes modernas e paleta de cores amigável.

## Requisitos Técnicos

- Frontend: HTML, CSS, JavaScript (jQuery).
- Estrutura modular de scripts (validação, cálculo de preços).
- Dados de cursos, planos, cupons e descontos do Amigo Lebre em arquivos JSON editáveis (ex: `amigo_lebre_descontos.json`).
- Integração com webhooks via fetch.
- Integração com n8n para consulta do CPF do aprendiz, retornando a categoria do programa Amigo Lebre para aplicação do desconto conforme o arquivo JSON.
- Máscaras de input via jQuery Mask.
- Imagens e assets organizados em pastas específicas.

## Restrições

- Descontos não são cumulativos.
- Bolsista Integral zera o valor da inscrição.
- Cupom pode ser percentual ou valor fixo, conforme regras do arquivo `cupons.json`.
- O sistema não realiza reposição de aulas em caso de falta.

## Critérios de Aceite

- Usuário consegue realizar inscrição completa sem erros.
- Valores calculados corretamente conforme regras de negócio.
- Cupom de desconto funciona conforme especificado.
- Dados enviados corretamente para o webhook de matrícula.
- Layout responsivo e intuitivo.

## Referências

- [Site Casa Lebre](https://www.casalebre.com)
- Arquivos: `index.html`, `style.css`, `js/script.js`, `js/priceCalculator.js`, `js/cpfValidation.js`, `precos.json`, `cupons.json`, imagens.

---

## Fluxos Principais

### 1. Fluxo de Inscrição

1. Usuário acessa a página inicial.
2. Visualiza mensagem de boas-vindas e inicia o formulário.
3. Preenche dados do aprendiz (nome, CPF, e-mail, telefone, endereço).
4. Ao avançar para a próxima etapa, o sistema consulta automaticamente o CPF via integração n8n para verificar se o aprendiz é associado do programa Amigo Lebre e retorna a categoria. O desconto é aplicado conforme o arquivo `amigo_lebre_descontos.json`.
5. Seleciona plano de pagamento e forma de pagamento.
6. (Se PIX/Boleto) Seleciona dia de vencimento.
7. (Opcional) Insere cupom de desconto.
8. Visualiza resumo financeiro detalhado.
9. Aceita termos e condições.
10. Finaliza inscrição.
11. Visualiza tela de sucesso e opção para ir ao pagamento (se aplicável).

### 2. Fluxo de Validação

- Máscaras aplicadas nos campos de CPF, telefone e data.
- Validação de CPF via função específica.
- Campos obrigatórios destacados em vermelho se não preenchidos.
- Cupom validado em tempo real, com feedback visual.

### 3. Fluxo de Cálculo de Preço

- Subtotal calculado somando valores dos cursos/contraturnos conforme plano.
- Se mais de um curso, aplica desconto de múltiplos cursos no de menor valor.
- Se mais de um aprendiz, aplica desconto de irmãos.
- Se cupom válido, aplica desconto conforme tipo (percentual/fixo).
- Se forma de pagamento for cartão, aplica taxa do plano.
- Se bolsista integral, total é zerado.

---

## Wireframes Textuais

### Página Inicial

```
+------------------------------------------------------+
| [Banner com imagem]                                  |
| [Logo circular à esquerda]                           |
|                                                      |
| +-----------------------------------------------+    |
| | [Formulário multi-etapas]                     |    |
| |                                               |    |
| | [Boas-vindas]                                 |    |
| | [Dados do aprendiz]                           |    |
| | [Seleção de cursos]                           |    |
| | [Plano e forma de pagamento]                  |    |
| | [Cupom de desconto]                           |    |
| | [Resumo financeiro]                           |    |
| | [Aceite dos termos]                           |    |
| | [Botões: Voltar / Avançar / Finalizar]        |    |
| +-----------------------------------------------+    |
|                                                      |
+------------------------------------------------------+
```

### Resumo Financeiro

```
+-------------------+
| Subtotal: R$ XXX  |
| Desconto: R$ XX   |
| Cupom: R$ XX      |
| Taxa Cartão: R$ X |
| Total: R$ XXX     |
+-------------------+
```

### Tela de Sucesso

```
+-------------------------------+
| Cadastro quase completo! 🎨    |
| [Status da inscrição]         |
| [Botão: Ir para Pagamento]    |
+-------------------------------+
```

---

## Regras Específicas

### Regras de Desconto

**Programa Amigo Lebre:** O CPF do aprendiz pode ser consultado via integração n8n para verificar se pertence ao programa de associados 'Amigo Lebre'. Cada categoria de Amigo Lebre dá direito a um percentual de desconto em cursos, conforme definido no arquivo `amigo_lebre_descontos.json` (editável):
   - Mais Cultura: 15%
   - Individual: 10%
   - Família: 20%
- **Desconto de filhos de professores:** 10% sobre o total, aplicado via cupom de desconto específico.
- **Bolsista Integral:** 100% de desconto, total zerado.
- **Cupom:** Pode ser percentual ou valor fixo, conforme regras do arquivo `cupons.json`.

### Regras de Pagamento

- **Planos:** Mensal, Bimestral, Quadrimestral.
- **Taxa de cartão:** Percentual conforme plano.
- **PIX/Boleto:** Seleção de dia de vencimento obrigatória.
- **Bolsista Integral:** Forma de pagamento obrigatoriamente "Bolsista Integral".

### Regras de Validação

- **CPF:** Validado via função, não aceita sequências repetidas ou inválidas.
- **Campos obrigatórios:** Nome, CPF, e-mail, telefone, endereço, cursos, plano, forma de pagamento, aceite dos termos.
- **Cupom:** Validado em tempo real, feedback visual.

### Regras de UI/UX

- **Responsividade:** Layout adaptado para mobile e desktop.
- **Feedback visual:** Erros destacados, sucesso confirmado.
- **Navegação:** Botões Voltar, Avançar, Finalizar visíveis conforme etapa.

---
