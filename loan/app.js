// 純靜態前端,資料存在 Supabase。這裡只能放 publishable key(可公開),絕對不要放 secret / service_role key。
(function () {
  const BASE = 'https://ethmfnauwnqdvfejdzfx.supabase.co/rest/v1';
  const KEY = 'sb_publishable_4Ocpt38hbQfeDV8lJJ1heg_IUSQ46tB';
  const H = { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' };

  async function api(path, opt) {
    const r = await fetch(BASE + path, Object.assign({ headers: H }, opt));
    if (!r.ok) throw new Error(r.status + ' ' + (await r.text()));
    return r.json();
  }

  const $ = id => document.getElementById(id);
  const today = () => new Date().toLocaleDateString('sv'); // YYYY-MM-DD(本地時區)
  let items = [], open = {}; // open:item_id -> 未歸還紀錄
  let target = null, hist = [], view = 'items';

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  async function load() {
    try {
      const [its, recs] = await Promise.all([
        api('/loan_items?select=*&order=asset_no'),
        api('/loan_records?select=*&returned_at=is.null')
      ]);
      hist = await api('/loan_records?select=*,loan_items(asset_no,name,category)&order=borrowed_at.desc,id.desc');
      items = its; open = {};
      recs.forEach(r => open[r.item_id] = r);
      $('msg').textContent = '';
    } catch (e) {
      console.warn(e);
      $('msg').textContent = '無法連線到資料庫,請稍後再試。';
    }
    render(); renderHist();
  }

  const state = it => !open[it.id] ? 'available' : (open[it.id].due_date < today() ? 'overdue' : 'borrowed');

  function render() {
    const cats = [...new Set(items.map(i => i.category))];
    const cs = $('cat'), cur = cs.value;
    cs.replaceChildren(new Option('全部類別', ''), ...cats.map(c => new Option(c, c)));
    cs.value = cur;

    const cnt = { available: 0, borrowed: 0, overdue: 0 };
    items.forEach(i => cnt[state(i)]++);
    const st = $('stats'); st.replaceChildren();
    [['總數', items.length], ['可借用', cnt.available], ['已借出', cnt.borrowed + cnt.overdue], ['已逾期', cnt.overdue]]
      .forEach(([l, n]) => { const d = el('div', 'stat'); d.append(el('b', '', n), el('span', '', l)); st.append(d); });

    const od = items.filter(i => state(i) === 'overdue');
    $('overdue').hidden = view === 'hist' || !od.length;
    $('overdue').textContent = od.length ? '逾期提醒:' + od.map(i => `${i.name}(${open[i.id].borrower},應還 ${open[i.id].due_date})`).join('、') : '';

    const q = $('q').value.trim().toLowerCase(), c = cs.value, s = $('st').value;
    const list = items.filter(i =>
      (!q || (i.name + i.asset_no).toLowerCase().includes(q)) && (!c || i.category === c) &&
      (!s || (s === 'borrowed' ? state(i) !== 'available' : state(i) === s)));
    const g = $('list'); g.replaceChildren();
    if (!list.length) g.append(el('p', 'muted', '沒有符合的設備'));
    list.forEach(i => {
      const sv = state(i), r = open[i.id];
      const card = el('div', 'card' + (sv === 'overdue' ? ' over' : ''));
      card.append(el('h3', '', i.name), el('div', 'muted', `${i.asset_no} · ${i.category}`),
        el('span', 'tag ' + sv, { available: '可借用', borrowed: '已借出', overdue: '已逾期' }[sv]));
      if (r) card.append(el('div', 'muted', `${r.borrower}(${r.dept})\n應還:${r.due_date}`));
      const b = el('button', sv === 'available' ? '' : 'ret', sv === 'available' ? '借用' : '歸還');
      b.onclick = () => sv === 'available' ? openDlg(i) : giveBack(i, b);
      card.append(b); g.append(card);
    });
    g.querySelectorAll('.muted').forEach(m => m.style.whiteSpace = 'pre-line');
  }

  function openDlg(it) {
    target = it;
    $('dlgTitle').textContent = '借用:' + it.name;
    const f = $('form'); f.reset();
    const d = new Date(); d.setDate(d.getDate() + 7);
    f.due.min = today(); f.due.value = d.toLocaleDateString('sv');
    $('dlg').showModal();
  }
  $('cancel').onclick = () => $('dlg').close();

  $('form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target, ok = $('ok');
    if (ok.disabled) return;
    ok.disabled = true;
    try {
      await api('/loan_records', { method: 'POST', body: JSON.stringify({
        item_id: target.id, borrower: f.borrower.value.trim(), dept: f.dept.value.trim(), due_date: f.due.value }) });
      await api('/loan_items?id=eq.' + target.id, { method: 'PATCH', body: JSON.stringify({ status: 'borrowed' }) });
      $('dlg').close();
    } catch (err) { console.warn(err); alert('借用失敗,請再試一次。'); }
    ok.disabled = false;
    load();
  };

  async function giveBack(it, btn) {
    const r = open[it.id];
    if (!r || btn.disabled || !confirm(`確認歸還「${it.name}」?`)) return;
    btn.disabled = true;
    try {
      await api('/loan_records?id=eq.' + r.id, { method: 'PATCH', body: JSON.stringify({ returned_at: today() }) });
      await api('/loan_items?id=eq.' + it.id, { method: 'PATCH', body: JSON.stringify({ status: 'available' }) });
    } catch (err) { console.warn(err); alert('歸還失敗,請再試一次。'); }
    load();
  }

  const histState = r => r.returned_at ? '已歸還' : (r.due_date < today() ? '逾期未還' : '借用中');
  const histRows = () => {
    const q = $('hq').value.trim().toLowerCase(), f = $('hst').value;
    return hist.filter(r => {
      const it = r.loan_items || {};
      return (!q || [it.name, it.asset_no, r.borrower, r.dept].join(' ').toLowerCase().includes(q)) &&
        (!f || (f === 'done') === !!r.returned_at);
    });
  };
  const HEAD = ['設備編號', '設備名稱', '類別', '借用人', '部門', '借用日', '應還日', '歸還日', '狀態'];
  const cells = r => { const it = r.loan_items || {};
    return [it.asset_no, it.name, it.category, r.borrower, r.dept, r.borrowed_at, r.due_date, r.returned_at || '', histState(r)]; };

  function renderHist() {
    const t = $('ht'); t.replaceChildren();
    const hr = el('tr'); HEAD.forEach(h => hr.append(el('th', '', h))); t.append(hr);
    const rows = histRows();
    if (!rows.length) { const tr = el('tr'), td = el('td', '', '沒有紀錄'); td.colSpan = HEAD.length; tr.append(td); t.append(tr); }
    rows.forEach(r => {
      const tr = el('tr');
      cells(r).forEach((c, i) => tr.append(el('td', i === 8 && c === '逾期未還' ? 'bad' : '', c)));
      t.append(tr);
    });
  }

  function exportCsv() {
    // 以 ' 開頭避免試算表把 = + - @ 開頭的文字當成公式執行
    const esc = v => { v = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
    const lines = [HEAD, ...histRows().map(cells)].map(row => row.map(esc).join(','));
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'loan-history-' + today() + '.csv';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function setView(v) {
    view = v;
    $('tabItems').classList.toggle('on', v === 'items'); $('tabHist').classList.toggle('on', v === 'hist');
    $('hist').hidden = v !== 'hist';
    ['overdue', 'stats'].forEach(id => { if (v === 'hist') $(id).hidden = true; });
    document.querySelector('.filters').hidden = v === 'hist';
    $('list').hidden = v === 'hist';
    if (v === 'items') render();
  }
  $('tabItems').onclick = () => setView('items');
  $('tabHist').onclick = () => setView('hist');
  $('csv').onclick = exportCsv;
  ['hq', 'hst'].forEach(id => $(id).addEventListener('input', renderHist));

  ['q', 'cat', 'st'].forEach(id => $(id).addEventListener('input', render));
  load();
})();
