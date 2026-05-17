// public/js/main.js
document.addEventListener("DOMContentLoaded", () => {
  
  // 🔹 Estado del carrito (persistente)
  const state = {
    cart: JSON.parse(localStorage.getItem("agro_cart")) || []
  };

  // 🔹 Referencias al DOM
  const cartCountEl = document.querySelector(".cart-count");
  const productGrid = document.querySelector(".grid-productos");
  const menuToggle = document.querySelector(".menu-toggle");
  const mainMenu = document.getElementById("main-menu");

  // 🚀 Inicializar
  updateCartCount();
  bindAddToCart();      // ← Solo vincula eventos, NO renderiza
  bindMobileMenu();
  initCartPage();       // ← Renderiza /carrito si estamos ahí

  // 🛒 Vincular botones "Agregar al carrito" (solo si existe el grid)
  function bindAddToCart() {
    if (!productGrid) return;
    
    productGrid.addEventListener("click", (e) => {
      const btn = e.target.closest(".add-to-cart-btn");
      if (!btn) return;
      e.preventDefault();

      // ✅ Obtener datos del botón (dataset siempre son strings)
      const imgSrc = btn.closest(".card")?.querySelector("img")?.src || "";
const imagen = imgSrc.includes("/img/") ? imgSrc.split("/img/")[1] : "default.jpg";

const item = {
  id: String(btn.dataset.id),
  nombre: btn.dataset.name,
  precio: parseFloat(btn.dataset.price),
  imagen: imagen
};

      if (isNaN(item.precio)) {
        console.warn("⚠️ Precio inválido:", item);
        return;
      }

      addToCart(item);
    });
  }

  function addToCart(item) {
    // ✅ Comparar IDs como strings para evitar "1" !== 1
    const existing = state.cart.find(i => String(i.id) === String(item.id));
    
    if (existing) {
      existing.cantidad = (existing.cantidad || 1) + 1;
    } else {
      state.cart.push({ ...item, cantidad: 1 });
    }
    
    saveCart();
    showToast(`✅ ${item.nombre} agregado al carrito`);
  }

  function saveCart() {
    localStorage.setItem("agro_cart", JSON.stringify(state.cart));
    updateCartCount();
  }

  function updateCartCount() {
    const total = state.cart.reduce((sum, i) => sum + (i.cantidad || 1), 0);
    if (cartCountEl) cartCountEl.textContent = total;
  }

  function showToast(msg) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();
    
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  // 🍔 Menú móvil
  function bindMobileMenu() {
    if (!menuToggle || !mainMenu) return;
    
    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", !isOpen);
      mainMenu.classList.toggle("active");
    });
    
    mainMenu.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        menuToggle.setAttribute("aria-expanded", "false");
        mainMenu.classList.remove("active");
      });
    });
  }

  // 🛒 Renderizar página /carrito
  function initCartPage() {
    const cartContainer = document.getElementById("cart-container");
    const cartItemsEl = document.getElementById("cart-items");
    const cartSummaryEl = document.getElementById("cart-summary");
    const emptyCartEl = document.getElementById("empty-cart");

    if (!cartContainer) return; // No estamos en /carrito

    function renderCart() {
      if (!state.cart || state.cart.length === 0) {
        cartContainer.style.display = "none";
        if (emptyCartEl) emptyCartEl.style.display = "block";
        return;
      }
      
      if (cartContainer) cartContainer.style.display = "grid";
      if (emptyCartEl) emptyCartEl.style.display = "none";

      let itemsHTML = "";
      let subtotal = 0;

      state.cart.forEach(item => {
        const cantidad = item.cantidad || 1;
        const total = (item.precio || 0) * cantidad;
        subtotal += total;
        
        itemsHTML += `
          <div class="cart-item" data-id="${item.id}">
            <img src="/img/${item.imagen || 'default.jpg'}" alt="${item.nombre}" onerror="this.src='/img/default.jpg'">
            <div class="cart-item-info">
              <h3>${item.nombre}</h3>
              <p class="cart-item-price">Unitario: $${(item.precio || 0).toLocaleString()}</p>
            </div>
            <div class="cart-qty">
              <button type="button" class="qty-btn" data-action="dec" data-id="${item.id}">−</button>
              <input type="number" value="${cantidad}" min="1" readonly>
              <button type="button" class="qty-btn" data-action="inc" data-id="${item.id}">+</button>
            </div>
            <p style="font-weight:600; min-width:90px; text-align:right;">$${total.toLocaleString()}</p>
            <button type="button" class="remove-btn" data-id="${item.id}">🗑️</button>
          </div>
        `;
      });

      if (cartItemsEl) cartItemsEl.innerHTML = itemsHTML;
      
      if (cartSummaryEl) {
        cartSummaryEl.innerHTML = `
          <h3>Resumen</h3>
          <div class="summary-row"><span>Subtotal</span><span>$${subtotal.toLocaleString()}</span></div>
          <div class="summary-row summary-total"><span>Total</span><span>$${subtotal.toLocaleString()}</span></div>
          <button type="button" class="btn checkout-btn" id="checkout-btn">Finalizar Compra</button>
        `;
      }
    }

    // Eventos para +/- y eliminar
    if (cartItemsEl) {
      cartItemsEl.addEventListener("click", (e) => {
        const btn = e.target.closest(".qty-btn, .remove-btn");
        if (!btn) return;
        
        const id = String(btn.dataset.id);
        const action = btn.dataset.action;
        const item = state.cart.find(i => String(i.id) === id);
        
        if (!item) return;

        if (action === "inc") item.cantidad = (item.cantidad || 1) + 1;
        else if (action === "dec" && (item.cantidad || 1) > 1) item.cantidad--;
        else if (!action) {
          state.cart = state.cart.filter(i => String(i.id) !== id);
        }

        saveCart();
        renderCart();
      });
    }

    document.addEventListener("click", async (e) => {
  const checkoutBtn = e.target.closest("#checkout-btn");
  if (!checkoutBtn) return;

  if (!state.cart || state.cart.length === 0) {
    showToast("Tu carrito está vacío");
    return;
  }

  checkoutBtn.disabled = true;
  checkoutBtn.textContent = "Procesando...";

  try {
    const response = await fetch("/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: state.cart
      })
    });

    if (response.redirected) {
      window.location.href = response.url;
      return;
    }

    const data = await response.json();

    if (!data.ok) {
      showToast(data.message || "No se pudo finalizar la compra");
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Finalizar Compra";
      return;
    }

    state.cart = [];
    saveCart();
    renderCart();

    showToast(`Compra registrada. Pedido #${data.orderId}`);
  } catch (error) {
    console.error("Error en checkout:", error);

    showToast("Error al finalizar la compra");
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = "Finalizar Compra";
  }
});

    renderCart();
  }

  
});