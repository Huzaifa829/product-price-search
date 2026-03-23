let state = {
  query: "",
  city: "",
  cityName: "",
  page: 1,
  limit: 8,
  totalPages: 0,
};

const searchInput = document.getElementById("searchInput");
const citySelect = document.getElementById("citySelect");
const limitSelect = document.getElementById("limitSelect");
const searchBtn = document.getElementById("searchBtn");

const productsGrid = document.getElementById("productsGrid");
const loading = document.getElementById("loading");
const pagination = document.getElementById("pagination");

const resultCount = document.getElementById("resultCount");
const cityBadge = document.getElementById("cityBadge");

async function loadCities() {
  const res = await fetch("/api/cities");
  const data = await res.json();
  citySelect.innerHTML = data
    .map((c) => `<option value="${c.geo}">${c.name}</option>`)
    .join("");
  state.city = data[0].geo;
  state.cityName = data[0].name;
}

function setLoading(show) {
  loading.style.display = show ? "block" : "none";
}

async function fetchProducts() {
  setLoading(true);
  productsGrid.innerHTML = "";

  const params = new URLSearchParams({
    q: state.query,
    city: state.city,
    page: state.page,
    limit: state.limit,
  });

  const res = await fetch(`/api/search?${params}`);
  const data = await res.json();

  setLoading(false);

  state.totalPages = data.totalPages;

  renderProducts(data.products);
  renderPagination();

  resultCount.innerText = `${data.total} results`;
  cityBadge.innerText = state.cityName;
}

function handleImgError(img, link) {
  if (!img.dataset.fallback) {
    img.dataset.fallback = "1";
    try {
      const domain = new URL(link).hostname;
      img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      img.style.objectFit = "contain";
      img.style.padding = "16px";
    } catch {
      showPlaceholder(img);
    }
  } else {
    showPlaceholder(img);
  }
}

function showPlaceholder(img) {
  const wrap = img.parentElement;
  if (!wrap) return;
  wrap.innerHTML = `
    <div style="width:100%;height:100%;display:flex;align-items:center;
                justify-content:center;color:#ccc;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="1.2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="M21 15l-5-5L5 21"/>
      </svg>
    </div>`;
}

function renderProducts(products) {
  if (!products || !products.length) {
    productsGrid.innerHTML =
      "<p style='grid-column:1/-1;text-align:center'>No products found</p>";
    return;
  }

  productsGrid.innerHTML = products
    .map((p) => {
      const imgSrc = p.image || "";
      const safeLink = (p.link || "").replace(/'/g, "%27");

      const imgTag = imgSrc
        ? `<img
             src="${imgSrc}"
             alt="${p.name}"
             loading="lazy"
             onerror="handleImgError(this,'${safeLink}')"
             style="width:100%;height:100%;object-fit:cover;"
           >`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;
                       justify-content:center;color:#ccc;">
             <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="1.2">
               <rect x="3" y="3" width="18" height="18" rx="2"/>
               <circle cx="8.5" cy="8.5" r="1.5"/>
               <path d="M21 15l-5-5L5 21"/>
             </svg>
           </div>`;

      return `
<div class="product-card">
  <div class="product-img-wrap" style="width:100%;aspect-ratio:1;overflow:hidden;
       background:#f5f5f5;border-radius:8px 8px 0 0;">
    ${imgTag}
  </div>
  <div class="product-title">${p.name}</div>
  <div class="product-price">${p.price}</div>
  <div class="product-source">${p.source}</div>
  <a href="${p.link}" target="_blank" rel="noopener">View Product</a>
</div>`;
    })
    .join("");
}

function renderPagination() {
  pagination.innerHTML = "";
  for (let i = 1; i <= state.totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = "page-btn" + (i === state.page ? " active" : "");
    btn.innerText = i;
    btn.onclick = () => {
      state.page = i;
      fetchProducts();
    };
    pagination.appendChild(btn);
  }
}

function doSearch() {
  const q = searchInput.value.trim();
  if (q.length < 2) {
    alert("Enter product name");
    return;
  }
  state.query = q;
  state.city = citySelect.value;
  state.cityName = citySelect.options[citySelect.selectedIndex].text;
  state.limit = parseInt(limitSelect.value);
  state.page = 1;
  fetchProducts();
}

searchBtn.onclick = doSearch;
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doSearch();
});

loadCities();
