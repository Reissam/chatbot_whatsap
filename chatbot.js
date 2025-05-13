// leitor de qr code
const qrcode = require('qrcode-terminal');
const { Client, Buttons, List, MessageMedia } = require('whatsapp-web.js');
const client = new Client();

// serviço de leitura do qr code
client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

// apos isso ele diz que foi tudo certo
client.on('ready', () => {
    console.log('Tudo certo! WhatsApp conectado.');
});

// E inicializa tudo 
client.initialize();

const delay = ms => new Promise(res => setTimeout(res, ms)); // Função para criar delay entre ações

// Armazenar pedidos dos clientes
const pedidos = {};

// Cardápio de pizzas
const cardapio = {
    pizzas: {
        1: { nome: "Calabresa", valor: 35.00, descricao: "Molho de tomate, muçarela, calabresa e cebola" },
        2: { nome: "Muçarela", valor: 32.00, descricao: "Molho de tomate, muçarela e orégano" },
        3: { nome: "Frango com Catupiry", valor: 38.00, descricao: "Molho de tomate, muçarela, frango desfiado e catupiry" },
        4: { nome: "Portuguesa", valor: 40.00, descricao: "Molho de tomate, muçarela, presunto, ovo, cebola e ervilha" },
        5: { nome: "Margherita", valor: 36.00, descricao: "Molho de tomate, muçarela, tomate e manjericão" },
        6: { nome: "Quatro Queijos", valor: 42.00, descricao: "Molho de tomate, muçarela, provolone, gorgonzola e parmesão" }
    },
    bebidas: {
        1: { nome: "Coca Cola 2L", valor: 12.00 },
        2: { nome: "Fanta Laranja 2L", valor: 12.00 },
        3: { nome: "Fanta Uva 2L", valor: 12.00 },
        4: { nome: "Tuchaua Guaraná 2L", valor: 11.00 }
    }
};

// Dados do PIX
const dadosPix = {
    chave: "12345678900", // CPF como exemplo (substitua pela chave PIX real)
    nome: "Pizzaria Delícia",
    cidade: "Macapá"
};

// Funil de atendimento
client.on('message', async msg => {
    // Inicializar pedido do cliente caso não exista
    if (!pedidos[msg.from]) {
        pedidos[msg.from] = {
            itens: [],
            total: 0,
            etapa: "inicial",
            endereco: "",
            pagamento: "",
            nome: ""
        };
    }

    const chat = await msg.getChat();
    const contact = await msg.getContact();
    const clientName = contact.pushname ? contact.pushname.split(" ")[0] : "Cliente";
    
    // Salvar nome do cliente
    if (pedidos[msg.from].nome === "") {
        pedidos[msg.from].nome = clientName;
    }

    // Mensagem inicial ou Menu principal
    if (msg.body.match(/(menu|Menu|dia|tarde|noite|oi|Oi|Olá|olá|ola|Ola|pizza|Pizza)/i) && 
        (pedidos[msg.from].etapa === "inicial" || pedidos[msg.from].etapa === "fim")) {
        
        pedidos[msg.from].etapa = "menu";
        
        await delay(1000);
        await chat.sendStateTyping();
        await delay(2000);
        await client.sendMessage(msg.from, `Olá, ${clientName}! Bem-vindo à Pizzaria Delícia 🍕\n\nComo posso ajudar você hoje?\n\n1 - Ver cardápio de pizzas\n2 - Ver bebidas\n3 - Ver meu pedido atual\n4 - Informações e horários\n5 - Falar com atendente`);
    }

    // Ver cardápio de pizzas
    else if (msg.body === '1' && pedidos[msg.from].etapa === "menu") {
        pedidos[msg.from].etapa = "escolhendo_pizza";
        
        await delay(1000);
        await chat.sendStateTyping();
        await delay(2000);
        
        let menuText = "*🍕 CARDÁPIO DE PIZZAS 🍕*\n\n";
        
        for (const [id, pizza] of Object.entries(cardapio.pizzas)) {
            menuText += `*${id} - ${pizza.nome}* - R$ ${pizza.valor.toFixed(2)}\n${pizza.descricao}\n\n`;
        }
        
        menuText += "Para adicionar uma pizza ao seu pedido, digite o número da pizza espaço seguido da quantidade.\nExemplo: *1 2* (para duas pizzas de Calabresa)\n\nOu digite *0* para voltar ao menu principal.";
        
        await client.sendMessage(msg.from, menuText);
    }

    // Ver bebidas
    else if (msg.body === '2' && pedidos[msg.from].etapa === "menu") {
        pedidos[msg.from].etapa = "escolhendo_bebida";
        
        await delay(1000);
        await chat.sendStateTyping();
        await delay(2000);
        
        let bebidasText = "*🥤 CARDÁPIO DE BEBIDAS 🥤*\n\n";
        
        for (const [id, bebida] of Object.entries(cardapio.bebidas)) {
            bebidasText += `*${id} - ${bebida.nome}* - R$ ${bebida.valor.toFixed(2)}\n`;
        }
        
        bebidasText += "\nPara adicionar uma bebida ao seu pedido, digite o número da bebida seguido da quantidade.\nExemplo: *1 2* (para dois Refrigerantes 2L)\n\nOu digite *0* para voltar ao menu principal.";
        
        await client.sendMessage(msg.from, bebidasText);
    }

    // Ver pedido atual
    else if (msg.body === '3' && pedidos[msg.from].etapa === "menu") {
        await delay(1000);
        await chat.sendStateTyping();
        await delay(2000);
        
        if (pedidos[msg.from].itens.length === 0) {
            await client.sendMessage(msg.from, "Você ainda não adicionou itens ao seu pedido. Digite *1* para ver o cardápio de pizzas ou *2* para ver as bebidas.");
        } else {
            let pedidoText = "*🛒 SEU PEDIDO ATUAL 🛒*\n\n";
            
            pedidos[msg.from].itens.forEach((item, index) => {
                pedidoText += `${index + 1}. ${item.quantidade}x ${item.nome} - R$ ${(item.valor * item.quantidade).toFixed(2)}\n`;
            });
            
            pedidoText += `\n*Total: R$ ${pedidos[msg.from].total.toFixed(2)}*\n\n`;
            pedidoText += "O que deseja fazer agora?\n\n";
            pedidoText += "*F* - Finalizar pedido\n";
            pedidoText += "*R* - Remover item\n";
            pedidoText += "*0* - Voltar ao menu principal";
            
            pedidos[msg.from].etapa = "gerenciando_pedido";
            await client.sendMessage(msg.from, pedidoText);
        }
    }

    // Informações e horários
    else if (msg.body === '4' && pedidos[msg.from].etapa === "menu") {
        await delay(1000);
        await chat.sendStateTyping();
        await delay(2000);
        
        const infoText = "*📋 INFORMAÇÕES DA PIZZARIA 📋*\n\n" +
            "*Horário de Funcionamento:*\n" +
            "Segunda a Quinta: 18h às 23h\n" +
            "Sexta, Sábado e Domingo: 18h às 00h\n\n" +
            "*Tempo médio de entrega:* 30 a 45 minutos\n\n" +
            "*Taxa de entrega:* Consulte por bairro\n\n" +
            "*Formas de pagamento:*\n" +
            "- PIX\n" +
            "- Cartão de crédito/débito na entrega\n" +
            "- Dinheiro\n\n" +
            "Digite *0* para voltar ao menu principal.";
        
        await client.sendMessage(msg.from, infoText);
    }

    // Falar com atendente
    else if (msg.body === '5' && pedidos[msg.from].etapa === "menu") {
        await delay(1000);
        await chat.sendStateTyping();
        await delay(2000);
        
        await client.sendMessage(msg.from, "🧑‍💼 Estamos transferindo você para um de nossos atendentes. Por favor, aguarde um momento que logo será atendido.\n\nCaso queira voltar ao atendimento automático, digite *menu* a qualquer momento.");
        
        // Aqui você poderia notificar um atendente real para assumir a conversa
        pedidos[msg.from].etapa = "atendente";
    }

    // Adicionar pizza ao pedido
    else if (pedidos[msg.from].etapa === "escolhendo_pizza" && msg.body !== '0') {
        const entrada = msg.body.trim().split(" ");
        
        if (entrada.length === 2) {
            const idPizza = entrada[0];
            const quantidade = parseInt(entrada[1]);
            
            if (cardapio.pizzas[idPizza] && !isNaN(quantidade) && quantidade > 0) {
                const pizza = cardapio.pizzas[idPizza];
                
                // Adicionar ao pedido
                pedidos[msg.from].itens.push({
                    tipo: "pizza",
                    id: idPizza,
                    nome: pizza.nome,
                    valor: pizza.valor,
                    quantidade: quantidade
                });
                
                // Atualizar valor total
                pedidos[msg.from].total += pizza.valor * quantidade;
                
                await delay(1000);
                await chat.sendStateTyping();
                await delay(2000);
                
                await client.sendMessage(msg.from, `✅ *${quantidade}x ${pizza.nome}* adicionada(s) ao seu pedido!\n\nDeseja adicionar mais alguma pizza? Digite o número e a quantidade.\nOu digite *0* para voltar ao menu principal.`);
            } else {
                await client.sendMessage(msg.from, "❌ Por favor, digite um número de pizza válido seguido da quantidade.\nExemplo: *1 2* (para duas pizzas de Calabresa)");
            }
        } else {
            await client.sendMessage(msg.from, "❌ Formato inválido. Por favor, digite o número da pizza seguido da quantidade.\nExemplo: *1 2* (para duas pizzas de Calabresa)");
        }
    }

    // Adicionar bebida ao pedido
    else if (pedidos[msg.from].etapa === "escolhendo_bebida" && msg.body !== '0') {
        const entrada = msg.body.trim().split(" ");
        
        if (entrada.length === 2) {
            const idBebida = entrada[0];
            const quantidade = parseInt(entrada[1]);
            
            if (cardapio.bebidas[idBebida] && !isNaN(quantidade) && quantidade > 0) {
                const bebida = cardapio.bebidas[idBebida];
                
                // Adicionar ao pedido
                pedidos[msg.from].itens.push({
                    tipo: "bebida",
                    id: idBebida,
                    nome: bebida.nome,
                    valor: bebida.valor,
                    quantidade: quantidade
                });
                
                // Atualizar valor total
                pedidos[msg.from].total += bebida.valor * quantidade;
                
                await delay(1000);
                await chat.sendStateTyping();
                await delay(2000);
                
                await client.sendMessage(msg.from, `✅ *${quantidade}x ${bebida.nome}* adicionada(s) ao seu pedido!\n\nDeseja adicionar mais alguma bebida? Digite o número e a quantidade.\nOu digite *0* para voltar ao menu principal.`);
            } else {
                await client.sendMessage(msg.from, "❌ Por favor, digite um número de bebida válido seguido da quantidade.\nExemplo: *1 2* (para dois Refrigerantes 2L)");
            }
        } else {
            await client.sendMessage(msg.from, "❌ Formato inválido. Por favor, digite o número da bebida seguido da quantidade.\nExemplo: *1 2* (para dois Refrigerantes 2L)");
        }
    }

    // Voltar ao menu principal
    else if (msg.body === '0' && 
             (pedidos[msg.from].etapa === "escolhendo_pizza" || 
              pedidos[msg.from].etapa === "escolhendo_bebida" || 
              pedidos[msg.from].etapa === "gerenciando_pedido")) {
        
        pedidos[msg.from].etapa = "menu";
        
        await delay(1000);
        await chat.sendStateTyping();
        await delay(2000);
        
        await client.sendMessage(msg.from, `${clientName}, como posso ajudar você?\n\n1 - Ver cardápio de pizzas\n2 - Ver bebidas\n3 - Ver meu pedido atual\n4 - Informações e horários\n5 - Falar com atendente`);
    }

    // Remover item do pedido
    else if (msg.body === 'R' && pedidos[msg.from].etapa === "gerenciando_pedido") {
        if (pedidos[msg.from].itens.length === 0) {
            await client.sendMessage(msg.from, "Não há itens no seu pedido para remover. Digite *0* para voltar ao menu principal.");
        } else {
            pedidos[msg.from].etapa = "removendo_item";
            
            let itemText = "*🗑️ REMOVER ITEM DO PEDIDO 🗑️*\n\nDigite o número do item que deseja remover:\n\n";
            
            pedidos[msg.from].itens.forEach((item, index) => {
                itemText += `${index + 1}. ${item.quantidade}x ${item.nome} - R$ ${(item.valor * item.quantidade).toFixed(2)}\n`;
            });
            
            itemText += "\nOu digite *0* para cancelar.";
            
            await delay(1000);
            await chat.sendStateTyping();
            await delay(2000);
            
            await client.sendMessage(msg.from, itemText);
        }
    }

    // Finalizar pedido
    else if (msg.body === 'F' && pedidos[msg.from].etapa === "gerenciando_pedido") {
        if (pedidos[msg.from].itens.length === 0) {
            await client.sendMessage(msg.from, "Seu pedido está vazio. Adicione itens antes de finalizar. Digite *1* para ver o cardápio de pizzas.");
        } else {
            pedidos[msg.from].etapa = "endereco";
            
            await delay(1000);
            await chat.sendStateTyping();
            await delay(2000);
            
            await client.sendMessage(msg.from, "🏠 Por favor, digite seu endereço completo para entrega:\n(Rua, número, complemento, bairro)");
        }
    }

    // Receber endereço
    else if (pedidos[msg.from].etapa === "endereco" && msg.body.length > 10) {
        pedidos[msg.from].endereco = msg.body;
        pedidos[msg.from].etapa = "pagamento";
        
        await delay(1000);
        await chat.sendStateTyping();
        await delay(2000);
        
        await client.sendMessage(msg.from, "💵 Escolha a forma de pagamento:\n\n1 - PIX\n2 - Cartão na entrega\n3 - Dinheiro");
    }

    // Escolher forma de pagamento
    else if (pedidos[msg.from].etapa === "pagamento") {
        if (msg.body === '1') {
            // PIX
            pedidos[msg.from].pagamento = "PIX";
            
            await delay(1000);
            await chat.sendStateTyping();
            await delay(2000);
            
            // Gerar QR code ou dados do PIX
            const valorTotal = pedidos[msg.from].total.toFixed(2);
            
            let pixText = "*💲 PAGAMENTO VIA PIX 💲*\n\n" +
                          "Utilize os dados abaixo para fazer o pagamento:\n\n" +
                          `*Chave PIX:* ${dadosPix.chave}\n` +
                          `*Valor:* R$ ${valorTotal}\n` +
                          `*Nome:* ${dadosPix.nome}\n` +
                          `*Cidade:* ${dadosPix.cidade}\n\n` +
                          "Por favor, envie o comprovante de pagamento após a transferência.";
            
            await client.sendMessage(msg.from, pixText);
            
            // Gerar recibo do pedido
            let reciboText = "*🧾 RESUMO DO SEU PEDIDO 🧾*\n\n";
            reciboText += `Cliente: ${pedidos[msg.from].nome}\n`;
            reciboText += `Endereço: ${pedidos[msg.from].endereco}\n\n`;
            reciboText += "*Itens pedidos:*\n";
            
            pedidos[msg.from].itens.forEach((item, index) => {
                reciboText += `${index + 1}. ${item.quantidade}x ${item.nome} - R$ ${(item.valor * item.quantidade).toFixed(2)}\n`;
            });
            
            reciboText += `\n*Total: R$ ${valorTotal}*\n`;
            reciboText += `*Forma de pagamento:* PIX\n\n`;
            reciboText += "Seu pedido será preparado assim que confirmarmos o pagamento.\n";
            reciboText += "O tempo estimado de entrega é de 30-45 minutos.\n\n";
            reciboText += "Obrigado pela preferência! 😊\n\n";
            reciboText += "Digite *menu* para fazer um novo pedido.";
            
            await delay(3000);
            await chat.sendStateTyping();
            await delay(2000);
            
            await client.sendMessage(msg.from, reciboText);
            
            // Reiniciar o pedido
            pedidos[msg.from] = {
                itens: [],
                total: 0,
                etapa: "fim",
                endereco: "",
                pagamento: "",
                nome: pedidos[msg.from].nome
            };
        } else if (msg.body === '2') {
            // Cartão na entrega
            processarPagamentoNaEntrega("Cartão");
        } else if (msg.body === '3') {
            // Dinheiro
            await delay(1000);
            await chat.sendStateTyping();
            await delay(2000);
            
            await client.sendMessage(msg.from, "💵 Precisa de troco? Se sim, digite para qual valor.\nExemplo: *100* (para troco de R$ 100,00)\n\nSe não precisar de troco, digite *Sem troco*.");
            
            pedidos[msg.from].etapa = "troco";
        } else {
            await client.sendMessage(msg.from, "❌ Opção inválida. Por favor, escolha uma das opções de pagamento:\n\n1 - PIX\n2 - Cartão na entrega\n3 - Dinheiro");
        }
        
        // Função para processar pagamentos na entrega
        async function processarPagamentoNaEntrega(tipo) {
            pedidos[msg.from].pagamento = tipo;
            
            const valorTotal = pedidos[msg.from].total.toFixed(2);
            
            // Gerar recibo do pedido
            let reciboText = "*🧾 RESUMO DO SEU PEDIDO 🧾*\n\n";
            reciboText += `Cliente: ${pedidos[msg.from].nome}\n`;
            reciboText += `Endereço: ${pedidos[msg.from].endereco}\n\n`;
            reciboText += "*Itens pedidos:*\n";
            
            pedidos[msg.from].itens.forEach((item, index) => {
                reciboText += `${index + 1}. ${item.quantidade}x ${item.nome} - R$ ${(item.valor * item.quantidade).toFixed(2)}\n`;
            });
            
            reciboText += `\n*Total: R$ ${valorTotal}*\n`;
            reciboText += `*Forma de pagamento:* ${tipo} na entrega\n\n`;
            reciboText += "Seu pedido foi confirmado e está sendo preparado!\n";
            reciboText += "O tempo estimado de entrega é de 30-45 minutos.\n\n";
            reciboText += "Obrigado pela preferência! 😊\n\n";
            reciboText += "Digite *menu* para fazer um novo pedido.";
            
            await delay(1000);
            await chat.sendStateTyping();
            await delay(2000);
            
            await client.sendMessage(msg.from, reciboText);
            
            // Reiniciar o pedido
            pedidos[msg.from] = {
                itens: [],
                total: 0,
                etapa: "fim",
                endereco: "",
                pagamento: "",
                nome: pedidos[msg.from].nome
            };
        }
    }

    // Processar troco para pagamento em dinheiro
    else if (pedidos[msg.from].etapa === "troco") {
        let trocoInfo = "";
        
        if (msg.body.toLowerCase() === "sem troco") {
            trocoInfo = "Sem troco";
        } else {
            const valorTroco = parseFloat(msg.body.replace(',', '.'));
            
            if (!isNaN(valorTroco) && valorTroco > pedidos[msg.from].total) {
                trocoInfo = `Troco para R$ ${valorTroco.toFixed(2)}`;
            } else {
                await client.sendMessage(msg.from, "❌ Valor inválido para troco. O valor deve ser maior que o total do pedido. Por favor, digite novamente ou digite *Sem troco*.");
                return;
            }
        }
        
        // Registra a forma de pagamento
        pedidos[msg.from].pagamento = `Dinheiro (${trocoInfo})`;
        
        const valorTotal = pedidos[msg.from].total.toFixed(2);
        
        // Gerar recibo do pedido
        let reciboText = "*🧾 RESUMO DO SEU PEDIDO 🧾*\n\n";
        reciboText += `Cliente: ${pedidos[msg.from].nome}\n`;
        reciboText += `Endereço: ${pedidos[msg.from].endereco}\n\n`;
        reciboText += "*Itens pedidos:*\n";
        
        pedidos[msg.from].itens.forEach((item, index) => {
            reciboText += `${index + 1}. ${item.quantidade}x ${item.nome} - R$ ${(item.valor * item.quantidade).toFixed(2)}\n`;
        });
        
        reciboText += `\n*Total: R$ ${valorTotal}*\n`;
        reciboText += `*Forma de pagamento:* ${pedidos[msg.from].pagamento}\n\n`;
        reciboText += "Seu pedido foi confirmado e está sendo preparado!\n";
        reciboText += "O tempo estimado de entrega é de 30-45 minutos.\n\n";
        reciboText += "Obrigado pela preferência! 😊\n\n";
        reciboText += "Digite *menu* para fazer um novo pedido.";
        
        await delay(1000);
        await chat.sendStateTyping();
        await delay(2000);
        
        await client.sendMessage(msg.from, reciboText);
        
        // Reiniciar o pedido
        pedidos[msg.from] = {
            itens: [],
            total: 0,
            etapa: "fim",
            endereco: "",
            pagamento: "",
            nome: pedidos[msg.from].nome
        };
    }

    // Remover item selecionado
    else if (pedidos[msg.from].etapa === "removendo_item") {
        const indice = parseInt(msg.body) - 1;
        
        if (msg.body === '0') {
            pedidos[msg.from].etapa = "gerenciando_pedido";
            
            await delay(1000);
            await chat.sendStateTyping();
            await delay(1000);
            
            await client.sendMessage(msg.from, "Remoção cancelada. Digite *3* para voltar ao seu pedido ou *0* para o menu principal.");
        } else if (!isNaN(indice) && indice >= 0 && indice < pedidos[msg.from].itens.length) {
            const itemRemovido = pedidos[msg.from].itens[indice];
            
            // Subtrair do total
            pedidos[msg.from].total -= itemRemovido.valor * itemRemovido.quantidade;
            
            // Remover o item
            pedidos[msg.from].itens.splice(indice, 1);
            
            await delay(1000);
            await chat.sendStateTyping();
            await delay(1000);
            
            await client.sendMessage(msg.from, `✅ Item *${itemRemovido.quantidade}x ${itemRemovido.nome}* removido com sucesso!`);
            
            // Voltar para o pedido atual
            pedidos[msg.from].etapa = "menu";
            
            await delay(1000);
            await chat.sendStateTyping();
            await delay(2000);
            
            await client.sendMessage(msg.from, `${clientName}, como posso ajudar você?\n\n1 - Ver cardápio de pizzas\n2 - Ver bebidas\n3 - Ver meu pedido atual\n4 - Informações e horários\n5 - Falar com atendente`);
        } else {
            await client.sendMessage(msg.from, "❌ Número de item inválido. Por favor, digite o número correto do item que deseja remover ou *0* para cancelar.");
        }
    }
});