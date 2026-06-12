# 🎯 Guia de Uso - Divino Lanches

## 📱 Fluxo do Cliente

### 1. Montar o Dogão
- Acesse a URL do app
- Navegue pelos 4 passos do stepper:
  1. **Proteína** → Escolha entre Boi, Frango, Calabresa ou combinação de 2
  2. **Ingredientes** → Ative/desative ingredientes básicos (milho, vinagrete, cenoura, batata palha)
  3. **Bebidas** → Selecione refrigerantes, sucos ou água (opcional)
  4. **Confirmar** → Adicione observações, ajuste quantidade e veja o resumo do pedido
- Clique em **"Adicionar"** para incluir no carrinho

### 2. Carrinho & Checkout
- No desktop: clique na aba **"2. Carrinho & Checkout"**
- No mobile: clique no botão flutuante do carrinho
- Revise os itens, ajuste quantidades ou remova itens
- Escolha **Retirada** (sem taxa) ou **Entrega** (com taxa por bairro)
- Preencha nome e WhatsApp
- Se for entrega: preencha rua, número e bairro
- Escolha forma de pagamento: **Pix**, **Crédito**, **Débito** ou **Dinheiro**
- Clique em **"Finalizar Pedido"**

### 3. Confirmação
- O pedido é salvo automaticamente no histórico
- O pedido é enviado via WhatsApp para o estabelecimento
- Tela de confirmação é exibida

---

## 🔐 Painel Admin

### Acesso
- Adicione `?admin=true` na URL ou clique no escudo
- Senha padrão: **admin**

### Abas do Admin

#### 📦 Pedidos
Gerencie todo o fluxo de pedidos com 3 filtros:

| Filtro | Descrição | Ações |
|--------|-----------|-------|
| **⏳ Pendentes** | Pedidos recém-chegados | 🔵 **Confirmar Pedido** → Aceita e inicia preparo |
| **✅ Confirmados** | Pedidos em preparo | 🟡 **Reabrir** → Volta para pendentes |
|  |  | 🔵 **Finalizar Pedido** → Marca como entregue/retirado |
| **📦 Finalizados** | Histórico de pedidos concluídos | Visualização apenas |

#### 📝 Cardápio
Edite os itens do cardápio:
- **Cachorros-Quentes** → Editar nome, preço e descrição
- **Ingredientes Básicos (Passo 2)** → Editar nome e descrição
- **Extras & Molhos (Passo 2)** → Editar nome, preço e descrição
- **Bebidas (Passo 3)** → Editar nome, preço e descrição

#### 📊 Estatísticas
Visualize métricas de vendas:
- Preferência de proteínas (Boi vs Frango vs Calabresa)
- Tipo de fluxo (Entrega vs Retirada)
- Métodos de pagamento mais usados

#### ⚙️ Ajustes
Gerencie disponibilidade de itens (estoque):
- **Proteínas (Passo 1)** → Ativar/desativar Boi, Frango, Calabresa
- **Ingredientes Básicos (Passo 2)** → Ativar/desativar ingredientes
- **Bebidas (Passo 3)** → Ativar/desativar bebidas

---

## 🔄 Fluxo Completo (Funcionário)

```
Cliente faz pedido → ⏳ Pendentes
     ↓
Funcionário confirma → ✅ Confirmados
     ↓
Funcionário prepara e entrega → 📦 Finalizados
```

## 🛠️ Comandos do Projeto

```bash
npm run dev      # Iniciar servidor de desenvolvimento (porta 3000)
npm run build    # Build de produção
npm run preview  # Preview do build
npm run lint     # Verificar erros TypeScript