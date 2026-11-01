// Reviews Component
// Displays ratings and customer reviews with the ability to write new reviews

function createReviews(product) {
  const container = document.getElementById('reviews-section');
  if (!container) return;

  const rating = product.rating || 0;
  const reviewCount = product.review_count || 0;
  const reviews = product.reviews || [];

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function safeMediaUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value, window.location.origin);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  // Generate star rating
  function renderStars(rating, size = '16') {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) {
        stars += `<span style="color:#f97316;font-size:${size}px">★</span>`;
      } else if (i - rating < 1 && i - rating > 0) {
        stars += `<span style="color:#f97316;font-size:${size}px">★</span>`;
      } else {
        stars += `<span style="color:#cbd5e1;font-size:${size}px">★</span>`;
      }
    }
    return stars;
  }

  const html = `
    <div style="padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#fafafa">
      <!-- Rating Summary -->
      <div style="display:flex;align-items:center;justify-content:flex-start;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #e2e8f0">
        <div style="text-align:center">
          <div style="font-size:36px;font-weight:700;color:#1e293b">${rating.toFixed(1)}</div>
          <div style="display:flex;gap:2px">${renderStars(rating, '14')}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px">${reviewCount} reviews</div>
        </div>
      </div>

      <!-- Reviews List -->
      <div>
        <h3 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#1e293b">Customer Reviews</h3>
        <p style="margin:0 0 12px;color:#64748b;font-size:13px">To leave a review you must be a buyer who received this product; use your <a href="../purchase history.html">Purchase History</a> or <a href="../reviews%20ratings.html">My Reviews</a> page.</p>
        
        ${reviews.length > 0 ? `
          ${reviews.slice(0, 5).map(review => {
            const buyerName = [review.firstName, review.lastName].filter(Boolean).join(' ') || 'Anonymous';
            const comment = review.body || review.comment || 'Comment unavailable';
            const reviewDate = new Date(review.createdAt || review.created_at);
            const dateLabel = Number.isNaN(reviewDate.getTime()) ? 'Date unavailable' : reviewDate.toLocaleDateString();
            const media = Array.isArray(review.media) ? review.media : [];
            const replies = Array.isArray(review.replies) ? review.replies : [];
            const mediaHtml = media.map(item => {
              const url = safeMediaUrl(item?.url);
              if (!url) return '';
              const escapedUrl = escapeHtml(url);
              if (item.type === 'video') {
                return `<video controls preload="metadata" src="${escapedUrl}" style="display:block;max-width:100%;max-height:240px;margin-top:10px"></video>`;
              }
              if (item.type === 'image') {
                return `<img src="${escapedUrl}" alt="Review photo" loading="lazy" style="display:block;max-width:100%;max-height:240px;object-fit:contain;margin-top:10px">`;
              }
              return '';
            }).join('');
            const repliesHtml = replies.map(reply => {
              if (!reply || typeof reply.text !== 'string' || !reply.text.trim()) return '';
              const replyDate = reply.createdAt ? new Date(reply.createdAt) : null;
              const replyDateLabel = replyDate && !Number.isNaN(replyDate.getTime())
                ? replyDate.toLocaleDateString()
                : '';

              return `
                <div style="margin-top:12px;padding:10px 12px;border-left:3px solid #f97316;border-radius:6px;background:#fff7ed">
                  <div style="font-size:13px;font-weight:600;color:#9a3412">Seller reply</div>
                  <p style="margin:4px 0 0;font-size:13px;color:#475569;line-height:1.5;white-space:pre-wrap">${escapeHtml(reply.text)}</p>
                  ${replyDateLabel ? `<div style="font-size:12px;color:#94a3b8;margin-top:4px">${escapeHtml(replyDateLabel)}</div>` : ''}
                </div>
              `;
            }).join('');

            return `
            <div style="padding:12px 0;border-bottom:1px solid #e2e8f0">
              <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
                <div style="font-weight:600;color:#334155">${escapeHtml(buyerName)}</div>
                <div style="display:flex;gap:2px;font-size:12px">${renderStars(review.rating || 0, '12')}</div>
              </div>
              <p style="margin:0;font-size:14px;color:#475569;line-height:1.5;white-space:pre-wrap">${escapeHtml(comment)}</p>
              <div style="font-size:12px;color:#94a3b8;margin-top:4px">${escapeHtml(dateLabel)}</div>
              ${mediaHtml}
              ${repliesHtml}
            </div>
          `;}).join('')}
          ${reviewCount > 5 ? `
            <div style="text-align:center;margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0">
              <button id="view-all-reviews-btn" style="
                padding:8px 16px;
                background:#f5f5f5;
                color:#f97316;
                border:1px solid #f97316;
                border-radius:6px;
                font-size:13px;
                font-weight:600;
                cursor:pointer;
                transition:all 0.2s ease;
              ">View All Reviews (${reviewCount})</button>
            </div>
          ` : ''}
        ` : `
          <p style="color:#94a3b8;font-size:14px;text-align:center;padding:20px">No reviews yet. Be the first to review!</p>
        `}
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Setup event listeners
  const writeReviewBtn = document.getElementById('write-review-btn');
  const viewAllReviewsBtn = document.getElementById('view-all-reviews-btn');
  
  if (writeReviewBtn) {
    writeReviewBtn.addEventListener('click', () => openProductReviewModal(product));
    writeReviewBtn.addEventListener('mouseenter', function() {
      this.style.background = '#EA580C';
      this.style.transform = 'translateY(-2px)';
    });
    writeReviewBtn.addEventListener('mouseleave', function() {
      this.style.background = '#f97316';
      this.style.transform = 'translateY(0)';
    });
  }

  if (viewAllReviewsBtn) {
    viewAllReviewsBtn.addEventListener('click', () => {
      // Open reviews page in new tab or navigate
      window.location.href = `../reviews%20ratings.html?product=${product.id}`;
    });
  }
}

// Product-page submissions must use the eligible delivered-order flow in My Reviews.
function openProductReviewModal(product) {
  const productId = product?.id;
  alert('To review this product, use My Reviews. It will show only products from your eligible delivered orders.');
  window.location.href = `reviews%20ratings.html${productId ? `?product=${encodeURIComponent(productId)}` : ''}`;
}
