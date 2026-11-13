// ==========================================
// settings.js : 設定・海況・システム管理パネル（モデル追加/削除管理＆風向2時点厳格判定版）
// ==========================================

const getMoonPhaseIcon = (ageStr) => {
    if (!ageStr || String(ageStr).trim() === '') return '';
    const age = parseFloat(ageStr);
    if (isNaN(age)) return '';
    if (age >= 28.5 || age < 1.5) return '🌑';
    if (age < 6.0) return '🌒';
    if (age < 9.0) return '🌓';
    if (age < 13.5) return '🌔';
    if (age < 16.5) return '🌕';
    if (age < 21.0) return '🌖';
    if (age < 24.0) return '🌗';
    return '🌘';
};

function SettingsPanel({
    isSettingsOpen, setIsSettingsOpen,
    portCount, starboardCount, onCountChange,
    point, setPoint, waterTemp, setWaterTemp,
    waterDepth, setWaterDepth, tide, setTide,
    tideState, setTideState,
    moonAge, setMoonAge,
    highTide1, setHighTide1,
    highTide2, setHighTide2, lowTide1, setLowTide1,
    lowTide2, setLowTide2, weather1, setWeather1,
    weather2, setWeather2, windDir1, setWindDir1,
    windDir2, setWindDir2, windSpeed1, setWindSpeed1,
    windSpeed2, setWindSpeed2, waveHeight1, setWaveHeight1,
    waveHeight2, setWaveHeight2, theme, setTheme,
    targetFish, setTargetFish, date, setToastMessage,
    onFactoryReset, records, setRecords,
    userApiKey, setUserApiKey, selectedAiModel, setSelectedAiModel,
    gasBackupUrl, setGasBackupUrl
}) {
    const [activeSettingsTab, setActiveSettingsTab] = React.useState('basic');
    const [isPointDropdownOpen, setIsPointDropdownOpen] = React.useState(false);
    const [isTideDropdownOpen, setIsTideDropdownOpen] = React.useState(false);

    const [availableModels, setAvailableModels] = React.useState([]);
    const [newDetectedModels, setNewDetectedModels] = React.useState([]);
    const [isCheckingModels, setIsCheckingModels] = React.useState(false);

    React.useEffect(() => {
        if (isSettingsOpen) {
            setAvailableModels(window.getAiModelList ? window.getAiModelList() : (window.AI_MODEL_LIST || []));
            if (userApiKey && typeof window.checkNewGeminiModels === 'function') {
                window.checkNewGeminiModels(userApiKey, false).then(found => {
                    setNewDetectedModels(found || []);
                });
            }
        }
    }, [isSettingsOpen, userApiKey]);

    const handleManualModelCheck = async () => {
        const key = (tempKey || userApiKey || '').trim();
        if (!key) {
            setToastMessage('APIキーを入力してから確認してください。');
            return;
        }
        setIsCheckingModels(true);
        try {
            const found = await window.checkNewGeminiModels(key, true);
            setNewDetectedModels(found || []);
            if (found && found.length > 0) {
                setToastMessage(`新着モデルを ${found.length} 件検知しました！`);
            } else {
                setToastMessage('現在利用可能なモデルはすべて登録済みです（新着なし）。');
            }
        } finally {
            setIsCheckingModels(false);
        }
    };

    const handleAddNewModelToList = (modelObj) => {
        if (typeof window.addCustomAiModel === 'function') {
            window.addCustomAiModel(modelObj);
            setAvailableModels(window.getAiModelList());
            setNewDetectedModels(prev => prev.filter(m => m.id !== modelObj.id));
            setToastMessage(`「${modelObj.displayName}」を選択リストに追加しました。\n（現在の使用モデルは変更されていません）`);
        }
    };

    const handleDismissNewModel = (modelId) => {
        if (typeof window.ignoreNewAiModel === 'function') {
            window.ignoreNewAiModel(modelId);
            setNewDetectedModels(prev => prev.filter(m => m.id !== modelId));
        }
    };

    // 現在選択中のモデルをリストから削除する
    const handleDeleteCurrentModel = () => {
        const currentList = availableModels.length > 0 ? availableModels : (window.getAiModelList ? window.getAiModelList() : []);
        if (currentList.length <= 1) {
            setToastMessage('最低1つのAIモデルを残す必要があるため削除できません。');
            return;
        }
        const targetObj = currentList.find(m => m.value === selectedAiModel) || currentList[0];
        if (!window.confirm(`「${targetObj.label}」を選択リストから削除しますか？\n（いつでも「初期リストに戻す」から復元できます）`)) {
            return;
        }
        try {
            const nextList = window.removeAiModelFromList(targetObj.value);
            setAvailableModels(nextList);
            const nextSelected = nextList[0].value;
            setSelectedAiModel(nextSelected);
            localStorage.setItem('fishing_ai_model', nextSelected);
            setToastMessage(`「${targetObj.label}」を削除し、\n使用モデルを「${nextList[0].label}」に切り替えました。`);
        } catch (err) {
            setToastMessage(err.message || '削除に失敗しました');
        }
    };

    // モデルリストを初期状態へ復元する
    const handleResetModelList = () => {
        if (!window.confirm('AIモデル選択リストを初期状態（標準の5モデル）に戻しますか？')) return;
        if (typeof window.resetAiModelListToDefault === 'function') {
            const defaultList = window.resetAiModelListToDefault();
            setAvailableModels(defaultList);
            setNewDetectedModels([]);
            const preferred = defaultList.find(m => m.id === 'gemini-3.8-flash') || defaultList[0];
            if (preferred) {
                setSelectedAiModel(preferred.value);
                localStorage.setItem('fishing_ai_model', preferred.value);
            }
            setToastMessage('AIモデル一覧を初期リストに復元しました。');
        }
    };

    const pointRef = React.useRef(null);
    const tideRef = React.useRef(null);
    const scrollContainerRef = React.useRef(null);

    const tideImageInputRef = React.useRef(null);
    const weatherImageInputRef = React.useRef(null);
    const fileInputRef = React.useRef(null);
    const [tempKey, setTempKey] = React.useState(userApiKey || '');
    const [showKey, setShowKey] = React.useState(false);
    const [tempGasUrl, setTempGasUrl] = React.useState(gasBackupUrl || '');
    const [isCloudRestoring, setIsCloudRestoring] = React.useState(false);
    const [isCloudSaving, setIsCloudSaving] = React.useState(false);
    const [isCloudSaved, setIsCloudSaved] = React.useState(() => {
        return localStorage.getItem('fishing_is_gas_saved') === 'true';
    });
    const [lastSyncTime, setLastSyncTime] = React.useState(() => {
        return localStorage.getItem('fishing_last_gas_sync_time') || '';
    });

    React.useEffect(() => {
        setTempGasUrl(gasBackupUrl || '');
    }, [gasBackupUrl]);

    const handleSaveGasUrl = () => {
        const cleaned = (tempGasUrl || '').trim();
        setGasBackupUrl(cleaned);
        localStorage.setItem('fishing_gas_backup_url', cleaned);
        setToastMessage('Googleドライブ受取URLを保存しました');
    };

    const handleRestoreFromCloud = async () => {
        const targetUrl = (gasBackupUrl || tempGasUrl || '').trim();
        if (!targetUrl) {
            setToastMessage('Googleドライブの受取URLが設定されていません。\nURLを入力して「保存」を押してください。');
            return;
        }

        if (!window.confirm('Googleドライブの最新バックアップから釣果データを復元しますか？\n（現在の端末データは上書きされます）')) {
            return;
        }

        setIsCloudRestoring(true);
        setToastMessage('Googleドライブからバックアップを取得中...');

        try {
            const res = await fetch(targetUrl, { method: 'GET' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            let importedList = [];
            if (Array.isArray(data)) {
                importedList = data;
            } else if (data && Array.isArray(data.records)) {
                importedList = data.records;
            } else if (data && data.status === 'error') {
                throw new Error(data.message || 'データが見つかりません');
            } else {
                throw new Error('バックアップの形式が認識できません');
            }

            if (importedList.length === 0) {
                setToastMessage('復元できる釣果データが見つかりませんでした');
                return;
            }

            localStorage.setItem('fishing_records', JSON.stringify(importedList));
            setRecords(importedList);
            setToastMessage(`復元完了！\n${importedList.length}件の釣果データをGoogleドライブから復元しました。`);
            setIsSettingsOpen(false);
        } catch (err) {
            console.error(err);
            setToastMessage(`ドライブからの復元に失敗しました:\n${err.message}`);
        } finally {
            setIsCloudRestoring(false);
        }
    };
    
    const [isAnalyzingTide, setIsAnalyzingTide] = React.useState(false);
    const [isAnalyzingWeather, setIsAnalyzingWeather] = React.useState(false);

    React.useEffect(() => {
        setTempKey(userApiKey || '');
    }, [userApiKey]);

    React.useEffect(() => {
        if (isSettingsOpen) {
            setActiveSettingsTab('basic');
            setIsPointDropdownOpen(false);
            setIsTideDropdownOpen(false);
        }
    }, [isSettingsOpen]);

    if (!isSettingsOpen) return null;

    const waveHeightOptions = [
        "穏やか", "穏やかな方", "多少波がある", "波がやや高い", "波が高い", "しける", "大しけ"
    ];

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxDim = 1280;
                    let width = img.width;
                    let height = img.height;

                    if (width > height && width > maxDim) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else if (height > maxDim) {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    resolve(dataUrl.split(',')[1]);
                };
                img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleTideImageAnalysis = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const activeKey = (userApiKey || '').trim();
        if (!activeKey) {
            setToastMessage('APIキーが未入力です。「システム」タブでGemini APIキーを設定してください。');
            if (tideImageInputRef.current) tideImageInputRef.current.value = '';
            return;
        }

        setIsAnalyzingTide(true);
        const currentSelected = selectedAiModel || localStorage.getItem('fishing_ai_model');

        try {
            const base64Data = await fileToBase64(file);
            const prompt = `潮見表画像から潮時と月齢を抽出し、以下のJSON形式のみを出力してください。前置きや解説は一切不要です。不明な項目は空文字 "" にしてください。
{"tideState":"潮回り(大潮,中潮,小潮,若潮,長潮など)","moonAge":"月齢数値(例: 21.5)","highTide1":"満潮1(例: 10:18)","highTide2":"満潮2(例: 19:17)","lowTide1":"干潮1(例: 02:25)","lowTide2":"干潮2(例: 14:23)"}`;

            const parsed = await window.callAiVision({
                prompt: prompt,
                base64Image: base64Data,
                apiKey: activeKey,
                selectedModel: currentSelected,
                onStatusUpdate: (msg) => setToastMessage(msg)
            });

            if (parsed.tideState) setTideState(parsed.tideState);
            if (parsed.moonAge && typeof setMoonAge === 'function') setMoonAge(parsed.moonAge);
            if (parsed.highTide1) setHighTide1(parsed.highTide1);
            if (parsed.highTide2) setHighTide2(parsed.highTide2);
            if (parsed.lowTide1) setLowTide1(parsed.lowTide1);
            if (parsed.lowTide2) setLowTide2(parsed.lowTide2);

            setToastMessage(`解析完了！\n潮回り「${parsed.tideState || '-'}」・月齢「${parsed.moonAge || '-'}」を入力しました`);
        } catch (err) {
            console.error('Tide Analysis Error:', err);
            setToastMessage(`潮時表の解析エラー:\n${err.message || '通信エラー'}`);
        } finally {
            setIsAnalyzingTide(false);
            if (tideImageInputRef.current) tideImageInputRef.current.value = '';
        }
    };

    const handleWeatherImageAnalysis = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const activeKey = (userApiKey || '').trim();
        if (!activeKey) {
            setToastMessage('APIキーが未入力です。「システム」タブでGemini APIキーを設定してください。');
            if (weatherImageInputRef.current) weatherImageInputRef.current.value = '';
            return;
        }

        setIsAnalyzingWeather(true);
        const currentSelected = selectedAiModel || localStorage.getItem('fishing_ai_model');

        try {
            const prompt = `気象予報画像から【日中の実釣時間帯】の予報を抽出し、JSON形式のみで出力してください。
※深夜（0時・3時）や夜間（18時・21時）の列は絶対に無視してください。

【抽出ルール】
・対象時間帯:
  - 前半 ＝ 「6時」と「9時」の2列
  - 後半 ＝ 「12時」と「15時」の2列
・天候: 雷マークは無視し、前半（6時・9時）、後半（12時・15時）の天候アイコンから「晴れ」「曇り」「雨」を出力（途中で変わる場合は "曇り→晴れ" のように表記）。
・風向（最重要・2時点判定ルール）:
  矢印が指す方向（風下）ではなく、【風が吹いてくる方角（風向）】を判定してください。
  1. 四方位（北・南・東・西）は、矢印が完全な垂直・水平（真下＝北、真上＝南、真左＝東、真右＝西）を向いている時のみ使用してください。
  2. 少しでも斜めに傾いている場合は、必ず四隅の方角（左下向き＝「北東」、右下向き＝「北西」、左上向き＝「南東」、右上向き＝「南西」）と判定してください。
  3. 前半の「6時」と「9時」の風向が同じなら1つだけ出力（例: "北東"）、異なる場合は迷わず「→」で繋いで2つ出力してください（例: "北→北東"）。
  4. 後半の「12時」と「15時」も同様に、同じなら1つ（例: "北東"）、異なる場合は「→」で繋いで2つ出力してください（例: "北東→東"）。
・風速: 前半（6時・9時）、後半（12時・15時）の通常風速と最大瞬間風速の最小〜最大幅を出力（例: "3〜7m/s"）。
・波高: 選択肢 ["穏やか", "穏やかな方", "多少波がある", "波がやや高い", "波が高い", "しける", "大しけ"] から選んでください。

不明な項目は空文字 "" にしてください。JSONのみ出力：
{"weather1":"前半天気","weather2":"後半天気","windDir1":"前半風向","windDir2":"後半風向","windSpeed1":"前半風速幅","windSpeed2":"後半風速幅","waveHeight1":"前半波高","waveHeight2":"後半波高"}`;

            const base64Data = await fileToBase64(file);
            const parsed = await window.callAiVision({
                prompt: prompt,
                base64Image: base64Data,
                apiKey: activeKey,
                selectedModel: currentSelected,
                onStatusUpdate: (msg) => setToastMessage(msg)
            });

            const cleanWindDir = (dir) => {
                if (!dir) return '';
                const valid = ['北東', '北西', '南東', '南西', '北', '南', '東', '西'];
                const parts = String(dir).split(/[→➔➡~〜・/\s]+/).map(p => {
                    const trimmed = p.trim();
                    return valid.find(v => trimmed.includes(v)) || '';
                }).filter(Boolean);

                if (parts.length === 0) return dir.trim();
                if (parts.length >= 2 && parts[0] !== parts[parts.length - 1]) {
                    return `${parts[0]}→${parts[parts.length - 1]}`;
                }
                return parts[0];
            };

            let count = 0;
            if (parsed.weather1) { setWeather1(parsed.weather1); count++; }
            if (parsed.weather2) { setWeather2(parsed.weather2); count++; }
            if (parsed.windDir1) { setWindDir1(cleanWindDir(parsed.windDir1)); count++; }
            if (parsed.windDir2) { setWindDir2(cleanWindDir(parsed.windDir2)); count++; }
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
        if (cleaned && typeof window.checkNewGeminiModels === 'function') {
            window.checkNewGeminiModels(cleaned, true).then(found => setNewDetectedModels(found || []));
        }
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

                <div className="flex bg-sky-200 dark:bg-slate-950 px-2 pt-0.5 gap-1.5 border-b border-sky-300 dark:border-slate-800 font-black shrink-0 items-end">
                    {[
                        { id: 'basic', label: '基本設定' },
                        { id: 'weather', label: '気象・潮時' },
                        { id: 'system', label: 'システム', hasBadge: newDetectedModels.length > 0 }
                    ].map(tab => {
                        const isActive = activeSettingsTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveSettingsTab(tab.id)}
                                className={`flex-1 py-2.5 px-2 rounded-t-xl text-sm font-black transition-all relative select-none flex items-center justify-center gap-1 ${
                                    isActive
                                        ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-400 border-t-2 border-x border-t-sky-600 dark:border-t-sky-400 border-x-sky-300 dark:border-x-slate-800 -mb-px z-10 shadow-sm'
                                        : 'bg-sky-100/85 hover:bg-sky-100 dark:bg-slate-900 hover:dark:bg-slate-855 text-sky-800 dark:text-slate-400 border-t border-x border-sky-200/60 dark:border-slate-800/80 hover:dark:text-white active:scale-[0.98]'
                                }`}
                            >
                                <span>{tab.label}</span>
                                {tab.hasBadge && (
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" title="新着AIモデルあり"></span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-sm sm:text-base no-scrollbar bg-white dark:bg-slate-800">
                    {activeSettingsTab === 'basic' && (
                        <div className="space-y-4 animate-[fadeIn_0.15s_ease-out]">
                            <div className="bg-emerald-50/60 dark:bg-slate-900/60 p-3 rounded-xl border border-emerald-200/80 dark:border-slate-500 space-y-2 shadow-2xs">
                                <span className="font-black text-gray-700 dark:text-slate-200 block text-sm">座席表の釣座設定（0〜15席）</span>
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

                            <div className="bg-sky-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-sky-200/80 dark:border-slate-500 space-y-3 shadow-2xs">
                                <span className="font-black text-gray-700 dark:text-slate-200 block text-base">基本海況・ポイント設定</span>
                                <div>
                                    <label className="text-xs sm:text-sm font-black text-sky-800 dark:text-sky-300 block mb-1">🎣 釣り物 (候補・手入力)</label>
                                    <input
                                        type="text"
                                        list="target-fish-options"
                                        className="w-full border-2 border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 font-black text-base sm:text-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                                        value={targetFish}
                                        onChange={(e) => setTargetFish(e.target.value)}
                                        placeholder="選択または入力（例: カワハギ / アジ）"
                                    />
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
                                </div>

                                <div className="space-y-1.5" ref={pointRef}>
                                    <div className="flex gap-2">
                                        <div className="flex-1 min-w-0 relative">
                                            <label className="text-xs sm:text-sm font-bold text-gray-600 dark:text-slate-300 block mb-1 whitespace-nowrap">ポイント</label>
                                            <div className="relative flex items-center">
                                                <input
                                                    type="text"
                                                    className="w-full border-2 border-gray-200 dark:border-slate-600 rounded-xl pl-2.5 pr-8 py-2.5 font-bold text-sm sm:text-base tracking-tight bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                                                    value={point}
                                                    onChange={(e) => setPoint(e.target.value)}
                                                    placeholder="例: 久里浜沖〜竹岡沖"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const nextState = !isPointDropdownOpen;
                                                        setIsPointDropdownOpen(nextState);
                                                        setIsTideDropdownOpen(false);
                                                        if (nextState && scrollContainerRef.current && pointRef.current) {
                                                            setTimeout(() => {
                                                                const topPos = pointRef.current.offsetTop - 10;
                                                                scrollContainerRef.current.scrollTo({ top: topPos, behavior: 'smooth' });
                                                            }, 80);
                                                        }
                                                    }}
                                                    className="absolute right-0.5 top-1 bottom-1 px-2 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 text-xs font-black select-none active:scale-90"
                                                    title="候補を開く"
                                                >
                                                    {isPointDropdownOpen ? '▲' : '▼'}
                                                </button>
                                            </div>

                                            {isPointDropdownOpen && (
                                                <div className="absolute left-0 top-full mt-1 w-full bg-white dark:bg-slate-800 border-2 border-sky-400 dark:border-slate-600 rounded-xl shadow-xl z-30 p-1.5 space-y-1 animate-[fadeIn_0.15s_ease-out]">
                                                    <div className="flex justify-between items-center px-2 py-1.5 border-b border-gray-100 dark:border-slate-700">
                                                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 leading-tight">タップで<br />追加・解除</span>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setIsPointDropdownOpen(false)}
                                                            className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-rose-500 hover:text-white dark:bg-slate-700 dark:hover:bg-rose-600 text-slate-700 dark:text-slate-100 text-xs sm:text-sm font-black flex items-center gap-1.5 whitespace-nowrap shadow-xs active:scale-95 transition-all select-none shrink-0"
                                                        >
                                                            <span className="text-sm font-black leading-none">✕</span>
                                                            <span className="leading-none tracking-wider">閉じる</span>
                                                        </button>
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto no-scrollbar py-0.5 space-y-0.5">
                                                        {['久里浜沖', '鴨居沖', '走水沖', '観音崎沖', '下浦沖', '竹岡沖', '剣崎沖'].map((pName) => {
                                                            const isSelected = point && point.split('〜').map(s => s.trim()).includes(pName);
                                                            return (
                                                                <button
                                                                    key={pName}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const currentList = point ? point.split('〜').map(s => s.trim()).filter(Boolean) : [];
                                                                        let nextList;
                                                                        if (currentList.includes(pName)) {
                                                                            nextList = currentList.filter(item => item !== pName);
                                                                        } else {
                                                                            nextList = [...currentList, pName];
                                                                        }
                                                                        setPoint(nextList.join('〜'));
                                                                    }}
                                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold flex justify-between items-center transition-colors select-none ${
                                                                        isSelected
                                                                            ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-900 dark:text-sky-300 font-black'
                                                                            : 'hover:bg-gray-100 dark:hover:bg-slate-700/60 text-gray-700 dark:text-slate-200'
                                                                    }`}
                                                                >
                                                                    <span>{pName}</span>
                                                                    {isSelected && <span className="text-sky-600 dark:text-sky-400 font-black">✓</span>}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-[120px] shrink-0">
                                            <label className="text-xs sm:text-sm font-bold text-gray-600 dark:text-slate-300 block mb-1 text-center whitespace-nowrap">水深 (m)</label>
                                            <input
                                                type="text"
                                                className="w-full border-2 border-gray-200 dark:border-slate-600 rounded-xl px-2 py-2.5 font-bold text-base text-center bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                                                value={waterDepth}
                                                onChange={(e) => setWaterDepth(e.target.value)}
                                                placeholder="30〜60"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5 pt-1" ref={tideRef}>
                                    <div className="flex gap-2">
                                        <div className="flex-1 min-w-0 relative">
                                            <label className="text-xs sm:text-sm font-bold text-gray-600 dark:text-slate-300 block mb-1 whitespace-nowrap">潮色</label>
                                            <div className="relative flex items-center">
                                                <input
                                                    type="text"
                                                    className="w-full border-2 border-gray-200 dark:border-slate-600 rounded-xl pl-2.5 pr-8 py-2.5 font-bold text-sm sm:text-base tracking-tight bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                                                    value={tide}
                                                    onChange={(e) => setTide(e.target.value)}
                                                    placeholder="例: 澄み〜薄濁り"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const nextState = !isTideDropdownOpen;
                                                        setIsTideDropdownOpen(nextState);
                                                        setIsPointDropdownOpen(false);
                                                        if (nextState && scrollContainerRef.current && tideRef.current) {
                                                            setTimeout(() => {
                                                                const targetScrollTop = tideRef.current.offsetTop + 180;
                                                                scrollContainerRef.current.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
                                                            }, 80);
                                                        }
                                                    }}
                                                    className="absolute right-0.5 top-1 bottom-1 px-2 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 text-xs font-black select-none active:scale-90"
                                                    title="候補を開く"
                                                >
                                                    {isTideDropdownOpen ? '▲' : '▼'}
                                                </button>
                                            </div>

                                            {isTideDropdownOpen && (
                                                <div className="absolute left-0 top-full mt-1 w-full bg-white dark:bg-slate-800 border-2 border-sky-400 dark:border-slate-600 rounded-xl shadow-xl z-30 p-1.5 space-y-1 animate-[fadeIn_0.15s_ease-out]">
                                                    <div className="flex justify-between items-center px-2 py-1.5 border-b border-gray-100 dark:border-slate-700">
                                                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 leading-tight">タップで<br />追加・解除</span>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setIsTideDropdownOpen(false)}
                                                            className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-rose-500 hover:text-white dark:bg-slate-700 dark:hover:bg-rose-600 text-slate-700 dark:text-slate-100 text-xs sm:text-sm font-black flex items-center gap-1.5 whitespace-nowrap shadow-xs active:scale-95 transition-all select-none shrink-0"
                                                        >
                                                            <span className="text-sm font-black leading-none">✕</span>
                                                            <span className="leading-none tracking-wider">閉じる</span>
                                                        </button>
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto no-scrollbar py-0.5 space-y-0.5">
                                                        {['澄み', '薄濁り', '濁り', '笹濁り', '激濁り'].map((tName) => {
                                                            const isSelected = tide && tide.split('〜').map(s => s.trim()).includes(tName);
                                                            return (
                                                                <button
                                                                    key={tName}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const currentList = tide ? tide.split('〜').map(s => s.trim()).filter(Boolean) : [];
                                                                        let nextList;
                                                                        if (currentList.includes(tName)) {
                                                                            nextList = currentList.filter(item => item !== tName);
                                                                        } else {
                                                                            nextList = [...currentList, tName];
                                                                        }
                                                                        setTide(nextList.join('〜'));
                                                                    }}
                                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold flex justify-between items-center transition-colors select-none ${
                                                                        isSelected
                                                                            ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-900 dark:text-sky-300 font-black'
                                                                            : 'hover:bg-gray-100 dark:hover:bg-slate-700/60 text-gray-700 dark:text-slate-200'
                                                                    }`}
                                                                >
                                                                    <span>{tName}</span>
                                                                    {isSelected && <span className="text-sky-600 dark:text-sky-400 font-black">✓</span>}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-[120px] shrink-0">
                                            <label className="text-xs sm:text-sm font-bold text-gray-600 dark:text-slate-300 block mb-1 text-center whitespace-nowrap">海水温 (℃)</label>
                                            <input
                                                type="text"
                                                className="w-full border-2 border-gray-200 dark:border-slate-600 rounded-xl px-2 py-2.5 font-bold text-base text-center bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                                                value={waterTemp}
                                                onChange={(e) => setWaterTemp(e.target.value)}
                                                placeholder="20〜24"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSettingsTab === 'weather' && (
                        <div className="space-y-4 animate-[fadeIn_0.15s_ease-out]">
                            <div className="bg-sky-50 dark:bg-slate-900/60 p-3 rounded-xl border border-sky-200/80 dark:border-slate-500 space-y-2.5 shadow-2xs">
                                <div className="flex justify-between items-center">
                                    <span className="font-black text-sky-900 dark:text-sky-300 block text-sm">🌊 潮時データ</span>
                                    <span className="text-xs text-gray-400">カウンターのアラート連動</span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => tideImageInputRef.current && tideImageInputRef.current.click()}
                                    disabled={isAnalyzingTide}
                                    className={`w-full text-white font-black py-3 rounded-xl shadow-md text-sm sm:text-base flex items-center justify-center gap-2 transition-all select-none ${
                                        isAnalyzingTide
                                            ? 'bg-sky-600 animate-pulse cursor-wait ring-2 ring-sky-300'
                                            : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-95'
                                    }`}
                                >
                                    {isAnalyzingTide ? (
                                        <>
                                            <svg className="animate-spin w-5 h-5 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span className="tracking-wide">潮時表をAI解析中...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-lg">📷</span>
                                            <span>潮時表の画像を自動読み取り</span>
                                        </>
                                    )}
                                </button>
                                <input ref={tideImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleTideImageAnalysis} />

                                <div className="pt-1 space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs font-bold text-sky-700 dark:text-sky-300 block mb-1">潮回り</label>
                                            <input
                                                type="text"
                                                className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-black text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400"
                                                value={tideState}
                                                onChange={(e) => setTideState(e.target.value)}
                                                placeholder="例: 小潮"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-sky-700 dark:text-sky-300 block mb-1">月齢</label>
                                            <div className="relative flex items-center">
                                                {moonAge && String(moonAge).trim() !== '' && (
                                                    <span className="absolute left-2.5 text-base select-none pointer-events-none">
                                                        {getMoonPhaseIcon(moonAge)}
                                                    </span>
                                                )}
                                                <input
                                                    type="text"
                                                    className={`w-full border border-gray-200 dark:border-slate-600 rounded-lg py-2 font-black text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400 ${
                                                        moonAge && String(moonAge).trim() !== '' ? 'pl-8 pr-2' : 'px-2.5'
                                                    }`}
                                                    value={moonAge || ''}
                                                    onChange={(e) => typeof setMoonAge === 'function' && setMoonAge(e.target.value)}
                                                    placeholder=""
                                                />
                                            </div>
                                        </div>
                                    </div>

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

                            <div className="bg-amber-50/70 dark:bg-slate-900/60 p-3 rounded-xl border border-amber-200/80 dark:border-slate-500 space-y-2.5 shadow-2xs">
                                <span className="font-black text-amber-900 dark:text-amber-300 block text-sm">☀️ 気象・風・波データ</span>

                                <button
                                    type="button"
                                    onClick={() => weatherImageInputRef.current && weatherImageInputRef.current.click()}
                                    disabled={isAnalyzingWeather}
                                    className={`w-full text-white font-black py-3 rounded-xl shadow-md text-sm sm:text-base flex items-center justify-center gap-2 transition-all select-none ${
                                        isAnalyzingWeather
                                            ? 'bg-amber-600 animate-pulse cursor-wait ring-2 ring-amber-300'
                                            : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 active:scale-95'
                                    }`}
                                >
                                    {isAnalyzingWeather ? (
                                        <>
                                            <svg className="animate-spin w-5 h-5 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span className="tracking-wide">気象予報をAI解析中...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-lg">📷</span>
                                            <span>天気予報の画像を自動読み取り</span>
                                        </>
                                    )}
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
                                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">風向 (前半:6〜9時)</label>
                                        <input type="text" className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400" value={windDir1} onChange={(e) => setWindDir1(e.target.value)} placeholder="例: 北東 / 北→北東" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">風向 (後半:12〜15時)</label>
                                        <input type="text" className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400" value={windDir2} onChange={(e) => setWindDir2(e.target.value)} placeholder="例: 南西 / 東→南東" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">風速 (前半)</label>
                                        <input type="text" className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400" value={windSpeed1} onChange={(e) => setWindSpeed1(e.target.value)} placeholder="例: 3〜7m/s" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">風速 (後半)</label>
                                        <input type="text" className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2 font-bold text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400" value={windSpeed2} onChange={(e) => setWindSpeed2(e.target.value)} placeholder="例: 2〜5m/s" />
                                    </div>

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

                    {activeSettingsTab === 'system' && (
                        <div className="space-y-4 animate-[fadeIn_0.15s_ease-out]">
                            <div className="p-3 bg-amber-50/70 dark:bg-slate-900/60 rounded-xl border border-amber-200/80 dark:border-slate-500 shadow-2xs space-y-2">
                                <div>
                                    <span className="font-black text-sm block text-gray-800 dark:text-slate-100">画面テーマ</span>
                                    <span className="text-xs text-gray-500 dark:text-slate-400">日中モード／夜間ダークモードの選択</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2.5 pt-1 select-none">
                                    <button
                                        type="button"
                                        onClick={() => setTheme('light')}
                                        className={`relative flex flex-col items-center justify-between p-3 rounded-xl border-2 transition-all duration-200 active:scale-[0.98] ${
                                            theme !== 'dark'
                                                ? 'border-sky-500 bg-white ring-2 ring-sky-300/60 shadow-md'
                                                : 'border-slate-700 bg-slate-850/60 hover:bg-slate-800 text-slate-400 opacity-60 hover:opacity-90'
                                        }`}
                                    >
                                        {theme !== 'dark' && (
                                            <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-sky-500 text-white text-xs font-black shadow-xs">✓</span>
                                        )}
                                        <span className="text-2xl sm:text-3xl filter drop-shadow-xs mb-1">☀️</span>
                                        <span className={`text-xs sm:text-sm font-black ${theme !== 'dark' ? 'text-sky-950' : 'text-slate-300'}`}>ライトモード</span>
                                        <div className={`w-full mt-2 py-0.5 px-1.5 rounded flex items-center justify-center space-x-1 border ${theme !== 'dark' ? 'bg-amber-50/80 border-amber-200/80' : 'bg-slate-900 border-slate-755'}`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                            <span className={`text-[10px] font-bold ${theme !== 'dark' ? 'text-amber-900' : 'text-slate-400'}`}>標準・明るい画面</span>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setTheme('dark')}
                                        className={`relative flex flex-col items-center justify-between p-3 rounded-xl border-2 transition-all duration-200 active:scale-[0.98] ${
                                            theme === 'dark'
                                                ? 'border-indigo-400 bg-slate-800 ring-2 ring-indigo-400/50 shadow-md'
                                                : 'border-slate-200 bg-white/70 hover:bg-white text-slate-500 opacity-60 hover:opacity-90'
                                        }`}
                                    >
                                        {theme === 'dark' && (
                                            <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500 text-white text-xs font-black shadow-xs">✓</span>
                                        )}
                                        <span className="text-2xl sm:text-3xl filter drop-shadow-xs mb-1">🌙</span>
                                        <span className={`text-xs sm:text-sm font-black ${theme === 'dark' ? 'text-indigo-200' : 'text-slate-700'}`}>ダークモード</span>
                                        <div className={`w-full mt-2 py-0.5 px-1.5 rounded flex items-center justify-center space-x-1 border ${theme === 'dark' ? 'bg-slate-950 border-slate-700' : 'bg-emerald-50/80 border-emerald-200/80'}`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                            <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-emerald-900'}`}>バッテリー省電力</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-gray-200 dark:border-slate-500 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="font-black text-gray-700 dark:text-slate-200 text-sm">Gemini AI設定</span>
                                    <button
                                        type="button"
                                        onClick={handleManualModelCheck}
                                        disabled={isCheckingModels}
                                        className="text-xs font-black px-2.5 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-slate-600 active:scale-95 transition-all"
                                    >
                                        {isCheckingModels ? '確認中...' : '🔄 新着モデル確認'}
                                    </button>
                                </div>

                                {/* 新モデル通知バナー */}
                                {newDetectedModels.length > 0 && (
                                    <div className="bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-400 dark:border-amber-600 rounded-xl p-3 space-y-2 animate-[fadeIn_0.2s_ease-out]">
                                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-amber-900 dark:text-amber-300">
                                            <span>✨</span>
                                            <span>新しいAIモデルが利用可能です！</span>
                                        </div>
                                        <p className="text-[11px] font-bold text-amber-800/80 dark:text-amber-200/80 leading-snug">
                                            ※現在の使用モデルは自動変更されません。必要な場合のみリストに追加できます。
                                        </p>
                                        <div className="space-y-1.5 pt-1">
                                            {newDetectedModels.map(nm => (
                                                <div key={nm.id} className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 px-2.5 py-2 rounded-lg border border-amber-200 dark:border-slate-700">
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-black text-gray-800 dark:text-slate-100 truncate">{nm.displayName}</div>
                                                        <div className="text-[10px] font-mono text-gray-400 truncate">{nm.id}</div>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddNewModelToList(nm)}
                                                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black active:scale-95"
                                                        >
                                                            ＋ 追加
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDismissNewModel(nm.id)}
                                                            className="px-2 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 text-gray-600 dark:text-slate-300 text-xs font-bold"
                                                            title="この通知を非表示"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs sm:text-sm font-black text-sky-700 dark:text-sky-300 block flex items-center justify-between">
                                        <span>🤖 使用AIモデル（日報・多角分析・画像解析）</span>
                                    </label>
                                    <select
                                        className="w-full border-2 border-sky-300 dark:border-slate-600 rounded-xl px-3 py-2.5 font-black text-base sm:text-lg bg-white dark:bg-slate-800 text-sky-950 dark:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer shadow-xs leading-normal"
                                        value={selectedAiModel}
                                        onChange={handleModelChange}
                                    >
                                        {(availableModels.length > 0 ? availableModels : (window.AI_MODEL_LIST || [])).map((opt) => (
                                            <option key={opt.value} value={opt.value} className="text-sm sm:text-base font-bold text-gray-800 dark:text-slate-100">
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>

                                    {/* モデル整理（選択中モデルの削除 ＆ 初期リスト復元）ボタン */}
                                    <div className="flex items-center justify-between gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={handleDeleteCurrentModel}
                                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/70 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
                                        >
                                            <span>🗑️</span>
                                            <span>選択中のモデルをリストから削除</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleResetModelList}
                                            className="px-2.5 py-1.5 rounded-lg bg-gray-200/80 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 text-xs font-bold active:scale-95 transition-all"
                                        >
                                            初期リストに戻す
                                        </button>
                                    </div>
                                </div>

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

                            <div className="bg-sky-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-sky-200/80 dark:border-slate-500 space-y-3 shadow-2xs">
                                <div className="flex justify-between items-center">
                                    <span className="font-black text-sky-800 dark:text-sky-300 block text-sm">☁️ Googleドライブ同期・復元</span>
                                    {lastSyncTime && (
                                        <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-sky-200 dark:border-slate-700">
                                            最終同期: {lastSyncTime}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        disabled={isCloudSaving}
                                        onClick={async () => {
                                            const targetUrl = (gasBackupUrl || tempGasUrl || '').trim();
                                            if (!targetUrl) {
                                                setToastMessage('受取URLが設定されていません。下の入力欄に登録してください。');
                                                return;
                                            }
                                            setIsCloudSaving(true);
                                            setToastMessage('Googleドライブへ全データを保存中...');
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
                                                await fetch(targetUrl, {
                                                    method: 'POST',
                                                    mode: 'no-cors',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(exportPayload)
                                                });

                                                const now = new Date();
                                                const timeStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                                localStorage.setItem('fishing_last_gas_sync_time', timeStr);
                                                localStorage.setItem('fishing_is_gas_saved', 'true');
                                                setLastSyncTime(timeStr);
                                                setIsCloudSaved(true);
                                                setToastMessage('Googleドライブに最新データを保存しました！');
                                            } catch (err) {
                                                setToastMessage(`保存に失敗しました: ${err.message}`);
                                            } finally {
                                                setIsCloudSaving(false);
                                            }
                                        }}
                                        className={`font-black py-2.5 rounded-xl text-xs sm:text-sm shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 select-none ${
                                            isCloudSaved
                                                ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white ring-2 ring-emerald-300 dark:ring-emerald-800'
                                                : 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white'
                                        }`}
                                    >
                                        {isCloudSaving ? (
                                            <>
                                                <svg className="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>保存中...</span>
                                            </>
                                        ) : isCloudSaved ? (
                                            <>
                                                <span>✓</span>
                                                <span>クラウド保存済み</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>☁️</span>
                                                <span>クラウド保存</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isCloudRestoring}
                                        onClick={handleRestoreFromCloud}
                                        className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 font-black py-2.5 rounded-xl text-xs sm:text-sm shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 select-none"
                                    >
                                        {isCloudRestoring ? (
                                            <>
                                                <span className="animate-spin">↻</span>
                                                <span>復元中...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>📥</span>
                                                <span>ドライブから復元</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="pt-2 border-t border-sky-200/60 dark:border-slate-800">
                                    <label className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block mb-1">🔗 GASウェブアプリURL（初回登録用）</label>
                                    <div className="flex gap-1.5">
                                        <input
                                            type="url"
                                            className="flex-1 border border-gray-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-xs bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-400 min-w-0"
                                            placeholder="https://script.google.com/macros/s/.../exec"
                                            value={tempGasUrl}
                                            onChange={(e) => setTempGasUrl(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSaveGasUrl}
                                            className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold px-3 py-1.5 rounded-lg text-xs shrink-0 transition-all active:scale-95 border border-slate-300 dark:border-slate-600"
                                        >
                                            保存
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-sky-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-sky-100 dark:border-slate-500 space-y-2.5">
                                <span className="font-black text-sky-800 dark:text-sky-300 block text-sm">データ管理・メンテナンス</span>
                                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                                    釣果記録の保存・復元、または初期化を行います。
                                </p>
                                
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={handleExportData}
                                        className="w-full bg-sky-100 hover:bg-sky-200 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 font-black py-2.5 rounded-xl shadow-xs text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                    >
                                        <span>📥</span> データを保存
                                    </button>

                                    <button
                                        type="button"
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

                                <div className="pt-2 border-t border-sky-200/50 dark:border-slate-800 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={handleFullReset}
                                        className="w-1/2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/70 font-bold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                    >
                                        <span>⚠️</span> アプリを初期化
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