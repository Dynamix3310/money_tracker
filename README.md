# WealthFlow Pro (money_tracker)

網頁版個人／群組財務管理應用程式。除了日常收支記帳與多人分帳，同時整合投資組合追蹤、銀行與信用卡資金管理、AI 單據辨識與財務分析，所有資料透過 Firebase 即時同步，並以 PWA 形式支援手機安裝使用。

## 線上預覽 (Live Demo)

[https://dynamix3310.vercel.app/](https://dynamix3310.vercel.app/)

> 注意：目前登入後仍會檢查白名單 (`services/gemini.ts` 的 `ADMIN_EMAILS`)，非名單內帳號會停在「權限不足」畫面。

## 功能說明

應用程式分為四個主要分頁：總覽、投資、記帳、資金。

### 總覽

* **總資產淨值**：投資市值 + 投資平台現金 + 銀行帳戶餘額，依所選基準幣別 (TWD / USD / JPY) 即時換算。
* **隱私遮罩**：一鍵隱藏淨值金額。
* **資產趨勢圖**：每日自動寫入一筆淨值快照，最多保留 180 天走勢。
* **收支分析圖**：月度收入／支出長條圖。

### 記帳

* **收支記錄管理**：新增、修改、刪除收入與支出，支援多幣別並保存原始金額、原幣別與當下匯率。
* **算式輸入**：金額欄位可直接輸入四則運算式（例如 `120+35*2`），偵測到運算符號會即時顯示計算結果，離開欄位或按 Enter 自動代入，不必切換到計算機。附 `+ − × ÷ ⌫ C` 快捷鍵盤。
* **滑動選人**：付款人、收入歸屬、單人分帳對象改為左右滑動（或點箭頭）切換，兩人帳本一個手勢即可完成，不需展開下拉選單。
* **日曆式日期時間**：以月曆格線挑選日期，搭配時／分微調與「今天 / 昨天 / 前天 / 現在」快捷鍵，取代行動裝置上的滾輪選擇器。
* **多人分帳**：付款人可單人或多人分攤；分帳方式支援單人、平分、自訂金額；兩人帳本會自動補足餘額。
* **群組結算**：自動計算每位成員的應收／應付淨額。
* **預算追蹤**：為分類設定每月預算上限，顯示使用進度、剩餘或超支金額。
* **統計分析**：可依本週／本月／上月／今年／自訂區間統計，並依成員篩選。
* **搜尋與檢視**：關鍵字搜尋、依日期分組、捲動載入更多。
* **固定收支**：每月或自訂間隔（季／年）自動產生交易，可連動投資平台餘額。
* **AI 單據辨識**：拍照或上傳收據，自動填入金額、幣別、日期、說明與分類。
* **AI 批次匯入**：貼上文字、上傳圖片或檔案，一次匯入多筆記錄，支援民國年轉換、重複偵測與異常標記（未來日期、超大金額）。

### 投資

* **多平台管理**：證券與加密貨幣平台，各自記錄現金餘額（入金／出金）。
* **持股追蹤**：股票與加密貨幣的成本、市價、未實現損益與資產配置圓餅圖。
* **報價更新**：加密貨幣走 CoinGecko、股票走 Finnhub，失敗時以 Gemini（Google Search grounding）作為備援；亦可手動覆寫價格。
* **批次成本 (Lot) 管理**：買入時建立批次，賣出可選 FIFO 或指定批次，並計算已實現損益。
* **股利**：現金股利與股票股利，現金股利可自動入帳至平台餘額並產生記帳。
* **股息再投入 (DRIP)**：依每股股利與持股數自動買入零股並重算平均成本。
* **再平衡試算**：設定股票／加密／現金目標比例，計算與現況的差額。

### 資金

* **銀行帳戶**：初始餘額加流水自動計算現有餘額，支援帳戶間轉帳與明細檢視。
* **對帳單匯入**：於帳戶明細內以 AI 匯入交易紀錄。
* **信用卡**：設定結帳日後自動切分帳單週期，可前後翻閱各期帳單。
* **卡帳對帳**：將信用卡消費對應到記帳交易，系統依金額與日期相似度優先推薦候選項目，支援跨帳本連結。

### 系統與設定

* **多帳本 / 群組共享**：個人帳本與群組帳本並存，以邀請碼加入他人帳本，頂部下拉即可切換。
* **分類管理**：新增、更名、排序、設定分類預算。
* **外觀設定**：六種主題色、20 種記帳成功動畫（可設為隨機或關閉）。
* **API 金鑰**：可自行填入個人的 Gemini 與 Finnhub 金鑰。
* **資料匯出入**：JSON 完整備份、交易明細 CSV 匯出、JSON 匯入。
* **離線快取**：資料寫入 localStorage，冷啟動先顯示快取內容再等待 Firestore 同步。
* **PWA**：可安裝至桌面，並提供「記一筆」「掃發票」捷徑。
* **響應式介面**：以行動裝置為主的版面，同時適配桌面瀏覽器。

## 技術架構

* **前端框架**：React 19 + TypeScript
* **建置工具**：Vite 6
* **樣式**：Tailwind CSS
* **後端 / 資料庫**：Firebase Authentication + Cloud Firestore（onSnapshot 即時同步）
* **圖表**：Recharts
* **AI**：Google Gemini (`@google/genai`, gemini-2.5-flash)
* **行情資料**：Finnhub（股票）、CoinGecko（加密貨幣）、exchangerate-api（匯率）
* **部署平台**：Vercel

## 專案結構

```
App.tsx              主應用程式：分頁、資料訂閱、淨值計算、固定收支排程
types.ts             資料型別定義
components/
  Auth.tsx           登入 / 註冊畫面
  Views.tsx          投資、記帳、資金三大分頁
  Modals.tsx         所有彈出視窗（記帳、資產、銀行、信用卡、AI、設定）
  Charts.tsx         淨值趨勢、收支、資產配置圖表
services/
  firebase.ts        Firebase 初始化與 Firestore 路徑組合
  gemini.ts          Gemini 呼叫與金鑰控管
  api.ts             匯率、股價、幣價查詢
utils/
  calc.ts            金額欄位的四則運算式解析器
```

## 開發環境建置

### 1. 環境需求

Node.js 18 以上與 npm。

### 2. 下載專案

```bash
git clone https://github.com/Dynamix3310/money_tracker.git
cd money_tracker
```

### 3. 安裝相依套件

```bash
npm install
```

### 4. 設定環境變數

於專案根目錄建立 `.env.local`：

```bash
# Firebase（必要，缺少時應用程式會顯示 Configuration Error）
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# AI 功能（選用，亦可於「設定 > API & 資料」填入個人金鑰）
VITE_GEMINI_API_KEY=
```

### 5. 啟動開發伺服器

```bash
npm run dev
```

啟動後於瀏覽器開啟 `http://localhost:3000`。

其他指令：

```bash
npm run build     # 產出 production 版本至 dist/
npm run preview   # 預覽 build 結果
```

## 授權條款

本專案採用 MIT License。
