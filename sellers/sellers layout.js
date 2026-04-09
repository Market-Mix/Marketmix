       document.addEventListener("DOMContentLoaded", function () {
  const toggler = document.getElementById("navbar-toggler");
  const offcanvasMenu = document.getElementById("offcanvasMenu");
  const offcanvasClose = document.getElementById("offcanvasClose");

  // Open Offcanvas Menu
  toggler.addEventListener("click", function () {
    offcanvasMenu.classList.add("show");
    
    // FIX: Refresh mobile profile image when offcanvas becomes visible
    // This ensures the image renders properly after the container is visible
    setTimeout(() => {
      const mobileProfileImg = document.getElementById("sellerProfileImageMobile");
      if (mobileProfileImg && mobileProfileImg.src) {
        // Force re-render by touching the src
        const currentSrc = mobileProfileImg.src;
        mobileProfileImg.style.opacity = "0.99"; // Trigger repaint
        setTimeout(() => {
          mobileProfileImg.style.opacity = "1";
          // Force image refresh if it hasn't loaded properly
          if (!mobileProfileImg.naturalHeight || mobileProfileImg.naturalHeight === 0) {
            mobileProfileImg.src = currentSrc; // Reload the image
            console.log("✓ Mobile profile image refreshed for visibility");
          }
        }, 10);
      }
    }, 50);
  });

  // Close Offcanvas Menu
  offcanvasClose.addEventListener("click", function () {
    offcanvasMenu.classList.remove("show");
  });

  // Close Offcanvas when clicking outside, but not when clicking inside
  document.addEventListener("click", function (event) {
    if (!offcanvasMenu.contains(event.target) && !toggler.contains(event.target)) {
      offcanvasMenu.classList.remove("show");
    }
  });

  // Ensure clicking inside doesn't close menu
  offcanvasMenu.addEventListener("click", function (event) {
    event.stopPropagation();
  });

  // Close offcanvas when clicking any menu link (for better UX)
  document.querySelectorAll('.offcanvas-body a').forEach(link => {
    link.addEventListener('click', () => {
      offcanvasMenu.classList.remove('show');
    });
  });

  // ========== MOBILE LOGO TOGGLE FUNCTIONALITY ==========
  const mobileLogoToggle = document.getElementById("mobileLogoToggle");
  const mobileLogoPanel = document.getElementById("mobileLogoPanel");
  const mobileLogoPanelClose = document.getElementById("mobileLogoPanelClose");

  // Open Mobile Logo Panel
  if (mobileLogoToggle) {
    mobileLogoToggle.addEventListener("click", function () {
      mobileLogoPanel.classList.add("show");
    });
  }

  // Close Mobile Logo Panel
  if (mobileLogoPanelClose) {
    mobileLogoPanelClose.addEventListener("click", function () {
      mobileLogoPanel.classList.remove("show");
    });
  }

  // Close Mobile Logo Panel when clicking outside
  document.addEventListener("click", function (event) {
    if (mobileLogoPanel && !mobileLogoPanel.contains(event.target) && !mobileLogoToggle.contains(event.target)) {
      mobileLogoPanel.classList.remove("show");
    }
  });

  // Close Mobile Logo Panel when clicking any menu link
  if (mobileLogoPanel) {
    document.querySelectorAll('.mobile-logo-nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        mobileLogoPanel.classList.remove('show');
      });
    });
  }

  // Prevent closing when clicking inside the panel
  if (mobileLogoPanel) {
    mobileLogoPanel.addEventListener("click", function (event) {
      event.stopPropagation();
    });
  }

  // Initialize product badge if available
  initializeProductBadge();

  // Load seller profile image
  loadSellerProfileImage();

  });

 function toggleProfileDropdown() {
    const dropdown = document.getElementById("profileDropdown");
    dropdown.style.display = dropdown.style.display === "flex" ? "none" : "flex";
  }

  // ===== LOAD SELLER PROFILE IMAGE FROM BACKEND API =====
  async function loadSellerProfileImage() {
    try {
      const profileImg = document.getElementById("sellerProfileImage");
      const profileImgMobile = document.getElementById("sellerProfileImageMobile");
      
      console.log("=== LOADING SELLER PROFILE IMAGE ===");
      console.log("Desktop image element found:", !!profileImg);
      console.log("Mobile image element found:", !!profileImgMobile);
      
      // DEBUG: Check for ALL profile-icon elements
      const allProfileIcons = document.querySelectorAll('.profile-icon');
      console.log("Total .profile-icon elements in DOM:", allProfileIcons.length);
      allProfileIcons.forEach((el, idx) => {
        const parent = el.parentElement;
        const parentComputed = window.getComputedStyle(parent);
        const elComputed = window.getComputedStyle(el);
        
        console.log(`  [${idx}] id="${el.id}" src="${el.src}"`);
        console.log(`       offsetWidth: ${el.offsetWidth}, offsetHeight: ${el.offsetHeight}`);
        console.log(`       display: ${elComputed.display}, visibility: ${elComputed.visibility}`);
        console.log(`       parent: ${parent.tagName} class="${parent.className}"`);
        console.log(`       parent offsetWidth: ${parent.offsetWidth}, offsetHeight: ${parent.offsetHeight}`);
        console.log(`       parent display: ${parentComputed.display}, visible: ${el.offsetHeight > 0 ? 'YES' : 'NO'}`);
      });
      
      // Guard: at least one element must exist
      if (!profileImg && !profileImgMobile) {
        console.error("ERROR: Profile image elements not found in DOM");
        return;
      }

      console.log("Fetching seller profile for store logo...");

      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        console.log("No auth token found");
        return;
      }

      // Use backend API (which handles auth and RLS)
      const apiUrl = (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.API_BASE_URL) 
        ? CONFIG.API_BASE_URL 
        : 'https://marketmix-backend.onrender.com/api';

      const response = await fetch(`${apiUrl}/seller/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`Failed to fetch seller profile: ${response.status}`);
        return;
      }

      const data = await response.json();
      console.log("Seller profile API response:", data);
      const storeLogoUrl = data?.data?.seller?.profile?.storeLogo;

      console.log("Store logo URL extracted:", storeLogoUrl ? storeLogoUrl.substring(0, 50) + "..." : "NULL/EMPTY");

      // Set BOTH images to the SAME value
      if (storeLogoUrl && storeLogoUrl.trim() !== '') {
        // Simple direct approach - don't replace element, just update src
        const setImageSrc = (img, label) => {
          if (img) {
            img.src = storeLogoUrl;
            img.style.backgroundImage = "none";
            
            const computed = window.getComputedStyle(img);
            console.log(`${label} image src updated. Computed display: ${computed.display}, opacity: ${computed.opacity}`);
          }
        };
        
        if (profileImg) {
          setImageSrc(profileImg, "Desktop");
        }
        if (profileImgMobile) {
          setImageSrc(profileImgMobile, "Mobile");
        }
        
        console.log("Store logo set on both images");
        
        // VERIFY both images
        setTimeout(() => {
          const verify1 = document.getElementById("sellerProfileImage")?.src;
          const verify2 = document.getElementById("sellerProfileImageMobile")?.src;
          
          const mobileEl = document.getElementById("sellerProfileImageMobile");
          const mobileParent = mobileEl?.parentElement;
          const mobileComputed = window.getComputedStyle(mobileEl);
          const parentComputed = window.getComputedStyle(mobileParent);
          
          console.log("VERIFICATION after 500ms:");
          console.log("  Desktop src match:", verify1 === storeLogoUrl ? "✓ YES" : "✗ NO");
          console.log("  Mobile src match:", verify2 === storeLogoUrl ? "✓ YES" : "✗ NO");
          console.log("  Both match each other:", verify1 === verify2 ? "✓ YES" : "✗ NO");
          console.log("  Mobile element width:", mobileEl?.offsetWidth, "height:", mobileEl?.offsetHeight);
          console.log("  Mobile computed display:", mobileComputed.display, "opacity:", mobileComputed.opacity);
          console.log("  Mobile parent size - width:", mobileParent?.offsetWidth, "height:", mobileParent?.offsetHeight);
          console.log("  Mobile parent display:", parentComputed.display);
        }, 500);
      } else {
        // No store_logo_url → clear both images
        if (profileImg) profileImg.src = "";
        if (profileImgMobile) profileImgMobile.src = "";
        console.log("No store logo found, images cleared");
      }
      
      // Setup load handlers
      const setupLoadHandler = (img, label) => {
        if (img) {
          img.onload = () => {
            console.log(`✓ ${label} image loaded successfully`);
            // Force re-render after image loads
            img.style.display = "none";
            setTimeout(() => {
              img.style.display = "block";
            }, 0);
          };
          
          // Handle image load errors
          img.onerror = () => {
            console.error(`✗ ${label} image failed to load. Attempting retry...`);
            // Retry after 1 second
            setTimeout(() => {
              if (img.src && img.src !== storeLogoUrl) {
                img.src = storeLogoUrl;
                console.log(`↻ ${label} image retry initiated`);
              }
            }, 1000);
          };
        }
      };
      
      setupLoadHandler(profileImg, "Desktop");
      setupLoadHandler(profileImgMobile, "Mobile");
      
    } catch (error) {
      console.error("ERROR loading seller profile image:", error);
    }
  }

  // Close dropdown if clicking outside
  document.addEventListener("click", function (e) {
    const dropdown = document.getElementById("profileDropdown");
    const profile = document.querySelector(".profile-icon");

    if (!dropdown.contains(e.target) && !profile.contains(e.target)) {
      dropdown.style.display = "none";
    }
  });








  // Modal handling
document.addEventListener("DOMContentLoaded", () => {
  const couponsModal = document.getElementById('coupons-modal');
  const salesModal = document.getElementById('sales-modal');

  // Open modals on tool card click
  document.getElementById('marketing-coupons-card').onclick = () => couponsModal.style.display = 'block';
  document.getElementById('sales-chart-card').onclick = () => {
    salesModal.style.display = 'block';
    renderSalesChart();
  };

  // Close buttons
  document.getElementById('close-coupons').onclick = () => couponsModal.style.display = 'none';
  document.getElementById('close-sales').onclick = () => salesModal.style.display = 'none';

  // Close modal when clicking outside modal content
  window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  };

  // Coupon form submit demo
  document.getElementById('coupon-form').onsubmit = (e) => {
    e.preventDefault();
    alert(`Coupon "${e.target['coupon-code'].value}" with ${e.target['discount'].value}% discount created! (Demo)`);
    couponsModal.style.display = 'none';
    e.target.reset();
  };

  // Sales Chart render with Chart.js
  function renderSalesChart() {
    // Load Chart.js from CDN if not loaded yet
    if (typeof Chart === 'undefined') {
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/chart.js";
      script.onload = drawChart;
      document.head.appendChild(script);
    } else {
      drawChart();
    }
  }

  function drawChart() {
    const ctx = document.getElementById('salesChart').getContext('2d');
    // Clear previous chart if any
    if (window.salesChartInstance) window.salesChartInstance.destroy();

    window.salesChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Sales ($)',
          data: [1200, 1900, 3000, 2500, 3200, 4000],
          borderColor: '#ff6600',
          backgroundColor: 'rgba(255,102,0,0.3)',
          fill: true,
          tension: 0.3,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
});



  // Dark Mode Toggle
// const darkModeBtn = document.getElementById('darkModeBtn');

// darkModeBtn.addEventListener('click', () => {
//   document.body.classList.toggle('dark-mode');
  
//   if (document.body.classList.contains('dark-mode')) {
//     darkModeBtn.textContent = '☀️ Light Mode';
//   } else {
//     darkModeBtn.textContent = '🌙 Dark Mode';
//   }
// });

// Seller Tips - Rotate every 2 seconds
const tips = [
  "Welcome to MarketMix!",
  "Keep your product descriptions clear and detailed.",
  "Offer promotions to boost your sales.",
  "Respond quickly to buyer inquiries for better ratings.",
  "Update your shop regularly to keep it fresh."
];

let tipIndex = 0;
const tipText = document.getElementById('tip-text');

setInterval(() => {
  tipIndex = (tipIndex + 1) % tips.length;
  tipText.textContent = tips[tipIndex];
}, 3000);

// Progress Tracker Demo - You can customize the steps here
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progress-text');

// Simulate progress steps for demo (you can tie this to real data later)
let progressSteps = [
  { text: "Profile setup: 40%", percent: 40 },
  { text: "First product added: 60%", percent: 60 },
  { text: "First sale made: 80%", percent: 80 },
  { text: "100+ sales milestone: 100%", percent: 100 },
];

let currentStep = 0;

function updateProgress() {
  let step = progressSteps[currentStep];
  progressBar.style.width = step.percent + '%';
  progressText.textContent = step.text;
  currentStep = (currentStep + 1) % progressSteps.length;
}

// Update progress every 8 seconds for demo
updateProgress();
setInterval(updateProgress, 8000);




// Activity Log Modal Handler
const activityTicker = document.getElementById('activityTicker');
const activityModal = document.getElementById('activityModal');
const closeModal = document.getElementById('closeModal');

// Open modal on ticker click
activityTicker.addEventListener('click', () => {
  activityModal.style.display = 'block';
});

// Close modal
closeModal.addEventListener('click', () => {
  activityModal.style.display = 'none';
});

// Close modal when clicking outside the content
window.addEventListener('click', (e) => {
  if (e.target === activityModal) {
    activityModal.style.display = 'none';
  }
});

// Function to initialize and update product badge
function initializeProductBadge() {
  const productBadge = document.getElementById('productBadge');
  if (!productBadge) return; // Badge element may not exist on all pages
  
  // Check if we're on a page with product data available
  // If products array exists (from sellers product.js), update badge
  if (typeof window.products !== 'undefined') {
    updateProductBadgeDisplay();
  } else {
    // Set a default sample number for demo purposes
    productBadge.textContent = '2';
    productBadge.style.display = 'flex';
  }
}

function updateProductBadgeDisplay() {
  if (typeof window.products === 'undefined') return;
  
  const productBadge = document.getElementById('productBadge');
  if (!productBadge) return;
  
  // Count low-stock and out-of-stock items
  let lowStock = 0, outStock = 0;
  window.products.forEach(product => {
    if (product.status === 'Low Stock') lowStock++;
    if (product.status === 'Out of Stock') outStock++;
  });
  
  const totalAlerts = lowStock + outStock;
  productBadge.textContent = totalAlerts;
  productBadge.style.display = totalAlerts > 0 ? 'flex' : 'none';
}
