// ---------- State ----------
let cart = JSON.parse(localStorage.getItem("orbit_cart")) || [];
let activeCategories = new Set();
let maxPrice = 500;
let searchTerm = "";
let sortMode = "default";

// ---------- Elements ----------
const productGrid = document.getElementById("productGrid");
const resultsCount = document.getElementById("resultsCount");
const categoryFilters = document.getElementById("categoryFilters");
const searchInput = document.getElementById("searchInput");
const priceRange = document.getElementById("priceRange");
const priceValue = document.getElementById("priceValue");
const sortSelect = document.getElementById("sortSelect");

const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");
const cartDrawer = document.getElementById("cartDrawer");
const overlay = document.getElementById("overlay");
const closeCart = document.getElementById("closeCart");
const cartItems = document.getElementById("cartItems");
const cartSubtotal = document.getElementById("cartSubtotal");
const checkoutBtn = document.getElementById("checkoutBtn");

const checkoutOverlay = document.getElementById("checkoutOverlay");
const closeCheckout = document.getElementById("closeCheckout");
const shippingForm = document.getElementById("shippingForm");
const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const step3 = document.getElementById("step3");
const reviewSummary = document.getElementById("reviewSummary");
const reviewItems = document.getElementById("reviewItems");
const backToStep1 = document.getElementById("backToStep1");
const placeOrderBtn = document.getElementById("placeOrderBtn");
const confirmEmail = document.getElementById("confirmEmail");
const orderRef = document.getElementById("orderRef");
const closeConfirmation = document.getElementById("closeConfirmation");

let pendingShipping = null;

// ---------- Init ----------
function init() {
  renderCategoryFilters();
  renderProducts();
  updateCartUI();
  attachEvents();
}

// ---------- Filters ----------
function renderCategoryFilters() {
  const categories = [...new Set(PRODUCTS.map((p) => p.category))];
  categoryFilters.innerHTML = categories
    .map(
      (cat) => `
      <label class="checkbox-row">
        <input type="checkbox" value="${cat}" class="category-checkbox">
        ${cat}
      </label>`
    )
    .join("");

  document.querySelectorAll(".category-checkbox").forEach((box) => {
    box.addEventListener("change", (e) => {
      if (e.target.checked) activeCategories.add(e.target.value);
      else activeCategories.delete(e.target.value);
      renderProducts();
    });
  });
}

function getFilteredProducts() {
  let list = PRODUCTS.filter((p) => {
    const matchesCategory =
      activeCategories.size === 0 || activeCategories.has(p.category);
    const matchesPrice = p.price <= maxPrice;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesPrice && matchesSearch;
  });

  if (sortMode === "price-asc") list.sort((a, b) => a.price - b.price);
  else if (sortMode === "price-desc") list.sort((a, b) => b.price - a.price);
  else if (sortMode === "name-asc") list.sort((a, b) => a.name.localeCompare(b.name));

  return list;
}

// ---------- Render products ----------
function renderProducts() {
  const filtered = getFilteredProducts();
  resultsCount.textContent = `${filtered.length} product${filtered.length === 1 ? "" : "s"}`;

  if (filtered.length === 0) {
    productGrid.innerHTML = `<p class="empty-state">No products match your filters. Try widening your search.</p>`;
    return;
  }

  productGrid.innerHTML = filtered
    .map(
      (p) => `
      <article class="product-card">
        <div class="product-image" style="background:${p.swatch}"></div>
        <div class="product-info">
          <p class="product-category">${p.category}</p>
          <h3>${p.name}</h3>
          <p class="product-desc">${p.description}</p>
          <div class="product-footer">
            <span class="product-price">$${p.price.toFixed(2)}</span>
            <button class="add-btn" data-id="${p.id}">Add to cart</button>
          </div>
        </div>
      </article>`
    )
    .join("");

  document.querySelectorAll(".add-btn").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(btn.dataset.id));
  });
}

// ---------- Cart logic ----------
function addToCart(productId) {
  const product = PRODUCTS.find((p) => p.id === productId);
  const existing = cart.find((item) => item.id === productId);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
  }

  saveCart();
  updateCartUI();
  openCart();
}

function updateQty(productId, delta) {
  const item = cart.find((i) => i.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter((i) => i.id !== productId);
  }
  saveCart();
  updateCartUI();
}

function removeFromCart(productId) {
  cart = cart.filter((i) => i.id !== productId);
  saveCart();
  updateCartUI();
}

function saveCart() {
  localStorage.setItem("orbit_cart", JSON.stringify(cart));
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function updateCartUI() {
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  cartCount.textContent = totalItems;

  if (cart.length === 0) {
    cartItems.innerHTML = `<p class="empty-state">Your cart is empty.</p>`;
  } else {
    cartItems.innerHTML = cart
      .map(
        (item) => `
        <div class="cart-item">
          <div class="cart-item-info">
            <p class="cart-item-name">${item.name}</p>
            <p class="cart-item-price">$${item.price.toFixed(2)}</p>
          </div>
          <div class="qty-control">
            <button class="qty-btn" data-id="${item.id}" data-delta="-1">−</button>
            <span>${item.qty}</span>
            <button class="qty-btn" data-id="${item.id}" data-delta="1">+</button>
          </div>
          <button class="remove-btn" data-id="${item.id}">Remove</button>
        </div>`
      )
      .join("");

    document.querySelectorAll(".qty-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        updateQty(btn.dataset.id, parseInt(btn.dataset.delta))
      );
    });
    document.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", () => removeFromCart(btn.dataset.id));
    });
  }

  cartSubtotal.textContent = `$${getCartTotal().toFixed(2)}`;
}

// ---------- Cart drawer open/close ----------
function openCart() {
  cartDrawer.classList.add("open");
  overlay.classList.add("visible");
}

function closeCartDrawer() {
  cartDrawer.classList.remove("open");
  overlay.classList.remove("visible");
}

// ---------- Checkout flow ----------
function openCheckout() {
  if (cart.length === 0) return;
  closeCartDrawer();
  checkoutOverlay.classList.add("visible");
  showStep(1);
}

function closeCheckoutModal() {
  checkoutOverlay.classList.remove("visible");
  shippingForm.reset();
  clearFieldErrors();
  showStep(1);
}

function showStep(stepNumber) {
  [step1, step2, step3].forEach((el) => el.classList.add("hidden"));
  document.getElementById(`step${stepNumber}`).classList.remove("hidden");
}

function clearFieldErrors() {
  document.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
}

function validateShippingForm(formData) {
  const errors = {};
  if (!formData.get("fullName").trim()) errors.fullName = "Full name is required.";
  const email = formData.get("email").trim();
  if (!email) errors.email = "Email is required.";
  else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = "Enter a valid email address.";
  if (!formData.get("address").trim()) errors.address = "Shipping address is required.";
  if (!formData.get("city").trim()) errors.city = "City is required.";
  return errors;
}

function renderReview() {
  reviewSummary.innerHTML = `
    <p><strong>${pendingShipping.fullName}</strong></p>
    <p>${pendingShipping.address}, ${pendingShipping.city}</p>
    <p>${pendingShipping.email}</p>
  `;

  reviewItems.innerHTML =
    cart
      .map(
        (item) => `
      <div class="review-item">
        <span>${item.name} × ${item.qty}</span>
        <span>$${(item.price * item.qty).toFixed(2)}</span>
      </div>`
      )
      .join("") +
    `<div class="review-item review-total">
      <span>Total</span>
      <span>$${getCartTotal().toFixed(2)}</span>
    </div>`;
}

function placeOrder() {
  const ref = "ORB-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  confirmEmail.textContent = pendingShipping.email;
  orderRef.textContent = ref;

  cart = [];
  saveCart();
  updateCartUI();

  showStep(3);
}

// ---------- Event wiring ----------
function attachEvents() {
  searchInput.addEventListener("input", (e) => {
    searchTerm = e.target.value;
    renderProducts();
  });

  priceRange.addEventListener("input", (e) => {
    maxPrice = parseInt(e.target.value);
    priceValue.textContent = `$${maxPrice}`;
    renderProducts();
  });

  sortSelect.addEventListener("change", (e) => {
    sortMode = e.target.value;
    renderProducts();
  });

  cartBtn.addEventListener("click", openCart);
  closeCart.addEventListener("click", closeCartDrawer);
  overlay.addEventListener("click", closeCartDrawer);

  checkoutBtn.addEventListener("click", openCheckout);
  closeCheckout.addEventListener("click", closeCheckoutModal);

  shippingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    clearFieldErrors();
    const formData = new FormData(shippingForm);
    const errors = validateShippingForm(formData);

    if (Object.keys(errors).length > 0) {
      Object.entries(errors).forEach(([field, message]) => {
        const input = shippingForm.querySelector(`[name="${field}"]`);
        input.nextElementSibling.textContent = message;
      });
      return;
    }

    pendingShipping = Object.fromEntries(formData.entries());
    renderReview();
    showStep(2);
  });

  backToStep1.addEventListener("click", () => showStep(1));
  placeOrderBtn.addEventListener("click", placeOrder);
  closeConfirmation.addEventListener("click", closeCheckoutModal);
}

init();