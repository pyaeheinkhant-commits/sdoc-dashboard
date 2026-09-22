
const SUPABASE_URL = "https://pynjffwqaxubfroithak.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5bmpmZndxYXh1YmZyb2l0aGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MTc2MjcsImV4cCI6MjEwNTQ5MzYyN30.sBluHcF86hj8CHPHa4tkuCpt2AiZZq6zyvlFOay4Qss";

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: "Bearer " + SUPABASE_ANON_KEY
};

let comparisons = [];
let emailsById = {};
let activeFilter = "ALL";

async function sbGet(path){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  if(!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

function setLive(ok, label){
  document.getElementById('liveDot').classList.toggle('off', !ok);
  document.getElementById('liveLabel').textContent = label;
}

function fmtField(f){
  return f.replace(/_/g,' ');
}

function defectFields(value){
  if(Array.isArray(value)) return value;
  if(typeof value !== 'string') return [];
  try{
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch{
    return [];
  }
}

function renderKpis(){
  const total = Object.keys(emailsById).length;
  const mismatch = comparisons.filter(c=>c.status==='MISMATCH').length;
  const review = comparisons.filter(c=>c.status==='NEEDS_REVIEW').length;
  const ok = comparisons.filter(c=>c.status==='OK').length;
  document.getElementById('kpiTotal').textContent = total;
  document.getElementById('kpiMismatch').textContent = mismatch;
  document.getElementById('kpiReview').textContent = review;
  document.getElementById('kpiOk').textContent = ok;
  document.getElementById('cntAll').textContent = comparisons.length;
  document.getElementById('cntMismatch').textContent = mismatch;
  document.getElementById('cntReview').textContent = review;
  document.getElementById('cntOk').textContent = ok;
}

function renderLedger(){
  const body = document.getElementById('ledgerBody');
  const rows = activeFilter === 'ALL' ? comparisons : comparisons.filter(c=>c.status===activeFilter);
  if(rows.length === 0){
    body.innerHTML = `<tr><td colspan="5" class="empty">Nothing in this view yet.</td></tr>`;
    return;
  }
  body.innerHTML = rows.map(c=>{
    const email = emailsById[c.email_id] || {};
    const fields = defectFields(c.defect_fields);
    const fieldHtml = fields.length
      ? `<div class="fields">${fields.map(f=>`<span class="field-tag">${fmtField(f)}</span>`).join('')}</div>`
      : `<span class="none">—</span>`;
    return `
      <tr data-eid="${c.email_id}">
        <td class="eid">${c.email_id}</td>
        <td>
          <span class="subj">${escapeHtml(email.subject || c.subject || '(no subject)')}</span>
          <div class="sender">${escapeHtml(email.sender || c.sender || '')}</div>
        </td>
        <td class="cat">${(email.category || c.category || '').replace(/_/g,' ')}</td>
        <td><span class="badge ${c.status}">${c.status.replace(/_/g,' ')}</span></td>
        <td>${fieldHtml}</td>
      </tr>`;
  }).join('');

  body.querySelectorAll('tr[data-eid]').forEach(tr=>{
    tr.addEventListener('click', ()=>openDrawer(tr.dataset.eid));
  });
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function openDrawer(emailId){
  const c = comparisons.find(x=>x.email_id===emailId);
  const email = emailsById[emailId] || {};
  const fields = defectFields(c?.defect_fields);
  const drawer = document.getElementById('drawer');
  drawer.innerHTML = `
    <button class="close" id="drawerClose">×</button>
    <h3>${emailId}</h3>
    <div class="drawer-sub">${escapeHtml(email.category || c?.category || '—')}</div>
    <dl>
      <dt>Subject</dt><dd>${escapeHtml(email.subject || c?.subject || '—')}</dd>
      <dt>Sender</dt><dd>${escapeHtml(email.sender || c?.sender || '—')}</dd>
      <dt>Result</dt><dd><span class="badge ${c?.status||''}">${(c?.status||'—').replace(/_/g,' ')}</span></dd>
      <dt>Defect fields</dt><dd>${fields.length ? fields.map(fmtField).join(', ') : 'None'}</dd>
      <dt>Review reason</dt><dd>${escapeHtml(email.review_reason || c?.review_reason || '—')}</dd>
      <dt>Recommended action</dt><dd>${escapeHtml(c?.recommended_action || '—')}</dd>
    </dl>
  `;
  document.getElementById('drawerBackdrop').classList.add('open');
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
}
function closeDrawer(){ document.getElementById('drawerBackdrop').classList.remove('open'); }
document.getElementById('drawerBackdrop').addEventListener('click', e=>{
  if(e.target.id === 'drawerBackdrop') closeDrawer();
});

document.getElementById('tabs').addEventListener('click', e=>{
  const btn = e.target.closest('.tab');
  if(!btn) return;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = btn.dataset.filter;
  renderLedger();
});

async function fireWebhook(url, btn, resultEl, payload){
  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = 'Sending…';
  resultEl.classList.remove('show','success','failure');
  try{
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload || {})
    });
    resultEl.classList.add('show');
    if(res.ok){
      resultEl.classList.add('success');
      resultEl.textContent = `✓ Sent — n8n responded ${res.status}. Resumed workflow.`;
      btn.textContent = 'Sent ✓';
    } else {
      resultEl.classList.add('failure');
      resultEl.textContent = `✗ n8n responded ${res.status}. Check the workflow execution log.`;
      btn.textContent = originalLabel;
      btn.disabled = false;
    }
  } catch(err){
    resultEl.classList.add('show','failure');
    resultEl.textContent = `✗ Request blocked or failed (${err.message}). This is usually the browser blocking cross-origin calls — if it persists, confirm CORS is open on the n8n webhook, or trigger the resume URL directly.`;
    btn.textContent = originalLabel;
    btn.disabled = false;
  }
}

function renderQueue(reviewCases, outboundMessages){
  const queue = document.getElementById('queue');
  const openReviews = reviewCases.filter(r => (r.status||'').toUpperCase() === 'OPEN');
  const draftMessages = outboundMessages.filter(m => (m.status||'').toUpperCase() === 'DRAFT');
  const awaitingDoc = outboundMessages.filter(m => (m.status||'').toUpperCase() === 'SENT' && m.reprocess_webhook_url && !m.replacement_email_id);

  document.getElementById('kpiPending').textContent = openReviews.length + draftMessages.length + awaitingDoc.length;

  if(openReviews.length === 0 && draftMessages.length === 0 && awaitingDoc.length === 0){
    queue.innerHTML = `<div class="empty">Nothing waiting on you right now.</div>`;
    return;
  }

  let html = '';

  openReviews.forEach(r=>{
    const wh = r.webhook_url;
    html += `
      <div class="qcard">
        <div class="qtype">Review case · ${escapeHtml(r.email_id)}</div>
        <div class="qtitle">${escapeHtml(r.review_reason || 'Needs human review')}</div>
        <div class="qmeta">Opened ${r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</div>
        <div class="qactions">
          ${wh ? `
          <button class="btn small primary" data-webhook="${escapeHtml(wh)}" data-payload='{"decision":"CONFIRM_OK","reviewer":"dashboard_reviewer"}'>Confirm OK</button>
          <button class="btn small" data-webhook="${escapeHtml(wh)}" data-payload='{"decision":"CONFIRM_MISMATCH","reviewer":"dashboard_reviewer"}'>Confirm mismatch</button>
          <button class="btn small" data-webhook="${escapeHtml(wh)}" data-payload='{"decision":"RETRY","reviewer":"dashboard_reviewer"}'>Retry check</button>
          <button class="btn small" data-webhook="${escapeHtml(wh)}" data-payload='{"decision":"CLOSE","reviewer":"dashboard_reviewer"}'>Close</button>`
          : `<span class="none">No resume webhook on this case</span>`}
        </div>
        <div class="qresult"></div>
      </div>`;
  });

  draftMessages.forEach(m=>{
    const fields = defectFields(m.defect_fields);
    html += `
      <div class="qcard">
        <div class="qtype">Outbound draft · ${escapeHtml(m.email_id)}</div>
        <div class="qtitle">${escapeHtml(m.subject || 'Correction request')}</div>
        <div class="qmeta">To ${escapeHtml(m.to_address || '—')}${fields.length ? ' · ' + fields.map(fmtField).join(', ') : ''}</div>
        <div class="qactions">
          ${m.approval_webhook_url ? `
          <button class="btn small primary" data-webhook="${escapeHtml(m.approval_webhook_url)}" data-payload='{"decision":"APPROVE","reviewer":"dashboard_reviewer"}'>Approve & send</button>
          <button class="btn small" data-webhook="${escapeHtml(m.approval_webhook_url)}" data-payload='{"decision":"REJECT","reviewer":"dashboard_reviewer"}'>Reject</button>`
          : `<span class="none">Waiting on n8n to open an approval webhook</span>`}
        </div>
        <div class="qresult"></div>
      </div>`;
  });

  awaitingDoc.forEach(m=>{
    html += `
      <div class="qcard">
        <div class="qtype">Awaiting new document · ${escapeHtml(m.email_id)}</div>
        <div class="qtitle">Correction sent to ${escapeHtml(m.to_address || 'sender')} — waiting for the replacement</div>
        <div class="qmeta">Enter the email ID of the resend once it arrives (e.g. email_052)</div>
        <div class="qactions" style="gap:8px;">
          <input type="text" class="replacement-input" placeholder="email_052" style="background:var(--panel-2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:var(--mono);font-size:12px;padding:6px 8px;width:110px;">
          <button class="btn small primary" data-webhook="${escapeHtml(m.reprocess_webhook_url)}" data-replacement-btn="1">Submit & reprocess</button>
        </div>
        <div class="qresult"></div>
      </div>`;
  });

  queue.innerHTML = html;

  queue.querySelectorAll('button[data-webhook]:not([data-replacement-btn])').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const card = btn.closest('.qcard');
      const resultEl = card.querySelector('.qresult');
      const payload = JSON.parse(btn.dataset.payload || '{}');
      fireWebhook(btn.dataset.webhook, btn, resultEl, payload);
    });
  });

  queue.querySelectorAll('button[data-replacement-btn]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const card = btn.closest('.qcard');
      const resultEl = card.querySelector('.qresult');
      const input = card.querySelector('.replacement-input');
      const val = (input.value || '').trim();
      if(!/^email_\d{3}$/.test(val)){
        resultEl.classList.add('show','failure');
        resultEl.textContent = '✗ Enter an email ID in the form email_052.';
        return;
      }
      fireWebhook(btn.dataset.webhook, btn, resultEl, { replacement_email_id: val });
    });
  });
}

async function loadAll(){
  setLive(false, 'Syncing…');
  try{
    const [emails, comps, reviewCases, outboundMessages] = await Promise.all([
      sbGet('emails?select=email_id,sender,subject,category,status,review_reason,has_defect,defect_fields,comparison_summary,created_at&order=created_at.desc'),
      sbGet('comparisons?select=email_id,sender,subject,category,status,review_reason,has_defect,defect_fields,comparison_summary,recommended_action,processed_at&order=processed_at.desc.nullslast'),
      sbGet('review_cases?select=id,email_id,status,review_reason,created_at,webhook_url&order=created_at.desc'),
      sbGet('outbound_messages?select=id,email_id,status,to_address,subject,defect_fields,approval_webhook_url,reprocess_webhook_url,replacement_email_id,created_at&order=created_at.desc')
    ]);

    emailsById = {};
    emails.forEach(e => emailsById[e.email_id] = e);
    comparisons = comps;

    renderKpis();
    renderLedger();
    renderQueue(reviewCases, outboundMessages);
    setLive(true, `Live — synced ${new Date().toLocaleTimeString()}`);
  } catch(err){
    setLive(false, `Connection failed — ${err.message}`);
    const hint = (err.message || '').toLowerCase().includes('failed to fetch')
      ? ' This usually means the browser blocked the cross-origin request (ad blocker, privacy extension, or restrictive network) — try disabling extensions for this page, or a different browser.'
      : '';
    document.getElementById('ledgerBody').innerHTML = `<tr><td colspan="5" class="err">Couldn't reach Supabase: ${escapeHtml(err.message)}.${hint}</td></tr>`;
    document.getElementById('queue').innerHTML = `<div class="err">Couldn't reach Supabase: ${escapeHtml(err.message)}.${hint}</div>`;
  }
}

const WORKFLOW_C_WEBHOOK = 'https://texr.app.n8n.cloud/webhook/workflow-c-run';

document.getElementById('runBtn').addEventListener('click', async ()=>{
  const input = document.getElementById('runEmailId');
  const btn = document.getElementById('runBtn');
  const resultEl = document.getElementById('runResult');
  const val = (input.value || '').trim();
  resultEl.style.display = 'block';
  if(!/^email_\d{3}$/.test(val)){
    resultEl.style.color = 'var(--mismatch)';
    resultEl.textContent = '✗ Enter an email ID in the form email_050.';
    return;
  }
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = 'Starting…';
  resultEl.style.color = 'var(--text-dim)';
  resultEl.textContent = `Calling ${WORKFLOW_C_WEBHOOK}…`;
  try{
    const res = await fetch(WORKFLOW_C_WEBHOOK, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email_id: val })
    });
    const text = await res.text().catch(()=> '');
    if(res.ok){
      resultEl.style.color = 'var(--ok)';
      resultEl.textContent = `✓ Started (${res.status}). SI/BL comparison runs in n8n — refresh in a few seconds to see it land in the ledger.`;
    } else {
      resultEl.style.color = 'var(--mismatch)';
      resultEl.textContent = `✗ n8n responded ${res.status}: ${text.slice(0,200)}`;
    }
  } catch(err){
    resultEl.style.color = 'var(--mismatch)';
    resultEl.textContent = `✗ Request blocked or failed (${err.message}).`;
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
});

document.getElementById('refreshBtn').addEventListener('click', loadAll);
loadAll();
