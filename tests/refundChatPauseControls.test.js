const test = require('node:test');
const assert = require('node:assert/strict');
const controls = require('../shared/refund-chat-controls');

function element(initial = {}) {
  return {
    style: { display: initial.display || '' },
    disabled: initial.disabled || false,
    textContent: initial.textContent || ''
  };
}

function apply(caseInfo, party, readOnly = false, stateKnown = true) {
  const ui = {
    inputRow: element(),
    input: element(),
    sendButton: element(),
    fileInput: element(),
    uploadControl: element(),
    attachmentPreview: element({ display: 'block' }),
    messageContainer: element({ display: 'block', textContent: 'Existing buyer, seller, and admin messages' }),
    infoText: element(),
    readOnlyText: 'Existing status restriction',
    normalText: 'All conversations are monitored by MarketMix'
  };
  const paused = controls.applyPartyPauseState({ caseInfo, party, ...ui, readOnly, stateKnown });
  return { ...ui, paused };
}

test('buyer and seller pause states remain independent', () => {
  const buyerPaused = apply({ buyer_chat_paused: true, seller_chat_paused: false }, 'buyer');
  const sellerActive = apply({ buyer_chat_paused: true, seller_chat_paused: false }, 'seller');
  assert.equal(buyerPaused.paused, true);
  assert.equal(sellerActive.paused, false);
  assert.equal(buyerPaused.inputRow.style.display, 'none');
  assert.equal(sellerActive.inputRow.style.display, '');
});

test('paused users can continue reading while composer and attachment controls are hidden', () => {
  const ui = apply({ seller_chat_paused: true }, 'seller');
  assert.equal(ui.paused, true);
  assert.equal(ui.inputRow.style.display, 'none');
  assert.equal(ui.input.disabled, true);
  assert.equal(ui.sendButton.disabled, true);
  assert.equal(ui.fileInput.disabled, true);
  assert.equal(ui.uploadControl.style.display, 'none');
  assert.equal(ui.attachmentPreview.style.display, 'none');
  assert.equal(ui.messageContainer.style.display, 'block');
  assert.equal(ui.messageContainer.textContent, 'Existing buyer, seller, and admin messages');
  assert.equal(ui.infoText.textContent, controls.PAUSED_NOTICE);
});

test('resuming restores composer and attachment controls', () => {
  const ui = apply({ buyer_chat_paused: false }, 'buyer');
  assert.equal(ui.paused, false);
  assert.equal(ui.inputRow.style.display, '');
  assert.equal(ui.input.disabled, false);
  assert.equal(ui.sendButton.disabled, false);
  assert.equal(ui.fileInput.disabled, false);
  assert.equal(ui.uploadControl.style.display, '');
  assert.equal(ui.infoText.textContent, 'All conversations are monitored by MarketMix');
});

test('composer stays disabled until the backend pause state is known', () => {
  const ui = apply({}, 'buyer', false, false);
  assert.equal(ui.paused, false);
  assert.equal(ui.inputRow.style.display, '');
  assert.equal(ui.input.disabled, true);
  assert.equal(ui.sendButton.disabled, true);
  assert.equal(ui.fileInput.disabled, true);
  assert.equal(ui.infoText.textContent, 'Checking messaging availability…');
});

test('existing refund-status read-only restrictions remain applied after resume', () => {
  const ui = apply({ seller_chat_paused: false }, 'seller', true);
  assert.equal(ui.inputRow.style.display, '');
  assert.equal(ui.input.disabled, true);
  assert.equal(ui.sendButton.disabled, true);
  assert.equal(ui.fileInput.disabled, true);
  assert.equal(ui.infoText.textContent, 'Existing status restriction');
});

test('Refunds Manage permission is read from the effective RBAC response', () => {
  assert.equal(controls.hasRefundManagePermission({
    data: { permissions: { Refunds: { Manage: 'inherited' } } }
  }), true);
  assert.equal(controls.hasRefundManagePermission({
    data: { permissions: { Refunds: { Manage: 'restricted' } } }
  }), false);
});

test('admin pause and resume URLs preserve the selected party', () => {
  assert.equal(
    controls.getAdminRefundChatControlUrl('/api', 'case/1', 'buyer', 'pause'),
    '/api/refund-chat/case%2F1/pause/buyer'
  );
  assert.equal(
    controls.getAdminRefundChatControlUrl('/api', 'case-2', 'seller', 'resume'),
    '/api/refund-chat/case-2/resume/seller'
  );
  assert.throws(() => controls.getAdminRefundChatControlUrl('/api', 'case', 'admin', 'pause'), TypeError);
});
