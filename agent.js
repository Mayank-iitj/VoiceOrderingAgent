const { OpenAI } = require('openai');

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1',
});

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'add_item',
      description: 'Add a menu item to the cart, or increase its quantity if already present.',
      parameters: {
        type: 'object',
        properties: {
          item_id: { type: 'string', description: 'The menu item id, exactly as given in the menu.' },
          quantity: { type: 'integer', minimum: 1 },
          notes: { type: 'string', description: 'Optional customization, e.g. "extra spicy", "no onions".' }
        },
        required: ['item_id', 'quantity']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_quantity',
      description: "Change the quantity of an item already in the cart. Use quantity 0 to remove it.",
      parameters: {
        type: 'object',
        properties: {
          item_id: { type: 'string' },
          quantity: { type: 'integer', minimum: 0 }
        },
        required: ['item_id', 'quantity']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'confirm_order',
      description: 'Finalize the order once the customer explicitly confirms they are done and the cart is correct. Requires a pickup or delivery choice and a name to call out.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string' },
          fulfillment: { type: 'string', enum: ['pickup', 'delivery'] },
          phone: { type: 'string', description: 'Phone number for the receipt / order updates, if the customer gave one.' }
        },
        required: ['customer_name', 'fulfillment']
      }
    }
  }
];

function buildSystemPrompt(menu, cart) {
  const menuLines = menu.items
    .map(i => `- ${i.item_id ?? i.id} | ${i.name} | $${i.price.toFixed(2)} | ${i.category} | ${i.dietary_type || 'Unknown'}${i.spice_level ? ' | spice: ' + i.spice_level : ''}`)
    .join('\n');
  const cartLines = cart.length
    ? cart.map(c => `- ${c.quantity}x ${c.name} ($${(c.price * c.quantity).toFixed(2)})${c.notes ? ' — ' + c.notes : ''}`).join('\n')
    : '(empty)';

  return `You are a warm, efficient voice ordering assistant for ${menu.tenant_id}. Speak naturally and briefly — this is a voice conversation, not a chat window. One question at a time. Confirm the full order back to the customer before calling confirm_order.

MENU:
${menuLines}

CURRENT CART:
${cartLines}

Rules:
- Only use item_id values that exist in the menu above.
- If the customer asks for something not on the menu, say so and suggest a close alternative.
- Never call confirm_order until the customer has explicitly said the order is complete/correct.
- Ask for pickup vs delivery and a name before confirming, if not already given.
- Keep spoken responses short — a sentence or two.`;
}

class OrderSession {
  constructor(menu) {
    this.menu = menu;
    this.cart = []; // [{item_id, name, price, quantity, notes}]
    this.messages = [];
    this.confirmed = false;
    this.order = null;
  }

  applyAddItem({ item_id, quantity, notes }) {
    const menuItem = this.menu.items.find(i => i.id === item_id);
    if (!menuItem) return `No menu item with id "${item_id}".`;
    const existing = this.cart.find(c => c.item_id === item_id && (c.notes || '') === (notes || ''));
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.cart.push({ item_id, name: menuItem.name, price: menuItem.price, quantity, notes: notes || null });
    }
    return `Added ${quantity}x ${menuItem.name}.`;
  }

  applyUpdateQuantity({ item_id, quantity }) {
    const idx = this.cart.findIndex(c => c.item_id === item_id);
    if (idx === -1) return `"${item_id}" is not in the cart.`;
    if (quantity <= 0) {
      const [removed] = this.cart.splice(idx, 1);
      return `Removed ${removed.name}.`;
    }
    this.cart[idx].quantity = quantity;
    return `Updated ${this.cart[idx].name} to ${quantity}.`;
  }

  applyConfirmOrder({ customer_name, fulfillment, phone }) {
    if (!this.cart.length) return 'Cannot confirm an empty cart.';
    const subtotal = this.cart.reduce((s, c) => s + c.price * c.quantity, 0);
    this.confirmed = true;
    this.order = {
      tenant_id: this.menu.tenant_id,
      customer_name,
      fulfillment,
      phone: phone || null,
      items: this.cart.map(c => ({ item_id: c.item_id, name: c.name, quantity: c.quantity, unit_price: c.price, notes: c.notes })),
      subtotal: Number(subtotal.toFixed(2)),
      currency: this.menu.currency,
      confirmed_at: new Date().toISOString()
    };
    return `Order confirmed for ${customer_name}.`;
  }

  runTool(name, input) {
    if (name === 'add_item') return this.applyAddItem(input);
    if (name === 'update_quantity') return this.applyUpdateQuantity(input);
    if (name === 'confirm_order') return this.applyConfirmOrder(input);
    return `Unknown tool ${name}.`;
  }

  async handleUserMessage(userText) {
    this.messages.push({ role: 'user', content: userText });

    // Loop until the model responds with plain text (no further tool calls)
    for (let turn = 0; turn < 4; turn++) {
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt(this.menu, this.cart) },
          ...this.messages
        ],
        tools: TOOLS,
      });

      const message = response.choices[0].message;
      this.messages.push(message);

      if (!message.tool_calls || message.tool_calls.length === 0) {
        return { agentText: message.content || "", cart: this.cart, confirmed: this.confirmed, order: this.order };
      }

      for (const toolCall of message.tool_calls) {
        let args;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          args = {};
        }
        const result = this.runTool(toolCall.function.name, args);
        this.messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result
        });
      }

      if (this.confirmed) {
        // Let the model produce one final confirmation utterance, then stop.
        const finalRes = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: buildSystemPrompt(this.menu, this.cart) },
            ...this.messages
          ]
        });
        const finalText = finalRes.choices[0].message.content || 'Your order is confirmed!';
        return { agentText: finalText, cart: this.cart, confirmed: true, order: this.order };
      }
    }
    return { agentText: "Sorry, let's try that again — what would you like to order?", cart: this.cart, confirmed: false, order: null };
  }
}

module.exports = { OrderSession };
