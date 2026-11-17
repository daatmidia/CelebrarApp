# Celebrarapp

RSVP de casamento para uma lista fechada. O demo já abre com o casamento de Helena Vasconcelos e Miguel Albuquerque — sem conta, sem chave e sem API paga.

A interface está em português do Brasil. A marca na tela é a arte oficial do Celebrarapp.

## Como rodar

```bash
npm install
npm run build
npm start
```

O servidor escuta em `0.0.0.0:43123`. Abra [http://127.0.0.1:43123](http://127.0.0.1:43123).

Use `npm start` (build de produção). O `npm run dev` deixa a página estática quando o navegador chega por um host diferente de localhost, e os cliques não respondem.

Os dados ficam em `data/celebrar.sqlite` (SQLite, via `node:sqlite`). Na primeira execução o arquivo é criado e semeado. Para voltar ao demo original, pare o servidor, apague esse arquivo e suba de novo.

## O que o demo já mostra

- Famílias com nomes no convite, um casal e convites com vaga de acompanhante (`+1`).
- Várias respostas pendentes, dois convites confirmados em todos os momentos, o Felipe só na cerimônia, e a Ana Clara já com entrada registrada.
- Telefones fictícios no formato `+55`.

## Páginas

- `/` convite do fim de semana
- `/rsvp` busca pelo nome, confirmação por momento, restrições e música
- `/convite` cartão para imprimir, com QR para o RSVP
- `/ingresso/[código]` ingresso individual
- `/recepcao` leitura do QR e busca manual
- `/painel` abre em duas portas, sem senha: Cerimonial e Anfitrião (convidado, lugares livres, mapa de mesas, cronograma, RSVP, disparo, buffet, playlist, momentos, lembretes e recepção)
- `/cerimonial/entrar` é a porta do cerimonial. A conta de demonstração é `aline@celebrar.app` / `celebrar` (também dá para criar outra conta neste navegador). Depois do login, `/cerimonial` abre o menu Celebrar. O nome de quem entrou fica só no rodapé do menu. Ajustes, Ajuda e Sugerir melhorias ficam abaixo do traço, antes de Instalar no celular. O logo do topo volta para a página inicial e mantém a sessão. Agenda é o calendário do mês corrente em América/São Paulo, com eventos e notas desse mês. O horário de cada evento aparece ao lado do nome no dia. No calendário, notas ficam vermelhas, casamento em lilás, 15 anos em rosa, formatura em azul, reunião em laranja e corporativo em verde-musgo. Ensaio e visita técnica usam a cor da visita. Criar Nota grava uma anotação ou fotos. Criar Reunião e Criar Ensaio/Visita Técnica gravam esses itens no dia. Cada nota, reunião, ensaio ou visita abre para editar texto, data, horário e fotos quando o tipo já tem fotos. O evento aberto também guarda nome, data e horário. Helena e Miguel continuam em 17 de abril de 2027 e Letícia e Bruno em 24 de abril. A data de um casamento abre o casal. Criar novo evento escolhe o tipo e já traz tarefas e roteiro do dia para ajustar
- `/cerimonial/salao` lista por sobrenome e desenho do salão de Helena e Miguel. Na ficha de cada evento, em ordem alfabética: Cronograma (roteiro do dia), Desenho do salão, Documentos (orçamento, contrato assinado, checklist, distrato, recibos e termos de imagem) e Fornecedores (nome e função). O exemplo inicial é o Ateliê Camélia, de flores. Esses botões não aparecem no calendário. Abaixo da data e do local, o campo Time guarda quem trabalha naquele evento. No fim da ficha, à direita, Apagar evento pede confirmação e só então remove o evento e o histórico, voltando ao calendário
- `/hoje` a pessoa se identifica na lista e escreve Mesa ou Cronograma

## Lembretes de WhatsApp

Não há WhatsApp Business API nem chatbot. No painel, cada convidado sem resposta e com telefone tem um botão que abre `https://wa.me/<número>` com uma mensagem em português já escrita. O Celebrarapp grava o horário em que o lembrete foi preparado. Quem envia de fato é a pessoa, na conversa do WhatsApp. Os números do seed não pertencem a ninguém.

No dia, a aba Dia prepara outra mensagem só para quem confirmou: mesa, cronograma, mapa, Waze e o link do ingresso. O texto e o horário ficam gravados no convidado. Esse registro é o que um envio oficial, por API, usaria depois. Hoje o botão só abre a conversa.

O haras do convite é fictício. O pin do mapa é a Pousada Vale Verde, na estrada de Tiradentes.

## Limites deste corte

A porta Anfitrião não tem senha: quem tem o link edita a lista. A porta Cerimonial pede o login de demonstração `aline@celebrar.app` / `celebrar`, ou uma conta criada neste navegador.
