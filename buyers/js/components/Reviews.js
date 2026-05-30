// Reviews Component
// Displays ratings and customer reviews with the ability to write new reviews

function createReviews(product) {
  const container = document.getElementById('reviews-section');
  if (!container) return;

  const rating = product.rating || 0;
  const reviewCount = product.review_count || 0;
  const reviews = product.reviews || [];

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
          ${reviews.slice(0, 5).map((review, idx) => `
            <div style="padding:12px 0;border-bottom:1px solid #e2e8f0">
              <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
                <div style="font-weight:600;color:#334155">${[review.firstName, review.lastName].filter(Boolean).join(' ') || 'Anonymous'}</div>
                <div style="display:flex;gap:2px;font-size:12px">${renderStars(review.rating || 0, '12')}</div>
              </div>
              <p style="margin:0;font-size:14px;color:#475569;line-height:1.5">${review.body || review.comment || 'Good product'}</p>
              <div style="font-size:12px;color:#94a3b8;margin-top:4px">${new Date(review.createdAt || review.created_at).toLocaleDateString()}</div>
            </div>
          `).join('')}
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

// Open review modal for product
function openProductReviewModal(product, options = {}) {
  // Only allow reviews when the user is authenticated (buyers via purchase history or My Reviews)
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please log in to leave a review. Reviews can be left from your Purchase History.');
    window.location.href = 'login for buyers.html';
    return;
  }

  const isLoggedIn = true; // since token exists
  const orderId = options.orderId || null;

  // Create and show modal
  let modal = document.getElementById('product-review-modal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'product-review-modal';
    modal.style.cssText = `
      display: none;
      position: fixed;
      z-index: 2000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      align-items: center;
      justify-content: center;
    `;
    document.body.appendChild(modal);
  }

  // Build modal content (no guest/anonymous input - only logged-in buyers)
  const modalContent = `
    <div style="
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 600px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      animation: slideUp 0.3s ease;
    ">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2 style="margin:0;font-size:24px;font-weight:700">Write a Review</h2>
        <button onclick="closeProductReviewModal()" style="
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #666;
        ">&times;</button>
      </div>

      <p style="margin:0 0 16px;color:#666;font-size:14px">Product: <strong>${product.name}</strong></p>

      <form id="product-review-form" style="display:flex;flex-direction:column;gap:16px">
        <!-- Star Rating -->
        <div>
          <label style="display:block;margin-bottom:8px;font-weight:600;font-size:14px">Rating *</label>
          <div id="star-rating-input" style="display:flex;gap:8px">
            <button type="button" data-rating="1" style="background:none;border:none;font-size:32px;color:#ddd;cursor:pointer;padding:0">★</button>
            <button type="button" data-rating="2" style="background:none;border:none;font-size:32px;color:#ddd;cursor:pointer;padding:0">★</button>
            <button type="button" data-rating="3" style="background:none;border:none;font-size:32px;color:#ddd;cursor:pointer;padding:0">★</button>
            <button type="button" data-rating="4" style="background:none;border:none;font-size:32px;color:#ddd;cursor:pointer;padding:0">★</button>
            <button type="button" data-rating="5" style="background:none;border:none;font-size:32px;color:#ddd;cursor:pointer;padding:0">★</button>
          </div>
          <input type="hidden" id="product-review-rating" required>
        </div>

        <!-- Review Text -->
        <div>
          <label style="display:block;margin-bottom:8px;font-weight:600;font-size:14px">Your Review *</label>
          <textarea id="product-review-body" style="
            width:100%;
            min-height:120px;
            padding:10px;
            border:1px solid #ddd;
            border-radius:8px;
            font-family:inherit;
            font-size:14px;
            resize:vertical;
          " placeholder="Share your experience with this product..." required></textarea>
          <div style="font-size:12px;color:#999;margin-top:4px">4-1200 characters required</div>
        </div>

        <!-- Buttons -->
        <div style="display:flex;gap:10px;margin-top:12px">
          <button type="submit" id="product-review-submit" style="
            flex:1;
            padding:12px;
            background:#f97316;
            color:#fff;
            border:none;
            border-radius:8px;
            font-size:14px;
            font-weight:600;
            cursor:pointer;
            transition:all 0.2s ease;
          ">Submit Review</button>
          <button type="button" onclick="closeProductReviewModal()" style="
            flex:1;
            padding:12px;
            background:#f5f5f5;
            color:#333;
            border:none;
            border-radius:8px;
            font-size:14px;
            font-weight:600;
            cursor:pointer;
            transition:all 0.2s ease;
          ">Cancel</button>
        </div>
      </form>
    </div>
  `;

  modal.innerHTML = modalContent;
  modal.style.display = 'flex';

  // Setup star rating interactivity
  const starButtons = modal.querySelectorAll('#star-rating-input button');
  const ratingInput = modal.querySelector('#product-review-rating');
  let currentRating = 0;

  starButtons.forEach((btn, index) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      currentRating = parseInt(btn.dataset.rating);
      ratingInput.value = currentRating;
      starButtons.forEach((b, i) => {
        b.style.color = i < currentRating ? '#f97316' : '#ddd';
      });
    });

    btn.addEventListener('mouseenter', () => {
      const hoverRating = parseInt(btn.dataset.rating);
      starButtons.forEach((b, i) => {
        b.style.color = i < hoverRating ? '#f97316' : '#ddd';
      });
    });
  });

  modal.addEventListener('mouseleave', () => {
    starButtons.forEach((b, i) => {
      b.style.color = i < currentRating ? '#f97316' : '#ddd';
    });
  });

  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeProductReviewModal();
    }
  });

  // Setup form submission
  const form = modal.querySelector('#product-review-form');
  const submitBtn = modal.querySelector('#product-review-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rating = parseInt(ratingInput.value);
    const body = modal.querySelector('#product-review-body').value.trim();

    // Validation
    if (!rating) {
      alert('Please select a rating');
      return;
    }
    if (body.length < 4) {
      alert('Review must be at least 4 characters');
      return;
    }
    if (body.length > 1200) {
      alert('Review must be less than 1200 characters');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
      const token = localStorage.getItem('token');

      // Determine API base URL
      let API_BASE_URL = 'https://marketmix-backend.onrender.com/api';

      // Validate product ID exists
      if (!product.id) {
        throw new Error('Product ID is missing. Cannot submit review.');
      }

      // Build payload
      const payload = {
        review_type: 'product',
        product_id: String(product.id),
        rating: rating,
        body: body
      };

      // Include order id if available (ensures review ties to a delivered order)
      if (orderId) payload.order_id = String(orderId);

      console.log('Submitting review to:', `${API_BASE_URL}/reviews`);
      console.log('Final payload:', payload);

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // token is required by design for purchase-history-based reviews
      };

      const response = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok && data.status === 'success') {
        alert('Review submitted successfully!');
        closeProductReviewModal();
        // Reload product to show new review
        location.reload();
      } else {
        const errorMsg = data.message || data.error || 'Failed to submit review';
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      console.error('Error details:', error.stack);
      
      // Show detailed error to user
      let userMessage = error.message;
      if (error.message.includes('Failed to fetch')) {
        userMessage = 'Network error - could not reach server. Check your internet connection.';
      }
      alert(userMessage || 'Failed to submit review');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Submit Review';
    }
  });
}

function closeProductReviewModal() {
  const modal = document.getElementById('product-review-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}
