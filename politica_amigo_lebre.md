# Política do Programa Amigo Lebre

O programa Amigo Lebre é voltado para pessoas que desejam se aproximar da Casa Lebre e integrar uma comunidade engajada no fomento à arte e cultura. Ao se tornar membro, o associado tem acesso a benefícios exclusivos, descontos em cursos de artes e vantagens em instituições parceiras.

## Categorias de Associação

- **Amigo Lebre | Mais Cultura**
  - Público: Estudantes, professores, aposentados, pessoas que moram fora de São Paulo e trabalhadores da cultura.
  - Valor anual: R$ 140
  - Desconto em cursos: 15%

- **Amigo Lebre | Individual**
  - Público geral
  - Valor anual: R$ 280
  - Desconto em cursos: 10%

- **Amigo Lebre | Família**
  - Famílias: acesso gratuito para até seis membros da família. Todas as configurações de família são bem-vindas.
  - Valor anual: R$ 540
  - Desconto em cursos: 20%

## Benefícios

- Descontos em cursos de artes oferecidos pela Casa Lebre, conforme categoria.
- Programação especial e exclusiva para associados.
- Parcerias com instituições culturais, garantindo entrada gratuita ou descontos em museus, shows e eventos.

## Funcionamento no Formulário

Ao preencher os dados do aprendiz, o sistema realiza uma consulta automática via integração n8n para verificar se o CPF pertence ao programa Amigo Lebre e retorna a categoria do associado. O formulário consulta o arquivo `amigo_lebre_descontos.json` para aplicar o desconto correspondente na inscrição dos cursos.

---

Para editar os valores e percentuais de desconto, basta alterar o arquivo `amigo_lebre_descontos.json`.
