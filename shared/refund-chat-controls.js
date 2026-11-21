(function (root, factory) {
  const controls = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = controls;
  if (root) root.RefundChatControls = controls;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const PAUSED_NOTICE = 'MarketMix has temporarily paused your ability to send messages while this issue is being resolved.';

  function isPartyPaused(caseInfo, party) {
    if (party !== 'buyer' && party !== 'seller') return false;
    const value = caseInfo && caseInfo[`${party}_chat_paused`];
    return value === true || value === 'true';
  }

  function applyPartyPauseState(options) {
    const {
      caseInfo,
      party,
      inputRow,
      input,
      sendButton,
      fileInput,
      uploadControl,
      attachmentPreview,
      infoText,
      readOnly = false,
      stateKnown = true,
      pendingText = 'Checking messaging availability…',
      readOnlyText = '',
      normalText = ''
    } = options;
    const paused = isPartyPaused(caseInfo, party);

    if (inputRow) inputRow.style.display = paused ? 'none' : '';
    [input, sendButton, fileInput].forEach(control => {
      if (control) control.disabled = paused || readOnly || !stateKnown;
    });
    if (uploadControl) uploadControl.style.display = paused ? 'none' : '';
    if (paused && attachmentPreview) attachmentPreview.style.display = 'none';
    if (infoText) infoText.textContent = paused ? PAUSED_NOTICE : (!stateKnown ? pendingText : (readOnly ? readOnlyText : normalText));

    return paused;
  }

  function hasRefundManagePermission(response) {
    const payload = response && response.data ? response.data : response;
    return payload?.isSuper === true ||
      ['allowed', 'inherited'].includes(payload?.permissions?.Refunds?.Manage);
  }

  function getAdminRefundChatControlUrl(apiBase, caseId, party, action) {
    if (!['buyer', 'seller'].includes(party) || !['pause', 'resume'].includes(action)) {
      throw new TypeError('Invalid refund chat control');
    }
    return `${apiBase}/refund-chat/${encodeURIComponent(caseId)}/${action}/${party}`;
  }

  return {
    PAUSED_NOTICE,
    isPartyPaused,
    applyPartyPauseState,
    hasRefundManagePermission,
    getAdminRefundChatControlUrl
  };
});
