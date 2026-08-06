const cmsData = {
  pages: [
    { name: 'Homepage', category: 'Landing', status: 'Published', updated: '2026-08-03', by: 'Admin', visibility: 'Public' },
    { name: 'About Us', category: 'Info', status: 'Published', updated: '2026-07-29', by: 'Editor', visibility: 'Public' },
    { name: 'Contact Us', category: 'Support', status: 'Published', updated: '2026-07-25', by: 'Support', visibility: 'Public' },
    { name: 'FAQ', category: 'Help', status: 'Draft', updated: '2026-07-20', by: 'Editor', visibility: 'Public' },
    { name: 'Privacy Policy', category: 'Legal', status: 'Published', updated: '2026-06-30', by: 'Legal', visibility: 'Public' },
    { name: 'Terms & Conditions', category: 'Legal', status: 'Scheduled', updated: '2026-07-31', by: 'Legal', visibility: 'Public' },
    { name: 'Shipping Policy', category: 'Info', status: 'Hidden', updated: '2026-07-10', by: 'Logistics', visibility: 'Private' },
    { name: 'Return Policy', category: 'Info', status: 'Published', updated: '2026-07-05', by: 'Support', visibility: 'Public' }
  ],
  sections: [
    'Hero Banner','Featured Categories','Featured Products','Featured Sellers','Testimonials','Blog Section','Newsletter','Footer'
  ],
  banners: [
    { id: 'BNR-01', title: 'Summer Sale', location: 'Homepage Hero', schedule: '2026-08-05 to 2026-08-12', status: 'Active' },
    { id: 'BNR-02', title: 'Free Shipping', location: 'Category Sidebar', schedule: 'Always', status: 'Active' }
  ],
  activity: [
    'Homepage Updated by Admin • 2 hrs ago',
    'Banner Published • 1 day ago',
    'Privacy Policy Edited • 4 days ago',
    'FAQ Updated • 6 days ago',
    'Homepage Hero Changed • 2 weeks ago'
  ]
};

function renderCmsSummaryCards() {
  const cards = [
    { title: 'Published Pages', value: cmsData.pages.filter(p=>p.status==='Published').length, icon: 'fa-file-alt' },
    { title: 'Draft Pages', value: cmsData.pages.filter(p=>p.status==='Draft').length, icon: 'fa-pencil-alt' },
    { title: 'Homepage Sections', value: cmsData.sections.length, icon: 'fa-th-large' },
    { title: 'Active Banners', value: cmsData.banners.filter(b=>b.status==='Active').length, icon: 'fa-image' },
    { title: 'Featured Categories', value: 12, icon: 'fa-star' },
    { title: 'Last Updated', value: '2026-08-03', icon: 'fa-clock' }
  ];
  const container = document.getElementById('summaryCards');
  if (!container) return;
  container.innerHTML = cards.map(c=>`
    <div class="metric-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
      <div class="mb-3 flex items-center justify-between">
        <div class="rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 px-3 py-2 text-slate-700"><i class="fa-solid ${c.icon}"></i></div>
        <span class="rounded-full bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">${c.title}</span>
      </div>
      <p class="text-sm text-slate-500">${c.title}</p>
      <p class="mt-2 text-2xl font-semibold text-slate-900">${c.value}</p>
    </div>
  `).join('');
}

function renderPagesTable() {
  const body = document.getElementById('pagesTableBody');
  if (!body) return;
  body.innerHTML = cmsData.pages.map(p=>`
    <tr>
      <td class="px-4 py-3 font-medium text-slate-900">${p.name}</td>
      <td class="px-4 py-3">${p.category}</td>
      <td class="px-4 py-3"><span class="px-2 py-1 rounded-full text-xs bg-slate-100">${p.status}</span></td>
      <td class="px-4 py-3">${p.updated}</td>
      <td class="px-4 py-3">${p.by}</td>
      <td class="px-4 py-3">${p.visibility}</td>
      <td class="px-4 py-3">
        <div class="flex gap-2">
          <button class="view-page-btn rounded-lg border px-3 py-1" data-name="${p.name}">View</button>
          <button class="edit-page-btn rounded-lg border px-3 py-1" data-name="${p.name}">Edit</button>
          <button class="duplicate-page-btn rounded-lg border px-3 py-1" data-name="${p.name}">Duplicate</button>
          <button class="delete-page-btn rounded-lg border px-3 py-1 text-red-600" data-name="${p.name}">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.edit-page-btn').forEach(b=>b.addEventListener('click', (e)=> openEditor(e.currentTarget.dataset.name)));
  document.querySelectorAll('.view-page-btn').forEach(b=>b.addEventListener('click', (e)=> openPreview('Page: '+e.currentTarget.dataset.name, renderPagePreviewHtml(e.currentTarget.dataset.name))));
  document.querySelectorAll('.delete-page-btn').forEach(b=>b.addEventListener('click', (e)=> { if(confirm('Delete page?')) { cmsData.pages = cmsData.pages.filter(p=>p.name!==e.currentTarget.dataset.name); renderPagesTable(); showToast('Page deleted','success'); }}));
}

function renderHomepageSections() {
  const container = document.getElementById('sectionsList');
  if (!container) return;
  container.innerHTML = cmsData.sections.map(s=>`
    <div class="flex items-center justify-between border p-3 rounded-lg">
      <div>
        <p class="font-semibold">${s}</p>
        <p class="text-xs text-slate-500">Manage ${s.toLowerCase()} content and settings.</p>
      </div>
      <div class="flex gap-2">
        <label class="inline-flex items-center"><input type="checkbox" class="section-toggle" data-name="${s}" checked /><span class="ml-2 text-sm">Enabled</span></label>
        <button class="rounded-xl border px-3 py-1 preview-section-btn" data-name="${s}">Preview</button>
        <button class="rounded-xl border px-3 py-1 edit-section-btn" data-name="${s}">Edit</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.preview-section-btn').forEach(b=>b.addEventListener('click', e=> openPreview('Section: '+e.currentTarget.dataset.name, renderSectionPreviewHtml(e.currentTarget.dataset.name))));
  document.querySelectorAll('.edit-section-btn').forEach(b=>b.addEventListener('click', e=> openEditor(e.currentTarget.dataset.name)));
}

function renderBanners() {
  const container = document.getElementById('bannersList');
  if (!container) return;
  container.innerHTML = cmsData.banners.map(b=>`
    <div class="flex items-center justify-between border p-3 rounded-lg">
      <div class="flex items-center gap-3">
        <div class="w-16 h-10 bg-slate-100 rounded"></div>
        <div>
          <p class="font-semibold">${b.title}</p>
          <p class="text-xs text-slate-500">${b.location} • ${b.schedule}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <span class="text-sm px-2 py-1 rounded bg-slate-50">${b.status}</span>
        <button class="rounded-xl border px-3 py-1 edit-banner-btn" data-id="${b.id}">Edit</button>
        <button class="rounded-xl border px-3 py-1 delete-banner-btn" data-id="${b.id}">Delete</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.delete-banner-btn').forEach(b=>b.addEventListener('click', e=> { if(confirm('Delete banner?')) { cmsData.banners = cmsData.banners.filter(x=>x.id!==e.currentTarget.dataset.id); renderBanners(); showToast('Banner deleted','success'); }}));
}

function renderActivity() {
  const container = document.getElementById('cmsActivity');
  if (!container) return;
  container.innerHTML = cmsData.activity.map(a=>`<div class="py-2 border-b text-sm text-slate-700">${a}</div>`).join('');
}

function openEditor(pageName) {
  document.getElementById('cmsEditorDrawer').classList.remove('hidden');
  document.getElementById('cmsEditorDrawer').classList.add('active');
  document.getElementById('editorTitle').textContent = 'Edit: ' + pageName;
  const page = cmsData.pages.find(p=>p.name===pageName);
  if (!page) return;
  document.getElementById('pageTitleInput').value = page.name;
  document.getElementById('pageSlugInput').value = page.name.toLowerCase().replace(/\s+/g,'-');
  document.getElementById('metaTitleInput').value = page.name + ' - MarketMix';
  document.getElementById('metaDescriptionInput').value = 'Meta description for '+page.name;
  document.getElementById('keywordsInput').value = 'marketmix,'+page.name.toLowerCase();
  document.getElementById('pageStatusSelect').value = page.status;
  document.getElementById('richContent').value = page.name + ' content (dummy).';
}

function closeEditor() {
  document.getElementById('cmsEditorDrawer').classList.add('hidden');
  document.getElementById('cmsEditorDrawer').classList.remove('active');
}

function wireCmsButtons() {
  document.getElementById('refreshCmsBtn').addEventListener('click', ()=> { renderCmsSummaryCards(); renderPagesTable(); renderHomepageSections(); renderBanners(); renderActivity(); showToast('Refreshed','success'); });
  document.getElementById('createPageBtn').addEventListener('click', ()=> openEditor('New Page'));
  document.getElementById('publishChangesBtn').addEventListener('click', ()=> showToast('Published changes (UI-only)','success'));
  document.getElementById('previewSiteBtn').addEventListener('click', ()=> openPreview('Website Preview', renderSitePreviewHtml()));
  document.querySelectorAll('[data-close-drawer]').forEach(el=> el.addEventListener('click', closeEditor));
  document.querySelectorAll('[data-close-preview]').forEach(el=> el.addEventListener('click', closePreview));
  document.getElementById('saveDraftCms').addEventListener('click', ()=> showToast('Saved draft (UI-only)','success'));
  document.getElementById('publishCms').addEventListener('click', ()=> showToast('Published (UI-only)','success'));
}

function initializeWebsiteCMSPage() {
  renderCmsSummaryCards();
  renderPagesTable();
  renderHomepageSections();
  renderBanners();
  renderActivity();
  wireCmsButtons();
  document.getElementById('overviewTotalPages') && (document.getElementById('overviewTotalPages').textContent = String(cmsData.pages.length));
}

/* Preview drawer helpers */
function renderPagePreviewHtml(pageName){
  const page = cmsData.pages.find(p=>p.name===pageName) || {name: pageName, category:'', status:'', updated:'', by:'', visibility:''};
  return `
    <div class="space-y-4">
      <p class="text-sm text-slate-500">${page.category} • ${page.status} • Updated ${page.updated}</p>
      <h4 class="text-xl font-semibold text-slate-900">${page.name}</h4>
      <div class="prose text-slate-700">${page.name} content preview (UI-only).</div>
    </div>
  `;
}

function renderSectionPreviewHtml(name){
  return `
    <div class="space-y-4">
      <h4 class="text-xl font-semibold text-slate-900">${name}</h4>
      <p class="text-sm text-slate-700">This is a live preview of the ${name} section. Content is UI-only and for mockup purposes.</p>
      <div class="w-full h-40 bg-slate-100 rounded-lg"></div>
    </div>
  `;
}

function renderSitePreviewHtml(){
  return `
    <div class="space-y-4">
      <h4 class="text-xl font-semibold text-slate-900">Website Preview</h4>
      <p class="text-sm text-slate-700">Quick site preview (UI-only). Click a page to view details.</p>
      <ul class="mt-3 space-y-2">
        ${cmsData.pages.map(p=>`<li class="py-2 border rounded px-3"><a href="#" data-preview-page="${p.name}">${p.name} — ${p.category}</a></li>`).join('')}
      </ul>
    </div>
  `;
}

function openPreview(title, html){
  const drawer = document.getElementById('cmsPreviewDrawer');
  if(!drawer) return;
  document.getElementById('previewTitle').textContent = title;
  document.getElementById('cmsPreviewContent').innerHTML = html;
  drawer.classList.remove('hidden');
  // attach click handlers for links inside preview (e.g., page links)
  document.querySelectorAll('#cmsPreviewContent [data-preview-page]').forEach(a=> a.addEventListener('click', e=>{ e.preventDefault(); const name = e.currentTarget.dataset.previewPage; document.getElementById('previewTitle').textContent = 'Page: '+name; document.getElementById('cmsPreviewContent').innerHTML = renderPagePreviewHtml(name); }));
}

function closePreview(){
  const drawer = document.getElementById('cmsPreviewDrawer');
  if(!drawer) return;
  drawer.classList.add('hidden');
}

window.initializeWebsiteCMSPage = initializeWebsiteCMSPage;
