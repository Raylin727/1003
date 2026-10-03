// 共用資料層：以 Supabase REST API 讀寫示範資料
// 注意：這裡只能放 publishable key（可公開）。絕對不要放 secret / service_role key。
(function () {
  const URL_ = 'https://ethmfnauwnqdvfejdzfx.supabase.co';
  const KEY = 'sb_publishable_4Ocpt38hbQfeDV8lJJ1heg_IUSQ46tB';
  const H = { apikey: KEY, 'Content-Type': 'application/json' };

  const OPS = {
    live: false, // 是否已成功連上資料庫（失敗時各工具退回內建示範資料）
    url: URL_,
    async select(table, query = '') {
      try {
        const r = await fetch(`${URL_}/rest/v1/${table}${query ? '?' + query : ''}`, { headers: H });
        if (!r.ok) throw new Error(r.status + ' ' + (await r.text()));
        const j = await r.json();
        this.live = true;
        return j;
      } catch (e) { console.warn('[ops-db] select 失敗：', table, e); return null; }
    },
    // 新增一筆，回傳資料庫實際儲存的那一列（含 id）；失敗回傳 null
    async insert(table, row) {
      try {
        const r = await fetch(`${URL_}/rest/v1/${table}`, {
          method: 'POST', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(row)
        });
        if (!r.ok) throw new Error(r.status + ' ' + (await r.text()));
        return (await r.json())[0];
      } catch (e) { console.warn('[ops-db] insert 失敗：', table, e); return null; }
    },
    // 一次新增多筆（單一請求），回傳實際儲存的列陣列；失敗回傳 null
    async insertMany(table, rows) {
      try {
        const r = await fetch(`${URL_}/rest/v1/${table}`, {
          method: 'POST', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(rows)
        });
        if (!r.ok) throw new Error(r.status + ' ' + (await r.text()));
        return await r.json();
      } catch (e) { console.warn('[ops-db] insertMany 失敗：', table, e); return null; }
    },
    async patch(table, id, obj) {
      try {
        const r = await fetch(`${URL_}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH', headers: H, body: JSON.stringify(obj)
        });
        if (!r.ok) throw new Error(r.status + ' ' + (await r.text()));
        return true;
      } catch (e) { console.warn('[ops-db] patch 失敗：', table, e); return false; }
    },
    // 依任意條件修改，例：patchWhere('ops_ports','switch_id=eq.CORE-01&port_no=eq.3',{status:'down'})
    async patchWhere(table, filter, obj) {
      try {
        const r = await fetch(`${URL_}/rest/v1/${table}?${filter}`, {
          method: 'PATCH', headers: H, body: JSON.stringify(obj)
        });
        if (!r.ok) throw new Error(r.status + ' ' + (await r.text()));
        return true;
      } catch (e) { console.warn('[ops-db] patchWhere 失敗：', table, e); return false; }
    },
    // filter 例：'id=eq.5' 或 'id=gt.0'（刪全部）
    async remove(table, filter) {
      try {
        const r = await fetch(`${URL_}/rest/v1/${table}?${filter}`, { method: 'DELETE', headers: H });
        if (!r.ok) throw new Error(r.status + ' ' + (await r.text()));
        return true;
      } catch (e) { console.warn('[ops-db] delete 失敗：', table, e); return false; }
    },
    // 正常連線時不顯示任何訊息；只有連不上資料庫（改用內建示範資料）時才在副標題後提示
    mark() {
      const el = document.querySelector('.sub');
      if (!el || this.live) return;
      const s = document.createElement('span');
      s.className = 'ops-src';
      s.textContent = ' · 離線模式：顯示示範資料，修改不會儲存';
      s.style.fontWeight = '600';
      el.appendChild(s);
    },
    fail(msg) { alert((msg || '操作失敗') + '\n（無法連線到資料庫，請稍後再試）'); },
  };
  window.OPS = OPS;
})();
