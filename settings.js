// ==========================================
// settings.js : 設定・海況・システム管理パネル
// ==========================================

function SettingsPanel({
    isSettingsOpen, setIsSettingsOpen,
    portCount, starboardCount, onCountChange,
    point, setPoint, waterTemp, setWaterTemp,
    waterDepth, setWaterDepth, tide, setTide,
    tideState, setTideState, highTide1, setHighTide1,
    highTide2, setHighTide2, lowTide1, setLowTide1,
    lowTide2, setLowTide2, weather1, setWeather1,
    weather2, setWeather2, windDir1, setWindDir1,
    windDir2, setWindDir2, windSpeed1, setWindSpeed1,
    windSpeed2, setWindSpeed2, waveHeight1, setWaveHeight1,
    waveHeight2, setWaveHeight2, theme, setTheme,
    targetFish, setTargetFish, date, setToastMessage,
    onFactoryReset, records, setRecords,
    userApiKey, setUserApiKey, selectedAiModel, setSelectedAiModel
}) {
    const [activeSettingsTab, setActiveSettingsTab] = React.useState('basic'); // 'basic', 'weather', 'system'
    const tideImageInputRef = React.useRef(null);
    const weatherImageInputRef = React.useRef(null);
    const fileInputRef = React.useRef(null);
    const [tempKey, setTempKey] = React.useState(userApiKey || '');
    const [showKey, setShowKey] = React.useState(false);
    
    const [isAnalyzingTide, setIsAnalyzingTide] = React.useState(false);
    const [isAnalyzingWeather, setIsAnalyzingWeather] = React.useState(false);

    React.useEffect(() => {
        setTempKey(userApiKey || '');
    }, [userApiKey]);

    // 設定パネルが開いた時、常に「基本設定」タブにリセット
    React.useEffect(() => {
        if (isSettingsOpen) {
            setActiveSettingsTab('basic');
        }
    }, [isSettingsOpen]);

    if (!isSettingsOpen) return null;

    // AIモデルの表示名とAPI識別子のマップ
    const aiModelOptions = [
        { label: "Gemini 2.5 Flash（推奨・高速）", value: "Gemini 2.5 Flash", id: "gemini-2.5-flash" },
        { label: "Gemini 2.5 Pro（深層考察・高精度）", value: "Gemini 2.5 Pro", id: "gemini-2.5-pro" },
        { label: "Gemini 3.5 Flash", value: "Gemini 3.5 Flash", id: "gemini-3.5-flash" },
        { label: "Gemini 3.6 Flash", value: "Gemini 3.6 Flash", id: "gemini-3.6-flash" },
        { label: "Gemini 3.7 Flash", value: "Gemini 3.7 Flash", id: "gemini-3.7-flash" },
        { label: "Gemini 3.8 Flash", value: "Gemini 3.8 Flash", id: "gemini-3.8-flash" },
        { label: "Gemini 3.1 Pro", value: "Gemini 3.1 Pro", id: "gemini-3.1-pro" }
    ];

    // 波高（波の状態）の選択肢
    const waveHeightOptions = [
        "穏やか",
        "穏やかな方",
        "多少波がある",
        "波がやや高い",
        "波が高い",
        "しける",
        "大しけ"
    ];

    // Base64変換
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // 共通 Gemini Vision 呼び出し
    const callVisionApi = async (file, prompt) => {
        const activeKey = (userApiKey || '').trim();
        if (!activeKey) {
            throw new Error('APIキーが設定されていません。「システム」タブでGemini APIキーを入力して保存してください。');
        }

        const base64Data = await fileToBase64(file);
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`;
        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: file.type || 'image/png',
                            data: base64Data
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                response_mime_type: "application/json"
            }
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `通信エラー: HTTP ${response.status}`);
        }

        const resData = await response.json();
        const text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('解析結果が得られませんでした');
        
        const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
    };

    // ==========================================
    // 潮時表 画像解析
    // ==========================================
    const handleTideImageAnalysis = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        setIsAnalyzingTide(true);
        setToastMessage('潮時表をAI解析中...');

        try {
            const prompt = `この画像は潮時表（タイドグラフ）のスクリーンショットです。
以下の潮時情報を読み取り、JSON形式のみで出力してください。不明な項目は空文字 "" にしてください。
{"tideState":"潮回り(大潮,中潮,小潮,若潮,長潮など)","highTide1":"満潮1(例: 05:24)","highTide2":"満潮2(例: 17:40)","lowTide1":"干潮1(例: 11:15)","lowTide2":"干潮2(例: 23:50)"}`;

            const parsed = await callVisionApi(file, prompt);
            let count = 0;
            if (parsed.tideState) { setTideState(parsed.tideState); count++; }
            if (parsed.highTide1) { setHighTide1(parsed.highTide1); count++; }
            if (parsed.highTide2) { setHighTide2(parsed.highTide2); count++; }
            if (parsed.lowTide1) { setLowTide1(parsed.lowTide1); count++; }
            if (parsed.lowTide2) { setLowTide2(parsed.lowTide2); count++; }

            setToastMessage(`潮時表の解析完了！\n${count}項目の潮時データを自動入力しました`);
        } catch (err) {
            console.error(err);
            setToastMessage(`潮時表の解析に失敗しました: ${err.message}`);
        } finally {
            setIsAnalyzingTide(false);
            if (tideImageInputRef.current) tideImageInputRef.current.value = '';
        }
    };

    // ==========================================
    // 気象予報 画像解析
    // ==========================================
    const handleWeatherImageAnalysis = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        setIsAnalyzingWeather(true);
        setToastMessage('気象予報をAI解析中...');

        try {
            const prompt = `この画像は海の天気・風・波の気象予報スクリーンショットです。
午前(前半)・午後(後半)の予報を読み取り、JSON形式のみで出力してください。

【風速の抽出ルール（ハイブリッド幅表記）】
時系列表の【風速】と【瞬間最大風速】の数値を参照し、もっとも穏やかな数値から突風のピークまでを「最小値〜最大値m/s」の幅（レンジ）形式で出力してください：
・windSpeed1（前半）: 【6時】と【9時】の時間帯に含まれる「風速」と「瞬間最大風速」のすべての数値の中から、【最も小さい数値】〜【最も大きい数値】を特定して出力（例: 通常2m/4m、瞬間5m/7m の場合は "2〜7m/s"）
・windSpeed2（後半）: 【12時】と【15時】の時間帯に含まれる「風速」と「瞬間最大風速」のすべての数値の中から、【最も小さい数値】〜【最も大きい数値】を特定して出力（例: 通常3m/5m、瞬間6m/9m の場合は "3〜9m/s"）

【風向きアイコンの向きの判定ルール】
画像のなかにある、風向きアイコンまたは矢印は、画像によって以下のいずれかのデザインになっています。
まずはどちらの形状かを確認し、その「先端」が画面上のどの方向を指しているかを厳密に判定してください：

● パターンA：太い「家（ホームアイコン）型・五角形」の場合
  ・平らな四角い土台部分（根本）ではなく、最も突き出た【三角屋根のてっぺん（頂点）】を「先端」とします。
  ・土台の四隅の角と屋根のてっぺんを取り違えないよう注意してください。
  ・屋根のてっぺんが画面の「右上」を向いているか、「左上」を向いているか（左右の傾き）を慎重に見極めてください。

● パターンB：通常の「細い線状の矢印（→）」の場合
  ・線の端にある【三角形の矢じり（尖っている先端）】が指している方向を判定してください。

※気象学的な解釈（風が吹いてくる方向等）は一切不要です。純粋に画面上で先端が向いている方向を選択肢から選んでください。

選択肢：["真下", "左下", "真左", "左上", "真上", "右上", "真右", "右下"]
・windDir1: 前半のアイコン先端が指している向き
・windDir2: 後半のアイコン先端が指している向き

【波高の判定ルール】
・waveHeight1, waveHeight2 は以下の選択肢から選んでください：
["穏やか", "穏やかな方", "多少波がある", "波がやや高い", "波が高い", "しける", "大しけ"]

不明な項目は空文字 "" にしてください。
{"weather1":"前半天気","weather2":"後半天気","windDir1":"前半の矢印の向き","windDir2":"後半の矢印の向き","windSpeed1":"前半風速幅(例: 2〜7m)","windSpeed2":"後半風速幅(例: 3〜9m)","waveHeight1":"前半波高","waveHeight2":"後半波高"}`;

            const parsed = await callVisionApi(file, prompt);

            // 矢印の見た目の向きから、正確な風向（風が吹いてくる方角）へ確実に変換
            const arrowToWindDir = (arrow) => {
                if (!arrow) return '';
                const clean = arrow.trim();
                
                // 1. 見た目の向きマップ（最優先照合）
                const map = {
                    '真下': '北',
                    '左下': '北東',
                    '真左': '東',
                    '左上': '南東',
                    '真上': '南',
                    '右上': '南西',
                    '真右': '西',
                    '右下': '北西'
                };
                if (map[clean]) return map[clean];

                // 2. もしAIが直接方角文字列で返してきた場合の保険（2文字の方角を先に判定）
                if (clean.includes('北東')) return '北東';
                if (clean.includes('北西')) return '北西';
                if (clean.includes('南東')) return '南東';
                if (clean.includes('南西')) return '南西';
                if (clean.includes('北')) return '北';
                if (clean.includes('南')) return '南';
                if (clean.includes('東')) return '東';
                if (clean.includes('西')) return '西';

                return clean;
            };

            let count = 0;
            if (parsed.weather1) { setWeather1(parsed.weather1); count++; }
            if (parsed.weather2) { setWeather2(parsed.weather2); count++; }
            if (parsed.windDir1) { setWindDir1(arrowToWindDir(parsed.windDir1)); count++; }
            if (parsed.windDir2) { setWindDir2(arrowToWindDir(parsed.windDir2)); count++; }
            if (parsed.windSpeed1) { setWindSpeed1(parsed.windSpeed1); count++; }
            if (parsed.windSpeed2) { setWindSpeed2(parsed.windSpeed2); count++; }
            if (parsed.waveHeight1) { setWaveHeight1(parsed.waveHeight1); count++; }
            if (parsed.waveHeight2) { setWaveHeight2(parsed.waveHeight2); count++; }

            setToastMessage(`気象予報の解析完了！\n${count}項目の気象データを自動入力しました`);
        } catch (err) {
            console.error(err);
            setToastMessage(`気象予報の解析に失敗しました: ${err.message}`);
        } finally {
            setIsAnalyzingWeather(false);
            if (weatherImageInputRef.current) weatherImageInputRef.current.value = '';
        }
    };

    // ==========================================
    // バックアップ保存（エクスポート）
    // ==========================================
    const handleExportData = () => {
        try {
            let currentRecords = records;
            const savedRaw = localStorage.getItem('fishing_records');
            if (savedRaw) {
                try {
                    const parsed = JSON.parse(savedRaw);
                    if (Array.isArray(parsed)) currentRecords = parsed;
                } catch (e) {}
            }

            const exportPayload = {
                app: "yamashitamaru",
                version: "2.0",
                exportedAt: new Date().toISOString(),
                records: currentRecords || []
            };

            const jsonStr = JSON.stringify(exportPayload, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const safeDate = (date || getTodayString()).replace(/-/g, '');
            a.href = url;
            a.download = `yamashitamaru_backup_${safeDate}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setToastMessage('バックアップファイルを保存しました');
        } catch (e) {
            console.error(e);
            setToastMessage('バックアップの保存に失敗しました');
        }
    };

    // 共通復元ロジック
    const applyRestoreData = (textData) => {
        if (!textData || !textData.trim()) throw new Error('データが空です');
        const parsed = JSON.parse(textData);
        let importedList = [];

        if (Array.isArray(parsed)) {
            importedList = parsed;
        } else if (parsed && Array.isArray(parsed.records)) {
            importedList = parsed.records;
        } else {
            throw new Error('データ形式が認識できません');
        }

        if (importedList.length === 0) {
            setToastMessage('復元できる釣果データが見つかりませんでした');
            return false;
        }

        localStorage.setItem('fishing_records', JSON.stringify(importedList));
        setRecords(importedList);
        setToastMessage(`復元完了：${importedList.length}件の釣果データを復元しました`);
        setIsSettingsOpen(false);
        return true;
    };

    // ファイル復元
    const handleFileImport = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                applyRestoreData(event.target.result);
            } catch (err) {
                console.error(err);
                setToastMessage('復元に失敗しました。正しいファイルかご確認ください。');
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.onerror = () => {
            setToastMessage('ファイルの読み込み中にエラーが発生しました');
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file, 'UTF-8');
    };

    // 完全初期化
    const handleFullReset = () => {
        const confirm1 = window.confirm('【警告】すべての釣果記録と設定を初期化しますか？\nこの操作は絶対に取り消せません。');
        if (!confirm1) return;
        const confirm2 = window.confirm('本当によろしいですか？');
        if (!confirm2) return;

        try {
            localStorage.clear();
            if (typeof onFactoryReset === 'function') {
                onFactoryReset();
            } else {
                setRecords([]);
            }
            setToastMessage('すべてのデータを完全初期化しました');
            setIsSettingsOpen(false);
        } catch (e) {
            setToastMessage('初期化に失敗しました');
        }
    };

    const handleSaveApiKey = () => {
        const cleaned = (tempKey || '').trim();
        setUserApiKey(cleaned);
        localStorage.setItem('fishing_api_key', cleaned);
        setToastMessage('Gemini APIキーを保存しました');
    };

    const handleModelChange = (e) => {
        const val = e.target.value;
        setSelectedAiModel(val);
        localStorage.setItem('fishing_ai_model', val);
        setToastMessage(`使用モデルを「${val}」に設定しました`);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 animate-[fadeIn_0.15s_ease-out]">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-md max-h-[92dvh] flex flex-col overflow-hidden text-gray-800 dark:text-slate-100">
                {/* ヘッダー */}
                <div className="px-4 py-3.5 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50 shrink-0">
                    <span className="font-black text-lg flex items-center gap-2">
                        <IconSettings className="w-5 h-5 text-sky-600 dark:text-sky-400" /> 設定・海況管理
                    </span>
                    <button 
                        type="button"
                        onClick={() => setIsSettingsOpen(false)} 
                        className="w-10 h-10 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 border border-slate-400 dark:border-slate-500 rounded-xl flex items-center justify-center font-black text-lg text-slate-800 dark:text-white shadow-sm active:scale-90 transition-all select-none"
                        aria-label="閉じる"
                    >
                        ✕
                    </button>
                </div>

                {/* 3タブ切り替えバー */}
                <div className="flex bg-sky-200 dark:bg-slate-950 px-2 pt-0.5 gap-1.5 border-b border-sky-300 dark:border-slate-800 font-black shrink-0 items-end">
                    {[
                        { id: 'basic', label: '基本設定' },
                        { id: 'weather', label: '気象・潮時' },
                        { id: 'system', label: 'システム' }
                    ].map(tab => {
                        const isActive = activeSettingsTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveSettingsTab(tab.id)}
                                className={`flex-1 py-2.5 px-2 rounded-t-xl text-sm font-black transition-all relative select-none ${
                                    isActive
                                        ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-400 border-t-2 border-x border-t-sky-600 dark:border-t-sky-400 border-x-sky-300 dark:border-x-slate-800 -mb-px z-10 shadow-sm'
                                        : 'bg-sky-100/85 hover:bg-sky-100 dark:bg-slate-900 hover:dark:bg-slate-850 text-sky-800 dark:text-slate-400 border-t border-x border-sky-200/60 dark:border-slate-800/80 hover:dark:text-white active:scale-[0.98]'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* プルダウン候補リスト（datalist） */}
                <datalist id="point-options">
                    <option value="久里浜沖" />
                    <option value="鴨居沖" />
                    <option value="走水沖" />
                    <option value="観音崎沖" />
                    <option value="下浦沖" />
                    <option value="竹岡沖" />
                    <option value="剣崎沖" />
                </datalist>

                <datalist id="target-fish-options">
                    <option value="カワハギ" />
                    <option value="アジ" />
                    <option value="アマダイ" />
                    <option value="マダイ" />
                    <option value="タチウオ" />
                    <option value="スミイカ" />
                    <option value="アオリイカ" />
                    <option value="マルイカ" />
                </datalist>

                <datalist id="tide-color-options">
                    <option value="澄み" />
                    <option value="薄濁り" />
                    <option value="濁り" />
                    <option value="笹濁り" />
                    <option value="激濁り" />
                    <option value="暗濁り" />
                </datalist>

                {/* スクロールコンテンツ */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm sm:text-base no-scrollbar bg-white dark:bg-slate-800">

                    {/* ========================================== */}
                    {/* タブ 1: 基本設定（外枠：dark:border-slate-500） */}
                    {/* ========================================== */}
                    {activeSettingsTab === 'basic' && (
                        <div className="space-y-4 animate-[fadeIn_0.15s_ease-out]">
                            {/* 画面テーマ切り替えスイッチ */}
                            <div className="flex justify-between items-center p-3 bg-amber-50/70 dark:bg-slate-900/60 rounded-xl border border-amber-200/80 dark:border-slate-500 shadow-2xs">
                                <div>
                                    <span className="font-black text-sm block text-gray-800 dark:text-slate-100">画面テーマ</span>
                                    <span className="text-xs text-gray-500 dark:text-slate-400">日中モード／夜間ダークモード</span>
                                </div>
                               <button
                                    type="button"
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    className={`px-3.5 py-1.5 rounded-lg font-black text-sm shadow-sm active:scale-95 transition-all flex items-center gap-1.5 border-2 select-none ${
                                        theme === 'dark'
                                            ? 'bg-slate-800 text-amber-300 border-amber-400/80 shadow-amber-950/40 hover:border-amber-300'
                                            : 'bg-white text-sky-700 border-sky-400 shadow-sky-100 hover:border-sky-500'
                                    }`}
                                >
                                    {theme === 'dark' ? (
                                        <><span>🌙</span><span>ダークモード</span></>
                                    ) : (
                                        <><span>☀️</span><span>日中モード</span></>
                                    )}
                                </button>
                            </div>

                            {/* 釣り座席数設定 */}
                            <div className="bg-emerald-50/60 dark:bg-slate-900/60 p-3 rounded-xl border border-emerald-200/80 dark:border-slate-500 space-y-2 shadow-2xs">
                                <span className="font-black text-gray-700 dark:text-slate-200 block text-sm">釣り座の席数設定（0〜15席）</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-bold text-red-500 dark:text-red-400 block mb-1">左舷 席数</label>
                                        <input
                                            type="number" min="0" max="15"
                                            className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-black bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 text-center text-lg focus:outline-none focus:ring-1 focus:ring-sky-400"
                                            value={portCount}
                                            onChange={(e) => onCountChange('port', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block mb-1">右舷 席数</label>
                                        <input
                                            type="number" min="0" max="15"
                                            className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-black bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 text-center text-lg focus:outline-none focus:ring-1 focus:ring-sky-400"
                                            value={starboardCount}
                                            onChange={(e) => onCountChange('starboard', e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 基本海況・ポイント */}
                            <div className="bg-sky-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-sky-200/80 dark:border-slate-500 space-y-2.5 shadow-2xs">
                                <span className="font-black text-gray-700 dark:text-slate-200 block text-sm">基本海況・ポイント設定</span>
                                
                                {/* 1段目：釣り物 */}
                                <div>
                                    <label className="text-xs font-bold text-sky-700 dark:text-sky-300 block mb-1">🎣 釣り物 (候補・手入力)</label>
                                    <input
                                        type="text"
                                        list="target-fish-options"
                                        className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 font-black text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400"
                                        value={targetFish}
                                        onChange={(e) => setTargetFish(e.target.value)}
                                        placeholder="選択または入力（例: カワハギ / アジ）"
                                    />
                                </div>

                                {/* 2段目：ポイント ＋ 水深 */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">ポイント (候補・手入力)</label>
                                        <input
                                            type="text"
                                            list="point-options"
                                            className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400"
                                            value={point}
                                            onChange={(e) => setPoint(e.target.value)}
                                            placeholder="選択または入力"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">水深 (m)</label>
                                        <input
                                            type="text"
                                            className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400"
                                            value={waterDepth}
                                            onChange={(e) => setWaterDepth(e.target.value)}
                                            placeholder="例: 30〜60"
                                        />
                                    </div>
                                </div>

                                {/* 3段目：水温 ＋ 潮色 */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">水温 (℃)</label>
                                        <input
                                            type="text"
                                            className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400"
                                            value={waterTemp}
                                            onChange={(e) => setWaterTemp(e.target.value)}
                                            placeholder="例: 20〜24"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">潮色 (候補・手入力)</label>
                                        <input
                                            type="text"
                                            list="tide-color-options"
                                            className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400"
                                            value={tide}
                                            onChange={(e) => setTide(e.target.value)}
                                            placeholder="例: 澄み / 薄濁り"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================== */}
                    {/* タブ 2: 気象・潮時（外枠：dark:border-slate-500） */}
                    {/* ========================================== */}
                    {activeSettingsTab === 'weather' && (
                        <div className="space-y-4 animate-[fadeIn_0.15s_ease-out]">
                            
                            {/* 上段：潮時ブロック */}
                            <div className="bg-sky-50 dark:bg-slate-900/60 p-3 rounded-xl border border-sky-200/80 dark:border-slate-500 space-y-2.5 shadow-2xs">
                                <div className="flex justify-between items-center">
                                    <span className="font-black text-sky-900 dark:text-sky-300 block text-sm">🌊 潮時データ</span>
                                    <span className="text-xs text-gray-400">カウンターのアラート連動</span>
                                </div>

                                {/* 潮時表画像解析ボタン */}
                                <button
                                    onClick={() => tideImageInputRef.current && tideImageInputRef.current.click()}
                                    disabled={isAnalyzingTide}
                                    className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black py-2.5 rounded-xl shadow-sm text-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
                                >
                                    {isAnalyzingTide ? <span className="animate-spin">↻</span> : <span>📷</span>}
                                    <span>潮時表の画像を自動読み取り</span>
                                </button>
                                <input ref={tideImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleTideImageAnalysis} />

                                <div className="pt-1 space-y-2">
                                    {/* 潮回り */}
                                    <div>
                                        <label className="text-xs font-bold text-sky-700 dark:text-sky-300 block mb-1">潮回り（大潮・中潮など）</label>
                                        <input
                                            type="text"
                                            className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400"
                                            value={tideState}
                                            onChange={(e) => setTideState(e.target.value)}
                                            placeholder="例: 中潮"
                                        />
                                    </div>

                                    {/* 満潮・干潮時刻 */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs font-bold text-sky-600 dark:text-sky-400 block mb-1">満潮 (1)</label>
                                            <input type="text" className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-400" value={highTide1} onChange={(e) => setHighTide1(e.target.value)} placeholder="05:30" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-sky-600 dark:text-sky-400 block mb-1">満潮 (2)</label>
                                            <input type="text" className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-400" value={highTide2} onChange={(e) => setHighTide2(e.target.value)} placeholder="17:45" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-amber-600 dark:text-amber-400 block mb-1">干潮 (1)</label>
                                            <input type="text" className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-400" value={lowTide1} onChange={(e) => setLowTide1(e.target.value)} placeholder="11:20" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-amber-600 dark:text-amber-400 block mb-1">干潮 (2)</label>
                                            <input type="text" className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 text-center focus:outline-none focus:ring-1 focus:ring-sky-400" value={lowTide2} onChange={(e) => setLowTide2(e.target.value)} placeholder="23:50" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 下段：気象・風波ブロック */}
                            <div className="bg-amber-50/70 dark:bg-slate-900/60 p-3 rounded-xl border border-amber-200/80 dark:border-slate-500 space-y-2.5 shadow-2xs">
                                <span className="font-black text-amber-900 dark:text-amber-300 block text-sm">☀️ 気象・風・波データ</span>

                                {/* 天気予報画像解析ボタン */}
                                <button
                                    onClick={() => weatherImageInputRef.current && weatherImageInputRef.current.click()}
                                    disabled={isAnalyzingWeather}
                                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black py-2.5 rounded-xl shadow-sm text-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
                                >
                                    {isAnalyzingWeather ? <span className="animate-spin">↻</span> : <span>📷</span>}
                                    <span>天気予報の画像を自動読み取り</span>
                                </button>
                                <input ref={weatherImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleWeatherImageAnalysis} />

                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">天候 (前半)</label>
                                        <input type="text" className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400" value={weather1} onChange={(e) => setWeather1(e.target.value)} placeholder="例: 晴れ" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">天候 (後半)</label>
                                        <input type="text" className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400" value={weather2} onChange={(e) => setWeather2(e.target.value)} placeholder="例: 曇り" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">風向 (前半)</label>
                                        <input type="text" className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400" value={windDir1} onChange={(e) => setWindDir1(e.target.value)} placeholder="例: 北東" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">風向 (後半)</label>
                                        <input type="text" className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400" value={windDir2} onChange={(e) => setWindDir2(e.target.value)} placeholder="例: 南西" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">風速 (前半)</label>
                                        <input type="text" className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400" value={windSpeed1} onChange={(e) => setWindSpeed1(e.target.value)} placeholder="例: 3m" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">風速 (後半)</label>
                                        <input type="text" className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400" value={windSpeed2} onChange={(e) => setWindSpeed2(e.target.value)} placeholder="例: 6m" />
                                    </div>

                                    {/* 波高プルダウン */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">波高 (前半)</label>
                                        <select
                                            className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400"
                                            value={waveHeight1}
                                            onChange={(e) => setWaveHeight1(e.target.value)}
                                        >
                                            <option value="">選択してください</option>
                                            {waveHeightOptions.map((opt) => (
                                                <option key={`wh1-${opt}`} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">波高 (後半)</label>
                                        <select
                                            className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400"
                                            value={waveHeight2}
                                            onChange={(e) => setWaveHeight2(e.target.value)}
                                        >
                                            <option value="">選択してください</option>
                                            {waveHeightOptions.map((opt) => (
                                                <option key={`wh2-${opt}`} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================== */}
                    {/* タブ 3: システム（外枠：dark:border-slate-500） */}
                    {/* ========================================== */}
                    {activeSettingsTab === 'system' && (
                        <div className="space-y-4 animate-[fadeIn_0.15s_ease-out]">
                            {/* データ管理・バックアップ */}
                            <div className="bg-sky-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-sky-100 dark:border-slate-500 space-y-2.5">
                                <span className="font-black text-sky-800 dark:text-sky-300 block text-sm">データ管理・メンテナンス</span>
                                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                                    釣果記録の保存・復元、または初期化を行います。
                                </p>
                                
                                {/* 1段目：保存 と 復元 */}
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <button
                                        onClick={handleExportData}
                                        className="w-full bg-sky-100 hover:bg-sky-200 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 font-black py-2.5 rounded-xl shadow-xs text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                    >
                                        <span>📥</span> データを保存
                                    </button>

                                    <button
                                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                        className="w-full bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-black py-2.5 rounded-xl shadow-xs text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                    >
                                        <span>📤</span> データを復元
                                    </button>
                                    
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        onChange={handleFileImport}
                                    />
                                </div>

                                {/* 2段目：コンパクトな初期化ボタン */}
                                <div className="pt-2 border-t border-sky-200/50 dark:border-slate-800 flex justify-center">
                                    <button
                                        onClick={handleFullReset}
                                        className="w-1/2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/70 font-bold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                    >
                                        <span>⚠️</span> アプリを初期化
                                    </button>
                                </div>
                            </div>

                            {/* Gemini AI設定（モデル選択が上・APIキーが下 / 文字拡大版） */}
                            <div className="bg-gray-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-gray-200 dark:border-slate-500 space-y-4">
                                <span className="font-black text-gray-700 dark:text-slate-200 block text-sm">Gemini AI設定</span>
                                
                                {/* 1. モデル選択（上段に配置 ＆ フォントサイズ拡大） */}
                                <div>
                                    <label className="text-xs sm:text-sm font-black text-sky-700 dark:text-sky-300 block mb-1.5 flex items-center justify-between">
                                        <span>🤖 使用AIモデル（日報・多角分析用）</span>
                                    </label>
                                    <select
                                        className="w-full border-2 border-sky-300 dark:border-slate-600 rounded-xl px-3 py-2.5 font-black text-base sm:text-lg bg-white dark:bg-slate-800 text-sky-950 dark:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer shadow-xs leading-normal"
                                        value={selectedAiModel}
                                        onChange={handleModelChange}
                                    >
                                        {aiModelOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value} className="text-sm sm:text-base font-bold text-gray-800 dark:text-slate-100">
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 2. APIキー（下段に配置） */}
                                <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
                                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">🔑 Gemini APIキー</label>
                                    <div className="relative">
                                        <input
                                            type={showKey ? "text" : "password"}
                                            className="w-full border border-gray-300 dark:border-slate-700 rounded-lg pl-3 pr-10 py-2 font-mono text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400"
                                            placeholder="AIzaSy..."
                                            value={tempKey}
                                            onChange={(e) => setTempKey(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowKey(!showKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-bold select-none"
                                        >
                                            {showKey ? '隠す' : '表示'}
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSaveApiKey}
                                        className="w-full mt-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-black py-2 rounded-lg text-sm shadow-sm transition-all active:scale-95"
                                    >
                                        APIキーを保存
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
                            

                                {/* モデル選択 */}
                                <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
                                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">使用AIモデル（日報・多角分析用）</label>
                                    <select
                                        className="w-full border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100"
                                        value={selectedAiModel}
                                        onChange={handleModelChange}
                                    >
                                        {aiModelOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}