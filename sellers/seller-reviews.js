(() => {
  const PAGE_SIZE = 100;
  const MAX_PAGES = 1000;
  const state = {
    reviews: [],
    loaded: false,
    loading: false,
    replyingTo: new Set(),
    recentlySaved: new Set()
  };

  const elements = {
    total: document.getElementById('totalReviews'),
    store: document.getElementById('activeStoreName'),
    average: document.getElementById('averageRating'),
    distribution: document.getElementById('ratingDistribution'),
    search: document.getElementById('reviewSearch'),
    product: document.getElementById('productFilter'),
    rating: document.getElementById('ratingFilter'),
    sort: document.getElementById('sortOrder'),
    summary: document.getElementById('resultsSummary'),
    status: document.getElementById('reviewsStatus'),
    list: document.getElementById('reviewsList'),
    empty: document.getElementById('reviewsEmpty'),
    emptyMessage: document.getElementById('emptyMessage'),
    error: document.getElementById('reviewsError'),
    errorMessage: document.getElementById('errorMessage'),
    retry: document.getElementById('retryReviews')
  };

  function showError(message) {
    elements.status.hidden = true;
    elements.empty.hidden = true;
    elements.list.replaceChildren();
    elements.summary.textContent = '';
    clearStatistics();
    elements.errorMessage.textContent = message;
    elements.error.hidden = false;
  }

  function clearStatistics() {
    elements.total.textContent = '—';
    elements.average.textContent = '—';
    elements.distribution.replaceChildren();
  }

  function showLoading() {
    elements.error.hidden = true;
    elements.empty.hidden = true;
    elements.list.replaceChildren();
    elements.summary.textContent = '';
    clearStatistics();
    elements.status.hidden = false;
    elements.status.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>Loading reviews…</span>';
  }

  async function fetchReviews() {
    if (state.loading) return;
    state.loading = true;
    showLoading();

    try {
      if (!window.StoreManager) throw new Error('Seller store services are unavailable. Reload the page and try again.');
      if (!StoreManager.getToken()) {
        window.location.href = 'sellers-login.html';
        return;
      }

      const activeStore = await StoreManager.requireActiveStore();
      if (!activeStore) return;
      elements.store.textContent = activeStore.business_name || 'Active store';

      const reviews = [];
      let page = 1;
      let totalPages = 1;

      do {
        const response = await StoreManager.apiFetch(
          `/reviews/seller/my-reviews?page=${page}&limit=${PAGE_SIZE}`
        );
        if (!response || response.status !== 'success' || !Array.isArray(response.data?.reviews)) {
          throw new Error(response?.message || 'The seller reviews request failed.');
        }

        const pagination = response.data.pagination;
        if (!pagination || !Number.isInteger(Number(pagination.totalPages)) ||
            Number(pagination.totalPages) < 0 || Number(pagination.totalPages) > MAX_PAGES) {
          throw new Error('The review response did not contain valid pagination data.');
        }

        totalPages = Number(pagination.totalPages);
        reviews.push(...response.data.reviews);
        page += 1;
      } while (page <= totalPages);

      const uniqueReviews = new Map();
      for (const review of reviews) {
        if (review && review.id) uniqueReviews.set(String(review.id), review);
      }

      state.reviews = Array.from(uniqueReviews.values());
      state.loaded = true;
      renderProducts();
      renderStatistics();
      renderFilteredReviews();
      elements.error.hidden = true;
      elements.status.hidden = true;
    } catch (error) {
      console.error('Seller reviews load failed:', error);
      showError(error?.message || 'Reviews could not be loaded. Please try again.');
    } finally {
      state.loading = false;
    }
  }

  function renderProducts() {
    const selected = elements.product.value;
    const products = new Map();
    for (const review of state.reviews) {
      if (review.productId && review.productName) {
        products.set(String(review.productId), String(review.productName));
      }
    }

    const options = [new Option('All products', '')];
    for (const [id, name] of Array.from(products.entries()).sort((a, b) => a[1].localeCompare(b[1]))) {
      options.push(new Option(name, id));
    }
    elements.product.replaceChildren(...options);
    if (products.has(selected)) elements.product.value = selected;
  }

  function renderStatistics() {
    const ratings = state.reviews.map(review => Number(review.rating)).filter(rating =>
      Number.isInteger(rating) && rating >= 1 && rating <= 5
    );
    const total = state.reviews.length;
    const average = ratings.length
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : null;

    elements.total.textContent = String(total);
    elements.average.textContent = average === null ? '—' : `${average.toFixed(1)} / 5`;
    const counts = [5, 4, 3, 2, 1].map(star => ({
      star,
      count: ratings.filter(rating => rating === star).length
    }));
    const max = Math.max(1, ...counts.map(item => item.count));
    elements.distribution.replaceChildren(...counts.map(({ star, count }) => {
      const item = document.createElement('div');
      item.className = 'distribution-item';
      const label = document.createElement('span');
      label.textContent = `${star}★ ${count}`;
      const bar = document.createElement('span');
      bar.className = 'bar';
      const fill = document.createElement('span');
      fill.className = 'bar-fill';
      fill.style.display = 'block';
      fill.style.width = `${(count / max) * 100}%`;
      bar.append(fill);
      item.append(label, bar);
      return item;
    }));
  }

  function getFilteredReviews() {
    const search = elements.search.value.trim().toLocaleLowerCase();
    const productId = elements.product.value;
    const rating = elements.rating.value;
    const order = elements.sort.value;

    return state.reviews.filter(review => {
      if (productId && String(review.productId) !== productId) return false;
      if (rating && Number(review.rating) !== Number(rating)) return false;
      if (search) {
        const productName = String(review.productName || '').toLocaleLowerCase();
        const comment = String(review.comment || '').toLocaleLowerCase();
        if (!productName.includes(search) && !comment.includes(search)) return false;
      }
      return true;
    }).sort((a, b) => {
      const aTime = Date.parse(a.createdAt) || 0;
      const bTime = Date.parse(b.createdAt) || 0;
      return order === 'oldest' ? aTime - bTime : bTime - aTime;
    });
  }

  function appendImage(container, url, alt, className) {
    const safeUrl = safeMediaUrl(url);
    if (!safeUrl) return;
    const image = document.createElement('img');
    image.className = className;
    image.src = safeUrl;
    image.alt = alt;
    image.loading = 'lazy';
    image.addEventListener('error', () => image.remove(), { once: true });
    container.append(image);
  }

  function safeMediaUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value, window.location.href);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function makeRating(ratingValue) {
    const rating = Number(ratingValue);
    const wrapper = document.createElement('div');
    wrapper.className = 'rating';
    wrapper.setAttribute('aria-label', `${Number.isFinite(rating) ? rating : 0} out of 5 stars`);
    for (let star = 1; star <= 5; star += 1) {
      const icon = document.createElement('i');
      icon.className = `${star <= rating ? 'fas filled' : 'far'} fa-star`;
      icon.setAttribute('aria-hidden', 'true');
      wrapper.append(icon);
    }
    const value = document.createElement('span');
    value.className = 'rating-value';
    value.textContent = Number.isFinite(rating) ? `${rating}/5` : 'Rating unavailable';
    wrapper.append(value);
    return wrapper;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function makeReviewCard(review) {
    const card = document.createElement('article');
    card.className = 'review-card';
    const top = document.createElement('div');
    top.className = 'review-top';
    const productInfo = document.createElement('div');
    productInfo.className = 'product-info';

    const imageUrl = safeMediaUrl(review.productImage);
    if (imageUrl) {
      const productImage = document.createElement('img');
      productImage.className = 'product-image';
      productImage.src = imageUrl;
      productImage.alt = '';
      productImage.loading = 'lazy';
      productImage.addEventListener('error', () => {
        productImage.replaceWith(createProductPlaceholder());
      }, { once: true });
      productInfo.append(productImage);
    } else {
      productInfo.append(createProductPlaceholder());
    }

    const productDetails = document.createElement('div');
    productDetails.className = 'product-details';
    const productName = document.createElement('h2');
    productName.className = 'product-name';
    productName.textContent = review.productName || 'Product unavailable';
    const buyerAndDate = document.createElement('p');
    buyerAndDate.className = 'review-meta';
    const buyer = document.createElement('span');
    buyer.textContent = review.buyerName || 'Buyer';
    const separator = document.createTextNode(' · ');
    const date = document.createElement('time');
    date.dateTime = review.createdAt || '';
    date.textContent = formatDate(review.createdAt);
    buyerAndDate.append(buyer, separator, date);
    productDetails.append(productName, buyerAndDate);
    productInfo.append(productDetails);
    top.append(productInfo, makeRating(review.rating));
    card.append(top);

    const comment = document.createElement('p');
    comment.className = 'review-comment';
    comment.textContent = review.comment || 'No comment provided.';
    card.append(comment);

    if (Array.isArray(review.media) && review.media.length) {
      const mediaContainer = document.createElement('div');
      mediaContainer.className = 'review-media';
      mediaContainer.setAttribute('aria-label', 'Review media');
      review.media.forEach(media => {
        const url = safeMediaUrl(media?.url);
        if (!url) return;
        if (media.type === 'video') {
          const video = document.createElement('video');
          video.src = url;
          video.controls = true;
          video.preload = 'none';
          video.setAttribute('aria-label', 'Review video');
          mediaContainer.append(video);
        } else if (media.type === 'image') {
          appendImage(mediaContainer, url, 'Image attached to review', '');
        }
      });
      if (mediaContainer.childElementCount) card.append(mediaContainer);
    }

    if (Array.isArray(review.replies) && review.replies.length) {
      review.replies.forEach(reply => {
        const replyBlock = document.createElement('section');
        replyBlock.className = 'existing-reply';
        const heading = document.createElement('strong');
        heading.textContent = 'Seller reply';
        const replyText = document.createElement('p');
        replyText.textContent = reply.text || '';
        replyBlock.append(heading, replyText);
        if (reply.createdAt) {
          const replyDate = document.createElement('time');
          replyDate.dateTime = reply.createdAt;
          replyDate.textContent = formatDate(reply.createdAt);
          replyBlock.append(replyDate);
        }
        card.append(replyBlock);
      });

      if (state.recentlySaved.has(String(review.id))) {
        const confirmation = document.createElement('p');
        confirmation.className = 'reply-feedback reply-success';
        confirmation.setAttribute('role', 'status');
        confirmation.textContent = 'Reply saved successfully.';
        card.append(confirmation);
      }
    } else {
      const replyActions = document.createElement('div');
      replyActions.className = 'reply-actions';
      const replyButton = document.createElement('button');
      replyButton.type = 'button';
      replyButton.className = 'reply-open-button';
      replyButton.textContent = 'Reply';
      replyButton.setAttribute('aria-expanded', 'false');

      const form = document.createElement('form');
      form.className = 'reply-form';
      form.hidden = true;
      form.noValidate = true;
      const label = document.createElement('label');
      label.className = 'reply-label';
      label.textContent = 'Your reply';
      const textArea = document.createElement('textarea');
      textArea.rows = 4;
      textArea.maxLength = 1000;
      textArea.required = true;
      textArea.placeholder = 'Write a reply (1–500 characters)';
      const counter = document.createElement('span');
      counter.className = 'reply-counter';
      counter.textContent = '0 / 500';
      label.append(textArea);
      const feedback = document.createElement('p');
      feedback.className = 'reply-feedback';
      feedback.setAttribute('role', 'status');
      feedback.setAttribute('aria-live', 'polite');
      const buttons = document.createElement('div');
      buttons.className = 'reply-form-buttons';
      const submit = document.createElement('button');
      submit.type = 'submit';
      submit.className = 'reply-submit-button';
      submit.textContent = 'Submit reply';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'reply-cancel-button';
      cancel.textContent = 'Cancel';
      buttons.append(submit, cancel);
      form.append(label, counter, feedback, buttons);
      replyActions.append(replyButton, form);
      card.append(replyActions);

      replyButton.addEventListener('click', () => {
        form.hidden = false;
        replyButton.hidden = true;
        replyButton.setAttribute('aria-expanded', 'true');
        textArea.focus();
      });
      cancel.addEventListener('click', () => {
        form.reset();
        feedback.textContent = '';
        form.hidden = true;
        replyButton.hidden = false;
        replyButton.setAttribute('aria-expanded', 'false');
      });
      textArea.addEventListener('input', () => {
        counter.textContent = `${Array.from(textArea.value).length} / 500`;
      });
      form.addEventListener('submit', event => {
        event.preventDefault();
        submitSellerReply(review, textArea, submit, cancel, feedback);
      });
    }

    return card;
  }

  async function submitSellerReply(review, textArea, submitButton, cancelButton, feedback) {
    const reviewKey = String(review.id);
    if (state.replyingTo.has(reviewKey)) return;

    const replyText = textArea.value.trim();
    const replyLength = Array.from(replyText).length;
    if (replyLength < 1 || replyLength > 500) {
      feedback.className = 'reply-feedback reply-error';
      feedback.textContent = 'Enter a reply between 1 and 500 characters.';
      return;
    }

    state.replyingTo.add(reviewKey);
    textArea.disabled = true;
    submitButton.disabled = true;
    cancelButton.disabled = true;
    feedback.className = 'reply-feedback';
    feedback.textContent = 'Submitting reply…';

    try {
      const response = await StoreManager.apiFetch(
        `/reviews/seller/my-reviews/${encodeURIComponent(reviewKey)}/replies`,
        {
          method: 'POST',
          body: JSON.stringify({ reply_text: replyText })
        }
      );
      const savedReply = response?.data?.reply;
      if (response?.status !== 'success' || !savedReply ||
          typeof savedReply.text !== 'string' || !savedReply.text.trim()) {
        throw new Error(response?.message || 'The reply could not be saved.');
      }

      const currentReview = state.reviews.find(item => String(item.id) === reviewKey);
      if (!currentReview) throw new Error('The review is no longer available. Reload the page and try again.');
      if (!Array.isArray(currentReview.replies)) currentReview.replies = [];
      if (!currentReview.replies.some(item => item.id && item.id === savedReply.id)) {
        currentReview.replies.push(savedReply);
      }
      state.recentlySaved.add(reviewKey);
      renderFilteredReviews();
    } catch (error) {
      console.error('Seller review reply failed:', error);
      feedback.className = 'reply-feedback reply-error';
      feedback.textContent = error?.message || 'Reply could not be saved. Please try again.';
      textArea.disabled = false;
      submitButton.disabled = false;
      cancelButton.disabled = false;
    } finally {
      state.replyingTo.delete(reviewKey);
    }
  }

  function createProductPlaceholder() {
    const placeholder = document.createElement('span');
    placeholder.className = 'product-image-placeholder';
    const icon = document.createElement('i');
    icon.className = 'fas fa-image';
    icon.setAttribute('aria-hidden', 'true');
    placeholder.append(icon);
    return placeholder;
  }

  function renderFilteredReviews() {
    if (!state.loaded) return;
    const reviews = getFilteredReviews();
    elements.error.hidden = true;
    elements.status.hidden = true;
    elements.list.replaceChildren(...reviews.map(makeReviewCard));
    elements.summary.textContent = `${reviews.length} of ${state.reviews.length} reviews`;

    if (!reviews.length) {
      elements.emptyMessage.textContent = state.reviews.length
        ? 'No reviews match these search and filter settings.'
        : 'There are no visible reviews for this store yet.';
      elements.empty.hidden = false;
    } else {
      elements.empty.hidden = true;
    }
  }

  [elements.search, elements.product, elements.rating, elements.sort].forEach(control => {
    control.addEventListener('input', renderFilteredReviews);
    control.addEventListener('change', renderFilteredReviews);
  });
  elements.retry.addEventListener('click', fetchReviews);

  window.addEventListener('storeChanged', fetchReviews);
  fetchReviews();
})();
