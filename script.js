(() => {
  const cart = new Map();

  const els = {
    count: document.getElementById("cart-count"),
    drawer: document.getElementById("cart-drawer"),
    backdrop: document.getElementById("cart-backdrop"),
    items: document.getElementById("cart-items"),
    total: document.getElementById("cart-total"),
    btnOpen: document.getElementById("cart-btn"),
    btnClose: document.getElementById("cart-close"),
    btnCheckout: document.getElementById("cart-checkout"),
    toast: document.getElementById("toast"),
    menuToggle: document.getElementById("menu-toggle"),
    nav: document.getElementById("nav"),
  };

  const money = (n) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function showToast(msg, options = {}) {
    if (window.Auth && typeof Auth.toast === "function") {
      Auth.toast(msg, options.type || "");
      return;
    }
    const { duration = 2800, type = "" } = options;
    els.toast.textContent = msg;
    els.toast.className = "toast is-visible" + (type ? ` toast--${type}` : "");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove("is-visible"), duration);
  }

  function openCart() {
    els.drawer.classList.add("is-open");
    els.backdrop.classList.add("is-open");
    els.drawer.setAttribute("aria-hidden", "false");
  }

  function closeCart() {
    els.drawer.classList.remove("is-open");
    els.backdrop.classList.remove("is-open");
    els.drawer.setAttribute("aria-hidden", "true");
  }

  function addItem(id, name, price) {
    const current = cart.get(id) || { id, name, price, qty: 0 };
    current.qty += 1;
    cart.set(id, current);
    render();
    showToast(`${name} adicionado!`, { type: "success" });
  }

  function setQty(id, qty) {
    const item = cart.get(id);
    if (!item) return;
    if (qty <= 0) cart.delete(id);
    else {
      item.qty = qty;
      cart.set(id, item);
    }
    render();
  }

  function render() {
    let totalQty = 0;
    let totalPrice = 0;
    const lines = [];

    for (const item of cart.values()) {
      totalQty += item.qty;
      totalPrice += item.qty * item.price;
      lines.push(`
        <div class="cart-line" data-id="${item.id}">
          <div class="cart-line__name">${item.name}</div>
          <div class="cart-line__meta">${money(item.price)} × ${item.qty} = ${money(item.price * item.qty)}</div>
          <div class="cart-line__actions">
            <div class="cart-line__qty">
              <button type="button" data-action="dec" aria-label="Diminuir">−</button>
              <span>${item.qty}</span>
              <button type="button" data-action="inc" aria-label="Aumentar">+</button>
            </div>
            <button type="button" class="cart-line__remove" data-action="remove">Remover</button>
          </div>
        </div>
      `);
    }

    els.count.textContent = String(totalQty);
    els.total.textContent = money(totalPrice);

    if (lines.length === 0) {
      els.items.innerHTML = '<p class="cart-empty">Carrinho vazio. Adicione um hambúrguer!</p>';
    } else {
      els.items.innerHTML = lines.join("");
    }
  }

  document.querySelectorAll(".card").forEach((card) => {
    const btn = card.querySelector(".add-to-cart");
    if (!btn) return;
    btn.addEventListener("click", () => {
      addItem(card.dataset.id, card.dataset.name, parseFloat(card.dataset.price));
    });
  });

  els.items.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const line = btn.closest(".cart-line");
    const id = line?.dataset.id;
    if (!id) return;
    const item = cart.get(id);
    if (!item) return;

    const action = btn.dataset.action;
    if (action === "inc") setQty(id, item.qty + 1);
    if (action === "dec") setQty(id, item.qty - 1);
    if (action === "remove") setQty(id, 0);
  });

  els.btnOpen.addEventListener("click", openCart);
  els.btnClose.addEventListener("click", closeCart);
  els.backdrop.addEventListener("click", closeCart);

  els.btnCheckout.addEventListener("click", async () => {
    if (cart.size === 0) {
      showToast("Carrinho vazio!", { type: "error" });
      return;
    }

    const user = window.Auth ? Auth.getUser() : null;
    const token = window.Auth ? Auth.getToken() : "";

    if (!user || !token) {
      showToast("Faça login para finalizar o pedido", { type: "error" });
      setTimeout(() => {
        location.href = "login.html?next=index.html";
      }, 900);
      return;
    }

    const itens = [];
    for (const item of cart.values()) {
      itens.push({
        id: item.id,
        nome: item.name,
        preco: item.price,
        quantidade: item.qty,
      });
    }

    els.btnCheckout.disabled = true;
    try {
      const res = await Auth.api("/api/pedidos", {
        method: "POST",
        body: JSON.stringify({ itens }),
      });
      showToast(
        `Pedido #${res.pedidoId} registrado · ${money(res.total)}`,
        { type: "success" }
      );
      cart.clear();
      render();
      closeCart();
    } catch (err) {
      const msg = err.message || "Erro ao enviar pedido";
      showToast(msg, { type: "error" });
      if (/login/i.test(msg)) {
        setTimeout(() => {
          location.href = "login.html?next=index.html";
        }, 1000);
      }
    } finally {
      els.btnCheckout.disabled = false;
    }
  });

  els.menuToggle.addEventListener("click", () => {
    els.nav.classList.toggle("is-open");
  });

  els.nav.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => els.nav.classList.remove("is-open"));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCart();
  });

  render();
})();
