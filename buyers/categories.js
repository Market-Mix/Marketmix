document.addEventListener('DOMContentLoaded', async function(){
  const grid = document.getElementById('allCategoriesGrid');
  if (!grid) return;

  try {
    const API_BASE = 'https://marketmix-backend.onrender.com/api';
    const resp = await fetch(`${API_BASE}/categories?limit=200`);
    if (!resp.ok) throw new Error('Failed to fetch categories');
    const json = await resp.json();
    const cats = json.data || [];

    if (cats.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1;padding:20px;color:#666;text-align:center">No categories found.</div>';
      return;
    }

    grid.innerHTML = cats.map(c => `
      <div class="category-card">
        <img src="${c.image || 'https://via.placeholder.com/200'}" alt="${c.name}" />
        <div class="category-name">${escapeHtml(c.name)}</div>
        <div class="meta" style="margin-top:8px;color:#666">${c.product_count || 0} product(s)</div>
        <button class="view-category" data-id="${c.id}" style="margin-top:12px;background:#667eea;color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer">View Category</button>
      </div>
    `).join('');

    // Attach handlers
    grid.querySelectorAll('.view-category').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.dataset.id;
        if (id) window.location.href = `buyers-category.html?id=${id}`;
      });
    });
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<div style="grid-column:1/-1;padding:20px;color:#666;text-align:center">Error loading categories.</div>';
  }

  function escapeHtml(text){
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
});
