// ====== DYNAMIC PRODUCT DATA ======
const products = [
  { id: 1, name: "Classic Hoodie", price: 35, rating: 4.5, category: "clothing", img: "oli.png" },
  { id: 2, name: "Denim Jacket", price: 48, rating: 4.7, category: "clothing", img: "marketplace.png" },
  { id: 3, name: "Running Sneakers", price: 55, rating: 4.6, category: "shoes", img: "props and stuff.jpg" },
  { id: 4, name: "Leather Belt", price: 20, rating: 4.3, category: "accessories", img: "cloths and shoes.jpg" },
  { id: 5, name: "Graphic Tee", price: 25, rating: 4.8, category: "clothing", img: "elon.jfif" },
];

// ====== LOAD PRODUCTS ======
const grid = document.getElementById("productsGrid");
function renderProducts(filter = "all") {
  grid.innerHTML = "";
  const filtered = filter === "all" ? products : products.filter(p => p.category === filter);
  filtered.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${p.img}" alt="${p.name}">
      <div class="product-info">
        <h4>${p.name}</h4>
        <p>₦${p.price.toFixed(2)}</p>
        <div class="product-actions">
          <span><i class="fa-solid fa-star" style="color:gold"></i> ${p.rating}</span>
          <button onclick="addToCart('${p.name}')">Add to Cart</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}
renderProducts();

// ====== CATEGORY FILTER ======
document.getElementById("categoryFilter").addEventListener("change", e => {
  renderProducts(e.target.value);
});

// ====== TABS ======
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// ====== FOLLOW BUTTON ======
const followBtn = document.getElementById("followBtn");
let following = false;
followBtn.addEventListener("click", () => {
  following = !following;
  followBtn.textContent = following ? "Following" : "Follow";
  showToast(following ? "You are now following this store" : "Unfollowed store");
});

// ====== TOAST NOTIFICATION ======
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

// ====== ADD TO CART ======
function addToCart(name) {
  showToast(`${name} added to cart 🛒`);
}
