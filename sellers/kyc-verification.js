document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'sellers login.html';
    return;
  }

  const form = document.getElementById('kycForm');
  const fullName = document.getElementById('fullName');
  const dob = document.getElementById('dob');
  const businessName = document.getElementById('businessName');
  const businessAddress = document.getElementById('businessAddress');
  const email = document.getElementById('email');
  const phone = document.getElementById('phone');
  const idType = document.getElementById('idType');
  const idDocument = document.getElementById('idDocument');
  const selfiePhoto = document.getElementById('selfiePhoto');
  const idDocumentList = document.getElementById('idDocumentList');
  const selfiePhotoList = document.getElementById('selfiePhotoList');
  const submitButton = form.querySelector('.save-btn');

  function showToast(msg, type = 'info') {
    if (typeof showNotification === 'function') {
      showNotification(msg, type);
      return;
    }
    const existing = document.querySelector('.toast-msg');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '1rem 1.4rem',
      borderRadius: '10px',
      color: '#fff',
      fontWeight: '600',
      zIndex: '9999',
      background: type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3',
      maxWidth: '360px'
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3800);
  }

  function showFieldError(id, message) {
    const error = document.getElementById(`error-${id}`);
    if (error) {
      error.textContent = message;
      error.style.display = 'block';
    }
    const field = document.getElementById(id);
    if (field) field.style.borderColor = 'rgba(255,77,77,0.7)';
  }

  function clearFieldError(id) {
    const error = document.getElementById(`error-${id}`);
    if (error) {
      error.textContent = '';
      error.style.display = 'none';
    }
    const field = document.getElementById(id);
    if (field) field.style.borderColor = '';
  }

  function updateFileList(input, listContainer) {
    const files = Array.from(input.files || []);
    listContainer.innerHTML = '';

    files.forEach(file => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML = `<span>${file.name}</span><button type="button">Remove</button>`;
      item.querySelector('button').addEventListener('click', () => {
        input.value = '';
        listContainer.innerHTML = '';
      });
      listContainer.appendChild(item);
    });
  }

  idDocument.addEventListener('change', () => {
    updateFileList(idDocument, idDocumentList);
    clearFieldError('idDocument');
  });

  selfiePhoto.addEventListener('change', () => {
    updateFileList(selfiePhoto, selfiePhotoList);
    clearFieldError('selfiePhoto');
  });

  form.addEventListener('submit', event => {
    event.preventDefault();

    ['fullName', 'email', 'idType', 'idDocument', 'selfiePhoto'].forEach(clearFieldError);

    let valid = true;

    if (!fullName.value.trim()) {
      showFieldError('fullName', 'Please enter your full name as shown on your ID.');
      valid = false;
    }

    const emailValue = email.value.trim();
    if (!emailValue) {
      showFieldError('email', 'Email is required.');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      showFieldError('email', 'Enter a valid email address.');
      valid = false;
    }

    if (!idType.value) {
      showFieldError('idType', 'Please select an ID type.');
      valid = false;
    }

    if (!idDocument.files.length) {
      showFieldError('idDocument', 'Please upload your ID document.');
      valid = false;
    }

    if (!selfiePhoto.files.length) {
      showFieldError('selfiePhoto', 'Please upload a selfie for verification.');
      valid = false;
    }

    if (!valid) {
      form.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    setTimeout(() => {
      showToast('KYC submitted successfully! We will review your documents shortly.', 'success');
      submitButton.textContent = 'Submit KYC for Verification';
      submitButton.disabled = false;
      setTimeout(() => { window.location.href = 'sellers layout.html'; }, 1800);
    }, 600);
  });

  const footerCopy = document.querySelector('.footer-copy');
  if (footerCopy) {
    footerCopy.innerHTML = `&copy; ${new Date().getFullYear()} MarketMix. All rights reserved.`;
  }
});
