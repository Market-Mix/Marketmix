(() => {
  const milestones = [
    { key: "store_setup", title: "Store Setup" },
    { key: "upload_product", title: "Upload Product" },
    { key: "shopping_details", title: "Shopping Details" },
    { key: "first_sales", title: "First Sales" },
    { key: "withdraw_earning", title: "Withdraw Earnings" },
    { key: "complete", title: "Complete" }
  ];

  function normalizeKycStatus(rawStatus, previousStatus = "not_submitted") {
    const status = String(rawStatus || "").trim().toLowerCase();
    if (!status) return previousStatus || "not_submitted";
    if (status === "under_review" || status === "pending" || status.includes("review") || status.includes("submitted")) {
      return "pending";
    }
    if (status === "approved" || status.includes("approved") || status.includes("verified")) {
      return "approved";
    }
    if (status === "rejected" || status === "failed" || status.includes("reject")) {
      return "rejected";
    }
    if (status === "not_submitted" || status.includes("not") || status.includes("unsubmitted")) {
      return "not_submitted";
    }
    return previousStatus || "not_submitted";
  }

  function calculate(profile, store, user, previousKycStatus = "not_submitted") {
    const p = profile?.profile || profile || {};
    const rawKycStatus = p?.kyc_status ?? p?.kycStatus;
    const kycStatus = normalizeKycStatus(rawKycStatus, previousKycStatus);
    const isVerifiedFlag = kycStatus === "approved";
    const isRejectedFlag = ["rejected", "failed"].includes(kycStatus);
    const isKycPendingFlag = kycStatus === "pending";
    const isNotSubmitted = kycStatus === "not_submitted";
    const userAddress = user?.address || user?.business_address || p?.address || p?.business_address || null;
    const hasShoppingDetails = !!(
      userAddress ||
      user?.city || user?.state || user?.postalCode || user?.country ||
      p?.city || p?.state || p?.postalCode || p?.country
    );

    const storeLogoUrl = store?.store_logo_url || store?.storeLogo || store?.logo_url || store?.logo;
    const storeAddress = store?.business_address || store?.address || store?.store_address;
    const storeSetupDone = !!(store?.business_name && storeLogoUrl && storeAddress);
    const productCount = store?.productCount || store?.product_count || 0;
    const totalSales = store?.total_sales || 0;
    const completedStages = [];
    if (storeSetupDone) completedStages.push("store_setup");
    if (productCount >= 1) completedStages.push("upload_product");
    if (productCount >= 1 && hasShoppingDetails) completedStages.push("shopping_details");
    if (totalSales >= 1) completedStages.push("first_order");

    let stage = "unknown";
    let progress = 0;
    let color = "#2563eb";
    let actionHtml = "";
    let actionText = "";
    let actionHref = "";
    let badgeText = "";
    let badgeClass = "";

    if (!storeSetupDone) {
      stage = "store_setup";
      progress = 15;
      color = "#ef4444";
      actionText = "Complete your store setup";
      actionHref = "sellers setting.html";
    } else if (productCount < 1) {
      progress = 30;
      if (isNotSubmitted) {
        stage = "kyc_not_submitted";
        color = "#ef4444";
        actionText = "Complete KYC";
        actionHref = "kyc-verification.html";
      } else {
        stage = "upload_product";
        if (isVerifiedFlag) {
          color = "#16a34a";
        } else if (isRejectedFlag) {
          color = "#dc2626";
        } else if (isKycPendingFlag) {
          color = "#f59e0b";
        } else {
          color = "#f97316";
        }
        actionText = "Upload your first product";
        actionHref = "sellers product.html";
      }
    } else if (productCount >= 1 && !hasShoppingDetails) {
      stage = "shopping_details";
      progress = 60;
      color = "#eab308";
      actionText = "Setup your shopping details";
      actionHref = "sellers-account.html#address";
    } else if (productCount >= 1 && hasShoppingDetails && totalSales < 1) {
      stage = "first_sales";
      progress = 75;
      color = "#86efac";
      actionText = "Make your first sales";
    } else if (totalSales >= 1 && !(productCount >= 1 && hasShoppingDetails && isVerifiedFlag)) {
      stage = "withdraw_earning";
      progress = 90;
      color = "#22c55e";
      actionText = "Withdraw your first earning";
      actionHref = "sellers earning.html";
    }

    if (isRejectedFlag) {
      badgeText = "KYC Failed";
      badgeClass = "red";
    } else if (isVerifiedFlag) {
      badgeText = '<i class="fas fa-check-circle"></i> Verified';
      badgeClass = "green";
    }

    if (storeSetupDone && productCount >= 1 && hasShoppingDetails && totalSales >= 1) {
      stage = "complete";
      progress = 100;
      if (isVerifiedFlag) {
        color = "#3b82f6";
        actionText = "Everything complete!";
        badgeText = '<i class="fas fa-check-circle"></i> Fully Verified';
        badgeClass = "blue";
      } else if (isKycPendingFlag) {
        color = "#f59e0b";
        actionText = "Your KYC is under review";
        actionHref = "kyc-verification.html";
        badgeText = "KYC Under Review";
        badgeClass = "yellow";
      } else if (isRejectedFlag) {
        color = "#dc2626";
        actionText = "KYC rejected — resubmit";
        actionHref = "kyc-verification.html";
        badgeText = "KYC Rejected";
        badgeClass = "red";
      } else {
        color = "#f97316";
        actionText = "Review your KYC status";
        actionHref = "kyc-verification.html";
        badgeText = "KYC Pending";
        badgeClass = "yellow";
      }
    }

    if (actionHref) {
      actionHtml = `<a href="${actionHref}" style="color:#1e293b;text-decoration:underline">${actionText}</a>`;
    } else {
      actionHtml = actionText;
    }

    const milestoneStatuses = {
      store_setup: storeSetupDone ? "complete" : "pending",
      upload_product: Number(productCount) >= 1 ? "complete" : "pending",
      shopping_details: Number(productCount) >= 1 && hasShoppingDetails ? "complete" : "pending",
      first_sales: Number(totalSales) >= 1 ? "complete" : "pending",
      withdraw_earning: "pending",
      complete: "pending"
    };
    const activeMilestone = stage === "kyc_not_submitted" ? "upload_product" : stage;
    if (milestoneStatuses[activeMilestone] === "pending") milestoneStatuses[activeMilestone] = "current";

    return {
      stage,
      progress,
      color,
      actionHtml,
      trackerHtml: progress === 100
        ? "<strong>Congratulations!</strong><br>Your seller account setup is complete."
        : actionHtml,
      actionText,
      actionHref,
      badgeText,
      badgeClass,
      accountCompleted: progress === 100,
      kycStatus,
      isVerifiedFlag,
      isRejectedFlag,
      isKycPendingFlag,
      isNotSubmitted,
      storeSetupDone,
      productCount,
      totalSales,
      hasShoppingDetails,
      completedStages,
      currentMilestone: stage === "kyc_not_submitted"
        ? "Complete KYC"
        : milestones.find(milestone => milestone.key === stage)?.title || "Progress unavailable",
      milestones: milestones.map(milestone => ({
        ...milestone,
        status: milestoneStatuses[milestone.key]
      }))
    };
  }

  window.SellerProgress = { normalizeKycStatus, calculate };
})();
