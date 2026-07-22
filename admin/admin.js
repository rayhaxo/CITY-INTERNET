/* ================= CITY INTERNET ADMIN — JS (FULL) ================= */
/* Handles: auth, routing, CRUD, charts, exports, toasts, theme, modals, search */

/* ---------- 0. THEME (shared across login + dashboard) ---------- */
(function initTheme(){
  const saved = localStorage.getItem('ci_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
})();

/* ============================================================
   1. LOGIN PAGE LOGIC
   ============================================================ */
const loginForm = document.getElementById('loginForm');
if (loginForm){
  const togglePass = document.getElementById('togglePass');
  togglePass.addEventListener('click', () => {
    const p = document.getElementById('password');
    p.type = p.type === 'password' ? 'text' : 'password';
    togglePass.querySelector('i').className =
      p.type === 'password' ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
  });

  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const err = document.getElementById('loginError');
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value.trim();
    err.textContent = '';
    btn.classList.add('loading');

    /* Auth — REPLACE with your Laravel Sanctum API call in production */
    setTimeout(() => {
      btn.classList.remove('loading');
      if (u === 'admin' && p === 'admin123'){
        localStorage.setItem('ci_auth', '1');
        localStorage.setItem('ci_user', u);
        if (document.getElementById('remember').checked){
          localStorage.setItem('ci_remember', '1');
        }
        window.location.href = 'dashboard.html';
      } else {
        err.textContent = 'Invalid credentials.';
        loginForm.classList.add('shake');
        setTimeout(() => loginForm.classList.remove('shake'), 500);
      }
    }, 900);
  });
}

/* ============================================================
   2. DASHBOARD GUARD + APP
   ============================================================ */
const pageArea = document.getElementById('pageArea');
if (pageArea){
  /* Auth guard */
  if (localStorage.getItem('ci_auth') !== '1'){
    window.location.href = 'login.html';
  }

  /* ===== LIVE DATABASE =====
     Empty by default. Everything you add through the UI is stored
     in localStorage and shown live on the dashboard.
     Replace the load/save helpers with your API calls in production. */

  const DEFAULT_PACKAGES = [
    {name:'Starter',  speed:'20 Mbps',  price:500,  features:['Unlimited Data','24/7 Support']},
    {name:'Standard', speed:'40 Mbps',  price:1000, features:['Unlimited Data','Priority Support','Free Router']},
    {name:'Premium',  speed:'80 Mbps',  price:1500, features:['Unlimited Data','Dedicated Support','Free Router','No FUP']},
    {name:'Ultra',    speed:'120 Mbps', price:2100, features:['Unlimited Data','Dedicated Support','Free Router','No FUP','Priority Line']},
  ];

  function loadStore(){
    let s;
    try { s = JSON.parse(localStorage.getItem('ci_data')); } catch(e){ s = null; }
    if (!s) s = {};
    return {
      customers: Array.isArray(s.customers) ? s.customers : [],
      invoices:  Array.isArray(s.invoices)  ? s.invoices  : [],
      packages:  Array.isArray(s.packages) && s.packages.length ? s.packages : DEFAULT_PACKAGES,
      logs:      Array.isArray(s.logs)      ? s.logs      : []
    };
  }
  function saveStore(){
    localStorage.setItem('ci_data', JSON.stringify(DB));
  }
  const DB = loadStore();

  /* Add an activity log entry (live) */
  function addLog(action){
    DB.logs.unshift({action, user: localStorage.getItem('ci_user') || 'admin', time: new Date().toLocaleString()});
    if (DB.logs.length > 100) DB.logs.pop();
    saveStore();
  }

  /* ===== TOAST NOTIFICATIONS ===== */
  function toast(msg, type='success'){
    const c = document.getElementById('toastContainer');
    const icons = {success:'fa-circle-check', error:'fa-circle-xmark', warning:'fa-triangle-exclamation'};
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fa-solid ${icons[type]}"></i><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(120%)';
      setTimeout(() => t.remove(), 300);
    }, 3000);
  }

  /* ===== MODAL SYSTEM ===== */
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  function openModal(html){ box.innerHTML = html; overlay.classList.add('show'); }
  function closeModal(){ overlay.classList.remove('show'); }
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  window.closeModal = closeModal;

  /* ===== EXPORT UTILITIES ===== */
  function exportExcel(rows, filename){
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    downloadBlob('\uFEFF' + csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
    toast('Excel/CSV exported', 'success');
  }
  function exportWord(title, tableHtml){
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${title}</title></head><body><h2>${title}</h2><p>Generated: ${new Date().toLocaleString()}</p>${tableHtml}</body></html>`;
    downloadBlob(html, `${title}.doc`, 'application/msword');
    toast('Word document exported', 'success');
  }
  function exportPDF(title, tableHtml){
    const w = window.open('', '', 'width=900,height=650');
    w.document.write(`<html><head><title>${title}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#222}
        h2{color:#3b82f6;margin-bottom:4px}
        p{color:#666;font-size:12px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:13px}
        th{background:#3b82f6;color:#fff}
        tr:nth-child(even){background:#f5f6fa}
      </style></head>
      <body><h2>City Internet — ${title}</h2><p>Generated: ${new Date().toLocaleString()}</p>${tableHtml}
      <script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close();
    toast('PDF ready — use "Save as PDF" in print dialog', 'success');
  }
  function printTable(title, tableHtml){ exportPDF(title, tableHtml); }
  function downloadBlob(content, filename, mime){
    const blob = new Blob([content], {type: mime});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function tableToHtml(headers, rows){
    return `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }

  /* ===== SMALL UI HELPERS ===== */
  function statCard(label, value, icon, bg, trend, dir){
    return `<div class="stat-card">
      <div class="icon ${bg}"><i class="fa-solid ${icon}"></i></div>
      <div class="value">${value}</div>
      <div class="label">${label}</div>
      ${trend ? `<div class="trend ${dir}"><i class="fa-solid fa-arrow-${dir==='up'?'trend-up':'trend-down'}"></i> ${trend}</div>` : ''}
    </div>`;
  }

  function customerTable(list, actions){
    if (!list.length){
      return `<div style="text-align:center;padding:40px;color:var(--muted)">
        <i class="fa-solid fa-inbox" style="font-size:34px;opacity:.5"></i><p style="margin-top:10px">No customers yet. Click "Add Customer" to get started.</p></div>`;
    }
    return `<div class="table-wrap"><table class="data-table"><thead><tr>
      <th>Customer</th><th>Phone</th><th>Package</th><th>Status</th><th>Due</th>${actions ? '<th>Actions</th>' : ''}
      </tr></thead><tbody>
      ${list.map(c => `<tr>
        <td><div class="avatar-cell">
          <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random">
          <div><b>${c.name}</b><br><small style="color:var(--muted)">${c.email||''}</small></div>
        </div></td>
        <td>${c.phone||'—'}</td>
        <td>${c.package||'—'}</td>
        <td><span class="status ${c.status}">${c.status}</span></td>
        <td>${c.due > 0 ? '৳' + c.due : '—'}</td>
        ${actions ? `<td><div class="action-btns">
          <button class="act-view" data-view="${c.id}" title="View"><i class="fa-solid fa-eye"></i></button>
          <button class="act-edit" data-edit="${c.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="act-del" data-del="${c.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div></td>` : ''}
      </tr>`).join('')}
    </tbody></table></div>`;
  }

  /* ===== MODAL TEMPLATES ===== */
  function customerForm(c = {}){
    const edit = !!c.id;
    return `<div class="modal-head">
        <h3>${edit ? 'Edit' : 'Add'} Customer</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body"><form id="custForm"><div class="form-grid">
        <div class="field"><label>Full Name *</label><input name="name" value="${c.name||''}" required></div>
        <div class="field"><label>Email</label><input name="email" type="email" value="${c.email||''}"></div>
        <div class="field"><label>Phone</label><input name="phone" value="${c.phone||''}"></div>
        <div class="field"><label>Package</label><select name="package">
          ${DB.packages.map(p => `<option ${c.package===p.speed?'selected':''}>${p.speed}</option>`).join('')}
        </select></div>
        <div class="field"><label>Status</label><select name="status">
          <option ${c.status==='active'?'selected':''}>active</option>
          <option ${c.status==='inactive'?'selected':''}>inactive</option>
          <option ${c.status==='pending'?'selected':''}>pending</option>
        </select></div>
        <div class="field"><label>Due (৳)</label><input name="due" type="number" value="${c.due||0}"></div>
        <div class="field full"><label>Address</label><input name="address" value="${c.address||''}"></div>
      </div></form></div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="saveCust" data-id="${c.id||''}">
          <i class="fa-solid fa-check"></i> ${edit ? 'Update' : 'Save'}
        </button>
      </div>`;
  }

  function customerView(c){
    return `<div class="modal-head">
        <h3>Customer Details</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div style="text-align:center;margin-bottom:20px">
          <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=4f46e5&color=fff&size=90" style="border-radius:50%">
          <h3 style="margin-top:12px">${c.name}</h3>
          <span class="status ${c.status}">${c.status}</span>
        </div>
        <div class="setting-row"><span style="color:var(--muted)">Email</span><b>${c.email||'—'}</b></div>
        <div class="setting-row"><span style="color:var(--muted)">Phone</span><b>${c.phone||'—'}</b></div>
        <div class="setting-row"><span style="color:var(--muted)">Package</span><b>${c.package||'—'}</b></div>
        <div class="setting-row"><span style="color:var(--muted)">Address</span><b>${c.address||'—'}</b></div>
        <div class="setting-row"><span style="color:var(--muted)">Joined</span><b>${c.joined||'—'}</b></div>
        <div class="setting-row"><span style="color:var(--muted)">Outstanding Due</span><b>${c.due>0?'৳'+c.due:'৳0'}</b></div>
      </div>
      <div class="modal-foot"><button class="btn btn-primary" onclick="closeModal()">Close</button></div>`;
  }

  function packageForm(p = {}, index = null){
    const edit = index !== null;
    return `<div class="modal-head">
        <h3>${edit ? 'Edit' : 'Add'} Package</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body"><form id="pkgForm"><div class="form-grid">
        <div class="field"><label>Plan Name *</label><input name="name" value="${p.name||''}" required></div>
        <div class="field"><label>Speed (e.g. 20 Mbps) *</label><input name="speed" value="${p.speed||''}" required></div>
        <div class="field"><label>Price (৳) *</label><input name="price" type="number" value="${p.price||''}" required></div>
        <div class="field full"><label>Features (comma separated)</label><input name="features" value="${(p.features||[]).join(', ')}"></div>
      </div></form></div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="savePkg" data-index="${edit?index:''}">
          <i class="fa-solid fa-check"></i> ${edit ? 'Update' : 'Save'}
        </button>
      </div>`;
  }

  /* ===== PAGE RENDERERS ===== */
  const pages = {
    dashboard(){
      /* ---- LIVE COUNTS ---- */
      const totalCustomers  = DB.customers.length;
      const activeCustomers = DB.customers.filter(c => c.status === 'active').length;
      const monthlyRevenue  = DB.invoices.filter(i => i.status === 'paid').reduce((s,i)=>s+(+i.amount||0),0);
      const pendingDues     = DB.customers.reduce((s,c)=>s+(+c.due||0),0);

      return `
      <div class="page-head">
        <div><h2>Dashboard</h2><p>Welcome back, Admin 👋 Here's your network overview.</p></div>
        <button class="btn btn-primary" onclick="location.reload()"><i class="fa-solid fa-rotate"></i> Refresh</button>
      </div>
      <div class="stats-grid">
        ${statCard('Total Customers', totalCustomers, 'fa-users','bg-primary','','')}
        ${statCard('Active Connections', activeCustomers, 'fa-signal','bg-success','','')}
        ${statCard('Monthly Revenue','৳'+monthlyRevenue.toLocaleString(),'fa-sack-dollar','bg-warning','','')}
        ${statCard('Pending Dues','৳'+pendingDues.toLocaleString(),'fa-clock','bg-info','','')}
      </div>
      <div class="charts-row">
        <div class="panel">
          <div class="panel-head"><h3>Revenue Overview</h3><span class="status active">${new Date().getFullYear()}</span></div>
          <canvas id="revenueChart" height="120"></canvas>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Package Share</h3></div>
          <canvas id="pkgChart" height="120"></canvas>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Recent Customers</h3>
          <button class="btn btn-outline btn-sm" data-goto="customers">View All</button>
        </div>
        ${customerTable(DB.customers.slice(0,5), false)}
      </div>`;
    },

    customers(){
      return `
      <div class="page-head">
        <div><h2>Customer Management</h2><p>Add, edit, view & manage all subscribers.</p></div>
        <button class="btn btn-primary" id="addCustomer"><i class="fa-solid fa-plus"></i> Add Customer</button>
      </div>
      <div class="panel">
        <div class="table-tools">
          <input type="text" id="custSearch" placeholder="🔍 Search customer...">
          <select id="custFilter">
            <option value="">All Status</option>
            <option>active</option><option>inactive</option><option>pending</option>
          </select>
          <div class="export-group">
            <button class="btn btn-sm btn-pdf" data-exp="pdf"><i class="fa-solid fa-file-pdf"></i> PDF</button>
            <button class="btn btn-sm btn-word" data-exp="word"><i class="fa-solid fa-file-word"></i> Word</button>
            <button class="btn btn-sm btn-excel" data-exp="excel"><i class="fa-solid fa-file-excel"></i> Excel</button>
            <button class="btn btn-sm btn-print" data-exp="print"><i class="fa-solid fa-print"></i> Print</button>
          </div>
        </div>
        <div id="custTableWrap">${customerTable(DB.customers, true)}</div>
      </div>`;
    },

    billing(){
      const rows = DB.invoices.map(i => [i.id, i.customer, '৳'+i.amount, i.date, i.method, `<span class="status ${i.status}">${i.status}</span>`]);
      const totalBilled = DB.invoices.reduce((s,i)=>s+(+i.amount||0),0);
      const collected   = DB.invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+(+i.amount||0),0);
      const outstanding = totalBilled - collected;
      return `
      <div class="page-head">
        <div><h2>Billing System</h2><p>Manage invoices & payments.</p></div>
        <button class="btn btn-primary" id="genInvoice"><i class="fa-solid fa-plus"></i> New Invoice</button>
      </div>
      <div class="stats-grid">
        ${statCard('Total Billed','৳'+totalBilled.toLocaleString(),'fa-file-invoice','bg-primary','','')}
        ${statCard('Collected','৳'+collected.toLocaleString(),'fa-check','bg-success','','')}
        ${statCard('Outstanding','৳'+outstanding.toLocaleString(),'fa-hourglass','bg-warning','','')}
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Invoices</h3>
          <div class="export-group">
            <button class="btn btn-sm btn-pdf" data-billexp="pdf"><i class="fa-solid fa-file-pdf"></i> PDF</button>
            <button class="btn btn-sm btn-excel" data-billexp="excel"><i class="fa-solid fa-file-excel"></i> Excel</button>
            <button class="btn btn-sm btn-print" data-billexp="print"><i class="fa-solid fa-print"></i> Print</button>
          </div>
        </div>
        ${DB.invoices.length ? `<div class="table-wrap"><table class="data-table">
          <thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Date</th><th>Method</th><th>Status</th></tr></thead>
          <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>` : `<div style="text-align:center;padding:40px;color:var(--muted)">
          <i class="fa-solid fa-file-invoice" style="font-size:34px;opacity:.5"></i><p style="margin-top:10px">No invoices yet.</p></div>`}
      </div>`;
    },

    packages(){
      return `
      <div class="page-head">
        <div><h2>Internet Packages</h2><p>Manage your service plans.</p></div>
        <button class="btn btn-primary" id="addPkg"><i class="fa-solid fa-plus"></i> Add Package</button>
      </div>
      ${DB.packages.length ? `<div class="pkg-grid">${DB.packages.map((p,idx) => `
        <div class="pkg-card">
          <div class="speed">${p.speed}</div>
          <h3>${p.name}</h3>
          <div class="price">৳${p.price}<small style="font-size:13px;color:var(--muted)">/mo</small></div>
          <ul>${(p.features||[]).map(f => `<li><i class="fa-solid fa-check"></i>${f}</li>`).join('')}</ul>
          <button class="btn btn-outline" style="width:100%" data-editpkg="${idx}">Edit Plan</button>
        </div>`).join('')}</div>` : `<div class="panel" style="text-align:center;padding:40px;color:var(--muted)">
          <i class="fa-solid fa-box" style="font-size:34px;opacity:.5"></i><p style="margin-top:10px">No packages yet.</p></div>`}`;
    },

    notifications(){
      return `
      <div class="page-head">
        <div><h2>Notifications</h2><p>Stay updated with system events.</p></div>
      </div>
      <div class="panel" style="text-align:center;padding:40px;color:var(--muted)">
        <i class="fa-solid fa-bell" style="font-size:34px;opacity:.5"></i>
        <p style="margin-top:10px">No new notifications.</p>
      </div>`;
    },

    logs(){
      return `
      <div class="page-head">
        <div><h2>Activity Logs</h2><p>Track all admin actions.</p></div>
        <button class="btn btn-sm btn-excel" id="expLogs"><i class="fa-solid fa-file-excel"></i> Export</button>
      </div>
      <div class="panel">${DB.logs.length ? `<div class="timeline">${DB.logs.map(l => `
        <div class="timeline-item"><b>${l.action}</b><br><small>by ${l.user} • ${l.time}</small></div>`).join('')}</div>`
        : `<div style="text-align:center;padding:40px;color:var(--muted)">
          <i class="fa-solid fa-clock-rotate-left" style="font-size:34px;opacity:.5"></i><p style="margin-top:10px">No activity yet.</p></div>`}</div>`;
    },

    settings(){
      return `
      <div class="page-head"><div><h2>Admin Settings</h2><p>Configure your control panel.</p></div></div>
      <div class="settings-tabs">
        <button class="active">General</button><button>Security</button><button>Notifications</button>
      </div>
      <div class="panel">
        <h3 style="margin-bottom:16px">General Settings</h3>
        <div class="form-grid">
          <div class="field"><label>Company Name</label><input id="setCompany" value="${localStorage.getItem('ci_company') || 'City Internet'}"></div>
          <div class="field"><label>Support Email</label><input id="setEmail" value="${localStorage.getItem('ci_email') || 'support@cityinternet.com'}"></div>
          <div class="field"><label>Currency</label><select><option>BDT (৳)</option><option>USD ($)</option></select></div>
          <div class="field"><label>Timezone</label><select><option>Asia/Dhaka</option><option>UTC</option></select></div>
        </div>
        <div style="margin-top:20px">
          <div class="setting-row">
            <div><b>Two-Factor Authentication</b><br><small style="color:var(--muted)">Extra login security</small></div>
            <label class="switch"><input type="checkbox"><span class="slider"></span></label>
          </div>
          <div class="setting-row">
            <div><b>Email Alerts</b><br><small style="color:var(--muted)">Get notified on new payments</small></div>
            <label class="switch"><input type="checkbox"><span class="slider"></span></label>
          </div>
          <div class="setting-row">
            <div><b>Auto Backup</b><br><small style="color:var(--muted)">Daily database backup</small></div>
            <label class="switch"><input type="checkbox"><span class="slider"></span></label>
          </div>
        </div>
        <button class="btn btn-primary" style="margin-top:20px" id="saveSettings"><i class="fa-solid fa-floppy-disk"></i> Save Changes</button>
      </div>`;
    }
  };

  /* ===== ROUTER ===== */
  function loadPage(name){
    pageArea.innerHTML = pages[name]();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === name));
    bindPageEvents(name);
    if (name === 'dashboard') drawCharts();
  }

  /* ===== PER-PAGE EVENT BINDINGS ===== */
  function bindPageEvents(name){
    document.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => loadPage(b.dataset.goto));

    if (name === 'customers'){
      document.getElementById('addCustomer').onclick = () => { openModal(customerForm()); bindCustForm(); };

      const search = document.getElementById('custSearch');
      const filter = document.getElementById('custFilter');
      function refresh(){
        const q = search.value.toLowerCase();
        const f = filter.value;
        const list = DB.customers.filter(c =>
          ((c.name||'').toLowerCase().includes(q) || (c.phone||'').includes(q) || (c.email||'').toLowerCase().includes(q)) &&
          (!f || c.status === f));
        document.getElementById('custTableWrap').innerHTML = customerTable(list, true);
        bindRowActions();
      }
      search.oninput = refresh;
      filter.onchange = refresh;
      bindRowActions();

      document.querySelectorAll('[data-exp]').forEach(b => b.onclick = () => {
        const headers = ['Name','Email','Phone','Package','Status','Due'];
        const rows = DB.customers.map(c => [c.name, c.email, c.phone, c.package, c.status, c.due]);
        const html = tableToHtml(headers, rows);
        const type = b.dataset.exp;
        if (type === 'excel') exportExcel([headers, ...rows], 'customers');
        else if (type === 'word') exportWord('Customers Report', html);
        else if (type === 'pdf') exportPDF('Customers Report', html);
        else printTable('Customers Report', html);
      });
    }

    if (name === 'billing'){
      document.getElementById('genInvoice').onclick = () => openInvoiceForm();
      document.querySelectorAll('[data-billexp]').forEach(b => b.onclick = () => {
        const headers = ['Invoice','Customer','Amount','Date','Method','Status'];
        const rows = DB.invoices.map(i => [i.id, i.customer, i.amount, i.date, i.method, i.status]);
        const html = tableToHtml(headers, rows);
        const type = b.dataset.billexp;
        if (type === 'excel') exportExcel([headers, ...rows], 'invoices');
        else if (type === 'pdf') exportPDF('Invoices Report', html);
        else printTable('Invoices Report', html);
      });
    }

    if (name === 'packages'){
      document.getElementById('addPkg').onclick = () => { openModal(packageForm()); bindPkgForm(); };
      document.querySelectorAll('[data-editpkg]').forEach(b => b.onclick = () => {
        const idx = +b.dataset.editpkg;
        openModal(packageForm(DB.packages[idx], idx));
        bindPkgForm();
      });
    }

    if (name === 'logs'){
      document.getElementById('expLogs').onclick = () => {
        const headers = ['Action','User','Time'];
        exportExcel([headers, ...DB.logs.map(l => [l.action, l.user, l.time])], 'activity_logs');
      };
    }

    if (name === 'settings'){
      document.getElementById('saveSettings').onclick = () => {
        localStorage.setItem('ci_company', document.getElementById('setCompany').value);
        localStorage.setItem('ci_email', document.getElementById('setEmail').value);
        addLog('Updated settings');
        toast('Settings saved successfully', 'success');
      };
      document.querySelectorAll('.settings-tabs button').forEach(t => t.onclick = () => {
        document.querySelectorAll('.settings-tabs button').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
      });
    }
  }

  /* ===== INVOICE FORM (live) ===== */
  function openInvoiceForm(){
    if (!DB.customers.length){ toast('Add a customer first', 'warning'); return; }
    openModal(`<div class="modal-head">
        <h3>New Invoice</h3><button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body"><form id="invForm"><div class="form-grid">
        <div class="field full"><label>Customer *</label><select name="customer">
          ${DB.customers.map(c => `<option>${c.name}</option>`).join('')}
        </select></div>
        <div class="field"><label>Amount (৳) *</label><input name="amount" type="number" required></div>
        <div class="field"><label>Status</label><select name="status"><option>paid</option><option>unpaid</option></select></div>
        <div class="field"><label>Method</label><input name="method" placeholder="bKash / Nagad / Cash / Card"></div>
        <div class="field"><label>Date</label><input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      </div></form></div>
      <div class="modal-foot">
        <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="saveInv"><i class="fa-solid fa-check"></i> Save</button>
      </div>`);
    document.getElementById('saveInv').onclick = () => {
      const data = Object.fromEntries(new FormData(document.getElementById('invForm')).entries());
      if (!data.amount){ toast('Amount is required','warning'); return; }
      const num = DB.invoices.length + 1001;
      DB.invoices.push({ id:'INV-'+num, customer:data.customer, amount:+data.amount,
        date:data.date, status:data.status, method:data.method || '—' });
      saveStore();
      addLog(`Generated invoice INV-${num}`);
      closeModal();
      loadPage('billing');
      toast('Invoice created', 'success');
    };
  }

  /* ===== PACKAGE FORM SAVE (live) ===== */
  function bindPkgForm(){
    document.getElementById('savePkg').onclick = () => {
      const data = Object.fromEntries(new FormData(document.getElementById('pkgForm')).entries());
      if (!data.name.trim() || !data.speed.trim() || !data.price){ toast('Name, speed & price required','warning'); return; }
      const pkg = {
        name: data.name.trim(),
        speed: data.speed.trim(),
        price: +data.price,
        features: data.features ? data.features.split(',').map(s=>s.trim()).filter(Boolean) : []
      };
      const idx = document.getElementById('savePkg').dataset.index;
      if (idx !== ''){ DB.packages[+idx] = pkg; addLog(`Updated package "${pkg.name}"`); toast('Package updated','success'); }
      else { DB.packages.push(pkg); addLog(`Added package "${pkg.name}"`); toast('Package added','success'); }
      saveStore();
      closeModal();
      loadPage('packages');
    };
  }

  /* ===== TABLE ROW ACTIONS ===== */
  function bindRowActions(){
    document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => {
      const c = DB.customers.find(x => x.id == b.dataset.view);
      openModal(customerView(c));
    });

    document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
      const c = DB.customers.find(x => x.id == b.dataset.edit);
      openModal(customerForm(c));
      bindCustForm();
    });

    document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      const c = DB.customers.find(x => x.id == b.dataset.del);
      openModal(`<div class="modal-head">
          <h3>Delete Customer</h3>
          <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body"><p>Are you sure you want to delete <b>${c.name}</b>? This action cannot be undone.</p></div>
        <div class="modal-foot">
          <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button class="btn btn-pdf" id="confirmDel"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>`);
      document.getElementById('confirmDel').onclick = () => {
        DB.customers = DB.customers.filter(x => x.id != c.id);
        saveStore();
        addLog(`Deleted customer "${c.name}"`);
        closeModal();
        loadPage('customers');
        toast('Customer deleted', 'error');
      };
    });
  }

  /* ===== CUSTOMER FORM SAVE (live add / edit) ===== */
  function bindCustForm(){
    document.getElementById('saveCust').onclick = () => {
      const f = document.getElementById('custForm');
      const data = Object.fromEntries(new FormData(f).entries());
      if (!data.name.trim()){ toast('Name is required', 'warning'); return; }
      const id = document.getElementById('saveCust').dataset.id;
      if (id){
        const c = DB.customers.find(x => x.id == id);
        Object.assign(c, data, {due: +data.due});
        addLog(`Updated customer "${data.name}"`);
        toast('Customer updated successfully', 'success');
      } else {
        DB.customers.push({
          id: Date.now(),
          joined: new Date().toISOString().slice(0,10),
          ...data,
          due: +data.due
        });
        addLog(`Added customer "${data.name}"`);
        toast('Customer added successfully', 'success');
      }
      saveStore();
      closeModal();
      loadPage('customers');
    };
  }

  /* ===== CHARTS (Chart.js) — driven by LIVE data ===== */
  let revenueChartRef = null, pkgChartRef = null;
  function drawCharts(){
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const grid = isLight ? '#e3e7ef' : '#2a2f3f';
    const txt = isLight ? '#1a1d29' : '#e6e8ee';

    if (revenueChartRef) revenueChartRef.destroy();
    if (pkgChartRef) pkgChartRef.destroy();

    const revEl = document.getElementById('revenueChart');
    const pkgEl = document.getElementById('pkgChart');
    if (!revEl || !pkgEl) return;

    /* Revenue grouped by month from real paid invoices */
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const revByMonth = new Array(12).fill(0);
    DB.invoices.filter(i => i.status === 'paid').forEach(i => {
      const d = new Date(i.date);
      if (!isNaN(d)) revByMonth[d.getMonth()] += (+i.amount || 0);
    });

    revenueChartRef = new Chart(revEl, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Revenue (৳)',
          data: revByMonth,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,.15)',
          fill: true, tension: .4, borderWidth: 3, pointRadius: 4
        }]
      },
      options: {
        plugins: { legend: { labels: { color: txt } } },
        scales: {
          x: { grid: { color: grid }, ticks: { color: txt } },
          y: { grid: { color: grid }, ticks: { color: txt } }
        }
      }
    });

    /* Package share from real customer counts per package */
    const pkgLabels = DB.packages.map(p => p.speed);
    const pkgCounts = DB.packages.map(p => DB.customers.filter(c => c.package === p.speed).length);
    const palette = ['#06b6d4','#3b82f6','#7c3aed','#f59e0b','#22c55e','#ef4444'];

    pkgChartRef = new Chart(pkgEl, {
      type: 'doughnut',
      data: {
        labels: pkgLabels,
        datasets: [{
          data: pkgCounts,
          backgroundColor: pkgLabels.map((_,i)=>palette[i % palette.length]),
          borderWidth: 0
        }]
      },
      options: { plugins: { legend: { position: 'bottom', labels: { color: txt, padding: 14 } } } }
    });
  }

  /* ===== GLOBAL UI EVENTS ===== */
  document.querySelectorAll('.nav-item').forEach(n => n.onclick = e => {
    e.preventDefault();
    loadPage(n.dataset.page);
    if (window.innerWidth < 992) document.getElementById('sidebar').classList.remove('open');
  });

  document.getElementById('menuToggle').onclick = () =>
    document.getElementById('sidebar').classList.toggle('open');

  document.getElementById('logoutBtn').onclick = () => {
    localStorage.removeItem('ci_auth');
    window.location.href = 'login.html';
  };

  document.getElementById('themeToggle').onclick = function(){
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ci_theme', next);
    this.querySelector('i').className = next === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    if (document.querySelector('.nav-item.active')?.dataset.page === 'dashboard') drawCharts();
  };

  (function syncThemeIcon(){
    const cur = document.documentElement.getAttribute('data-theme');
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = cur === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  })();

  document.getElementById('globalSearch').oninput = e => {
    if (e.target.value.length > 2){
      loadPage('customers');
      setTimeout(() => {
        const s = document.getElementById('custSearch');
        if (s){ s.value = e.target.value; s.dispatchEvent(new Event('input')); }
      }, 50);
    }
  };

  document.getElementById('notifBtn').onclick = () => loadPage('notifications');

  /* ===== INITIALIZE APP ===== */
  loadPage('dashboard');
}
