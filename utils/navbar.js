// Navbar Utility - Handles hamburger menu and cart functionality
document.addEventListener('DOMContentLoaded', function() {
  
  // ===== HAMBURGER MENU =====
  (function() {
    const toggle = document.querySelector('.mm-toggle');
    const menu = document.getElementById('mm-menu');
    
    if (!toggle || !menu) return;
    
        toggle.addEventListener('click', function(e) {
          e.stopPropagation();
          menu.classList.toggle('open');
          const isOpen = menu.classList.contains('open');
          toggle.setAttribute('aria-expanded', isOpen);
          menu.setAttribute('aria-hidden', !isOpen);
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (!toggle.contains(e.target) && !menu.contains(e.target)) {
            menu.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
            menu.setAttribute('aria-hidden', 'true');
      }
    });
        
        // Close menu when clicking a link
        const menuLinks = menu.querySelectorAll('a');
        menuLinks.forEach(link => {
          link.addEventListener('click', function() {
            menu.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
            menu.setAttribute('aria-hidden', 'true');
          });
        });
  })();

  // ===== CART COUNT UPDATE =====
  (function() {
    const cartCountEls = document.querySelectorAll('#mm-cart-count, .cart-count, [data-cart-badge]');
    if (!cartCountEls || cartCountEls.length === 0) return;
    
    // Get cart from localStorage
    function updateCartCount() {
      try {
        // Prefer the app-standard 'cart' key; fallback to legacy 'marketmix-cart'
        const raw = localStorage.getItem('cart') || localStorage.getItem('marketmix-cart') || '[]';
        const cart = JSON.parse(raw);
        const totalCount = Array.isArray(cart) ? cart.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;
        cartCountEls.forEach(el => {
          el.textContent = totalCount;
          el.style.display = totalCount > 0 ? 'inline-block' : 'none';
        });
      } catch (error) {
        console.error('Error updating cart count:', error);
        cartCountEls.forEach(el => {
          el.textContent = '0';
          el.style.display = 'none';
        });
      }
    }
    
    // Update on page load
    updateCartCount();
    
    // Listen for storage changes (from other tabs/windows)
    window.addEventListener('storage', function(e) {
      if (e.key === 'marketmix-cart' || e.key === 'cart' || e.key === null) {
        // e.key === null can happen on localStorage.clear()
        updateCartCount();
      }
    });

    // Also update when add-to-cart buttons are clicked on this page
    document.addEventListener('click', function(e) {
      const btn = e.target.closest && e.target.closest('.add-to-cart');
      if (btn) {
        // Give other handlers a moment to update localStorage
        setTimeout(updateCartCount, 60);
      }
    });

    // And refresh when page visibility changes (user may have updated cart in another tab)
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden) updateCartCount();
    });
  })();

  // ===== USER DROPDOWN MENU =====
  (function() {
    const userBtn = document.querySelector('.user-dropdown .mm-icon');
    const userMenu = document.querySelector('.user-dropdown .menu');
    
    if (!userBtn || !userMenu) return;
    
    userBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      const isHidden = userMenu.getAttribute('aria-hidden') === 'true';
      userBtn.setAttribute('aria-expanded', isHidden);
      userMenu.setAttribute('aria-hidden', !isHidden);
    });
    
    // Close when clicking outside
    document.addEventListener('click', function(e) {
      if (!userBtn.contains(e.target) && !userMenu.contains(e.target)) {
        userBtn.setAttribute('aria-expanded', 'false');
        userMenu.setAttribute('aria-hidden', 'true');
      }
    });
  })();

});
