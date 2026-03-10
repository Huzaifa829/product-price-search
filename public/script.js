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

function renderProducts(products) {
  if (!products.length) {
    productsGrid.innerHTML = "No products found";
    return;
  }

  productsGrid.innerHTML = products
    .map(
      (p) => `

<div class="product-card">

<img src="${p.image || ""}">

<div class="product-title">${p.name}</div>

<div class="product-price">${p.price}</div>

<div class="product-source">${p.source}</div>

<a href="${p.link}" target="_blank">
View Product
</a>

</div>

`,
    )
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
