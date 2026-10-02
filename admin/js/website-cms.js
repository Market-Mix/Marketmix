const CMS_API = `${window.ADMIN_API_BASE || 'https://marketmix-backend.onrender.com/api'}/admin/cms`;
const cms = { pages: [], sections: [], banners: [], posts: [], activity: [], summary: {}, pageId: null, bannerId: null, postId: null };
const cmsEsc = s => window.escapeHtml(s);
const cmsDate = d => d ? new Date(d).toLocaleDateString() : '—';
const cmsLocal = d => d ? new Date(new Date(d) - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
const cmsEl = id => document.getElementById(id);
const cmsVal = id => (cmsEl(id)?.value || '').trim();

async function cmsApi(path = '', method = 'GET', body, isForm = false) {
  const headers = { ...getAdminAuthHeaders() };
  if (body && !isForm) headers['Content-Type'] = 'application/json';
  const res = await fetch(CMS_API + path, { method, headers, body: body ? (isForm ? body : JSON.stringify(body)) : undefined });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || 'Request failed');
  return json.data;
}

async function cmsReload() {
  try {
    const [s, p, sec, b, bl, a] = await Promise.all([cmsApi('/summary'), cmsApi('/pages'), cmsApi('/sections'),
      cmsApi('/banners'), cmsApi('/blog'), cmsApi('/activity')]);
    Object.assign(cms, { summary: s, pages: p.pages, sections: sec.sections, banners: b.banners, posts: bl.posts, activity: a.activity });
    renderCmsSummaryCards(); renderPagesTable(); renderHomepageSections(); renderBanners(); renderPosts(); renderActivity(); renderOverview();
  } catch (e) { showToast(e.message, 'error'); }
}

function renderCmsSummaryCards() {
  const s = cms.summary;
  const cards = [['Published Pages', s.published, 'fa-file-alt'], ['Draft Pages', s.drafts, 'fa-pencil-alt'],
    ['Homepage Sections', s.sections, 'fa-th-large'], ['Active Banners', s.activeBanners, 'fa-image'],
    ['Blog Posts', s.posts, 'fa-newspaper'], ['Last Updated', cmsDate(s.lastUpdated), 'fa-clock']];
  cmsEl('summaryCards').innerHTML = cards.map(([t, v, i]) => `
    <div class="metric-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="mb-3 w-fit rounded-xl bg-slate-100 px-3 py-2 text-slate-700"><i class="fa-solid ${i}"></i></div>
      <p class="text-sm text-slate-500">${t}</p><p class="mt-2 text-2xl font-semibold text-slate-900">${v ?? 0}</p></div>`).join('');
}

function renderOverview() {
  const s = cms.summary, set = (id, v) => { const el = cmsEl(id); if (el) el.textContent = v; };
  set('overviewTotalPages', s.totalPages); set('overviewPublishedToday', s.publishedToday);
  set('overviewScheduled', s.scheduled); set('overviewPromos', s.activeBanners);
}

const PAGE_BADGE = { published: 'bg-emerald-50 text-emerald-700', draft: 'bg-slate-100 text-slate-600', scheduled: 'bg-blue-50 text-blue-700', hidden: 'bg-amber-50 text-amber-700' };

function renderPagesTable() {
  cmsEl('pagesTableBody').innerHTML = cms.pages.length ? cms.pages.map(p => `
    <tr><td class="px-4 py-3 font-medium text-slate-900">${cmsEsc(p.title)}<div class="text-xs text-slate-400">/${cmsEsc(p.slug)}</div></td>
      <td class="px-4 py-3">${cmsEsc(p.category)}</td>
      <td class="px-4 py-3"><span class="px-2 py-1 rounded-full text-xs ${PAGE_BADGE[p.status]}">${p.status}</span></td>
      <td class="px-4 py-3">${cmsDate(p.updatedAt)}</td><td class="px-4 py-3">${cmsEsc(p.updatedBy)}</td>
      <td class="px-4 py-3 capitalize">${p.visibility}</td>
      <td class="px-4 py-3"><div class="flex gap-2">
        ${['view', 'edit', 'duplicate', 'delete'].map(a => `<button data-act="${a}" data-id="${p.id}" class="rounded-lg border px-3 py-1 ${a === 'delete' ? 'text-red-600' : ''}">${a[0].toUpperCase() + a.slice(1)}</button>`).join('')}
      </div></td></tr>`).join('')
    : '<tr><td colspan="7" class="px-4 py-10 text-center text-slate-500">No pages yet. Click “Create New Page”.</td></tr>';
}

function renderHomepageSections() {
  cmsEl('sectionsList').innerHTML = cms.sections.map(s => `
    <div class="flex items-center justify-between border p-3 rounded-lg">
      <div><p class="font-semibold">${cmsEsc(s.label)}</p><p class="text-xs text-slate-500">Show or hide on the buyers homepage.</p></div>
      <label class="inline-flex items-center"><input type="checkbox" class="section-toggle" data-key="${s.key}" ${s.isEnabled ? 'checked' : ''} />
        <span class="ml-2 text-sm">Enabled</span></label></div>`).join('');
}

function renderBanners() {
  cmsEl('bannersList').innerHTML = cms.banners.length ? cms.banners.map(b => `
    <div class="flex items-center justify-between border p-3 rounded-lg gap-3">
      <div class="flex items-center gap-3 min-w-0"><img src="${cmsEsc(b.imageUrl)}" class="w-20 h-12 rounded object-cover bg-slate-100">
        <div class="min-w-0"><p class="font-semibold truncate">${cmsEsc(b.title)}</p>
        <p class="text-xs text-slate-500">${b.location.replace('_', ' ')} • ${b.startsAt ? cmsDate(b.startsAt) : 'Now'} → ${b.endsAt ? cmsDate(b.endsAt) : 'No end'}</p></div></div>
      <div class="flex gap-2 shrink-0"><span class="text-sm px-2 py-1 rounded bg-slate-50">${b.status}</span>
        <button data-bact="edit" data-id="${b.id}" class="rounded-xl border px-3 py-1">Edit</button>
        <button data-bact="delete" data-id="${b.id}" class="rounded-xl border px-3 py-1 text-red-600">Delete</button></div></div>`).join('')
    : '<p class="text-sm text-slate-500">No banners yet.</p>';
}

function renderPosts() {
  cmsEl('postsList').innerHTML = cms.posts.length ? cms.posts.map(p => `
    <div class="flex items-center justify-between border p-3 rounded-lg gap-3">
      <div class="flex items-center gap-3 min-w-0">${p.coverImageUrl ? `<img src="${cmsEsc(p.coverImageUrl)}" class="w-16 h-12 rounded object-cover">` : '<div class="w-16 h-12 rounded bg-slate-100"></div>'}
        <div class="min-w-0"><p class="font-semibold truncate">${cmsEsc(p.title)}</p><p class="text-xs text-slate-500">${p.status} • ${cmsDate(p.publishedAt || p.updatedAt)}</p></div></div>
      <div class="flex gap-2 shrink-0"><button data-pact="edit" data-id="${p.id}" class="rounded-xl border px-3 py-1">Edit</button>
        <button data-pact="delete" data-id="${p.id}" class="rounded-xl border px-3 py-1 text-red-600">Delete</button></div></div>`).join('')
    : '<p class="text-sm text-slate-500">No posts yet.</p>';
}

function renderActivity() {
  cmsEl('cmsActivity').innerHTML = cms.activity.length
    ? cms.activity.map(a => `<div class="py-2 border-b text-sm text-slate-700 capitalize">${cmsEsc(a.text)} <span class="text-xs text-slate-400">• ${cmsDate(a.at)}</span></div>`).join('')
    : '<p class="text-sm text-slate-500">No activity yet.</p>';
}

const cmsOpen = id => cmsEl(id).classList.remove('hidden');
const cmsClose = id => cmsEl(id).classList.add('hidden');

function openEditor(id = null) {
  const p = id ? cms.pages.find(x => x.id === id) : null; cms.pageId = id;
  cmsEl('editorTitle').textContent = p ? `Edit: ${p.title}` : 'New Page';
  const set = (k, v) => { cmsEl(k).value = v ?? ''; };
  set('pageTitleInput', p?.title); set('pageSlugInput', p?.slug); set('metaTitleInput', p?.metaTitle);
  set('metaDescriptionInput', p?.metaDescription); set('keywordsInput', p?.keywords); set('pageStatusSelect', p?.status || 'draft');
  set('richContent', p?.content); set('pageVisibility', p?.visibility || 'public'); set('pagePublishAt', cmsLocal(p?.publishAt));
  cmsEl('featuredImageInput').value = '';
  cmsOpen('cmsEditorDrawer');
}

async function savePage(forceStatus) {
  const btns = [...document.querySelectorAll('#cmsEditorForm button')]; btns.forEach(b => b.disabled = true);
  try {
    let featuredImageUrl = null;
    const file = cmsEl('featuredImageInput').files[0];
    if (file) { const fd = new FormData(); fd.append('file', file); featuredImageUrl = (await cmsApi('/upload', 'POST', fd, true)).url; }
    const body = { title: cmsVal('pageTitleInput'), slug: cmsVal('pageSlugInput'), metaTitle: cmsVal('metaTitleInput'),
      metaDescription: cmsVal('metaDescriptionInput'), keywords: cmsVal('keywordsInput'), content: cmsEl('richContent').value,
      status: forceStatus || cmsVal('pageStatusSelect'), visibility: cmsVal('pageVisibility'), publishAt: cmsVal('pagePublishAt'),
      featuredImageUrl, category: cms.pages.find(x => x.id === cms.pageId)?.category || 'Info' };
    await cmsApi(cms.pageId ? `/pages/${cms.pageId}` : '/pages', cms.pageId ? 'PUT' : 'POST', body);
    showToast(body.status === 'published' ? 'Page published' : 'Page saved'); cmsClose('cmsEditorDrawer'); cmsReload();
  } catch (e) { showToast(e.message, 'error'); } finally { btns.forEach(b => b.disabled = false); }
}

function openBannerDrawer(id = null) {
  const b = id ? cms.banners.find(x => x.id === id) : null; cms.bannerId = id;
  cmsEl('bannerDrawerTitle').textContent = b ? 'Edit Banner' : 'New Banner';
  const set = (k, v) => { cmsEl(k).value = v ?? ''; };
  set('bnTitle', b?.title); set('bnLink', b?.linkUrl); set('bnLocation', b?.location || 'homepage_hero');
  set('bnStart', cmsLocal(b?.startsAt)); set('bnEnd', cmsLocal(b?.endsAt)); set('bnOrder', b?.sortOrder ?? 0);
  cmsEl('bnActive').checked = b ? b.isActive : true; cmsEl('bnImage').value = '';
  cmsOpen('bannerDrawer');
}
async function saveBanner() {
  const btn = cmsEl('bnSave'); btn.disabled = true;
  try {
    const fd = new FormData();
    fd.append('title', cmsVal('bnTitle')); fd.append('linkUrl', cmsVal('bnLink')); fd.append('location', cmsVal('bnLocation'));
    fd.append('sortOrder', cmsVal('bnOrder')); fd.append('isActive', cmsEl('bnActive').checked);
    if (cmsVal('bnStart')) fd.append('startsAt', new Date(cmsVal('bnStart')).toISOString());
    if (cmsVal('bnEnd')) fd.append('endsAt', new Date(cmsVal('bnEnd')).toISOString());
    const f = cmsEl('bnImage').files[0]; if (f) fd.append('image', f);
    await cmsApi(cms.bannerId ? `/banners/${cms.bannerId}` : '/banners', cms.bannerId ? 'PUT' : 'POST', fd, true);
    showToast('Banner saved'); cmsClose('bannerDrawer'); cmsReload();
  } catch (e) { showToast(e.message, 'error'); } finally { btn.disabled = false; }
}

function openPostDrawer(id = null) {
  const p = id ? cms.posts.find(x => x.id === id) : null; cms.postId = id;
  cmsEl('postDrawerTitle').textContent = p ? 'Edit Post' : 'New Post';
  const set = (k, v) => { cmsEl(k).value = v ?? ''; };
  set('pbTitle', p?.title); set('pbAuthor', p?.authorName || 'MarketMix Team'); set('pbExcerpt', p?.excerpt);
  set('pbContent', p?.content); set('pbStatus', p?.status || 'draft'); set('pbPublishAt', cmsLocal(p?.publishedAt));
  cmsEl('pbCover').value = ''; cmsOpen('postDrawer');
}
async function savePost() {
  const btn = cmsEl('pbSave'); btn.disabled = true;
  try {
    const fd = new FormData();
    fd.append('title', cmsVal('pbTitle')); fd.append('authorName', cmsVal('pbAuthor')); fd.append('excerpt', cmsVal('pbExcerpt'));
    fd.append('content', cmsEl('pbContent').value); fd.append('status', cmsVal('pbStatus'));
    if (cmsVal('pbPublishAt')) fd.append('publishedAt', new Date(cmsVal('pbPublishAt')).toISOString());
    const f = cmsEl('pbCover').files[0]; if (f) fd.append('cover', f);
    await cmsApi(cms.postId ? `/blog/${cms.postId}` : '/blog', cms.postId ? 'PUT' : 'POST', fd, true);
    showToast('Post saved'); cmsClose('postDrawer'); cmsReload();
  } catch (e) { showToast(e.message, 'error'); } finally { btn.disabled = false; }
}

function renderPagePreviewHtml(p) {
  return `<div class="space-y-4"><p class="text-sm text-slate-500">${cmsEsc(p.category)} • ${p.status} • /${cmsEsc(p.slug)}</p>
    <h4 class="text-xl font-semibold">${cmsEsc(p.title)}</h4>
    <div class="text-slate-700 whitespace-pre-line">${cmsEsc(p.content) || 'No content yet.'}</div></div>`;
}

function wireCmsButtons() {
  cmsEl('refreshCmsBtn').addEventListener('click', async () => { await cmsReload(); showToast('Refreshed'); });
  cmsEl('createPageBtn').addEventListener('click', () => openEditor());
  cmsEl('previewSiteBtn').addEventListener('click', () => window.open('../buyers/buyers%20homepage.html', '_blank'));
  cmsEl('publishChangesBtn').classList.add('hidden');
  cmsEl('saveDraftCms').addEventListener('click', () => savePage('draft'));
  cmsEl('publishCms').addEventListener('click', () => savePage('published'));
  cmsEl('previewCms').addEventListener('click', () => openPreview('Preview', renderPagePreviewHtml({ title: cmsVal('pageTitleInput'),
    slug: cmsVal('pageSlugInput'), category: '', status: cmsVal('pageStatusSelect'), content: cmsEl('richContent').value })));
  cmsEl('addBannerBtn').addEventListener('click', () => openBannerDrawer());
  cmsEl('bnSave').addEventListener('click', saveBanner);
  cmsEl('addPostBtn').addEventListener('click', () => openPostDrawer());
  cmsEl('pbSave').addEventListener('click', savePost);

  document.querySelectorAll('[data-close-drawer]').forEach(el => el.addEventListener('click', () => el.closest('.drawer')?.classList.add('hidden')));
  document.querySelectorAll('[data-close-preview]').forEach(el => el.addEventListener('click', closePreview));

  cmsEl('pagesTableBody').addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const p = cms.pages.find(x => x.id === b.dataset.id);
    try {
      if (b.dataset.act === 'edit') openEditor(p.id);
      else if (b.dataset.act === 'view') openPreview('Page: ' + p.title, renderPagePreviewHtml(p));
      else if (b.dataset.act === 'duplicate') { await cmsApi(`/pages/${p.id}/duplicate`, 'POST'); showToast('Page duplicated'); cmsReload(); }
      else if (confirm(`Delete "${p.title}"?`)) { await cmsApi(`/pages/${p.id}`, 'DELETE'); showToast('Page deleted'); cmsReload(); }
    } catch (err) { showToast(err.message, 'error'); }
  });
  cmsEl('sectionsList').addEventListener('change', async e => {
    const t = e.target.closest('.section-toggle'); if (!t) return;
    try { await cmsApi(`/sections/${t.dataset.key}`, 'PUT', { isEnabled: t.checked }); showToast('Section updated'); }
    catch (err) { t.checked = !t.checked; showToast(err.message, 'error'); }
  });
  cmsEl('bannersList').addEventListener('click', async e => {
    const b = e.target.closest('button[data-bact]'); if (!b) return;
    if (b.dataset.bact === 'edit') return openBannerDrawer(b.dataset.id);
    if (!confirm('Delete this banner?')) return;
    try { await cmsApi(`/banners/${b.dataset.id}`, 'DELETE'); showToast('Banner deleted'); cmsReload(); } catch (err) { showToast(err.message, 'error'); }
  });
  cmsEl('postsList').addEventListener('click', async e => {
    const b = e.target.closest('button[data-pact]'); if (!b) return;
    if (b.dataset.pact === 'edit') return openPostDrawer(b.dataset.id);
    if (!confirm('Delete this post?')) return;
    try { await cmsApi(`/blog/${b.dataset.id}`, 'DELETE'); showToast('Post deleted'); cmsReload(); } catch (err) { showToast(err.message, 'error'); }
  });
}

function initializeWebsiteCMSPage() { wireCmsButtons(); cmsReload(); }

function openPreview(title, html){
  const drawer = document.getElementById('cmsPreviewDrawer');
  if(!drawer) return;
  document.getElementById('previewTitle').textContent = title;
  document.getElementById('cmsPreviewContent').innerHTML = html;
  drawer.classList.remove('hidden');
}

function closePreview(){
  const drawer = document.getElementById('cmsPreviewDrawer');
  if(!drawer) return;
  drawer.classList.add('hidden');
}

window.initializeWebsiteCMSPage = initializeWebsiteCMSPage;
