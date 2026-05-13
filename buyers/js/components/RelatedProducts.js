// Related Products Component
// Displays related products from the same category

function createRelatedProducts(product) {
  const container = document.getElementById('related-products-section');
  if (!container) return;

  const relatedProducts = product.relatedProducts || [];

  if (relatedProducts.length === 0) {
    container.style.display = 'none';
    return;
  }

  const html = `
    <div style="padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#fafafa">
      <h3 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#1e293b">Related Products</h3>
      
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(150px, 1fr));gap:12px">
        ${relatedProducts.map(prod => `
          <div 
            class="related-product-card"
            data-product-id="${prod.id}"
            style="
              border:1px solid #e2e8f0;
              border-radius:8px;
              overflow:hidden;
              cursor:pointer;
              transition:all 0.2s ease;
              background:#fff
            "
          >
            <div style="
              background:#f1f5f9;
              aspect-ratio:1;
              overflow:hidden;
              display:flex;align-items:center;justify-content:center
            ">
              <img src="${prod.main_image_url}" alt="${prod.name}" style="
                width:100%;
                height:100%;
                object-fit:cover
              ">
            </div>
            <div style="padding:8px">
              <div style="font-weight:600;font-size:13px;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${prod.name}</div>
              <div style="font-size:14px;font-weight:700;color:#f97316;margin:4px 0">$${prod.price}</div>
              <div style="font-size:11px;color:#64748b">★ ${(prod.rating || 0).toFixed(1)} (${prod.review_count || 0})</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Add click handlers for related products
  document.querySelectorAll('.related-product-card').forEach(card => {
    card.addEventListener('click', () => {
      const productId = card.getAttribute('data-product-id');
      const storeId = product.store_id || product.storeId || product.seller?.store_id || product.seller?.storeId || '';
      const storeParam = storeId ? `&store=${encodeURIComponent(storeId)}` : '';
      window.location.href = `./product.html?id=${encodeURIComponent(productId)}${storeParam}`;
    });
  });
}
