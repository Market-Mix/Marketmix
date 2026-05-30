
function createImageGallery(product) {
  const container = document.getElementById('image-gallery');
  if (!container) return;

  const mainImage = product.main_image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500';
  
  // Build images array from product.images or fallback to main image
  let images = [];
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    images = product.images.filter(Boolean);
  }
  if (!images.includes(mainImage) && mainImage) {
    images.unshift(mainImage);
  }
  if (images.length === 0) images = [mainImage];

  let currentIndex = 0;

  const html = `
    <div style="display:flex;flex-direction:column;gap:12px">
      <!-- Main Image -->
      <div style="
        background:#f1f5f9;border-radius:12px;overflow:hidden;
        aspect-ratio:1;display:flex;align-items:center;justify-content:center;position:relative;
      ">
        <img id="gallery-main-img" src="${images[0]}" alt="${product.name}" style="
          width:100%;height:100%;object-fit:cover;cursor:zoom-in;transition:opacity 0.2s;
        " onerror="this.src='https://via.placeholder.com/500'">

        ${images.length > 1 ? `
          <button id="gallery-prev" style="
            position:absolute;top:50%;left:12px;transform:translateY(-50%);
            background:rgba(249,115,22,0.85);color:#fff;border:none;
            width:36px;height:36px;border-radius:50%;cursor:pointer;
            font-size:18px;display:flex;align-items:center;justify-content:center;
            transition:all 0.2s;z-index:10;
          ">‹</button>
          <button id="gallery-next" style="
            position:absolute;top:50%;right:12px;transform:translateY(-50%);
            background:rgba(249,115,22,0.85);color:#fff;border:none;
            width:36px;height:36px;border-radius:50%;cursor:pointer;
            font-size:18px;display:flex;align-items:center;justify-content:center;
            transition:all 0.2s;z-index:10;
          ">›</button>
          <div style="
            position:absolute;bottom:10px;right:12px;
            background:rgba(0,0,0,0.5);color:#fff;
            padding:3px 10px;border-radius:20px;font-size:12px;
          ">
            <span id="gallery-counter">1 / ${images.length}</span>
          </div>
        ` : ''}
      </div>

      <!-- Thumbnails -->
      ${images.length > 1 ? `
        <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;">
          ${images.map((img, idx) => `
            <img
              src="${img}"
              data-idx="${idx}"
              class="gallery-thumbnail"
              style="
                width:64px;height:64px;border-radius:8px;cursor:pointer;flex-shrink:0;
                border:2px solid ${idx === 0 ? '#f97316' : '#e2e8f0'};
                object-fit:cover;transition:all 0.2s;
              "
              onerror="this.src='https://via.placeholder.com/64'"
            >
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  container.innerHTML = html;

  // Thumbnail clicks
  container.querySelectorAll('.gallery-thumbnail').forEach(thumb => {
    thumb.addEventListener('click', () => updateGalleryImage(parseInt(thumb.dataset.idx)));
  });

  // Nav buttons
  document.getElementById('gallery-prev')?.addEventListener('click', () => {
    updateGalleryImage(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
  });
  document.getElementById('gallery-next')?.addEventListener('click', () => {
    updateGalleryImage(currentIndex < images.length - 1 ? currentIndex + 1 : 0);
  });

  // Keyboard navigation
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  updateGalleryImage(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
    if (e.key === 'ArrowRight') updateGalleryImage(currentIndex < images.length - 1 ? currentIndex + 1 : 0);
  });

  function updateGalleryImage(idx) {
    currentIndex = idx;
    const mainImg = document.getElementById('gallery-main-img');
    if (mainImg) {
      mainImg.style.opacity = '0';
      setTimeout(() => {
        mainImg.src = images[idx];
        mainImg.style.opacity = '1';
      }, 150);
    }

    container.querySelectorAll('.gallery-thumbnail').forEach((t, i) => {
      t.style.borderColor = i === idx ? '#f97316' : '#e2e8f0';
      t.style.transform   = i === idx ? 'scale(1.05)' : 'scale(1)';
    });

    const counter = document.getElementById('gallery-counter');
    if (counter) counter.textContent = `${idx + 1} / ${images.length}`;
  }
}