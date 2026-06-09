(function () {
  'use strict';

  const API_BASE = 'https://marketmix-backend.onrender.com/api';
  const SESSION_KEY = 'marketmix_checkout_session_id';
  const LEGACY_SESSION_KEY = 'checkoutSessionId';
  const FALLBACK_IMAGE = 'marketplace.png';

  const state = {
    sessionId: sessionStorage.getItem(SESSION_KEY) || sessionStorage.getItem(LEGACY_SESSION_KEY) || null,
    currentStep: 0,
    session: null,
    items: [],
    addresses: [],
    deliveryOptions: [],
    paymentMethods: [],
    selectedAddressId: null,
    selectedDelivery: null,
    selectedPayment: null,
    expiryTimer: null
  };

  const els = {};

  document.addEventListener('DOMContentLoaded', initCheckout);

  async function initCheckout() {
    cacheElements();
    bindEvents();
    initNotifications();
    try {
      setGlobalMessage('', '');
      await ensureSession();
      renderAll();
      startExpiryCountdown();
    } catch (error) {
      setGlobalMessage(error.message || 'We could not start checkout. Please try again.', 'error');
      renderEmptySummary();
    }
  }

  function cacheElements() {
    els.steps = Array.from(document.querySelectorAll('[data-step]'));
    els.progress = Array.from(document.querySelectorAll('[data-progress-step]'));
    els.globalMessage = document.getElementById('globalMessage');
    els.orderItems = document.getElementById('orderItems');
    els.summaryItems = document.getElementById('summaryItems');
    els.subtotalAmount = document.getElementById('subtotalAmount');
    els.shippingAmount = document.getElementById('shippingAmount');
    els.discountAmount = document.getElementById('discountAmount');
    els.totalAmount = document.getElementById('totalAmount');
    els.summaryToggleTotal = document.getElementById('summaryToggleTotal');
    els.couponCode = document.getElementById('couponCode');
    els.applyCouponBtn = document.getElementById('applyCouponBtn');
    els.removeCouponBtn = document.getElementById('removeCouponBtn');
    els.couponMessage = document.getElementById('couponMessage');
    els.addressList = document.getElementById('addressList');
    els.addressForm = document.getElementById('addressForm');
    els.toggleAddressForm = document.getElementById('toggleAddressForm');
    els.addressMessage = document.getElementById('addressMessage');
    els.saveAddressBtn = document.getElementById('saveAddressBtn');
    els.deliveryOptions = document.getElementById('deliveryOptions');
    els.deliveryMessage = document.getElementById('deliveryMessage');
    els.paymentOptions = document.getElementById('paymentOptions');
    els.paymentMessage = document.getElementById('paymentMessage');
    els.placeOrderBtn = document.getElementById('placeOrderBtn');
    els.confirmationPanel = document.getElementById('confirmationPanel');
    els.confirmationText = document.getElementById('confirmationText');
    els.expiryPill = document.getElementById('expiryPill');
    els.expiryCountdown = document.getElementById('expiryCountdown');
    els.summaryPanel = document.getElementById('summaryPanel');
    els.summaryToggle = document.getElementById('summaryToggle');
  }

  function bindEvents() {
    document.querySelectorAll('[data-next-step]').forEach((button) => {
      button.addEventListener('click', () => goNext());
    });
    document.querySelectorAll('[data-prev-step]').forEach((button) => {
      button.addEventListener('click', () => setStep(Math.max(0, state.currentStep - 1)));
    });
    els.applyCouponBtn.addEventListener('click', applyCoupon);
    els.removeCouponBtn.addEventListener('click', removeCoupon);
    els.couponCode.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); applyCoupon(); }
    });
    els.toggleAddressForm.addEventListener('click', () => {
      els.addressForm.hidden = !els.addressForm.hidden;
    });
    els.addressForm.addEventListener('submit', handleAddressSubmit);
    els.placeOrderBtn.addEventListener('click', placeOrder);
    els.summaryToggle.addEventListener('click', () => els.summaryPanel.classList.toggle('open'));
    window.addEventListener('pageshow', handlePaymentReturn);
  }

  async function ensureSession() {
    if (state.sessionId) {
      try {
        await loadSession(state.sessionId);
        return;
      } catch (error) {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(LEGACY_SESSION_KEY);
        state.sessionId = null;
      }
    }
    await createSession();
  }

  async function createSession() {
    const payload = buildCartPayload();
    const data = await api('/checkout/session', { method: 'POST', body: JSON.stringify(payload) });
    absorbSessionPayload(data);
  }

  async function loadSession(sessionId) {
    const data = await api(`/checkout/session/${encodeURIComponent(sessionId)}`);
    absorbSessionPayload(data);
  }

  function absorbSessionPayload(data) {
  // Handle wrapped response: {status, message, data: {addressId, address, nextStep}}
  // vs session response: {session: {...}} or {data: {session: {...}}}
  const inner = data.data || data;
  const session = inner.session || data.session || data.checkoutSession || (inner.id ? inner : null);
  const items = data.items || data.data?.items || session?.items || [];

  if (!session || !session.id) {
    // Non-session responses (address set, coupon applied etc) - just update selectedAddressId if present
    if (inner.addressId || inner.address_id) {
      state.selectedAddressId = inner.addressId || inner.address_id;
    }

    // If the response contains updated session totals or coupon fields but no full session object,
    // merge them into the current session so renderSummary() reflects the new total.
    if (state.session && (inner.total !== undefined || inner.subtotal !== undefined || inner.couponDiscount !== undefined || inner.coupon_discount !== undefined || inner.couponCode !== undefined || inner.coupon_code !== undefined || inner.shippingFee !== undefined || inner.shipping_fee !== undefined)) {
      state.session = {
        ...state.session,
        ...inner,
        coupon_code: inner.coupon_code ?? inner.couponCode ?? state.session.coupon_code,
        couponDiscount: inner.couponDiscount ?? inner.coupon_discount ?? state.session.couponDiscount,
        shipping_fee: inner.shipping_fee ?? inner.shippingFee ?? state.session.shipping_fee,
        subtotal: inner.subtotal ?? state.session.subtotal,
        total: inner.total ?? state.session.total
      };
      if (Array.isArray(items) && items.length) {
        state.items = items;
      }
    }

    return; // don't throw, just return
  }

  state.session = session;
  state.sessionId = session.id;
  state.items = Array.isArray(items) ? items : [];
  state.selectedAddressId = session.address_id || session.addressId || state.selectedAddressId;
  state.selectedPayment = session.paymentMethod || session.payment_method || state.selectedPayment;

  if (session.deliveryMethod || session.delivery_method) {
    state.selectedDelivery = {
      id: session.deliveryMethod || session.delivery_method,
      method: session.deliveryMethod || session.delivery_method,
      provider: session.deliveryProvider || session.delivery_provider,
      fee: readMoney(session.shippingFee || session.shipping_fee)
    };
  }

  sessionStorage.setItem(SESSION_KEY, state.sessionId);
  sessionStorage.setItem(LEGACY_SESSION_KEY, state.sessionId);
}

  function buildCartPayload() {
    const cart = safeJson(localStorage.getItem('cart'), []);
    const items = Array.isArray(cart) ? cart.map((item) => ({
      product_id: item.product_id || item.productId || item.id,
      seller_id: item.seller_id || item.sellerId || item.seller?.id,
      quantity: Number(item.quantity || 1),
      price: Number(item.price || item.unitPrice || 0),
      name: item.name || item.title || 'Product',
      image: item.image || item.main_image_url || item.imageUrl || ''
    })).filter((item) => item.product_id) : [];
    return items.length ? { items } : {};
  }

  async function api(path, options) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Please log in to continue checkout.');

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader(token),
        ...(options && options.headers ? options.headers : {})
      }
    });

    const text = await response.text();
    const data = text ? safeJson(text, null) : {};

    if (!response.ok) {
      const message = data?.message || data?.error || `Request failed with status ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data || {};
  }

  function renderAll() {
    renderItems();
    renderSummary();
    renderProgress();
    hydrateStepData(state.currentStep);
  }

  function renderItems() {
    if (!state.items.length) {
      els.orderItems.innerHTML = '<p class="muted">No items were found in this checkout session.</p>';
      return;
    }
    els.orderItems.innerHTML = state.items.map((item) => `
      <div class="checkout-item">
        <img src="${escapeAttr(item.image || FALLBACK_IMAGE)}" alt="${escapeAttr(item.name || 'Product')}" onerror="this.src='${FALLBACK_IMAGE}'">
        <div>
          <p class="item-name">${escapeHtml(item.name || 'Product')}</p>
          <p class="item-meta">Qty ${Number(item.quantity || 1)} x ${formatMoney(item.price)}</p>
        </div>
        <strong class="item-price">${formatMoney(Number(item.price || 0) * Number(item.quantity || 1))}</strong>
      </div>
    `).join('');
  }

  function renderSummary() {
    const session = state.session || {};
    const subtotal = readMoney(session.subtotal, calcItemsSubtotal());
    const shipping = readMoney(session.shippingFee ?? session.shipping_fee);
    const discount = readMoney(session.couponDiscount ?? session.coupon_discount);
    const total = readMoney(session.total, Math.max(0, subtotal + shipping - discount));

    els.summaryItems.innerHTML = state.items.length ? state.items.map((item) => `
      <div class="summary-item">
        <img src="${escapeAttr(item.image || FALLBACK_IMAGE)}" alt="${escapeAttr(item.name || 'Product')}" onerror="this.src='${FALLBACK_IMAGE}'">
        <div>
          <p>${escapeHtml(item.name || 'Product')}</p>
          <span>Qty ${Number(item.quantity || 1)}</span>
        </div>
        <strong>${formatMoney(Number(item.price || 0) * Number(item.quantity || 1))}</strong>
      </div>
    `).join('') : '<p class="muted">Your order summary will appear here.</p>';

    els.subtotalAmount.textContent = formatMoney(subtotal);
    els.shippingAmount.textContent = formatMoney(shipping);
    els.discountAmount.textContent = `-${formatMoney(discount)}`;
    els.totalAmount.textContent = formatMoney(total);
    els.summaryToggleTotal.textContent = formatMoney(total);
    els.couponCode.value = session.couponCode || session.coupon_code || els.couponCode.value || '';
    els.removeCouponBtn.hidden = !(session.couponCode || session.coupon_code);
  }

  function renderEmptySummary() {
    els.summaryItems.innerHTML = '<p class="muted">Checkout is unavailable right now.</p>';
    els.orderItems.innerHTML = '<p class="muted">Checkout is unavailable right now.</p>';
    ['subtotalAmount', 'shippingAmount', 'totalAmount', 'summaryToggleTotal'].forEach((key) => {
      els[key].textContent = formatMoney(0);
    });
    els.discountAmount.textContent = `-${formatMoney(0)}`;
  }

  // FIX: proper goNext with session fallback check
  async function goNext() {
    if (state.currentStep === 1) {
      const hasAddress = state.selectedAddressId ||
                         state.session?.addressId ||
                         state.session?.address_id;
      console.log('goNext step 1 - hasAddress:', hasAddress, 'state.selectedAddressId:', state.selectedAddressId, 'session:', state.session);
      if (!hasAddress) {
        setInlineMessage(els.addressMessage, 'Choose or add a delivery address first.', 'error');
        return;
      }
    }

    if (state.currentStep === 2 && !state.selectedDelivery) {
      setInlineMessage(els.deliveryMessage, 'Choose a delivery method to continue.', 'error');
      return;
    }

    const nextStep = Math.min(3, state.currentStep + 1);
    setStep(nextStep);
    await hydrateStepData(nextStep);
  }

  function setStep(step) {
    state.currentStep = step;
    els.steps.forEach((panel) => panel.classList.toggle('active', Number(panel.dataset.step) === step));
    renderProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderProgress() {
    els.progress.forEach((item) => {
      const index = Number(item.dataset.progressStep);
      item.classList.toggle('active', index === state.currentStep);
      item.classList.toggle('complete', index < state.currentStep);
    });
  }

  async function hydrateStepData(step) {
    try {
      if (step === 1 && !state.addresses.length) await loadAddresses();
      if (step === 2) await loadDeliveryOptions();
      if (step === 3 && !state.paymentMethods.length) await loadPaymentMethods();
    } catch (error) {
      setGlobalMessage(error.message || 'Something went wrong loading this step.', 'error');
    }
  }

  async function applyCoupon() {
    const code = els.couponCode.value.trim();
    if (!code) { setInlineMessage(els.couponMessage, 'Enter a coupon code first.', 'error'); return; }
    setButtonLoading(els.applyCouponBtn, true);
    try {
      const data = await api(`/checkout/session/${state.sessionId}/coupon`, {
        method: 'POST', body: JSON.stringify({ code })
      });
      console.log('applyCoupon response:', data);
      absorbSessionPayload(data);
      renderSummary();
      setInlineMessage(els.couponMessage, 'Coupon applied successfully.', 'success');
      await notifyCouponApplied(code);
    } catch (error) {
      setInlineMessage(els.couponMessage, error.message || 'Could not apply coupon.', 'error');
    } finally {
      setButtonLoading(els.applyCouponBtn, false);
    }
  }

  async function removeCoupon() {
    setButtonLoading(els.removeCouponBtn, true);
    try {
      const data = await api(`/checkout/session/${state.sessionId}/coupon`, { method: 'DELETE' });
      absorbSessionPayload(data);
      els.couponCode.value = '';
      renderSummary();
      setInlineMessage(els.couponMessage, 'Coupon removed.', 'success');
    } catch (error) {
      setInlineMessage(els.couponMessage, error.message || 'Could not remove coupon.', 'error');
    } finally {
      setButtonLoading(els.removeCouponBtn, false);
    }
  }

  async function loadAddresses() {
    els.addressList.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div>';
    const data = await api('/checkout/addresses');
    state.addresses = data.addresses || data.data?.addresses || data.data || [];
    renderAddresses();
  }

  function renderAddresses() {
    if (!state.addresses.length) {
      els.addressList.innerHTML = '<p class="muted">No saved addresses yet. Add one below to continue.</p>';
      els.addressForm.hidden = false;
      return;
    }

    els.addressList.innerHTML = state.addresses.map((address) => {
      const id = getAddressId(address);
      const selected = String(id) === String(state.selectedAddressId);
      return `
        <button type="button" class="address-card ${selected ? 'selected' : ''}" data-address-id="${escapeAttr(id)}">
          <span class="radio-dot"></span>
          <div>
            <strong>${escapeHtml(address.fullName || address.full_name || address.name || 'Delivery address')}</strong>
            <p class="muted">${escapeHtml(formatAddress(address))}</p>
            <p class="muted">${escapeHtml(address.phone || '')}</p>
          </div>
        </button>
      `;
    }).join('');

    els.addressList.querySelectorAll('[data-address-id]').forEach((card) => {
      card.addEventListener('click', () => attachAddress(card.dataset.addressId));
    });
  }

  // FIX: single clean attachAddress, no duplicates
  async function attachAddress(addressId, addressPayload) {
  console.log('attachAddress called - addressId:', addressId, 'payload:', addressPayload);
  setInlineMessage(els.addressMessage, '', '');
  const previousAddressId = state.selectedAddressId;
  const confirmedId = addressId;

  if (addressId) {
    state.selectedAddressId = addressId;
    renderAddresses();
  }

  try {
    const data = await attachAddressToSession(addressId, addressPayload);
    console.log('attachAddressToSession response:', data);
    absorbSessionPayload(data);
    
    // Reload session to get updated address_id on session object
    await loadSession(state.sessionId);
    
    state.selectedAddressId = confirmedId;
    renderAddresses();
    renderSummary();
    setInlineMessage(els.addressMessage, 'Delivery address selected.', 'success');
  } catch (error) {
    console.error('attachAddress failed:', error.message, error.data);
    state.selectedAddressId = previousAddressId;
    renderAddresses();
    setInlineMessage(els.addressMessage, error.message || 'Could not attach address.', 'error');
  }
}

  // FIX: debug logs added
  async function attachAddressToSession(addressId, addressPayload) {
    const attempts = buildSessionAddressPayloads(addressId, addressPayload);
    console.log('attachAddressToSession - attempts:', JSON.stringify(attempts));
    let lastError = null;

    for (const body of attempts) {
      try {
        console.log('Trying payload:', JSON.stringify(body));
        const result = await api(`/checkout/session/${state.sessionId}/address`, {
          method: 'POST',
          body: JSON.stringify(body)
        });
        console.log('Success response:', result);
        return result;
      } catch (error) {
        console.log('Attempt failed:', error.message, 'status:', error.status, 'data:', error.data);
        lastError = error;
        if (error.status !== 400) break;
      }
    }

    throw lastError || new Error('Could not attach address.');
  }

  function buildSessionAddressPayloads(addressId, addressPayload) {
    if (addressPayload) {
      const address = addressPayload.address || addressPayload;
      return [
        { address: toSnakeAddress(address) },
        toSnakeAddress(address)
      ].map(stripEmptyDeep);
    }

    return [
      { address_id: addressId }
    ].filter((body) => addressId && Object.values(body).every(Boolean));
  }

  async function handleAddressSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    setButtonLoading(els.saveAddressBtn, true);

    const payload = {
      fullName: formData.get('fullName'),
      phone: formData.get('phone'),
      addressLine1: formData.get('addressLine1'),
      addressLine2: formData.get('addressLine2') || null,
      city: formData.get('city'),
      state: formData.get('state'),
      country: formData.get('country') || 'Nigeria',
      postalCode: formData.get('postalCode') || null,
      deliveryInstructions: formData.get('deliveryInstructions') || null,
      saveAddress: formData.get('saveAddress') === 'on',
    };

    try {
      let savedAddress = false;
      if (payload.saveAddress) {
        const created = await createAddress(payload);
        const address = created.address || created.data?.address || created.data || created;
        const createdAddressId = getAddressId(address || {});
        if (address && createdAddressId) {
          savedAddress = true;
          state.addresses.unshift(address);
          state.selectedAddressId = createdAddressId;
          renderAddresses();
          await attachAddress(createdAddressId);
        } else {
          await attachAddress(null, { address: stripEmpty(payload) });
        }
      } else {
        await attachAddress(null, { address: stripEmpty(payload) });
      }
      await notifyAddressAdded(savedAddress);
      els.addressForm.reset();
      els.addressForm.hidden = true;
      renderAddresses();
    } catch (error) {
      console.log('handleAddressSubmit error:', error.data, error.status);
      setInlineMessage(els.addressMessage, error.message || 'Could not save address.', 'error');
    } finally {
      setButtonLoading(els.saveAddressBtn, false);
    }
  }

  async function createAddress(payload) {
    return api('/checkout/addresses', {
      method: 'POST',
      body: JSON.stringify(toSnakeAddress(payload))
    });
  }

  function toSnakeAddress(payload) {
    return stripEmpty({
      full_name: payload.fullName || payload.full_name || payload.name,
      phone: payload.phone,
      address_line1: payload.addressLine1 || payload.address_line1 || payload.line1,
      address_line2: payload.addressLine2 || payload.address_line2 || payload.line2,
      city: payload.city,
      state: payload.state,
      country: payload.country,
      postal_code: payload.postalCode || payload.postal_code,
      delivery_instructions: payload.deliveryInstructions || payload.delivery_instructions || payload.instructions
    });
  }

  async function loadDeliveryOptions() {
    els.deliveryOptions.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div>';
    const data = await api(`/checkout/session/${state.sessionId}/delivery/options`);
    console.log('Delivery response:', JSON.stringify(data));
    const rawOptions = data.options || data.deliveryOptions || data.data?.options || data.data?.all || data.data || [];
    state.deliveryOptions = normalizeDeliveryOptions(rawOptions);
    renderDeliveryOptions();
  }

  function normalizeDeliveryOptions(options) {
  const list = Array.isArray(options) ? options : [];
  if (!list.length) { /* fallback defaults unchanged */ }
  
  return list.map((option, index) => {
    const id = option.providerId || option.id || option.method || `delivery-${index}`;
    const provider = option.provider || option.providerId || '';
    const name = option.providerLabel || option.title || option.name || labelFromMethod(id);
    
    return {
      id,
      method:      option.provider || option.method || id,
      provider,
      title:       name,
      name,
      icon:        'fa-truck',
      description: option.estimatedDays || option.description || '',
      fee:         readMoney(option.totalFee ?? option.fee ?? 0),
      estimatedDays:     option.estimatedDays || option.estimated_days,
      estimatedDelivery: option.estimatedDelivery || option.estimated_delivery,
    };
  });

    return [
      { id: 'seller_delivery', method: 'seller_delivery', provider: 'seller', title: 'Seller Delivery', name: 'Seller Delivery', icon: 'fa-truck', fee: 0, estimatedDays: '2-5' },
      { id: 'marketmix_delivery', method: 'marketmix_delivery', provider: 'marketmix', title: 'MarketMix Delivery', name: 'MarketMix Delivery', icon: 'fa-truck', fee: 0, estimatedDays: '1-3' }
    ];
  }

  function renderDeliveryOptions() {
    if (!state.deliveryOptions.length) {
      els.deliveryOptions.innerHTML = '<p class="muted">No delivery options are available for this address.</p>';
      return;
    }

    els.deliveryOptions.innerHTML = state.deliveryOptions.map((option) => {
      const selected = state.selectedDelivery && String(state.selectedDelivery.id) === String(option.id);
      return `
        <button type="button" class="option-card ${selected ? 'selected' : ''}" data-delivery-id="${escapeAttr(option.id)}">
          <span class="radio-dot"></span>
          <div>
            <strong>${escapeHtml(option.title || 'Delivery option')}</strong>
            <p class="muted">${escapeHtml(deliveryEta(option))}</p>
          </div>
          <strong class="option-price">${formatMoney(option.fee)}</strong>
        </button>
      `;
    }).join('');

    els.deliveryOptions.querySelectorAll('[data-delivery-id]').forEach((card) => {
      card.addEventListener('click', () => selectDelivery(card.dataset.deliveryId));
    });
  }

  async function selectDelivery(optionId) {
    const option = state.deliveryOptions.find((item) => String(item.id) === String(optionId));
    if (!option) return;

    try {
      const savedCoupon = state.session?.couponCode || state.session?.coupon_code;
      const savedDiscount = state.session?.couponDiscount || state.session?.coupon_discount;

      const data = await api(`/checkout/session/${state.sessionId}/delivery`, {
        method: 'POST',
        body: JSON.stringify({
          method: option.provider,
          provider_id: option.providerId || option.id
        })
      });

      absorbSessionPayload(data);

      if (savedCoupon && state.session) {
        state.session.couponCode = state.session.couponCode || savedCoupon;
        state.session.coupon_code = state.session.coupon_code || savedCoupon;
        state.session.couponDiscount = state.session.couponDiscount || savedDiscount;
        state.session.coupon_discount = state.session.coupon_discount || savedDiscount;
      }

      state.selectedDelivery = option;
      renderDeliveryOptions();
      renderSummary();
      setInlineMessage(els.deliveryMessage, 'Delivery method selected.', 'success');
    } catch (error) {
      setInlineMessage(els.deliveryMessage, error.message || 'Could not select delivery method.', 'error');
    }
  }

  async function loadPaymentMethods() {
    els.paymentOptions.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div>';
    const data = await api('/payments/methods');
    state.paymentMethods = normalizePaymentMethods(data.methods || data.paymentMethods || data.data?.methods || data.data || []);
    state.selectedPayment = state.paymentMethods.some((method) => method.id === state.selectedPayment)
      ? state.selectedPayment
      : state.paymentMethods[0]?.id || null;
    renderPaymentMethods();
  }

  function normalizePaymentMethods(methods) {
    const defaults = [
      { id: 'paystack', name: 'Paystack', icon: 'fa-credit-card' },
      // Flutterwave and Cash on Delivery are intentionally hidden for now.
      // { id: 'cod', name: 'Cash on Delivery', icon: 'fa-money-bill-wave' },
      // { id: 'flutterwave', name: 'Flutterwave', icon: 'fa-wallet' }
    ];
    if (!Array.isArray(methods) || !methods.length) return defaults;
    const normalized = methods.map((method) => {
      const id = String(method.id || method.code || method.method || method.name).toLowerCase();
      const fallback = defaults.find((item) => id.includes(item.id));
      return {
        id: fallback ? fallback.id : id,
        name: method.name || method.label || fallback?.name || id,
        icon: fallback?.icon || 'fa-credit-card',
        description: method.description || ''
      };
    });
    const paystackMethods = normalized.filter((method) => method.id === 'paystack');
    return paystackMethods.length ? paystackMethods : defaults;
  }

  function renderPaymentMethods() {
    els.paymentOptions.innerHTML = state.paymentMethods.map((method) => {
      const selected = state.selectedPayment === method.id;
      return `
        <button type="button" class="option-card ${selected ? 'selected' : ''}" data-payment-id="${escapeAttr(method.id)}">
          <span class="radio-dot"></span>
          <i class="fas ${escapeAttr(method.icon)}"></i>
          <div>
            <strong>${escapeHtml(method.name)}</strong>
            <p class="muted">${escapeHtml(method.description || paymentDescription(method.id))}</p>
          </div>
        </button>
      `;
    }).join('');

    els.paymentOptions.querySelectorAll('[data-payment-id]').forEach((card) => {
      card.addEventListener('click', () => {
        state.selectedPayment = card.dataset.paymentId;
        renderPaymentMethods();
        setInlineMessage(els.paymentMessage, '', '');
      });
    });
  }

  async function placeOrder() {
    if (!state.selectedPayment) {
      setInlineMessage(els.paymentMessage, 'Choose a payment method first.', 'error');
      return;
    }
    setButtonLoading(els.placeOrderBtn, true);
    try {
      // First try to confirm checkout (creates order if needed)
      let confirmData = null;
      try {
        confirmData = await retryWithBackoff(() =>
          api(`/checkout/session/${state.sessionId}/confirm`, {
            method: 'POST',
            body: JSON.stringify({ payment_method: state.selectedPayment })
          })
        );
      } catch (confirmErr) {
        // 409 = order exists but unpaid — proceed to initiate payment
        if (confirmErr.status !== 409) throw confirmErr;
      }

      // Initiate payment (handles both new and retry)
      const data = await retryWithBackoff(() =>
        api('/payments/initiate', {
          method: 'POST',
          body: JSON.stringify({ sessionId: state.sessionId, method: state.selectedPayment })
        })
      );
      const paymentUrl = data.paymentUrl || data.authorizationUrl || data.authorization_url || data.data?.paymentUrl || data.data?.authorization_url;
      if (!paymentUrl) throw new Error('Could not start payment.');
      sessionStorage.setItem(SESSION_KEY, state.sessionId);
      window.location.href = paymentUrl;
    } catch (error) {
      setInlineMessage(els.paymentMessage, error.message || 'Could not initiate payment.', 'error');
    } finally {
      setButtonLoading(els.placeOrderBtn, false);
    }
  }

  async function retryWithBackoff(asyncFn, maxRetries = 3, baseDelayMs = 500) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await asyncFn();
      } catch (error) {
        lastError = error;
        const isTransient = isTransientError(error);
        const shouldRetry = attempt < maxRetries && isTransient;
        
        if (shouldRetry) {
          const delayMs = baseDelayMs * Math.pow(2, attempt);
          console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms due to: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else if (isTransient) {
          console.log(`Max retries reached for transient error: ${error.message}`);
          throw error;
        } else {
          throw error;
        }
      }
    }
    throw lastError;
  }

  function isTransientError(error) {
    if (!error.status) return true; // Network error
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }

  async function handlePaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    const paymentSignal = params.get('reference') || params.get('trxref') || params.get('transaction_id') || params.get('tx_ref') || params.get('status');
    if (!paymentSignal || !state.sessionId) return;
    try {
      setGlobalMessage('Confirming your payment...', 'success');
      await confirmOrder();
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      setGlobalMessage(error.message || 'Payment returned, but order confirmation failed.', 'error');
    }
  }

  async function confirmOrder() {
    const data = await api(`/checkout/session/${state.sessionId}/confirm`, { method: 'POST' });
    absorbSessionPayload(data);
    showConfirmation(data);
    // Cash on Delivery confirmation notifications are disabled while COD is hidden.
    // if (state.selectedPayment === 'cod') await notifyCodOrderPlaced(data);
  }

  function showConfirmation(data) {
    els.steps.forEach((panel) => panel.classList.remove('active'));
    els.confirmationPanel.hidden = false;
    els.confirmationPanel.classList.add('active');
    const orderId = data.orderId || data.order?.id || data.session?.orderId || state.session?.orderId;
    els.confirmationText.textContent = orderId
      ? `Your order number is ${orderId}. We will keep you updated as it moves.`
      : 'Your order has been placed successfully. We will keep you updated as it moves.';
    setGlobalMessage('', '');
    localStorage.removeItem('cart');
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
    renderSummary();
  }

  function startExpiryCountdown() {
    if (state.expiryTimer) clearInterval(state.expiryTimer);
    const expiresAt = state.session?.expiresAt || state.session?.expires_at;
    if (!expiresAt) return;
    const expiryTime = new Date(expiresAt).getTime();
    if (!Number.isFinite(expiryTime)) return;
    els.expiryPill.hidden = false;
    const tick = () => {
      const remainingMs = expiryTime - Date.now();
      if (remainingMs <= 0) {
        els.expiryCountdown.textContent = 'expired';
        setGlobalMessage('This checkout session has expired. Please return to your cart and start again.', 'error');
        clearInterval(state.expiryTimer);
        return;
      }
      const totalSeconds = Math.floor(remainingMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      els.expiryCountdown.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      if (remainingMs <= 5 * 60 * 1000) els.expiryPill.classList.add('urgent');
    };
    tick();
    state.expiryTimer = setInterval(tick, 1000);
  }

  function initNotifications() {
    const buyerId = window.getBuyerId?.();
    if (buyerId && window.NotificationManager) window.NotificationManager.init(buyerId);
  }

  async function notifyAddressAdded(saved) {
    try {
      const buyerId = window.getBuyerId?.();
      if (!buyerId || !window.NotificationManager?.createNotification) return;

      await window.NotificationManager.createNotification(buyerId, {
        title: saved ? 'Delivery address saved' : 'Delivery address selected',
        message: saved
          ? 'A new delivery address was saved and selected for your order.'
          : 'Your delivery address has been selected for this order.',
        type: 'account',
        link: '/buyers/checkout.html'
      });
    } catch (error) {
      console.warn('Address notification failed', error);
    }
  }

  async function notifyCouponApplied(code) {
    try {
      const buyerId = window.getBuyerId?.();
      if (!buyerId || !window.NotificationManager?.createNotification || !code) return;

      const notificationKey = `checkout-coupon-applied-${state.sessionId}-${code}`;
      if (sessionStorage.getItem(notificationKey)) return;

      await window.NotificationManager.createNotification(buyerId, {
        title: 'Coupon applied',
        message: `Coupon "${code}" was successfully applied to your order.`,
        type: 'order',
        link: '/buyers/checkout.html'
      });
      sessionStorage.setItem(notificationKey, '1');
    } catch (error) {
      console.warn('Coupon notification failed', error);
    }
  }

  async function notifyCodOrderPlaced(data) {
    try {
      const buyerId = window.getBuyerId?.();
      if (!buyerId || !window.NotificationManager?.createNotification) return;

      const orderId = data.orderId || data.order?.id || data.session?.orderId || state.session?.orderId;
      const notificationKey = `checkout-cod-order-${orderId || state.sessionId || 'unknown'}`;
      if (sessionStorage.getItem(notificationKey)) return;

      await window.NotificationManager.createNotification(buyerId, {
        title: 'Cash on Delivery order placed',
        message: orderId
          ? `Your order ${orderId} has been placed and will be paid on delivery.`
          : 'Your order has been placed and will be paid on delivery.',
        type: 'order',
        link: '/buyers/buyers order & tracking.html'
      });
      sessionStorage.setItem(notificationKey, '1');
    } catch (error) {
      console.warn('COD order notification failed', error);
    }
  }

  function calcItemsSubtotal() {
    return state.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  }

  function readMoney(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : Number(fallback || 0);
  }

  function formatMoney(value) {
    return `NGN ${readMoney(value).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }

  function formatAddress(address) {
    return [
      address.addressLine1 || address.address_line1 || address.address_line_1 || address.line1,
      address.addressLine2 || address.address_line2 || address.address_line_2 || address.line2,
      address.city,
      address.state,
      address.country
    ].filter(Boolean).join(', ');
  }

  function getAddressId(address) {
    return address.id || address.address_id || address.addressId || address.uuid || '';
  }

  function authHeader(token) {
    return String(token).startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  function deliveryEta(option) {
    if (option.estimatedDelivery) return `Estimated delivery: ${option.estimatedDelivery}`;
    if (option.estimatedDays) return `Estimated delivery: ${option.estimatedDays} days`;
    return 'Estimated delivery shown after selection';
  }


  function labelFromMethod(method) {
    const labels = {
      seller_delivery: 'Seller Delivery',
      marketmix_delivery: 'MarketMix Delivery',
      shipbubble: 'Shipbubble Courier'
    };
    if (labels[method]) return labels[method];
    const text = String(method || 'Delivery option').replace(/[_-]+/g, ' ');
    return text.replace(/\b\w/g, l => l.toUpperCase());
  }

  function paymentDescription(id) {
    if (id === 'paystack') return 'Pay securely with card, bank, or transfer.';
    // if (id === 'cod') return 'Pay when your order arrives.';
    // if (id === 'flutterwave') return 'Pay securely with Flutterwave checkout.';
    return 'Secure payment method.';
  }

  function setButtonLoading(button, loading) {
    button.disabled = loading;
    const spinner = button.querySelector('.fa-spinner');
    if (spinner) spinner.hidden = !loading;
  }

  function setGlobalMessage(message, type) {
    setInlineMessage(els.globalMessage, message, type);
  }

  function setInlineMessage(element, message, type) {
    if (!element) return;
    element.textContent = message || '';
    element.hidden = !message;
    element.classList.remove('success', 'error');
    if (type) element.classList.add(type);
  }

  function safeJson(value, fallback) {
    try { return JSON.parse(value); } catch (error) { return fallback; }
  }

  function stripEmpty(object) {
    return Object.fromEntries(Object.entries(object).filter(([, value]) => {
      return value !== undefined && value !== null && value !== '';
    }));
  }

  function stripEmptyDeep(object) {
    return Object.fromEntries(Object.entries(object).filter(([, value]) => {
      if (value === undefined || value === null || value === '') return false;
      if (typeof value === 'object' && !Array.isArray(value)) return Object.keys(value).length > 0;
      return true;
    }));
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#096;');
  }

})();
