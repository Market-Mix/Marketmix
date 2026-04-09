       document.addEventListener("DOMContentLoaded", function () {
  const toggler = document.getElementById("navbar-toggler");
  const offcanvasMenu = document.getElementById("offcanvasMenu");
  const offcanvasClose = document.getElementById("offcanvasClose");

  // Open Offcanvas Menu
  toggler.addEventListener("click", function () {
    offcanvasMenu.classList.add("show");
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

  console.log("Mobile Logo Toggle elements found:", { 
    toggle: !!mobileLogoToggle, 
    panel: !!mobileLogoPanel, 
    close: !!mobileLogoPanelClose 
  });

  // Open Mobile Logo Panel
  if (mobileLogoToggle && mobileLogoPanel) {
    mobileLogoToggle.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("Mobile logo toggle clicked!");
      mobileLogoPanel.classList.add("show");
    });
  }

  // Close Mobile Logo Panel
  if (mobileLogoPanelClose && mobileLogoPanel) {
    mobileLogoPanelClose.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("Mobile logo panel close clicked!");
      mobileLogoPanel.classList.remove("show");
    });
  }

  // Close Mobile Logo Panel when clicking outside
  document.addEventListener("click", function (event) {
    if (mobileLogoPanel && mobileLogoToggle) {
      const clickedOnPanel = mobileLogoPanel.contains(event.target);
      const clickedOnToggle = mobileLogoToggle.contains(event.target);
      
      if (!clickedOnPanel && !clickedOnToggle) {
        mobileLogoPanel.classList.remove("show");
      }
    }
  });

  // Close Mobile Logo Panel when clicking any menu link
  if (mobileLogoPanel) {
    document.querySelectorAll('.mobile-logo-nav-links a').forEach(link => {
      link.addEventListener('click', (e) => {
        console.log("Mobile logo nav link clicked!");
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

  // Update welcome text with seller name
  updateWelcomeText();

  // Update progress tracker
  updateProgressTracker();

  // Refresh progress tracker every 5 seconds (more responsive)
  setInterval(() => {
    console.log("🔄 Auto-refreshing progress tracker (5s interval)...");
    updateProgressTracker();
  }, 5000);

  // Refresh progress tracker when page becomes visible (user switches back to tab)
  document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "visible") {
      console.log("👁️ Page became visible - refreshing progress tracker...");
      updateProgressTracker();
    }
  });

  // Refresh progress tracker when window gets focus (user returns to window)
  window.addEventListener("focus", function() {
    console.log("🪟 Window focused - refreshing progress tracker...");
    updateProgressTracker();
  });

  });

 function toggleProfileDropdown() {
    const dropdown = document.getElementById("profileDropdown");
    dropdown.style.display = dropdown.style.display === "flex" ? "none" : "flex";
  }

  // ===== LOAD SELLER PROFILE IMAGE FROM BACKEND API =====
  async function loadSellerProfileImage() {
    try {
      const profileImg = document.getElementById("sellerProfileImage");
      
      console.log("=== LOADING SELLER PROFILE IMAGE ===");
      console.log("Desktop image element found:", !!profileImg);
      
      // Guard: element must exist
      if (!profileImg) {
        console.error("ERROR: Desktop profile image element not found in DOM");
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

      // Set desktop image
      if (storeLogoUrl && storeLogoUrl.trim() !== '') {
        profileImg.src = storeLogoUrl;
        profileImg.style.backgroundImage = "none";
        
        const computed = window.getComputedStyle(profileImg);
        console.log(`✓ Desktop image src updated. Display: ${computed.display}, Opacity: ${computed.opacity}`);
        
        // Setup load handler
        profileImg.onload = () => {
          console.log(`✓ Desktop image loaded successfully`);
            // Force re-render after image loads
            profileImg.style.opacity = "0.99";
            setTimeout(() => {
              profileImg.style.opacity = "1";
            }, 10);
          };
          
          // Handle image load errors
          profileImg.onerror = () => {
            console.error(`✗ Desktop image failed to load. Attempting retry...`);
            // Retry after 1 second
            setTimeout(() => {
              if (profileImg.src && profileImg.src !== storeLogoUrl) {
                profileImg.src = storeLogoUrl;
                console.log(`↻ Desktop image retry initiated`);
              }
            }, 1000);
          };
      } else {
        // No store logo found
        profileImg.src = "";
        console.log("No store logo found, image cleared");
      }
      
    } catch (error) {
      console.error("ERROR loading seller profile image:", error);
    }
  }

  // ===== UPDATE WELCOME TEXT WITH SELLER NAME =====
  async function updateWelcomeText() {
    try {
      const welcomeTextElement = document.getElementById("welcomeText");
      if (!welcomeTextElement) {
        console.warn("Welcome text element not found");
        return;
      }

      let displayName = "Seller";
      
      // Try to get Supabase user
      let user = null;
      if (typeof supabase !== 'undefined') {
        try {
          const { data: { user: supabaseUser } } = await supabase.auth.getUser();
          user = supabaseUser;
        } catch (err) {
          console.log("Could not get Supabase user:", err.message);
        }
      }

      // Fallback to localStorage if Supabase fails
      if (!user) {
        const localUserStr = localStorage.getItem("user");
        if (localUserStr) {
          try {
            user = JSON.parse(localUserStr);
          } catch (err) {
            console.log("Could not parse localStorage user:", err.message);
          }
        }
      }

      // Determine display name with priority
      if (user?.user_metadata?.firstName) {
        displayName = user.user_metadata.firstName;
        console.log("Using firstName from user metadata:", displayName);
      } else if (user?.firstName) {
        displayName = user.firstName;
        console.log("Using firstName from user object:", displayName);
      } else if (user?.id) {
        // Try to fetch businessName from seller_profiles
        try {
          if (typeof supabase !== 'undefined') {
            const { data: sellerProfile } = await supabase
              .from("seller_profiles")
              .select("businessName")
              .eq("id", user.id)
              .single();
            
            if (sellerProfile?.businessName) {
              displayName = sellerProfile.businessName;
              console.log("Using businessName from seller_profiles:", displayName);
            }
          }
        } catch (err) {
          console.log("Could not fetch seller profile:", err.message);
        }
      }

      // Update the welcome text
      welcomeTextElement.textContent = `Welcome, ${displayName}!`;
      console.log("Welcome text updated to:", displayName);
      
    } catch (error) {
      console.error("ERROR updating welcome text:", error);
    }
  }

  // ===== UPDATE PROGRESS TRACKER =====
  async function updateProgressTracker() {
    try {
      const progressBar = document.getElementById("progressBar");
      const progressText = document.getElementById("progress-text");

      if (!progressBar || !progressText) {
        console.warn("Progress tracker elements not found");
        return;
      }

      let progress = 20;
      let messageHTML = '<a href="setup-store.html" style="color: #1e293b; text-decoration: underline; cursor: pointer;">Complete your store setup Here</a>';
      let backgroundColor = "#ef4444"; // red
      let storeSetupCompleted = false;
      let kycCompleted = false;
      let productCount = 0;
      let totalSales = 0;

      // Get authenticated user
      let userId = null;
      if (typeof supabase !== 'undefined') {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          userId = user?.id;
          console.log("✓ Got user ID from Supabase:", userId);
        } catch (err) {
          console.log("Could not get Supabase user:", err.message);
        }
      }

      // Fallback to localStorage
      if (!userId) {
        const localUserStr = localStorage.getItem("user");
        if (localUserStr) {
          try {
            const localUser = JSON.parse(localUserStr);
            userId = localUser?.id;
            console.log("✓ Got user ID from localStorage:", userId);
          } catch (err) {
            console.log("Could not parse localStorage user:", err.message);
          }
        }
      }

      if (!userId) {
        console.warn("No user ID found - keeping default progress");
        progressBar.style.width = progress + "%";
        progressBar.style.backgroundColor = backgroundColor;
        progressText.innerHTML = messageHTML;
        return;
      }

      // Fetch seller profile
      let sellerProfile = null;

      console.log("🔍 Supabase available?", typeof supabase !== 'undefined');

      if (typeof supabase !== 'undefined') {
        try {
          console.log("🔍 Using Supabase - Querying seller_profiles table for user:", userId);
          const { data: profile, error } = await supabase
            .from("seller_profiles")
            .select("*")
            .eq("id", userId)
            .single();
          
          console.log("📊 Supabase Query returned:", { profile, error });
          
          if (error) {
            console.error("❌ Supabase Error fetching seller profile:", error.message, error);
          } else if (!profile) {
            console.error("❌ Supabase returned null profile");
          } else {
            sellerProfile = profile;
            console.log("✓ Seller profile fetched from Supabase - FULL DATA:", JSON.stringify(profile, null, 2));
            
            // Log every single field
            console.log("📋 ALL FIELDS IN PROFILE:");
            Object.keys(profile).forEach(key => {
              console.log(`  ${key}: ${profile[key]}`);
            });
          }
        } catch (err) {
          console.error("❌ Exception with Supabase:", err.message, err);
        }
      } else {
        // Fallback: Use the same API endpoint that works for the logo
        try {
          console.log("⚠️ Supabase not available - Using API fallback for seller profile");
          const token = localStorage.getItem('token');
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
            console.error("❌ API Error:", response.status);
          } else {
            const data = await response.json();
            console.log("📊 API Response - FULL STRUCTURE:", JSON.stringify(data, null, 2));
            
            // Log the nested data structure
            if (data?.data?.seller) {
              console.log("📋 data.data.seller fields:", Object.keys(data.data.seller));
              console.log("📋 data.data.seller.profile fields:", data.data.seller.profile ? Object.keys(data.data.seller.profile) : "NULL");
              console.log("📋 Full data.data.seller object:", JSON.stringify(data.data.seller, null, 2));
            }
            
            if (data?.data?.seller?.profile) {
              const profile = data.data.seller.profile;
              sellerProfile = {
                store_name: profile.businessName || profile.storeName || profile.store_name,
                store_logo_url: profile.storeLogo || profile.store_logo_url,
                business_address: profile.businessAddress || profile.business_address,
                kyc_document_urls: profile.kycDocumentUrls || profile.kyc_document_urls,
                kyc_verified: profile.isVerified || false,
                total_sales: profile.totalSales || data.data.seller.totalSales || 0,
                product_count: data.data.seller.productCount || 0
              };
              
              console.log("✓ Seller profile fetched from API - RAW DATA:", {
                businessName: profile.businessName,
                businessAddress: profile.businessAddress,
                storeLogo: profile.storeLogo,
                kycDocumentUrls: profile.kycDocumentUrls,
                isVerified: profile.isVerified,
                totalSales: profile.totalSales,
                productCount: data.data.seller.productCount
              });
              console.log("✓ MAPPED DATA:", sellerProfile);
              
              // Also update productCount variable from API
              productCount = data.data.seller.productCount || 0;
              console.log("✓ Product count from API:", productCount);
            }
          }
        } catch (err) {
          console.error("❌ Exception with API fallback:", err.message);
        }
      }

      // Fetch product count
      if (typeof supabase !== 'undefined') {
        try {
          console.log("🔍 Using Supabase - Querying products table for seller:", userId);
          const { count, error } = await supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("seller_id", userId);
          
          console.log("📊 Products query returned:", { count, error });
          
          if (error) {
            console.error("❌ Error fetching product count:", error.message, error);
          } else {
            productCount = count || 0;
            console.log("✓ Product count from Supabase:", productCount);
          }
        } catch (err) {
          console.error("❌ Exception fetching product count:", err.message, err);
        }
      } else {
        console.log("⚠️ Supabase not available - product count check skipped");
      }

      // Check conditions
      storeSetupCompleted = 
        !!(sellerProfile?.store_name && 
           sellerProfile?.store_logo_url && 
           sellerProfile?.business_address);
      
      // KYC is only complete if verified AND has submitted meaningful KYC data (website or at least one social link filled)
      const hasKycData = sellerProfile?.kyc_document_urls && (
        sellerProfile.kyc_document_urls.website || 
        (sellerProfile.kyc_document_urls.social_links && Object.values(sellerProfile.kyc_document_urls.social_links).some(v => v))
      );
      kycCompleted = sellerProfile?.kyc_verified && hasKycData;
      
      totalSales = sellerProfile?.total_sales || 0;

      console.log("Checking conditions:", {
        storeSetupCompleted,
        kycCompleted,
        kyc_verified: sellerProfile?.kyc_verified,
        kycDocumentUrls: sellerProfile?.kyc_document_urls,
        productCount,
        totalSales
      });

      // Determine progress level - check in order
      if (!storeSetupCompleted) {
        progress = 20;
        messageHTML = '<a href="setup-store.html" style="color: #1e293b; text-decoration: underline; cursor: pointer;">Complete your store setup Here</a>';
        backgroundColor = "#ef4444"; // red
        console.log("Stage 1: Store setup needed");
      } 
      else if (!kycCompleted) {
        progress = 40;
        messageHTML = '<a href="kyc-verification.html" style="color: #1e293b; text-decoration: underline; cursor: pointer;">Complete KYC HERE</a>';
        backgroundColor = "#f97316"; // orange
        console.log("Stage 2: KYC needed");
      }
      else if (productCount < 1) {
        progress = 60;
        messageHTML = '<a href="sellers product.html" style="color: #1e293b; text-decoration: underline; cursor: pointer;">Add your first product HERE</a>';
        backgroundColor = "#eab308"; // yellow
        console.log("Stage 3: First product needed");
      }
      else if (totalSales < 1) {
        progress = 75;
        messageHTML = 'Make your first sale';
        backgroundColor = "#86efac"; // lightgreen
        console.log("Stage 4: First sale needed");
      }
      else if (totalSales < 10) {
        progress = 90;
        messageHTML = 'Reach 10 sales';
        backgroundColor = "#22c55e"; // green
        console.log("Stage 5: Need 10 sales");
      }
      else {
        progress = 100;
        messageHTML = 'Verified Seller ✓';
        backgroundColor = "#3b82f6"; // blue
        console.log("Stage 6: Verified seller");
      }

      // Update progress bar
      progressBar.style.width = progress + "%";
      progressBar.style.backgroundColor = backgroundColor;

      // Update progress text with HTML
      progressText.innerHTML = messageHTML;

      console.log("✓ Progress tracker updated:", { 
        progress,
        stage: messageHTML,
        color: backgroundColor
      });

    } catch (error) {
      console.error("ERROR updating progress tracker:", error);
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
