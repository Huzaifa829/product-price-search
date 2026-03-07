const searchBtn = document.getElementById('searchBtn');
const productInput = document.getElementById('productInput');
const resultsDiv = document.getElementById('results');
const errorDiv = document.getElementById('error');
const loadingDiv = document.getElementById('loading');

// Prevent right-click & F12
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => {
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === 'I')
  ) {
    e.preventDefault();
  }
});

// Search Function
async function searchProduct() {
  const query = productInput.value.trim();
  resultsDiv.innerHTML = '';
  errorDiv.innerHTML = '';

  if (!query) {
    errorDiv.textContent = 'Please enter a product name';
    return;
  }

  loadingDiv.style.display = 'block';

  try {
    const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();

    loadingDiv.style.display = 'none';

    if (data.error) {
      errorDiv.textContent = data.error;
      return;
    }

    if (!data.length) {
      errorDiv.textContent = 'No products found';
      return;
    }

    // Display products
    data.forEach((product) => {
      const card = document.createElement('div');
      card.classList.add('product-card');

      card.innerHTML = `
        <img src="${product.image}" class="product-image" alt="${product.title}" />

        <div class="product-info">
          <h3>${product.title}</h3>
          <p><strong>Price:</strong> ${product.price || 'N/A'}</p>
          <p><strong>Shop:</strong> ${product.shop || 'Unknown'}</p>
          <p><strong>Rating:</strong> ⭐ ${product.rating || 'N/A'} (${product.reviews || 0} reviews)</p>
          <p><strong>Condition:</strong> ${product.condition || 'New'}</p>
          <p><strong>Delivery:</strong> ${product.delivery || 'Not specified'}</p>
          <a href="${product.link}" target="_blank" class="view-btn">View Product</a>
        </div>
      `;

      resultsDiv.appendChild(card);
    });
  } catch (error) {
    loadingDiv.style.display = 'none';
    errorDiv.textContent = 'Something went wrong while fetching products';
    console.error('Search Error:', error);
  }
}

// Event listeners
searchBtn.addEventListener('click', searchProduct);
productInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchProduct();
});
