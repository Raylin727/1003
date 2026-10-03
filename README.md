# IT 網路維運工具箱（示範）

五個單頁網頁小工具，資料皆為**示範資料**，存放於 Supabase：

| 工具 | 檔案 |
|---|---|
| 設備保固儀表板 | `warranty-dashboard.html` |
| 事件記錄與 MTTR 統計 | `incident-tracker.html` |
| IP 子網計算與規劃器 | `subnet-planner.html` |
| 機櫃 Port 配線圖 | `port-map.html` |
| 變更排程與衝突檢查 | `change-calendar.html` |

入口頁為 `index.html`；資料存取共用 `ops-db.js`（只使用 Supabase publishable key）。

連不上資料庫時，各工具會退回內建示範資料。示範資料庫開放匿名寫入，請勿輸入任何真實或機密資料。
