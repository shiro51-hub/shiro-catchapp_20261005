// ==========================================
// app.js : メイン司令塔・画面遷移・全体レンダリング
// ==========================================

// 画像キャプチャ用のライブラリを動的に読み込む機能
const loadHtml2Canvas = () => {
    return new Promise((resolve, reject) => {
        if (window.html2canvas) {
            resolve(window.html2canvas);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = () => resolve(window.html2canvas);
        script.onerror = () => reject(new Error('画像の生成に必要なツールの読み込みに失敗しました'));
        document.head.appendChild(script);
    });
};

const IconCamera = ({ className = "w-4 h-4 mr-1 shrink-0" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

// ==========================================
// デジタル釣果ボード（SNS画像）作成モーダル
// ==========================================
function ShareImageModal({ record, onClose, setToastMessage }) {
    const [isAnonymous, setIsAnonymous] = React.useState(false);
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [cardTheme, setCardTheme] = React.useState('dark'); // 'dark' or 'light'
    const cardRef = React.useRef(null);

    React.useEffect(() => {
        loadHtml2Canvas();
    }, []);

    if (!record) return null;

    const stats = getTopAnglerDetails(record.port || [], record.starboard || []);
    const unit = getUnit(record.targetFish);
    const pSeats = (record.port || []).filter(s => s && s.isVisible !== false);
    const sSeats = (record.starboard || []).filter(s => s && s.isVisible !== false);

    const maxSeatCount = Math.max(pSeats.length, sSeats.length);
    const isCrowded = maxSeatCount >= 8;

    const isDark = cardTheme === 'dark';
    const bgClass = isDark ? 'bg-slate-900 border-slate-950' : 'bg-gradient-to-br from-sky-600 to-blue-800 border-blue-950';
    const textClass = isDark ? 'text-slate-100' : 'text-white';
    const canvasBg = isDark ? '#0f172a' : '#0369a1';

    const topCount = stats.topNames ? stats.topNames.length : (record.topAnglerName ? 1 : 0);

    const handleDownload = async () => {
        setIsGenerating(true);
        setToastMessage('ボードを作成しています...');
        try {
            const html2canvas = await loadHtml2Canvas();
            const canvas = await html2canvas(cardRef.current, {
                scale: 3,
                backgroundColor: canvasBg,
                useCORS: true,
                logging: false,
                scrollY: 0,
                scrollX: 0
            });
            const imgData = canvas.toDataURL('image/png');
            
            const link = document.createElement('a');
            const safeDate = (record.date || '').replace(/-/g, '');
            const safeTarget = record.targetFish || '釣果';
            link.download = '山下丸_' + safeDate + '_' + safeTarget + '.png';
            link.href = imgData;
            link.click();
            
            setToastMessage('釣果ボードを保存しました！\n写真アプリからSNSに投稿できます。');
        } catch (e) {
            console.error(e);
            setToastMessage('画像の作成に失敗しました。電波の良い場所でお試しください。');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
            <div className="flex-1 w-full overflow-y-auto pb-[240px] pt-6 px-3 flex justify-center items-start no-scrollbar">
                <div 
                    ref={cardRef} 
                    className={`${bgClass} ${textClass} relative flex flex-col border-2 border-slate-700 dark:border-slate-600 shadow-2xl rounded-xl overflow-hidden transition-all duration-300`} 
                    style={{ width: '100%', maxWidth: '420px', minWidth: '330px', boxSizing: 'border-box' }}
                >
                    <div className="p-4 pb-5 flex flex-col gap-3 relative z-10">
                        {/* ヘッダー：日付をロゴ直下にキュッと接近配置 */}
                        <div className={`flex justify-between items-center border-b pb-2.5 ${isDark ? 'border-slate-700/80' : 'border-blue-400/40'}`}>
                            <div className="flex flex-col items-center">
                                <img 
                                    src="./text_logo.png" 
                                    onError={(e) => { e.target.style.display='none'; }} 
                                    className="h-8 sm:h-9 object-contain" 
                                    alt="yamashitamaru" 
                                />
                                <div className={`text-xs sm:text-sm font-bold tracking-wider -mt-0.5 text-center ${isDark ? 'text-sky-300' : 'text-sky-100'}`} style={{ lineHeight: 1.4, paddingBottom: '2px' }}>
                                    {(record.date || '').replace(/-/g, '.')} {getDayOfWeek(record.date)}
                                </div>
                            </div>
                            <div className="text-right pb-1">
                                <span className="text-xl sm:text-2xl font-black tracking-tight text-white inline-block" style={{ lineHeight: 1.5, paddingBottom: '3px' }}>
                                    {record.targetFish || ''}
                                </span>
                            </div>
                        </div>

                        {/* 成績サマリー枠：【上：釣果 ＆ 竿頭】＋【下：型 ＆ 平均のゆったり2分割】 */}
                        <div className={`rounded-lg px-3.5 pt-2.5 pb-3.5 border shadow-sm flex flex-col gap-2.5 ${isDark ? 'bg-slate-800/85 border-slate-600/80' : 'bg-black/20 border-white/20'}`}>
                            {topCount <= 2 ? (
                                <div className="flex justify-between items-end gap-2">
                                    <div className="flex flex-col items-start shrink-0">
                                        <span className={`text-[11px] sm:text-xs font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-sky-200'}`}>
                                            釣果
                                        </span>
                                        <div className="flex items-baseline gap-1 mt-0.5" style={{ lineHeight: 1.4 }}>
                                            <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-sm inline-block" style={{ paddingBottom: '2px' }}>
                                                {stats.min}<span className="text-lg sm:text-xl mx-0.5 opacity-75">〜</span>{stats.max}
                                            </span>
                                            <span className="text-xs sm:text-sm font-bold text-slate-200">{unit}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end text-right flex-1 min-w-0 pl-2">
                                        <span className={`text-[11px] sm:text-xs font-bold tracking-wider flex items-center ${isDark ? 'text-slate-400' : 'text-sky-200'}`}>
                                            <span className="mr-0.5 text-xs">👑</span>竿頭
                                        </span>
                                        <div className="mt-0.5 w-full flex justify-end items-baseline">
                                            {isAnonymous ? (
                                                <span className="text-lg sm:text-xl font-black text-white inline-block" style={{ lineHeight: 1.5, paddingBottom: '3px' }}>非公開</span>
                                            ) : topCount === 0 ? (
                                                <span className={`text-lg font-black ${isDark ? 'text-slate-500' : 'text-white/60'}`}>-</span>
                                            ) : (
                                                <div className="flex items-baseline justify-end max-w-full">
                                                    <span 
                                                        className={`${topCount === 1 ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'} font-black text-white truncate drop-shadow-sm inline-block`} 
                                                        style={{ lineHeight: 1.5, paddingBottom: '4px' }}
                                                    >
                                                        {stats.topNames.join('・')}
                                                    </span>
                                                    <span className={`text-[11px] sm:text-xs font-bold ml-1 shrink-0 ${isDark ? 'text-slate-300' : 'text-sky-200'}`} style={{ paddingBottom: '4px' }}>
                                                        さん
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-baseline">
                                        <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-sky-200'}`}>釣果</span>
                                        <div className="flex items-baseline gap-1" style={{ lineHeight: 1.4 }}>
                                            <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-sm inline-block" style={{ paddingBottom: '2px' }}>
                                                {stats.min}<span className="text-lg sm:text-xl mx-0.5 opacity-75">〜</span>{stats.max}
                                            </span>
                                            <span className="text-xs sm:text-sm font-bold text-slate-200">{unit}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col pt-0.5">
                                        <span className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-sky-200'} mb-1`}>
                                            👑 竿頭 ({topCount}名)
                                        </span>
                                        <div className="flex flex-wrap items-baseline gap-1">
                                            {isAnonymous ? (
                                                <span className="text-sm font-black text-white inline-block" style={{ lineHeight: 1.5, paddingBottom: '3px' }}>非公開</span>
                                            ) : (
                                                <div className="flex flex-wrap items-baseline gap-x-1">
                                                    <span className="text-sm sm:text-base font-black text-white drop-shadow-sm inline-block" style={{ lineHeight: 1.5, paddingBottom: '4px' }}>
                                                        {stats.topNames.join('・')}
                                                    </span>
                                                    <span className={`text-[11px] sm:text-xs font-bold ml-0.5 shrink-0 ${isDark ? 'text-slate-300' : 'text-sky-200'}`} style={{ paddingBottom: '4px' }}>
                                                        さん
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 型 ＆ 平均：総計を省いてゆったり2分割（文字切れを完全防止） */}
                            <div className="grid grid-cols-2 pt-2.5 border-t border-white/10 text-center font-bold text-sm sm:text-base items-center" style={{ minHeight: '34px' }}>
                                <div className={`truncate pr-2 border-r border-white/10 ${isDark ? 'text-slate-300' : 'text-white'}`} style={{ paddingBottom: '2px' }}>
                                    <span className="text-xs opacity-75 mr-1 font-normal">型:</span>
                                    <span className="font-black text-white text-base sm:text-lg inline-block">{(record.sizeMin || record.sizeMax) ? `${record.sizeMin || '?'}〜${record.sizeMax || '?'}` : '-'}</span>
                                    <span className="text-xs opacity-75 ml-1 font-normal">cm</span>
                                </div>
                                <div className={`truncate pl-2 ${isDark ? 'text-slate-300' : 'text-sky-100'}`} style={{ paddingBottom: '2px' }}>
                                    <span className="text-xs opacity-75 mr-1 font-normal">一人平均:</span>
                                    <span className="font-black text-white text-base sm:text-lg inline-block">{record.avg || 0}</span>
                                    <span className="text-xs opacity-75 ml-1 font-normal">{unit}</span>
                                </div>
                            </div>
                        </div>

                        {/* 座席リスト */}
                        <div className="flex gap-2 w-full">
                            {/* 左舷 */}
                            <div className={`flex-1 rounded-lg ${isCrowded ? 'p-1.5' : 'p-2.5'} border backdrop-blur-sm ${isDark ? 'bg-slate-800/60 border-slate-600/80' : 'bg-black/15 border-white/20'}`}>
                                <div className={`font-black tracking-widest border-b pb-1 mb-2 text-center text-xs ${isDark ? 'text-red-400 border-red-900/50' : 'text-pink-300 border-pink-300/30'}`} style={{ lineHeight: 1.5, paddingBottom: '3px' }}>左舷</div>
                                <div className={isCrowded ? 'space-y-1.5' : 'space-y-2'}>
                                    {pSeats.map((s, i) => {
                                        const c = parseInt(s.count) || 0;
                                        const isTop = c === stats.max && c > 0;
                                        const isAvg = c >= stats.avg && c > 0 && !isTop;
                                        
                                        let textColor = isDark ? 'text-slate-400' : 'text-sky-100';
                                        if (isTop) textColor = isDark ? 'text-amber-400 font-black' : 'text-yellow-300 font-black';
                                        else if (isAvg) textColor = 'text-white font-bold';

                                        return (
                                            <div key={`p-${i}`} className={`flex justify-between items-center ${isCrowded ? 'text-xs' : 'text-sm'} border-b last:border-0 ${textColor} ${isDark ? 'border-slate-700/30' : 'border-white/10'}`} style={{ minHeight: '32px', paddingBottom: '6px', paddingTop: '3px' }}>
                                                <div className="truncate pr-1 flex-1 flex items-baseline">
                                                    <span className="opacity-50 mr-1 text-[11px] shrink-0">{s.id}.</span>
                                                    <span className="truncate inline-block" style={{ lineHeight: 1.7, paddingBottom: '4px' }}>
                                                        {isAnonymous ? `座席${s.id}` : (s.name || '-')}
                                                    </span>
                                                </div>
                                                <div className="font-black flex items-center justify-end shrink-0 min-w-[32px] gap-1">
                                                    {isTop && <span className="text-xs mr-0.5">👑</span>}
                                                    <span className="inline-block" style={{ lineHeight: 1.5, paddingBottom: '2px' }}>{c}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {/* 右舷 */}
                            <div className={`flex-1 rounded-lg ${isCrowded ? 'p-1.5' : 'p-2.5'} border backdrop-blur-sm ${isDark ? 'bg-slate-800/60 border-slate-600/80' : 'bg-black/15 border-white/20'}`}>
                                <div className={`font-black tracking-widest border-b pb-1 mb-2 text-center text-xs ${isDark ? 'text-emerald-400 border-emerald-900/50' : 'text-emerald-300 border-emerald-300/30'}`} style={{ lineHeight: 1.5, paddingBottom: '3px' }}>右舷</div>
                                <div className={isCrowded ? 'space-y-1.5' : 'space-y-2'}>
                                    {sSeats.map((s, i) => {
                                        const c = parseInt(s.count) || 0;
                                        const isTop = c === stats.max && c > 0;
                                        const isAvg = c >= stats.avg && c > 0 && !isTop;

                                        let textColor = isDark ? 'text-slate-400' : 'text-sky-100';
                                        if (isTop) textColor = isDark ? 'text-amber-400 font-black' : 'text-yellow-300 font-black';
                                        else if (isAvg) textColor = 'text-white font-bold';

                                        return (
                                            <div key={`s-${i}`} className={`flex justify-between items-center ${isCrowded ? 'text-xs' : 'text-sm'} border-b last:border-0 ${textColor} ${isDark ? 'border-slate-700/30' : 'border-white/10'}`} style={{ minHeight: '32px', paddingBottom: '6px', paddingTop: '3px' }}>
                                                <div className="truncate pr-1 flex-1 flex items-baseline">
                                                    <span className="opacity-50 mr-1 text-[11px] shrink-0">{s.id}.</span>
                                                    <span className="truncate inline-block" style={{ lineHeight: 1.7, paddingBottom: '4px' }}>
                                                        {isAnonymous ? `座席${s.id}` : (s.name || '-')}
                                                    </span>
                                                </div>
                                                <div className="font-black flex items-center justify-end shrink-0 min-w-[32px] gap-1">
                                                    {isTop && <span className="text-xs mr-0.5">👑</span>}
                                                    <span className="inline-block" style={{ lineHeight: 1.5, paddingBottom: '2px' }}>{c}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* コントロールパネル */}
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-t-2xl p-3.5 flex flex-col gap-2 absolute bottom-0 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
                <div className="flex justify-between items-center mb-0.5">
                    <span className="font-black text-gray-800 dark:text-slate-100 text-base">釣果ボードを作成</span>
                    <button onClick={onClose} className="w-7 h-7 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-600 dark:text-slate-300 font-bold hover:bg-gray-300 text-xs">✕</button>
                </div>
                
                {/* テーマ切り替え */}
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-700/50 rounded-xl">
                    <button 
                        onClick={() => setCardTheme('dark')} 
                        className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${cardTheme === 'dark' ? 'bg-slate-800 shadow text-amber-400' : 'text-gray-500 dark:text-slate-400 active:bg-gray-200'}`}
                    >
                        🌙 ナイト
                    </button>
                    <button 
                        onClick={() => setCardTheme('light')} 
                        className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${cardTheme === 'light' ? 'bg-sky-600 shadow text-white' : 'text-gray-500 dark:text-slate-400 active:bg-gray-200'}`}
                    >
                        🌊 マリン
                    </button>
                </div>

                {/* 匿名化スイッチ */}
                <label className="flex items-center justify-between p-2 px-3 bg-gray-100 dark:bg-slate-700/50 rounded-xl cursor-pointer active:scale-[0.98] transition-transform">
                    <span className="text-xs font-bold text-gray-700 dark:text-slate-200">
                        お名前を隠す（匿名化）
                    </span>
                    <input type="checkbox" className="w-4 h-4 text-sky-500 rounded border-gray-300" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
                </label>

                <button 
                    onClick={handleDownload}
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:from-sky-600 active:to-blue-700 text-white font-black py-3 rounded-xl text-xs sm:text-sm shadow-lg active:scale-95 transition-all flex justify-center items-center gap-1.5 mt-0.5"
                >
                    {isGenerating ? (
                        <><span className="animate-spin text-base leading-none mb-0.5">↻</span> キャプチャ中...</>
                    ) : (
                        <><IconCamera className="w-4 h-4" /> この画像をスマホに保存</>
                    )}
                </button>
            </div>
        </div>
    );
}
// ==========================================
// 船長メモモーダル（例文全廃・スマートタイムスタンプ＆履歴アシスト版）
// ==========================================
function MemoModalWithTags({ showMemoModal, setShowMemoModal, tempMemo, setTempMemo, onAutoSave }) {
    if (!showMemoModal) return null;

    const textareaRef = React.useRef(null);
    // 1手前に戻す（アンドゥ）用の履歴ステート
    const [history, setHistory] = React.useState([tempMemo || '']);

    // 入力のたびに即時自動保存 ＆ アンドゥ履歴の蓄積
    const updateTextAndSave = (nextText, recordHistory = true) => {
        setTempMemo(nextText);
        if (recordHistory) {
            setHistory(prev => {
                const next = [...prev, nextText];
                return next.slice(-20); // 直近20手まで保持
            });
        }
        if (typeof onAutoSave === 'function') {
            onAutoSave(nextText);
        }
    };

    // ⏰ 現在時刻スタンプを挿入（自動改行＋入力欄フォーカス復帰）
    const insertCurrentTime = () => {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const stamp = `【${hh}:${mm}】 `;

        const currentText = tempMemo || '';
        let nextText = '';
        if (!currentText.trim()) {
            nextText = stamp;
        } else if (currentText.endsWith('\n')) {
            nextText = `${currentText}${stamp}`;
        } else {
            nextText = `${currentText}\n${stamp}`;
        }

        updateTextAndSave(nextText);

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(20);
        }

        // 挿入後すぐに入力欄へフォーカスを当てて音声入力・入力を継続可能にする
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
            }
        }, 50);
    };

    // ↶ 1つ前の状態に戻す
    const handleUndo = () => {
        if (history.length > 1) {
            const nextHistory = [...history];
            nextHistory.pop(); // 現在の状態を捨てる
            const prevText = nextHistory[nextHistory.length - 1];
            setHistory(nextHistory);
            updateTextAndSave(prevText, false);
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(10);
            }
        }
    };

    // 🗑️ 全消去（誤操作防止の安全確認付き）
    const handleClearAll = () => {
        if (!tempMemo || !tempMemo.trim()) return;
        if (window.confirm('メモの内容をすべて消去しますか？\n（直後なら「元に戻す」で復元できます）')) {
            updateTextAndSave('');
        }
    };

    // ✕ボタンで閉じる処理
    const handleClose = () => {
        if (typeof onAutoSave === 'function') {
            onAutoSave(tempMemo);
        }
        setShowMemoModal(false);
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-[fadeIn_0.15s_ease-out]">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-lg flex flex-col h-[85dvh] max-h-[720px] overflow-hidden">
                
                {/* モーダルヘッダー */}
                <div className="p-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/80 dark:bg-slate-900/50 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-base">📝</span>
                        <h3 className="font-black text-gray-800 dark:text-slate-100 text-sm sm:text-base">船長メモ</h3>
                    </div>
                    {/* ✕ボタン */}
                    <button 
                        type="button"
                        onClick={handleClose}
                        className="w-8 h-8 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 font-black text-sm active:scale-90 transition-transform shadow-xs"
                        aria-label="保存して閉じる"
                    >
                        ✕
                    </button>
                </div>

                {/* ツールバー：⏰ 時刻ボタン ＋ ↶ 元に戻す ＆ 🗑️ クリア */}
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/40 border-b border-gray-200 dark:border-slate-700/80 flex items-center justify-between shrink-0 select-none">
                    <button
                        type="button"
                        onClick={insertCurrentTime}
                        className="py-1.5 px-3 rounded-xl text-xs sm:text-sm font-black bg-amber-500 hover:bg-amber-600 active:scale-95 text-white shadow-xs flex items-center gap-1.5 transition-all"
                    >
                        <span className="text-sm leading-none">⏰</span>
                        <span>現在時刻を挿入</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                        {/* 1手戻すボタン */}
                        <button
                            type="button"
                            onClick={handleUndo}
                            disabled={history.length <= 1}
                            className={`py-1 px-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-0.5 ${
                                history.length > 1
                                    ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 shadow-2xs active:scale-90'
                                    : 'opacity-40 bg-transparent text-slate-400 border-transparent cursor-not-allowed'
                            }`}
                            title="1手前に戻す"
                        >
                            <span>↶</span>
                            <span>戻す</span>
                        </button>

                        {/* 全消去ボタン */}
                        <button
                            type="button"
                            onClick={handleClearAll}
                            disabled={!tempMemo || !tempMemo.trim()}
                            className={`py-1 px-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-0.5 ${
                                tempMemo && tempMemo.trim()
                                    ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 shadow-2xs active:scale-90 hover:bg-rose-50'
                                    : 'opacity-40 bg-transparent text-slate-400 border-transparent cursor-not-allowed'
                            }`}
                            title="メモをすべて消去"
                        >
                            <span>🗑️</span>
                        </button>

                        <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-0.5" />

                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tabular-nums">
                            {tempMemo ? `${tempMemo.length}字` : '0字'}
                        </span>
                    </div>
                </div>

                {/* 広大な本文入力欄 */}
                <div className="p-3 flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-800">
                    <textarea
                        ref={textareaRef}
                        className="w-full flex-1 p-3.5 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-100 font-bold text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none leading-relaxed"
                        placeholder="メモを入力してください。「現在時刻を挿入」を押すと【HH:MM】が入ります。入力内容は自動保存されます..."
                        value={tempMemo}
                        onChange={(e) => updateTextAndSave(e.target.value)}
                        autoFocus
                    />
                    <div className="text-[11px] text-gray-400 dark:text-slate-500 mt-2 text-right px-1 shrink-0">
                        🎙️ 音声入力はキーボードのマイクをご利用ください
                    </div>
                </div>

            </div>
        </div>
    );
}
// ==========================================
// アプリ本体
// ==========================================
function App() {
    const [activeTab, setActiveTab] = React.useState(() => localStorage.getItem('fishing_last_tab') || 'input');
    const [counterMode, setCounterMode] = React.useState(() => localStorage.getItem('fishing_counter_mode') || 'tap');
    const [inputSide, setInputSide] = React.useState('both');
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const [theme, setTheme] = React.useState(() => localStorage.getItem('theme') || 'light');
    const [userApiKey, setUserApiKey] = React.useState(() => localStorage.getItem('fishing_api_key') || '');
    const [selectedAiModel, setSelectedAiModel] = React.useState(() => localStorage.getItem('fishing_ai_model') || 'Gemini 2.5 Flash');
    const [toastMessage, setToastMessage] = React.useState('');

    // 下部ナビゲーションバーの表示・非表示状態
    const [isBottomNavVisible, setIsBottomNavVisible] = React.useState(true);

    const [date, setDate] = React.useState(getTodayString());
    const [targetFish, setTargetFish] = React.useState('');
    const [sizeMin, setSizeMin] = React.useState('');
    const [sizeMax, setSizeMax] = React.useState('');
    const [point, setPoint] = React.useState('');
    const [waterTemp, setWaterTemp] = React.useState('');
    const [waterDepth, setWaterDepth] = React.useState('');
    const [tide, setTide] = React.useState('');
    const [tideState, setTideState] = React.useState('');
    const [highTide1, setHighTide1] = React.useState('');
    const [highTide2, setHighTide2] = React.useState('');
    const [lowTide1, setLowTide1] = React.useState('');
    const [lowTide2, setLowTide2] = React.useState('');
    const [weather1, setWeather1] = React.useState('');
    const [weather2, setWeather2] = React.useState('');
    const [windDir1, setWindDir1] = React.useState('');
    const [windDir2, setWindDir2] = React.useState('');
    const [windSpeed1, setWindSpeed1] = React.useState('');
    const [windSpeed2, setWindSpeed2] = React.useState('');
    const [waveHeight1, setWaveHeight1] = React.useState('');
    const [waveHeight2, setWaveHeight2] = React.useState('');
    const [detailedMemo, setDetailedMemo] = React.useState('');

    const [records, setRecords] = React.useState([]);
    const [portSeatCount, setPortSeatCount] = React.useState(() => localStorage.getItem('port_seat_count') || '');
    const [starboardSeatCount, setStarboardSeatCount] = React.useState(() => localStorage.getItem('starboard_seat_count') || '');

    const getInitialSeats = (countStr) => {
        const count = countStr === '' ? 0 : parseInt(countStr, 10);
        return Array(count).fill(null).map((_, i) => ({ id: i + 1, name: '', count: '', memo: '', isVisible: true }));
    };

    const [portSeats, setPortSeats] = React.useState(() => getInitialSeats(portSeatCount));
    const [starboardSeats, setStarboardSeats] = React.useState(() => getInitialSeats(starboardSeatCount));

    const [searchQuery, setSearchQuery] = React.useState('');
    const [sortOrder, setSortOrder] = React.useState('date_desc');
    const [expandedRecordId, setExpandedRecordId] = React.useState(null);
    const [sharedRecordId, setSharedRecordId] = React.useState(null);
    const [recordToDelete, setRecordToDelete] = React.useState(null);
    
    const [shareImageRecord, setShareImageRecord] = React.useState(null);

    const [showMemoModal, setShowMemoModal] = React.useState(false);
    const [activeMemoRecordId, setActiveMemoRecordId] = React.useState(null);
    const [tempMemo, setTempMemo] = React.useState('');

    const [generatingAiId, setGeneratingAiId] = React.useState(null);
    const [showAiModal, setShowAiModal] = React.useState(false);
    const [aiGeneratedPatterns, setAiGeneratedPatterns] = React.useState([]);
    const [aiGeneratedText, setAiGeneratedText] = React.useState('');
    const [showAiInputModal, setShowAiInputModal] = React.useState(false);
    const [targetRecordForAi, setTargetRecordForAi] = React.useState(null);
    const [aiCurrentStep, setAiCurrentStep] = React.useState(0);
    const [aiInputData, setAiInputData] = React.useState({
        condition: '', scenery: '', tide: '', activity: '', episode: '', size: '', topAngler: '', patterns: [1]
    });
    const aiTimerRef = React.useRef(null);

    const [showAnalysisModal, setShowAnalysisModal] = React.useState(false);
    const [analyzingRecordId, setAnalyzingRecordId] = React.useState(null);
    const [currentAnalysis, setCurrentAnalysis] = React.useState(null);

    // ==========================================
    // スワイプによるタブ切り替えロジック
    // （エンドレス・ローテーション / 循環切り替え）
    // ==========================================
    const touchStartX = React.useRef(0);
    const touchStartY = React.useRef(0);
    const tabList = ['input', 'counter', 'history'];

    const handleSwipeStart = (e) => {
        if (!e.touches || e.touches.length === 0) return;
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleSwipeEnd = (e) => {
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        const diffX = e.changedTouches[0].clientX - touchStartX.current;
        const diffY = e.changedTouches[0].clientY - touchStartY.current;

        // 横スワイプ量が40px以上、かつ縦ブレが横移動より小さい場合に判定
        if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
            const currentIdx = tabList.indexOf(activeTab);
            let nextIdx = currentIdx;

            if (diffX < 0) {
                // 右から左へ（次へ進む：履歴の次は釣り座へループ）
                nextIdx = (currentIdx + 1) % tabList.length;
            } else {
                // 左から右へ（前へ戻る：釣り座の前は履歴へループ）
                nextIdx = (currentIdx - 1 + tabList.length) % tabList.length;
            }

            const nextTab = tabList[nextIdx];
            setActiveTab(nextTab);
            localStorage.setItem('fishing_last_tab', nextTab);
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(15);
            }
        }
    };

    const wizardSteps = [
        { id: 'condition', title: '📊 今日の釣況', desc: '今日の船全体の食い気・上がり具合を選択してください。', isSelect: true, options: ['🌟 絶好調', '☀️ 好調', '☁️ 普通', '🌊 食い渋り', '☔ 厳しい'] },
        { id: 'scenery', title: '🌅 海の情景', desc: '今日の海はどんな雰囲気でしたか？', placeholder: '例：ベタ凪の釣り日和でした、冷たい北風が吹く中でのスタートでした など' },
        { id: 'tide', title: '🌊 潮の流れ', desc: '潮の流れの速さや変化はどうでしたか？', placeholder: '例：一日中速くて釣りづらかった、二枚潮だった など' },
        { id: 'activity', title: '🎣 魚の活性・補足', desc: '魚の食い気や、全体的な状況はどうでしたか？', placeholder: '例：朝から入れ食い状態、後半は食い渋り、皆さんお土産十分 など' },
        { id: 'episode', title: '✨ 印象的なエピソード', desc: 'バラシや外道など、特記する出来事はありましたか？', placeholder: '例：大型のバラシが多かった、外道で立派なマダイが交じった など' },
        { id: 'size', title: '📏 サイズ感', desc: '釣れた魚の平均的な大きさはどうでしたか？', placeholder: '例：良型揃い、中型主体に小ぶりが交じる など ※数字は入れない' },
        { id: 'topAngler', title: '👑 竿頭の釣り方・好成績の要因', desc: 'トップの人の工夫やコメントを教えてください。', placeholder: '例：誘いをマメに入れていた、「底付近でアタリが集中した」との事 など' },
        { id: 'patterns', title: '📝 生成パターンの選択', desc: '作成したい文章のパターンを選択してください（複数選択可）。', isMultiSelect: true, options: [
            { id: 1, label: '【標準】王道の日報（400字程度）' },
            { id: 2, label: '【標準・詳報】じっくり読ませる日報（500字程度）' },
            { id: 3, label: '【公式HP向け】信頼感のある丁寧な文章' },
            { id: 4, label: '【情景重視】海の雰囲気・臨場感' },
            { id: 5, label: '【好調・熱血】大漁と活気を伝える文章' },
            { id: 6, label: '【技術・攻略】竿頭の工夫・ヒットパターン' },
            { id: 7, label: '【時合い集中】ワンチャンスの連発劇' },
            { id: 8, label: '【渋い日・要約短文】簡潔なまとめ版（300字程度）' },
            { id: 9, label: '【渋い日・潮/海況分析】次回への期待' },
            { id: 10, label: '【渋い日・テクニカル攻略】工夫と拾い釣り' },
            { id: 11, label: '【渋い日・1尾の価値＆ゲスト魚】' },
            { id: 12, label: '【渋い日・船長の意気込み＆感謝】' }
        ]}
    ];

    React.useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('dark');
        if (theme === 'dark') root.classList.add('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    React.useEffect(() => {
        try {
            const saved = localStorage.getItem('fishing_records');
            if (saved) {
                const parsed = JSON.parse(saved);
                setRecords(parsed);
                const todayRec = parsed.find(r => r.date === date);
                if (todayRec) {
                    setPortSeats(todayRec.port || []);
                    setStarboardSeats(todayRec.starboard || []);
                    setPortSeatCount((todayRec.port || []).length || '');
                    setStarboardSeatCount((todayRec.starboard || []).length || '');
                    setTargetFish(todayRec.targetFish || '');
                    setSizeMin(todayRec.sizeMin || '');
                    setSizeMax(todayRec.sizeMax || '');
                    setPoint(todayRec.point || '');
                    setWaterTemp(todayRec.waterTemp || '');
                    setWaterDepth(todayRec.waterDepth || '');
                    setTide(todayRec.tide || '');
                    setTideState(todayRec.tideState || '');
                    setHighTide1(todayRec.highTide1 || '');
                    setHighTide2(todayRec.highTide2 || '');
                    setLowTide1(todayRec.lowTide1 || '');
                    setLowTide2(todayRec.lowTide2 || '');
                    setWeather1(todayRec.weather1 || todayRec.weather || '');
                    setWeather2(todayRec.weather2 || '');
                    setWindDir1(todayRec.windDir1 || todayRec.windDir || '');
                    setWindDir2(todayRec.windDir2 || '');
                    setWindSpeed1(todayRec.windSpeed1 || todayRec.windSpeed || '');
                    setWindSpeed2(todayRec.windSpeed2 || '');
                    setWaveHeight1(todayRec.waveHeight1 || todayRec.waveHeight || '');
                    setWaveHeight2(todayRec.waveHeight2 || '');
                    setDetailedMemo(todayRec.detailedMemo || '');
                } else {
                    setPortSeatCount('');
                    setStarboardSeatCount('');
                    setPortSeats([]);
                    setStarboardSeats([]);
                    setTargetFish(''); setSizeMin(''); setSizeMax('');
                    setPoint(''); setWaterTemp(''); setWaterDepth(''); setTide('');
                    setTideState(''); setHighTide1(''); setHighTide2(''); setLowTide1(''); setLowTide2('');
                    setWeather1(''); setWeather2(''); setWindDir1(''); setWindDir2('');
                    setWindSpeed1(''); setWindSpeed2(''); setWaveHeight1(''); setWaveHeight2('');
                    setDetailedMemo('');
                }
            }
        } catch (e) {}
    }, [date]);

    React.useEffect(() => {
        setRecords(prev => {
            const pTotal = portSeats.reduce((sum, s) => sum + (s.isVisible !== false ? (parseInt(s.count) || 0) : 0), 0);
            const sTotal = starboardSeats.reduce((sum, s) => sum + (s.isVisible !== false ? (parseInt(s.count) || 0) : 0), 0);
            const stats = getTopAnglerDetails(portSeats, starboardSeats);

            const recData = {
                id: Date.now(),
                date, targetFish, total: pTotal + sTotal,
                anglers: stats.anglers, avg: stats.avg, min: stats.min, max: stats.max, topAnglerName: stats.topNamesString,
                portTotal: pTotal, starboardTotal: sTotal,
                port: portSeats, starboard: starboardSeats, sizeMin, sizeMax,
                point, waterTemp, waterDepth, tide, tideState,
                highTide1, highTide2, lowTide1, lowTide2,
                weather1, weather2, windDir1, windDir2, windSpeed1, windSpeed2, waveHeight1, waveHeight2,
                detailedMemo
            };

            const existingIdx = prev.findIndex(r => r.date === date);
            let updated = [...prev];
            if (existingIdx >= 0) {
                recData.id = updated[existingIdx].id;
                recData.aiGeneratedPatterns = updated[existingIdx].aiGeneratedPatterns;
                recData.aiGeneratedText = updated[existingIdx].aiGeneratedText;
                recData.aiAnalysisResult = updated[existingIdx].aiAnalysisResult;
                recData.aiInput_condition = updated[existingIdx].aiInput_condition;
                recData.aiInput_scenery = updated[existingIdx].aiInput_scenery;
                recData.aiInput_tide = updated[existingIdx].aiInput_tide;
                recData.aiInput_activity = updated[existingIdx].aiInput_activity;
                recData.aiInput_episode = updated[existingIdx].aiInput_episode;
                recData.aiInput_size = updated[existingIdx].aiInput_size;
                recData.aiInput_topAngler = updated[existingIdx].aiInput_topAngler;
                recData.aiInput_patterns = updated[existingIdx].aiInput_patterns;
                updated[existingIdx] = recData;
            } else {
                const hasData = (pTotal + sTotal > 0) || targetFish || point || waterTemp || waterDepth || tide || tideState || weather1 || windDir1 || sizeMin || sizeMax;
                if (hasData) {
                    updated.push(recData);
                    updated.sort((a, b) => new Date(b.date) - new Date(a.date));
                }
            }
            localStorage.setItem('fishing_records', JSON.stringify(updated));
            return updated;
        });
    }, [
        date, targetFish, sizeMin, sizeMax, point, waterTemp, waterDepth, tide, tideState,
        highTide1, highTide2, lowTide1, lowTide2, weather1, weather2, windDir1, windDir2,
        windSpeed1, windSpeed2, waveHeight1, waveHeight2, detailedMemo, portSeats, starboardSeats
    ]);

    const handleCountDelta = (side, index, delta) => {
        const isP = side === 'port';
        const seats = isP ? [...portSeats] : [...starboardSeats];
        if (!seats[index]) return;
        const nextVal = Math.max(0, Math.min(999, (parseInt(seats[index].count) || 0) + delta));
        seats[index] = { ...seats[index], count: String(nextVal) };
        if (isP) setPortSeats(seats);
        else setStarboardSeats(seats);
    };

    const handleSeatChange = (side, index, field, value) => {
        const isP = side === 'port';
        const seats = isP ? [...portSeats] : [...starboardSeats];
        if (!seats[index]) return;
        seats[index] = { ...seats[index], [field]: value };
        if (isP) setPortSeats(seats);
        else setStarboardSeats(seats);
    };

    const handleSeatCountChange = (side, newCount) => {
        const count = newCount === '' ? '' : Math.max(0, Math.min(15, parseInt(newCount, 10)));
        const actual = count === '' ? 0 : count;
        if (side === 'port') {
            setPortSeatCount(count);
            localStorage.setItem('port_seat_count', count);
            const newSeats = Array(actual).fill(null).map((_, i) => portSeats[i] || { id: i + 1, name: '', count: '', memo: '', isVisible: true });
            setPortSeats(newSeats);
        } else {
            setStarboardSeatCount(count);
            localStorage.setItem('starboard_seat_count', count);
            const newSeats = Array(actual).fill(null).map((_, i) => starboardSeats[i] || { id: i + 1, name: '', count: '', memo: '', isVisible: true });
            setStarboardSeats(newSeats);
        }
    };

    const handleToggleVisibility = (side, index) => {
        const isP = side === 'port';
        const seats = isP ? [...portSeats] : [...starboardSeats];
        if (!seats[index]) return;
        seats[index] = { ...seats[index], isVisible: !seats[index].isVisible };
        if (isP) setPortSeats(seats);
        else setStarboardSeats(seats);
    };

    const handleSizeChange = (type, val) => {
        let processed = String(val);
        if (processed.length > 4) processed = processed.slice(0, 4);
        if (parseInt(processed, 10) < 0) processed = '0';
        if (type === 'min') setSizeMin(processed);
        else setSizeMax(processed);
    };

    const resetOnlyCounts = () => {
        setPortSeats(portSeats.map(s => ({ ...s, count: '' })));
        setStarboardSeats(starboardSeats.map(s => ({ ...s, count: '' })));
        setToastMessage('釣果数をリセットしました（サイズ・お名前は保持）');
    };

    // ==========================================
    // 履歴からの個別削除処理（当日画面も即座にリセット）
    // ==========================================
    const handleDeleteRecord = (recordId) => {
        const target = records.find(r => r.id === recordId);
        
        if (target && target.date === date) {
            setPortSeatCount('');
            setStarboardSeatCount('');
            localStorage.removeItem('port_seat_count');
            localStorage.removeItem('starboard_seat_count');
            setPortSeats([]);
            setStarboardSeats([]);
            setTargetFish(''); setSizeMin(''); setSizeMax('');
            setPoint(''); setWaterTemp(''); setWaterDepth(''); setTide('');
            setTideState(''); setHighTide1(''); setHighTide2(''); setLowTide1(''); setLowTide2('');
            setWeather1(''); setWeather2(''); setWindDir1(''); setWindDir2('');
            setWindSpeed1(''); setWindSpeed2(''); setWaveHeight1(''); setWaveHeight2('');
            setDetailedMemo('');
        }

        setRecords(prev => {
            const updated = prev.filter(r => r.id !== recordId);
            localStorage.setItem('fishing_records', JSON.stringify(updated));
            return updated;
        });
        setToastMessage('釣果記録を削除しました（画面表示もリセットされました）');
    };

    const openMemoModal = (record = null) => {
        if (record) {
            setActiveMemoRecordId(record.id);
            // 余計な時刻スタンプを一切足さず、保存されているメモをそのままセット（無ければ空文字）
            setTempMemo(record.detailedMemo || '');
        } else {
            setActiveMemoRecordId(null);
            // カウンター画面からの場合も、既存のメモをそのままセット（無ければ空文字）
            setTempMemo(detailedMemo || '');
        }
        setShowMemoModal(true);
    };

    // メモの即時自動保存処理
    const handleAutoSaveMemo = (newText) => {
        const textToSave = typeof newText === 'string' ? newText : tempMemo;
        if (activeMemoRecordId) {
            setRecords(prev => {
                const next = prev.map(r => r.id === activeMemoRecordId ? { ...r, detailedMemo: textToSave } : r);
                localStorage.setItem('fishing_records', JSON.stringify(next));
                return next;
            });
            const target = records.find(r => r.id === activeMemoRecordId);
            if (target && target.date === date) {
                setDetailedMemo(textToSave);
            }
        } else {
            setDetailedMemo(textToSave);
        }
    };

    const copyMemoToClipboard = () => {
        const ta = document.createElement('textarea');
        ta.value = tempMemo;
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            setToastMessage('メモをコピーしました！');
        } catch (e) {}
        document.body.removeChild(ta);
    };

    const updateAiInputForRecord = (recordId, field, value) => {
        setRecords(prevRecords => {
            const newRecords = prevRecords.map(r => 
                r.id === recordId ? { ...r, [`aiInput_${field}`]: value } : r
            );
            localStorage.setItem('fishing_records', JSON.stringify(newRecords));
            return newRecords;
        });
    };

    const getPatternPrompt = (id) => {
        const prompts = {
            1: "■■■ 1.【標準】王道の日報（400字程度） ■■■\n全体のバランスが取れた標準的で読みやすいレポート",
            2: "■■■ 2.【標準・詳報】じっくり読ませる日報（500字程度） ■■■\n状況や展開、海の様子をより詳しく伝える読み応えのある文章",
            3: "■■■ 3.【公式HP向け】信頼感のある丁寧な文章 ■■■\n客観的で整った、公式ホームページやお知らせ向けの文章",
            4: "■■■ 4.【情景重視】海の雰囲気・臨場感 ■■■\n天気・波・朝の気配など、現場の空気感を情緒豊かに伝える文章",
            5: "■■■ 5.【好調・熱血】大漁と活気を伝える文章 ■■■\n入れ食いや好成績の喜び、船上の活気をストレートに伝える熱いトーン",
            6: "■■■ 6.【技術・攻略】竿頭の工夫・ヒットパターン ■■■\n誘い方、タナ、仕掛けの工夫など、釣り人目線で役立つ解説文章",
            7: "■■■ 7.【時合い集中】ワンチャンスの連発劇 ■■■\n1日の中でパタパタッと食い立った時合いやドラマに焦点を当てた文章",
            8: "■■■ 8.【渋い日・要約短文】簡潔なまとめ版（300字程度） ■■■\n厳しい日の状況をサクッと簡潔に報告するショート文章",
            9: "■■■ 9.【渋い日・潮/海況分析】次回への期待 ■■■\nなぜ渋かったかを冷静に分析し、次回の好転への期待を伝える文章",
            10: "■■■ 10.【渋い日・テクニカル攻略】工夫と拾い釣り ■■■\n渋い中でも工夫して顔を見た「腕の見せ所・テクニカルな面白さ」を伝える文章",
            11: "■■■ 11.【渋い日・1尾の価値＆ゲスト魚】 ■■■\n数は出なくても良型や美味しい外道、価値ある1尾を称える文章",
            12: "■■■ 12.【渋い日・船長の意気込み＆感謝】 ■■■\n最後まで頑張ってくれたお客様への感謝と、次回のリベンジを誓う男らしい文章"
        };
        return prompts[id];
    };

    const handleAiGenerate = async (record, conditionInfo, sceneryInfo, tideInfo, activityInfo, episodeInfo, sizeInfo, topAnglerInfo, selectedPatterns, customKey) => {
        setGeneratingAiId(record.id);
        const activeApiKey = (customKey || userApiKey || '').replace(/[\s\r\n ]/g, '');
        if (!activeApiKey) {
            setToastMessage('APIキーが入力されていません。設定画面の「基本設定」または「システム」からGeminiのAPIキーを入力してください。');
            setGeneratingAiId(null);
            return;
        }
        if (!selectedPatterns || selectedPatterns.length === 0) {
            setToastMessage('作成するパターンが選択されていません。');
            setGeneratingAiId(null);
            return;
        }

        const modelName = typeof getActualModelName === 'function' ? getActualModelName(selectedAiModel) : 'gemini-2.5-flash';
        const formatPrompt = selectedPatterns.map(id => getPatternPrompt(id)).join("\n\n");
        const systemPrompt = `※あなたはベテラン釣り船「山下丸」の船長です。海の男らしく、媚びないけれどお客様への温かみがある性格として、以下の釣行記録を作成してください。
■ 絶対厳守のルール
・文体：「です・ます調」で統一する。簡潔な「〜です」「〜でした」という表現にする（「〜ですね」「〜ですよ」などの甘い語尾、丁寧すぎる表現禁止、「だぜ」「だな」などの友達や後輩にしゃべるような表現は禁止）。
・敬称のルール：竿頭などお客様のお名前を紹介する際は、かしこまりすぎた「様」ではなく、必ず「さん」付けに統一すること（例: 〇〇さん）。
・釣果表記のルール（最重要）：釣果を紹介する際は、「〇〜〇尾」「〇〜〇匹」といった範囲（スソからトップまで）の表記や「平均〇尾」は一切使用禁止とします。必ず「トップ（上限釣果）」の数字のみを記載してください。
・数値・単位の表記（半角算用数字と摂氏）：釣果の枚数・匹数や海水温などの数値は、漢数字（「五枚」「十六度」など）は使用せず、すべて半角の算用数字（「5枚」「16℃」など）で表記すること。また、海水温度は「度」ではなく必ず「〇〇℃」（摂氏記号）を用いて表記すること。
・水温の非表示（特別指示がない限り禁止）：文章中に「海水温〇〇℃」「水温〇〇℃」といった水温の数値や記述は原則として一切記載しないでください。ただし、【船長からの追加情報】や詳細メモの中で船長自身が特別に水温についてコメントしている場合に限り、その内容に触れても構いません。
・風の表現（具体的な風速数値は禁止）：「風速〇m」「〇〜〇mの風」といった具体的な数値は文章中に出さないこと。入力された風速データに基づき、風の強弱を感覚的な言葉（ナギ、そよそよ、やや強め、強めなど）に置き換えて表現すること。
  【風速と言葉の変換目安】
  - 0〜3m程度：穏やか、ナギ、微風、風弱く、ベタ凪
  - 4〜7m程度：適度な風、ほどよい風、心地よい風、そよそよ
  - 8〜11m程度：やや強め、次第に増して、少々風波があり
  - 12m以上：強め、やや風強く、ゴチャつく海況
・表現：「混じる」は「交じる」に、「潮周り」は「潮回り」に統一。
・速度：潮や流れは「速い」を使用（「早い」は不可）。
・日付：「今日は」「本日は」を使用（「この日は」「当日は」は使用不可）。
・禁止：絵文字、太文字、装飾記号（★、◆など）は一切使用しない。
・段落と改行の禁止：途中で絶対に改行を行わず、すべての文章を隙間なく繋げて、ひと続きの1つの段落として出力してください。
＃ハルシネーション防止の対策
・捏造の禁止：提供された【釣果データ】および【船長からの追加情報】にある事実のみを使用してください。書いていない出来事、釣れていない魚種などを勝手に想像して創作（捏造）することは絶対に禁止です。
・推測の禁止：情報が不足している項目について、無理に推測で文章を膨らませないでください。情報がない場合はその話題には触れず、ある事実だけを使って簡潔に構成してください。
・誇張の禁止：釣果やサイズについて、データ以上の大げさな表現はしないでください。
・トーンの合わせ方：指定された「船全体の調子（絶好調/好調/普通/食い渋り/厳しい）」に100%合わせて文章のテンションを調整してください。
■ 記載内容のルール
1. 冒頭： 必ず「〇〇沖へと出船しました。」から開始し、次に「海上では…」と天候や海況（風・波・潮色）を伝える。海況を伝える際は情景が目に浮かぶような表現を1文交え、潮回り、潮色を簡潔に一連の流れで記載してください。特に指示がない限り"水深〇〇mでした"は不要です。また、海水温度（水温）についても特に船長からの指示がない限り記載しないでください。 さらに、風については前述の通り数値を出さず感覚的な強弱表現に置き換えてください。
2. 状況：潮の流れの強さや変化、魚の活性、印象的なエピソードを組み込む。
3. 竿頭の釣果とお名前（敬称は「さん」）、二番手は釣果だけを紹介する：名前を出すのは「竿頭」のみ。単位（匹、尾、枚、杯など）は魚によって変更すること。全体の釣果として紹介するのはトップの釣果のみとし、その後に続けて竿頭のお名前（敬称は「さん」）を紹介してください。二番手の釣果に触れる場合も釣果数のみとし、スソ（最低釣果）や全体幅（〇〜〇）は文章に出さないでください。
【トップ釣果の表現例】
・「トップは〇〇枚をマークし、〇〇さんが見事竿頭となりました。」
・「本日のトップは〇〇匹。見事釣り上げたのは〇〇さんでした。」
・「釣果はトップ〇〇尾（〇〇さん）となり、二番手も〇〇尾と続きました。」
・（渋い日の場合）「厳しい状況の中、トップ〇〇枚を仕留めた〇〇さんが技ありの竿頭でした。」
4. サイズ：数字（〇cm）は絶対に出さず、「良型」「中型主体」などの言葉のみで表現する。
5. 分析：竿頭の釣り方や好釣果の要因、決め手、コツ、工夫した点などを分析して書く。
6. 締め：釣れた人・釣れなかった人双方に配慮し、「またのご乗船お待ちしております」と前向きに締める。
■ 出力フォーマット
必ず以下の■■■タイトル■■■という区切り文字で区切って、それぞれ明確に切り口やトーンを変えた指定パターンの文章を出力してください。余計な挨拶やマークダウン(\`\`\`など)は含めないでください。${formatPrompt}`;

        const unit = getUnit(record.targetFish);

        // 二番手釣果（竿頭の次に多い数）を正確に抽出してAIに渡す
        const allCounts = [...(record.port || []), ...(record.starboard || [])]
            .filter(s => s && s.isVisible !== false && s.count !== '' && !isNaN(parseInt(s.count)))
            .map(s => parseInt(s.count, 10));
        const maxCount = record.max || 0;
        const secondCounts = allCounts.filter(c => c < maxCount);
        const secondMax = secondCounts.length > 0 ? Math.max(...secondCounts) : null;
        const secondMaxStr = secondMax !== null ? `${secondMax} ${unit}` : 'なし';

        let inputData = `日付: ${record.date} (${getDayOfWeek(record.date)})\n釣り物: ${record.targetFish}\n釣果: ${record.min}〜${record.max} ${unit}\n竿頭: ${record.topAnglerName || 'なし'} (${maxCount} ${unit})\n二番手釣果: ${secondMaxStr}\nポイント: ${record.point || ''}\n水深: ${record.waterDepth || ''}m / 水温: ${record.waterTemp || ''}℃ / 潮色: ${record.tide || ''} / 潮回り: ${record.tideState || ''}\n天候・風波: 前半[${record.weather1 || ''}, ${record.windDir1 || ''} ${record.windSpeed1 || ''}, ${record.waveHeight1 || ''}] / 後半[${record.weather2 || ''}, ${record.windDir2 || ''} ${record.windSpeed2 || ''}, ${record.waveHeight2 || ''}]`;

        let extraInfo = "";
        if (record.detailedMemo && record.detailedMemo.trim() !== '') {
            extraInfo += `\n・詳細メモ・釣行メモ（船長記録）: ${record.detailedMemo.trim()}`;
        }
        if (conditionInfo) extraInfo += `\n・船全体の調子（釣況）の評価: ${conditionInfo}`;
        if (sceneryInfo) extraInfo += `\n・海の情景: ${sceneryInfo}`;
        if (tideInfo) extraInfo += `\n・潮の流れの様子: ${tideInfo}`;
        if (activityInfo) extraInfo += `\n・全体的な釣果の評価・魚の活性: ${activityInfo}`;
        if (episodeInfo) extraInfo += `\n・印象的なエピソード: ${episodeInfo}`;
        if (sizeInfo) extraInfo += `\n・サイズ感: ${sizeInfo}`;
        if (topAnglerInfo) extraInfo += `\n・竿頭の釣り方・好成績の要因・コメント: ${topAnglerInfo}`;

        const userQuery = `以下の釣果データと船長からの追加情報をもとに、指示されたルールの通りに指定パターンの文章を作成してください。\n\n【釣果データ】\n${inputData}\n\n【船長からの追加情報】${extraInfo ? extraInfo : '\n(特になし)'}`;

        try {
            const text = await callGeminiApi(activeApiKey, `${systemPrompt}\n\n${userQuery}`, modelName, false);
            if (text) {
                const parts = text.split(/■■■/);
                const patterns = [];
                for (let i = 1; i < parts.length; i += 2) {
                    const title = parts[i]?.trim();
                    const content = parts[i+1]?.trim();
                    if (title && content) patterns.push({ title, content });
                }
                const newPatterns = patterns.length > 0 ? patterns : [];
                const newText = patterns.length === 0 ? text : '';

                setAiGeneratedPatterns(newPatterns);
                setAiGeneratedText(newText);
                setRecords(prev => {
                    const updated = prev.map(r => r.id === record.id ? { ...r, aiGeneratedPatterns: newPatterns, aiGeneratedText: newText } : r);
                    localStorage.setItem('fishing_records', JSON.stringify(updated));
                    return updated;
                });
                setShowAiModal(true);
            }
        } catch (e) {
            console.error("AI Generation Error:", e);
            setToastMessage(`文章の生成に失敗しました: ${e.message}`);
        } finally {
            setGeneratingAiId(null);
        }
    };

    const handleCopyPattern = (text) => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            setToastMessage('コピーしました！');
        } catch (err) {}
        document.body.removeChild(ta);
    };

    const generateShareText = (record) => {
        const unit = getUnit(record.targetFish);
        let text = `【山下丸 釣果記録】\n`;
        text += `日付: ${(record.date || '').replace(/-/g, '/')}${getDayOfWeek(record.date)}\n`;
        if (record.targetFish) text += `釣り物: ${record.targetFish}\n`;
        text += `釣果: ${record.min}〜${record.max} ${unit}\n`;
        if (record.sizeMin || record.sizeMax) {
            text += `型: ${record.sizeMin || '?'}〜${record.sizeMax || '?'} cm\n`;
        }
        if (record.topAnglerName) {
            text += `竿頭: ${record.topAnglerName} さん\n`;
        }
        if (record.point || record.waterTemp || record.waterDepth || record.tide || record.tideState) {
            text += `【海の状況】\n`;
            if (record.point) text += ` ポイント: ${record.point}\n`;
            if (record.waterDepth) text += ` 水深: ${record.waterDepth}m\n`;
            if (record.waterTemp) text += ` 水温: ${record.waterTemp}℃\n`;
            if (record.tide) text += ` 潮色: ${record.tide}\n`;
            if (record.tideState) text += ` 潮回り: ${record.tideState}\n`;
        }
        text += `総合計: ${record.total || 0} ${unit} (${record.anglers || 0}名)\n`;
        text += `一人平均: ${record.avg || 0} ${unit}\n\n`;

        const pSeats = (record.port || []).filter(s => s && s.isVisible !== false);
        if (pSeats.length > 0) {
            text += `■左舷 (${record.portTotal || 0}${unit})\n`;
            pSeats.forEach(s => {
                const nameStr = (s.name && s.name.trim() !== '') ? s.name.trim() : '-';
                const memoStr = s.memo ? ` (${s.memo})` : '';
                const countVal = (s.count !== '' && s.count !== undefined && s.count !== null) ? s.count : 0;
                text += `${s.id}. ${nameStr}${memoStr}: ${countVal}${unit}\n`;
            });
            text += `\n`;
        }

        const sSeats = (record.starboard || []).filter(s => s && s.isVisible !== false);
        if (sSeats.length > 0) {
            text += `■右舷 (${record.starboardTotal || 0}${unit})\n`;
            sSeats.forEach(s => {
                const nameStr = (s.name && s.name.trim() !== '') ? s.name.trim() : '-';
                const memoStr = s.memo ? ` (${s.memo})` : '';
                const countVal = (s.count !== '' && s.count !== undefined && s.count !== null) ? s.count : 0;
                text += `${s.id}. ${nameStr}${memoStr}: ${countVal}${unit}\n`;
            });
        }
        return text.trim();
    };

    const shareToLine = (record) => {
        const text = generateShareText(record);
        window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank');
        setSharedRecordId(null);
    };

    const shareToEmail = (record) => {
        const text = generateShareText(record);
        const subject = `【山下丸 釣果記録】${(record.date || '').replace(/-/g, '/')}`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
        setSharedRecordId(null);
    };

    // ==========================================
    // AI分析 実行処理
    // ==========================================
    const handleRunAiAnalysis = async (record) => {
        const activeApiKey = (userApiKey || '').replace(/[\s\r\n ]/g, '');
        if (!activeApiKey) {
            setToastMessage('APIキーが未入力です。「基本設定」または「システム」でGemini APIキーを設定してください。');
            return;
        }
        setAnalyzingRecordId(record.id);
        setToastMessage(`AI (${selectedAiModel}) が釣況・釣り座を多角分析中...`);

        const unit = getUnit(record.targetFish);
        const pSeats = (record.port || []).filter(s => s && s.isVisible !== false);
        const sSeats = (record.starboard || []).filter(s => s && s.isVisible !== false);

        const portAnglers = pSeats.length;
        const starboardAnglers = sSeats.length;
        const portTotal = record.portTotal || 0;
        const starboardTotal = record.starboardTotal || 0;
        const portAvg = portAnglers > 0 ? (portTotal / portAnglers).toFixed(1) : '0.0';
        const starboardAvg = starboardAnglers > 0 ? (starboardTotal / starboardAnglers).toFixed(1) : '0.0';

        const promptLines = [
            "あなたはベテラン遊漁船「山下丸」の船長兼データアナリストです。以下の釣果・海況・座席メモデータを精査し、客観的カルテおよび公式HP/日報用のトータル文章を作成してください。",
            "【本日の釣行データ】",
            "- 上限釣果（トップ）: " + record.max + " " + unit,
            "- 竿頭: " + (record.topAnglerName || 'なし') + " (" + record.max + " " + unit + ")",
            "- ポイント: " + (record.point || '久里浜沖周辺'),
            "- 潮色: " + (record.tide || '-') + " / 潮回り: " + (record.tideState || '-'),
            "- 天候・風波: 前半[" + (record.weather1 || '-') + ", 風:" + (record.windDir1 || '-') + (record.windSpeed1 || '-') + ", 波:" + (record.waveHeight1 || '-') + "] / 後半[" + (record.weather2 || '-') + ", 風:" + (record.windDir2 || '-') + (record.windSpeed2 || '-') + ", 波:" + (record.waveHeight2 || '-') + "]",
            "- 船長メモ/詳細メモ: " + (record.detailedMemo || 'なし'),
            "- 左舷状況: 乗船 " + portAnglers + "名 / 合計 " + portTotal + unit + " / 1人平均 " + portAvg + unit + "  座席詳細: " + pSeats.map(s => s.id + "番(" + (s.name || '-') + "):" + (s.count || 0) + unit + " [" + (s.memo || '') + "]").join(', '),
            "- 右舷状況: 乗船 " + starboardAnglers + "名 / 合計 " + starboardTotal + unit + " / 1人平均 " + starboardAvg + unit + "  座席詳細: " + sSeats.map(s => s.id + "番(" + (s.name || '-') + "):" + (s.count || 0) + unit + " [" + (s.memo || '') + "]").join(', '),
            "【指示事項】",
            "【最重要：入力メモの自動校正＆用語・漢字統一ルール（全出力共通）】",
            "・提供されたメモや座席メモは現場での入力のため、誤字・脱字・音声入力誤変換が含まれる場合があります。メモの文字をそのままオウム返しせず、必ず前後の文脈を汲み取り、正しく自然な釣行用語・日本語に校正して文章を生成してください。",
            "  - 潮や流れの速度：「早い」➔ 必ず「速い」に修正（例: 潮が早い ➔ 潮が速い）。",
            "  - 魚の混交表現：「混じる」「まじる」➔ 必ず「交じる」に統一。",
            "  - 潮の周期：「潮周り」➔ 必ず「潮回り」に統一。",
            "  - 時合の表記：「時合い」「地合い」➔「時合い」に統一。",
            "  - その他音声入力等の誤変換（例: 根が借り➔根掛かり、あたり➔アタリ/当たり、ばらし➔バラシ等）も適切な釣行用語に自動修正してください。",
            "1. totalSummaryReport（トータル状況日報）: 本日のポイント、釣況、メモを総括し、公式HPや日報にそのまま掲載できる400字程度の完成された文章を作成してください。",
            "    【文章の構成と比率（最重要）】",
            "    ・天候・風・波・潮などの海況描写は、冒頭の1〜2文（全体の2割程度）でサラッと簡潔にまとめること（海況の説明だけで長引かせない）。",
            "    ・文章の大半（全体の6〜7割）は【釣りの内容】に充て、魚の活性、アタリの出方、時間帯ごとの変化、メモにある船上の様子などを具体的に厚く描写してください。",
            "    ・終盤で竿頭の釣果（トップ数のみ）と工夫・ヒットパターンを紹介し、前向きに締めくくる。",
            "    【厳守ルール】",
            "    ・日付・時制の表現：「当日」「この日」「当日は」という表現は一切禁止とします。必ず「本日」「今日」を用いて、下船直後のリアルタイムな報告として記述してください。",
            "    ・海水温度（水温）および水深は文章中に記載しないでください。",
            "    ・書き出し：「〇〇沖へと出船しました」「〇〇沖からスタートしました」等の表現で簡潔に始める。",
            "    ・釣果については「上限の釣果（トップの数）」のみを記載し、「〇〜〇」といった範囲表示や「平均釣果」は絶対に記載しないでください。",
            "    ・竿頭の紹介と敬称：トップ釣果を紹介した後に竿頭のお名前を紹介しても構いませんが、「様」は使わず必ず「さん」付けで統一してください。",
            "    ・サイズについて「〇cm」といった具体的な寸法数値は一切出さないでください（触れる場合は「良型」「中型主体」などの表現のみ）。",
            "    ・文体は「です・ます調」で統一し、途中の不要な改行は避け、読みやすく温かみのある船長目線でまとめてください。",
            "2. seatBiasAnalysis（座席バイアス分析）: 左右舷の比較において、単純な合計数だけでなく必ず「乗船人数」と「1人あたりの平均釣果」を基準にして、人数の偏りによる見かけの差と実際の釣況差を明確に区別して考察してください。",
            "必ず以下のJSON形式のみで出力してください（Markdownコードブロックや余計な文字は一切不要）。",
            '{"difficulty":"難易度評価","totalSummaryReport":"トータル状況日報","seatBiasAnalysis":"座席分析","environmentCorrelation":"海況相関","topAnglerFactors":"竿頭勝因","captainAdvice":"船長カルテ"}'
        ];
        const prompt = promptLines.join('\n');

        try {
            const modelName = typeof getActualModelName === 'function' 
                ? getActualModelName(selectedAiModel) 
                : 'gemini-2.5-flash';

            const text = await callGeminiApi(activeApiKey, prompt, modelName, true);
            if (!text) {
                throw new Error('AIからの応答が得られませんでした');
            }

            let cleanJson = text.replace(/```json/gi, '');
            cleanJson = cleanJson.split('```').join('').trim();
            const analysisData = JSON.parse(cleanJson);

            setCurrentAnalysis({ record, data: analysisData });
            setRecords(prev => {
                const next = prev.map(r => r.id === record.id ? { ...r, aiAnalysisResult: analysisData } : r);
                localStorage.setItem('fishing_records', JSON.stringify(next));
                return next;
            });
            setShowAnalysisModal(true);
        } catch (e) {
            console.error("AI Analysis Error:", e);
            const msg = (e && e.message) ? e.message.toLowerCase() : '';
            let userFriendlyMsg = '通信エラーが発生しました。電波状況をご確認ください。';

            if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('timeout')) {
                userFriendlyMsg = '電波が不安定か、通信が切断されました。\n電波の届きやすい場所で再度お試しください。';
            } else if (msg.includes('api_key') || msg.includes('invalid') || msg.includes('403') || msg.includes('permission')) {
                userFriendlyMsg = 'APIキーが無効、または認証に失敗しました。\n設定画面で正しいGemini APIキーをご確認ください。';
            } else if (msg.includes('quota') || msg.includes('resource_exhausted') || msg.includes('429')) {
                userFriendlyMsg = 'AIの利用上限に達したか、アクセスが集中しています。\n1〜2分ほど時間を置いてから再度お試しください。';
            } else if (msg.includes('json') || msg.includes('parse')) {
                userFriendlyMsg = 'AIからの回答の読み込みに失敗しました。\nもう一度「分析」ボタンを押してください。';
            } else if (msg.includes('500') || msg.includes('503') || msg.includes('service unavailable')) {
                userFriendlyMsg = 'AIサーバーが混雑またはメンテナンス中です。\nしばらく待ってからお試しください。';
            }

            setToastMessage(`【AI分析エラー】\n${userFriendlyMsg}`);
        } finally {
            setAnalyzingRecordId(null);
        }
    };

    const copyAnalysisText = () => {
        if (!currentAnalysis?.data) return;
        const d = currentAnalysis.data;
        const r = currentAnalysis.record;
        let text = `【山下丸 釣況AI多角分析カルテ】\n日付: ${r.date} (${r.targetFish || ''})\n\n■ 釣況難易度\n${d.difficulty}\n\n`;
        if (d.totalSummaryReport) {
            text += `■ トータル状況日報（総括）\n${d.totalSummaryReport}\n\n`;
        }
        text += `■ 釣り座・座席バイアス分析\n${d.seatBiasAnalysis}\n\n■ 海況・潮時相関\n${d.environmentCorrelation}\n\n■ 竿頭の勝因考察\n${d.topAnglerFactors}\n\n■ 次回攻略への提言・船長カルテ\n${d.captainAdvice}`;
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            setToastMessage('分析レポートをコピーしました！');
        } catch (e) {}
        document.body.removeChild(ta);
    };

    const filteredRecords = React.useMemo(() => {
        return records.filter(r => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            const portNamesAndMemos = (r.port || []).map(s => `${s.name || ''} ${s.memo || ''}`).join(' ');
            const starboardNamesAndMemos = (r.starboard || []).map(s => `${s.name || ''} ${s.memo || ''}`).join(' ');
            
            const targetText = [
                r.date, (r.date || '').replace(/-/g, '/'), r.targetFish, r.point,
                r.topAnglerName, r.detailedMemo, portNamesAndMemos, starboardNamesAndMemos
            ].join(' ').toLowerCase();

            return targetText.includes(q);
        }).sort((a, b) => {
            if (sortOrder === 'top_desc') return (b.max || 0) - (a.max || 0);
            if (sortOrder === 'top_asc') return (a.max || 0) - (b.max || 0);
            return new Date(b.date) - new Date(a.date);
        });
    }, [records, searchQuery, sortOrder]);

    return (
        <div className="max-w-md mx-auto min-h-[100dvh] flex flex-col relative overflow-hidden transition-colors duration-300 bg-gray-100 dark:bg-slate-900">
            {toastMessage && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 animate-[fadeIn_0.15s_ease-out]" onClick={() => setToastMessage('')}>
                    <div 
                        className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white p-5 rounded-2xl shadow-2xl border-2 border-blue-400/80 max-w-xs sm:max-w-sm w-full text-center flex flex-col items-center space-y-4 backdrop-blur-md" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setToastMessage('')} 
                            className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-blue-200 font-bold text-sm"
                            aria-label="閉じる"
                        >
                            ✕
                        </button>
                        <div className="text-sm sm:text-base font-bold leading-relaxed whitespace-pre-wrap pt-2 px-1 text-slate-100">
                            {toastMessage}
                        </div>
                        <button 
                            onClick={() => setToastMessage('')} 
                            className="w-full bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-black py-2.5 rounded-xl shadow-md transition-all text-sm"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            {/* 個別記録削除の確認モーダル */}
            {recordToDelete && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]" onClick={() => setRecordToDelete(null)}>
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-2xl border-2 border-red-300 dark:border-red-800 w-full max-w-xs text-center space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center shadow-inner">
                            <IconTrash className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-gray-800 dark:text-slate-100">記録を削除しますか？</h3>
                            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                                {recordToDelete.date} {getDayOfWeek(recordToDelete.date)}<br/>
                                {recordToDelete.targetFish ? `【${recordToDelete.targetFish}】` : ''}の釣果記録を削除します。<br/>
                                <span className="text-red-500 text-[11px]">※この操作は元に戻せません</span>
                            </p>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={() => {
                                    handleDeleteRecord(recordToDelete.id);
                                    setRecordToDelete(null);
                                }}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-2.5 rounded-xl text-xs shadow active:scale-95 transition-all"
                            >
                                削除する
                            </button>
                            <button
                                onClick={() => setRecordToDelete(null)}
                                className="flex-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-black py-2.5 rounded-xl text-xs border border-gray-200 dark:border-slate-600 transition-all"
                            >
                                キャンセル
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <SettingsPanel
                isSettingsOpen={isSettingsOpen} setIsSettingsOpen={setIsSettingsOpen}
                portCount={portSeatCount} starboardCount={starboardSeatCount} onCountChange={handleSeatCountChange}
                point={point} setPoint={setPoint} waterTemp={waterTemp} setWaterTemp={setWaterTemp}
                waterDepth={waterDepth} setWaterDepth={setWaterDepth} tide={tide} setTide={setTide}
                tideState={tideState} setTideState={setTideState} highTide1={highTide1} setHighTide1={setHighTide1}
                highTide2={highTide2} setHighTide2={setHighTide2} lowTide1={lowTide1} setLowTide1={setLowTide1}
                lowTide2={lowTide2} setLowTide2={setLowTide2} weather1={weather1} setWeather1={setWeather1}
                weather2={weather2} setWeather2={setWeather2} windDir1={windDir1} setWindDir1={setWindDir1}
                windDir2={windDir2} setWindDir2={setWindDir2} windSpeed1={windSpeed1} setWindSpeed1={setWindSpeed1}
                windSpeed2={windSpeed2} setWindSpeed2={setWindSpeed2} waveHeight1={waveHeight1} setWaveHeight1={setWaveHeight1}
                waveHeight2={waveHeight2} setWaveHeight2={setWaveHeight2} theme={theme} setTheme={setTheme}
                targetFish={targetFish} setTargetFish={setTargetFish} date={date} setToastMessage={setToastMessage}
                onFactoryReset={() => { setRecords([]); localStorage.clear(); setToastMessage('初期化完了'); }}
                records={records} setRecords={setRecords} userApiKey={userApiKey} setUserApiKey={setUserApiKey}
                selectedAiModel={selectedAiModel} setSelectedAiModel={setSelectedAiModel}
            />

            {/* 釣行メモモーダル（Keep型自動保存版） */}
            <MemoModalWithTags
                showMemoModal={showMemoModal}
                setShowMemoModal={setShowMemoModal}
                tempMemo={tempMemo}
                setTempMemo={setTempMemo}
                onAutoSave={handleAutoSaveMemo}
            />

            {/* AI日報入力ウィザードモーダル */}
            <AiInputWizardModal
                showAiInputModal={showAiInputModal}
                setShowAiInputModal={setShowAiInputModal}
                aiCurrentStep={aiCurrentStep}
                setAiCurrentStep={setAiCurrentStep}
                wizardSteps={wizardSteps}
                aiInputData={aiInputData}
                setAiInputData={setAiInputData}
                targetRecordForAi={targetRecordForAi}
                updateAiInputForRecord={updateAiInputForRecord}
                userApiKey={userApiKey}
                setUserApiKey={setUserApiKey}
                handleAiGenerate={handleAiGenerate}
            />

            {/* AI日報表示モーダル */}
            <AiResultModal
                showAiModal={showAiModal}
                setShowAiModal={setShowAiModal}
                aiGeneratedPatterns={aiGeneratedPatterns}
                aiGeneratedText={aiGeneratedText}
                handleCopyPattern={handleCopyPattern}
                onRecreate={() => {
                    setShowAiModal(false);
                    if (targetRecordForAi) {
                        setAiInputData({
                            condition: targetRecordForAi.aiInput_condition || '',
                            scenery: targetRecordForAi.aiInput_scenery || '',
                            tide: targetRecordForAi.aiInput_tide || '',
                            activity: targetRecordForAi.aiInput_activity || '',
                            episode: targetRecordForAi.aiInput_episode || '',
                            size: targetRecordForAi.aiInput_size || '',
                            topAngler: targetRecordForAi.aiInput_topAngler || '',
                            patterns: targetRecordForAi.aiInput_patterns || [1]
                        });
                        setAiCurrentStep(0);
                        setShowAiInputModal(true);
                    }
                }}
            />

            {/* AI多角分析モーダル */}
            <AiAnalysisModal
                showAnalysisModal={showAnalysisModal}
                setShowAnalysisModal={setShowAnalysisModal}
                currentAnalysis={currentAnalysis}
                handleRunAiAnalysis={handleRunAiAnalysis}
                copyAnalysisText={copyAnalysisText}
                handleCopyPattern={handleCopyPattern}
                isAnalyzing={analyzingRecordId === (currentAnalysis?.record?.id)}
            />

            {/* 釣果ボード生成モーダル */}
            <ShareImageModal
                record={shareImageRecord}
                onClose={() => setShareImageRecord(null)}
                setToastMessage={setToastMessage}
            />

            {/* ヘッダー（左右スワイプでエンドレス・循環切り替え） */}
            <div 
                onTouchStart={handleSwipeStart}
                onTouchEnd={handleSwipeEnd}
                className="sticky top-0 z-20 shadow-md bg-gradient-to-r from-blue-900 via-blue-600 to-blue-900 dark:from-slate-950 dark:via-blue-950 dark:to-slate-950 text-white px-3 py-2 flex justify-between items-center border-b border-transparent dark:border-slate-800/80 transition-colors select-none"
            >
                <div className="w-8 shrink-0"></div>
                <div className="flex flex-col items-center justify-center flex-1 max-w-[320px] -translate-x-3.5 sm:-translate-x-5">
                    <img 
                        src="./text_logo.png" 
                        alt="山下丸" 
                        className="h-12 sm:h-14 w-auto max-w-[270px] object-contain object-center drop-shadow-md transition-all"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = document.getElementById('header-text-fallback');
                            if (fallback) fallback.style.display = 'block';
                        }}
                    />
                    <span 
                        id="header-text-fallback" 
                        style={{ display: 'none', fontFamily: "'Yuji Boku', serif", fontSize: "2.2em", fontWeight: "900", letterSpacing: "0.25em" }}
                    >
                        山下丸
                    </span>
                    <span className="font-sans font-extrabold text-sm sm:text-base tracking-tight text-sky-300 drop-shadow-sm mt-0.5 uppercase">
                        {activeTab === 'history' ? 'SeaNote Archive' : activeTab === 'counter' ? 'Count Fish' : 'CatchLog Pro'}
                    </span>
                </div>
                <button onClick={() => setIsSettingsOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-full active:bg-blue-800/50 shrink-0">
                    <IconSettings className="w-6 h-6 text-blue-100" />
                </button>
            </div>

            {/* メインスクロールエリア */}
            <div id="main-scroll-container" className="flex-1 flex flex-col overflow-y-auto p-3 sm:p-4 pb-36 no-scrollbar bg-sky-50 dark:bg-slate-900">
                {activeTab === 'input' && (
                    <div className="space-y-3 animate-[fadeIn_0.2s_ease-out]">
                        <div className="bg-blue-100 dark:bg-slate-800 rounded-xl p-3.5 shadow-sm border border-blue-200 dark:border-slate-700 flex flex-col gap-2.5">
                            <div className="flex justify-between items-center">
                                <input 
                                    type="date" 
                                    className="border border-stone-300 dark:border-slate-500 rounded-lg px-3 py-1.5 text-lg sm:text-xl font-black bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 shadow-2xs" 
                                    value={date} 
                                    onChange={(e) => setDate(e.target.value)} 
                                />
                                <span className="text-base sm:text-lg font-black text-sky-700 dark:text-sky-400">
                                    {targetFish || '釣り物未設定'}
                                </span>
                            </div>

                            {(point || waterDepth || waterTemp || tide || tideState || weather1 || windDir1 || windSpeed1) && (
                                <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-sm sm:text-base font-bold text-stone-800 dark:text-slate-200 pt-2 border-t border-stone-200 dark:border-slate-800 leading-normal">
                                    {point && <span className="font-black text-slate-800 dark:text-slate-100">{point}</span>}
                                    {waterDepth && <span>{waterDepth}m</span>}
                                    {waterTemp && <span>{waterTemp}℃</span>}
                                    {tide && <span>{tide}</span>}
                                    {tideState && <span>{tideState}</span>}
                                    {weather1 && <span>{weather1}{weather2 && weather1 !== weather2 ? `→${weather2}` : ''}</span>}
                                    {(() => {
                                        const f1 = (windDir1 || windSpeed1) ? `${windDir1 || ''}${windSpeed1 ? `(${windSpeed1})` : ''}` : '';
                                        const f2 = (windDir2 || windSpeed2) ? `${windDir2 || ''}${windSpeed2 ? `(${windSpeed2})` : ''}` : '';
                                        if (!f1 && !f2) return null;
                                        if (f1 && f2 && f1 !== f2) return <span>{f1}→{f2}</span>;
                                        return <span>{f1 || f2}</span>;
                                    })()}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between gap-1.5 mb-2 select-none">
                            <button
                                type="button"
                                onClick={() => setInputSide(inputSide === 'port' ? 'both' : 'port')}
                                className={`flex-1 py-2 px-2.5 rounded-lg text-sm font-black border transition-all flex items-center justify-center gap-1 active:scale-95 ${
                                    inputSide === 'port'
                                        ? 'bg-red-500 text-white border-red-600 shadow-sm ring-2 ring-red-300 dark:ring-red-950 dark:border-red-700'
                                        : inputSide === 'both'
                                        ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-950/60 hover:bg-red-100'
                                        : 'bg-gray-100 dark:bg-slate-800/80 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-slate-800 opacity-60'
                                }`}
                            >
                                <span>左舷</span>
                                {inputSide === 'port' && <span className="text-[11px] font-bold bg-white/20 px-1 rounded">のみ</span>}
                            </button>

                            <button
    type="button"
    onClick={() => setInputSide('both')}
    className={`px-4 py-2 rounded-lg text-sm font-black border transition-all active:scale-95 shrink-0 ${
        inputSide === 'both'
            ? 'bg-sky-100/70 dark:bg-slate-800 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700 shadow-2xs'
            : 'bg-transparent text-gray-400 dark:text-slate-500 border-transparent hover:text-gray-600'
    }`}
>
    両舷
</button>

                            <button
                                type="button"
                                onClick={() => setInputSide(inputSide === 'starboard' ? 'both' : 'starboard')}
                                className={`flex-1 py-2 px-2.5 rounded-lg text-sm font-black border transition-all flex items-center justify-center gap-1 active:scale-95 ${
                                    inputSide === 'starboard'
                                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-300 dark:ring-emerald-950 dark:border-emerald-700'
                                        : inputSide === 'both'
                                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-950/60 hover:bg-emerald-100'
                                        : 'bg-gray-100 dark:bg-slate-800/80 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-slate-800 opacity-60'
                                }`}
                            >
                                <span>右舷</span>
                                {inputSide === 'starboard' && <span className="text-[11px] font-bold bg-white/20 px-1 rounded">のみ</span>}
                            </button>
                        </div>

                        {/* 座席リスト描画 */}
                        {inputSide === 'both' ? (
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    {portSeats.map((s, i) => <SeatInput key={`p-${i}`} side="port" seat={s} index={i} onSeatChange={handleSeatChange} onCountDelta={handleCountDelta} viewMode="both" onToggleVisibility={handleToggleVisibility} />)}
                                </div>
                                <div>
                                    {starboardSeats.map((s, i) => <SeatInput key={`s-${i}`} side="starboard" seat={s} index={i} onSeatChange={handleSeatChange} onCountDelta={handleCountDelta} viewMode="both" onToggleVisibility={handleToggleVisibility} />)}
                                </div>
                            </div>
                        ) : (
                            <div>
                                {(inputSide === 'port' ? portSeats : starboardSeats).map((s, i) => <SeatInput key={`${inputSide}-${i}`} side={inputSide} seat={s} index={i} onSeatChange={handleSeatChange} onCountDelta={handleCountDelta} viewMode="single" onToggleVisibility={handleToggleVisibility} />)}
                            </div>
                        )}
                        <div className="h-16 shrink-0 pointer-events-none"></div>
                    </div>
                )}

                {/* カウンタータブ */}
                {activeTab === 'counter' && (
                    <div className="flex flex-col flex-1 space-y-3 animate-[fadeIn_0.2s_ease-out]">
                        {(() => {
                            const stats = getTopAnglerDetails(portSeats, starboardSeats);
                            const unit = getUnit(targetFish);

                            return (
                                <div className="bg-blue-100 dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-blue-200 dark:border-slate-700 flex justify-between items-stretch min-h-[80px] shrink-0">
                                    <div className="w-1/2 flex flex-col items-center justify-center border-r border-blue-200 dark:border-slate-700 px-2">
                                        <span className="text-xs font-bold text-blue-600 dark:text-sky-400 uppercase tracking-wider">現在の釣果</span>
                                        <div className="text-3xl sm:text-4xl font-black text-blue-900 dark:text-slate-100 mt-0.5">
                                            {stats.anglers > 0 ? `${stats.min}〜${stats.max}` : '-'} <span className="text-sm font-normal">{unit}</span>
                                        </div>
                                    </div>

                                    <div className="w-1/2 flex flex-col items-center justify-center px-2">
                                        <span className="text-xs font-bold text-blue-600 dark:text-sky-400 uppercase tracking-wider flex items-center mb-0.5">
                                            <IconTrophy className="w-4 h-4 mr-1 text-amber-500" /> 竿頭 {stats.max > 0 ? `(${stats.max}${unit})` : ''}
                                        </span>
                                        <div className="flex flex-wrap justify-center items-center gap-1 max-h-12 overflow-y-auto no-scrollbar w-full text-center">
                                            {stats.topNames.length > 0 ? (
                                                stats.topNames.map((name, idx) => {
                                                    const nameSizeClass = stats.topNames.length === 1 
                                                        ? 'text-xl sm:text-2xl' 
                                                        : stats.topNames.length === 2 
                                                            ? 'text-base sm:text-lg' 
                                                            : 'text-xs sm:text-sm';
                                                    return (
                                                        <span key={idx} className={`${nameSizeClass} font-black text-blue-900 dark:text-slate-100 leading-tight`}>
                                                            {name}{idx < stats.topNames.length - 1 ? '・' : ''}
                                                        </span>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-2xl font-black text-gray-400">-</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* 潮時リアルタイムアラートバー */}
                        <TideAlertBanner
                            tideState={tideState}
                            highTide1={highTide1}
                            highTide2={highTide2}
                            lowTide1={lowTide1}
                            lowTide2={lowTide2}
                        />

                        <div className="grid grid-cols-2 gap-2 flex-1">
                            {counterMode === 'slide' ? (
                                <>
                                    <div className="flex flex-col gap-1.5">{portSeats.map((s, i) => <CounterCardSlide key={`cp-${i}`} side="port" seat={s} index={i} onCountDelta={handleCountDelta} totalSeats={portSeats.length} />)}</div>
                                    <div className="flex flex-col gap-1.5">{starboardSeats.map((s, i) => <CounterCardSlide key={`cs-${i}`} side="starboard" seat={s} index={i} onCountDelta={handleCountDelta} totalSeats={starboardSeats.length} />)}</div>
                                </>
                            ) : counterMode === 'tap' ? (
                                <>
                                    <div className="flex flex-col gap-1.5">{portSeats.map((s, i) => <CounterCardTap key={`ctp-${i}`} side="port" seat={s} index={i} onCountDelta={handleCountDelta} onClear={(s, idx) => handleSeatChange(s, idx, 'count', '')} totalSeats={portSeats.length} />)}</div>
                                    <div className="flex flex-col gap-1.5">{starboardSeats.map((s, i) => <CounterCardTap key={`cts-${i}`} side="starboard" seat={s} index={i} onCountDelta={handleCountDelta} onClear={(s, idx) => handleSeatChange(s, idx, 'count', '')} totalSeats={starboardSeats.length} />)}</div>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-1.5">{portSeats.map((s, i) => <CounterKeypadCard key={`kp-${i}`} side="port" seat={s} index={i} onSeatChange={handleSeatChange} totalSeats={portSeats.length} />)}</div>
                                    <div className="flex flex-col gap-1.5">{starboardSeats.map((s, i) => <CounterKeypadCard key={`ks-${i}`} side="starboard" seat={s} index={i} onSeatChange={handleSeatChange} totalSeats={starboardSeats.length} />)}</div>
                                </>
                            )}
                        </div>

                        {/* 魚のサイズ（左） ＋ 船長メモ正方形大型ボタン（右） */}
                        <div className="flex items-stretch gap-2 shrink-0">
                            {/* 左側：魚のサイズ枠 */}
                            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-2.5 flex flex-col justify-between">
                                <div className="text-xs font-black text-gray-500 dark:text-slate-400 mb-1.5 flex items-center">
                                    <IconRuler className="w-4 h-4 mr-1 text-sky-500 dark:text-sky-400 shrink-0" /> 
                                    <span>魚のサイズ (cm)</span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                    <div className="flex-1 flex items-center border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-900 focus-within:border-sky-400 dark:focus-within:border-sky-500 overflow-hidden min-w-0">
                                        <span className="pl-1.5 text-[11px] text-gray-400 font-bold shrink-0">小</span>
                                        <input 
                                            type="number" 
                                            className="w-full py-1.5 bg-transparent text-center font-black text-base text-gray-800 dark:text-slate-100 focus:outline-none min-w-0" 
                                            placeholder="-" 
                                            value={sizeMin} 
                                            onChange={(e) => handleSizeChange('min', e.target.value)} 
                                        />
                                    </div>
                                    <span className="text-gray-400 font-bold text-xs shrink-0">〜</span>
                                    <div className="flex-1 flex items-center border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-900 focus-within:border-sky-400 dark:focus-within:border-sky-500 overflow-hidden min-w-0">
                                        <span className="pl-1.5 text-[11px] text-gray-400 font-bold shrink-0">大</span>
                                        <input 
                                            type="number" 
                                            className="w-full py-1.5 bg-transparent text-center font-black text-base text-gray-800 dark:text-slate-100 focus:outline-none min-w-0" 
                                            placeholder="-" 
                                            value={sizeMax} 
                                            onChange={(e) => handleSizeChange('max', e.target.value)} 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 右側：正方形大型メモボタン */}
                            <button
                                type="button"
                                onClick={() => openMemoModal(null)}
                                className={`w-24 sm:w-28 rounded-xl shadow-sm border p-2 flex flex-col items-center justify-center text-center active:scale-95 transition-all select-none shrink-0 ${
                                    detailedMemo && detailedMemo.trim() !== ''
                                        ? 'bg-amber-50 dark:bg-slate-800 border-amber-300 dark:border-amber-600 text-amber-900 dark:text-amber-300'
                                        : 'bg-sky-50 dark:bg-slate-800 border-sky-200 dark:border-slate-700 text-sky-800 dark:text-sky-300'
                                }`}
                            >
                                <span className="text-2xl mb-0.5">📝</span>
                                <span className="text-xs font-black leading-tight tracking-tight">船長メモ</span>
                                <span className="text-[10px] font-bold opacity-75 mt-0.5 leading-none">
                                    {detailedMemo && detailedMemo.trim() !== '' ? `${detailedMemo.length}文字` : 'タップ記録'}
                                </span>
                            </button>
                        </div>

                        <ResetButton onReset={resetOnlyCounts} counterMode={counterMode} setCounterMode={setCounterMode} />

                        <div className="h-16 shrink-0 pointer-events-none"></div>
                    </div>
                )}

                {/* 履歴タブ */}
                {activeTab === 'history' && (
                    <div className="space-y-3 animate-[fadeIn_0.2s_ease-out]">
                        <div className="space-y-2">
                            <div className="relative">
                                <input 
                                    type="search" 
                                    placeholder="日付・魚種・お名前・メモ・ポイントで検索" 
                                    className="w-full border border-gray-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-200" 
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)} 
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
                            </div>
                            <div className="flex bg-gray-200 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-black shadow-inner">
                                <button 
                                    onClick={() => setSortOrder('date_desc')} 
                                    className={`flex-1 py-2 rounded-lg transition-all ${sortOrder === 'date_desc' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-gray-500 dark:text-slate-400 active:bg-gray-100'}`}
                                >
                                    日付順
                                </button>
                                <button 
                                    onClick={() => setSortOrder('top_desc')} 
                                    className={`flex-1 py-2 rounded-lg transition-all ${sortOrder === 'top_desc' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-gray-500 dark:text-slate-400 active:bg-gray-100'}`}
                                >
                                    釣果が多い順
                                </button>
                                <button 
                                    onClick={() => setSortOrder('top_asc')} 
                                    className={`flex-1 py-2 rounded-lg transition-all ${sortOrder === 'top_asc' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-gray-500 dark:text-slate-400 active:bg-gray-100'}`}
                                >
                                    釣果が少ない順
                                </button>
                            </div>
                        </div>
                        {filteredRecords.map(r => {
                            const isExpanded = expandedRecordId === r.id;
                            const unit = getUnit(r.targetFish);
                            return (
                               
                                /* 外枠を dark:border-slate-500 に統一 */
                                <div key={r.id} className="bg-sky-100/70 dark:bg-slate-800 rounded-xl shadow border border-sky-200 dark:border-slate-500 overflow-hidden transition-all">
                                    <div 
                                        className="p-4 cursor-pointer active:bg-gray-50 dark:active:bg-slate-700/50 select-none" 
                                        onClick={() => setExpandedRecordId(isExpanded ? null : r.id)}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-black text-base sm:text-lg text-gray-800 dark:text-slate-100">{r.date} {getDayOfWeek(r.date)}</span>
                                            <div className="flex items-center gap-1.5">
                                                {r.targetFish ? (
                                                    <span className="text-sm bg-sky-200/30 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 px-3 py-1 rounded-lg font-black select-none border border-sky-300/80 dark:border-sky-700 shadow-2xs">
                                                        {r.targetFish}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-black border border-gray-200">釣果</span>
                                                )}
                                                <span className="text-gray-400 dark:text-slate-500">
                                                    {isExpanded ? <IconChevronUp className="w-5 h-5" /> : <IconChevronDown className="w-5 h-5" />}
                                                </span>
                                            </div>
                                        </div>

                                        {(r.point || r.waterDepth || r.waterTemp || r.tide || r.tideState || r.weather1 || r.windDir1 || r.windSpeed1) && (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
        {r.point && <span className="font-black text-slate-800 dark:text-slate-100">{r.point}</span>}
        {r.waterDepth && <span>{r.waterDepth}m</span>}
        {r.waterTemp && <span>{r.waterTemp}℃</span>}
        {r.tide && <span>{r.tide}</span>}
        {r.tideState && <span>{r.tideState}</span>}
        {r.weather1 && <span>{r.weather1}{r.weather2 && r.weather1 !== r.weather2 ? `→${r.weather2}` : ''}</span>}
        {(() => {
            const wd1 = r.windDir1 || r.windDir || '';
            const ws1 = r.windSpeed1 || r.windSpeed || '';
            const wd2 = r.windDir2 || '';
            const ws2 = r.windSpeed2 || '';
            const f1 = (wd1 || ws1) ? `${wd1}${ws1 ? `(${ws1})` : ''}` : '';
            const f2 = (wd2 || ws2) ? `${wd2}${ws2 ? `(${ws2})` : ''}` : '';
            if (!f1 && !f2) return null;
            if (f1 && f2 && f1 !== f2) return <span>{f1}→{f2}</span>;
            return <span>{f1 || f2}</span>;
        })()}
    </div>
)}

                                        <div className="bg-sky-50 dark:bg-slate-900/60 border border-sky-100 dark:border-slate-800 rounded-xl p-3 flex flex-wrap justify-between items-center gap-x-3 gap-y-1.5">
                                            <div className="flex items-center flex-wrap gap-x-3.5 gap-y-1">
                                                <div className="flex items-baseline text-slate-800 dark:text-slate-100">
                                                    <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mr-1.5">釣果:</span>
                                                    <span className="text-lg sm:text-xl font-black">{r.min}〜{r.max}</span>
                                                    <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 ml-0.5">{unit}</span>
                                                </div>
                                                {(r.sizeMin || r.sizeMax) && (
                                                    <div className="flex items-baseline text-slate-800 dark:text-slate-100">
                                                        <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mr-1.5">型:</span>
                                                        <span className="text-lg sm:text-xl font-black">{r.sizeMin || '?'}〜{r.sizeMax || '?'}</span>
                                                        <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 ml-0.5">cm</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-baseline text-slate-800 dark:text-slate-100 shrink-0">
                                                <IconTrophy className="w-4 h-4 mr-0.5 text-amber-500 self-center" />
                                                <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mr-1.5">竿頭:</span>
                                                <span className="text-base sm:text-lg font-black">{r.topAnglerName || '-'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="p-3 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 animate-[fadeIn_0.15s_ease-out] space-y-3">
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-red-100 dark:border-red-950/40">
                                                    <div className="font-black text-red-500 border-b border-red-100 dark:border-red-900 pb-1 mb-2 flex justify-between items-center text-sm">
                                                        <span>左舷</span>
                                                        <span className="text-xs font-bold text-gray-600 dark:text-slate-400">{r.portTotal || 0}{unit}</span>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {(r.port || []).filter(s => s && s.isVisible !== false).map((s, idx) => {
                                                            const countVal = parseInt(s.count) || 0;
                                                            const isTop = countVal === (r.max || 0) && countVal > 0;
                                                            return (
                                                                <div key={`p-detail-${idx}`} className={`flex justify-between items-baseline py-0.5 border-b border-gray-50 dark:border-slate-700/50 last:border-0 ${isTop ? 'font-black text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-slate-300'}`}>
                                                                    <span className="truncate pr-1 text-sm">
                                                                        <span className="font-bold mr-1 text-gray-400">{s.id}.</span>
                                                                        <span>{s.name || '-'}</span>
                                                                        {s.memo && <span className="text-xs text-gray-400 dark:text-slate-500 ml-1">({s.memo})</span>}
                                                                    </span>
                                                                    <span className="shrink-0 font-black flex items-center text-sm">
                                                                        {isTop && <span className="text-xs mr-0.5">👑</span>}
                                                                        {s.count || '0'}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-950/40">
                                                    <div className="font-black text-emerald-600 dark:text-emerald-400 border-b border-emerald-100 dark:border-emerald-900 pb-1 mb-2 flex justify-between items-center text-sm">
                                                        <span>右舷</span>
                                                        <span className="text-xs font-bold text-gray-600 dark:text-slate-400">{r.starboardTotal || 0}{unit}</span>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {(r.starboard || []).filter(s => s && s.isVisible !== false).map((s, idx) => {
                                                            const countVal = parseInt(s.count) || 0;
                                                            const isTop = countVal === (r.max || 0) && countVal > 0;
                                                            return (
                                                                <div key={`s-detail-${idx}`} className={`flex justify-between items-baseline py-0.5 border-b border-gray-50 dark:border-slate-700/50 last:border-0 ${isTop ? 'font-black text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-slate-300'}`}>
                                                                    <span className="truncate pr-1 text-sm">
                                                                        <span className="font-bold mr-1 text-gray-400">{s.id}.</span>
                                                                        <span>{s.name || '-'}</span>
                                                                        {s.memo && <span className="text-xs text-gray-400 dark:text-slate-500 ml-1">({s.memo})</span>}
                                                                    </span>
                                                                    <span className="shrink-0 font-black flex items-center text-sm">
                                                                        {isTop && <span className="text-xs mr-0.5">👑</span>}
                                                                        {s.count || '0'}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between text-sm font-bold text-gray-600 dark:text-slate-400 pt-1.5 px-1 border-t border-gray-200 dark:border-slate-700">
                                                <span>総計: <span className="font-black text-gray-800 dark:text-slate-100">{r.total || 0}</span> {unit} ({r.anglers || 0}名)</span>
                                                <span>平均: <span className="font-black text-gray-800 dark:text-slate-100">{r.avg || 0}</span> {unit}</span>
                                            </div>
                                        </div>
                                    )}

                                    {sharedRecordId === r.id && (
                                        <div className="w-full bg-gray-50 dark:bg-slate-900/80 p-3 border-t border-gray-200 dark:border-slate-700 shadow-inner space-y-2 animate-[fadeIn_0.15s_ease-out]">
                                            <span className="text-xs font-bold text-gray-600 dark:text-slate-300 block">共有先を選択</span>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); shareToLine(r); }} className="bg-[#06C755] hover:bg-[#05b34c] text-white py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all">
                                                    <IconLine /> LINEで共有
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); shareToEmail(r); }} className="bg-sky-600 hover:bg-sky-700 text-white py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all">
                                                    <IconMail /> メールで共有
                                                </button>
                                            </div>
                                            <div className="flex justify-end">
                                                <button onClick={(e) => { e.stopPropagation(); setSharedRecordId(null); }} className="text-gray-500 hover:text-gray-700 text-xs px-3 py-1 font-bold">キャンセル</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ========================================== */}
                                    {/* 2段アクションツールバー（上段3・下段3 均等レイアウト） */}
                                    {/* 上段：[釣行メモ] [AIカルテ] [日報作成] */}
                                    {/* 下段：[共有]     [釣果ボード] [削除]   */}
                                    {/* ========================================== */}
                                    <div className="p-3 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-900/40 flex flex-col gap-2">
                                        
                                        {/* 【上段】均等3分割：釣行メモ ➔ AIカルテ ➔ 日報作成 */}
                                        <div className="grid grid-cols-3 gap-2 w-full">
                                            
                                            {/* 1. 船長メモ（カウンター画面と統一） */}
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); openMemoModal(r); }}
                                                className={`py-2 px-1 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1 border shadow-2xs active:scale-95 transition-all select-none ${
                                                    r.detailedMemo && r.detailedMemo.trim() !== ''
                                                        ? 'bg-amber-100/80 hover:bg-amber-200/80 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                                        : 'bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                                                }`}
                                            >
                                                <span>📝</span>
                                                <span>{r.detailedMemo && r.detailedMemo.trim() !== '' ? 'メモ済' : '船長メモ'}</span>
                                                {r.detailedMemo && r.detailedMemo.trim() !== '' && (
                                                    <span className="text-amber-600 dark:text-amber-400 font-black text-xs leading-none">✓</span>
                                                )}
                                            </button>

                                            {/* 2. AIカルテ（未分析: AIカルテ / 分析済: 分析済） */}
                                            <button
                                                type="button"
                                                disabled={analyzingRecordId === r.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (analyzingRecordId === r.id) return;
                                                    if (r.aiAnalysisResult) {
                                                        setCurrentAnalysis({ record: r, data: r.aiAnalysisResult });
                                                        setShowAnalysisModal(true);
                                                    } else {
                                                        handleRunAiAnalysis(r);
                                                    }
                                                }}
                                                className={`py-2 px-1 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1 border shadow-2xs transition-all select-none ${
                                                    analyzingRecordId === r.id
                                                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/80 cursor-wait'
                                                        : r.aiAnalysisResult
                                                        ? 'bg-amber-100/80 hover:bg-amber-200/80 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 active:scale-95'
                                                        : 'bg-white hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-emerald-700 dark:text-emerald-400 border-slate-200 dark:border-slate-700 active:scale-95'
                                                }`}
                                            >
                                                {analyzingRecordId === r.id ? (
                                                    <>
                                                        <span>分析中</span>
                                                        <span className="inline-block animate-spin text-sm leading-none ml-0.5 text-amber-600 dark:text-amber-400">↻</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>📊</span>
                                                        <span>{r.aiAnalysisResult ? '分析済' : 'AIカルテ'}</span>
                                                    </>
                                                )}
                                            </button>

                                            {/* 3. 日報作成（未作成: 日報作成 / 作成済: 日報済） */}
                                            {generatingAiId === r.id ? (
                                                <div className="py-2 px-1 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 select-none">
                                                    <span>作成中</span>
                                                    <span className="inline-block animate-spin text-sm leading-none ml-0.5 text-amber-600 dark:text-amber-400">↻</span>
                                                </div>
                                            ) : (r.aiGeneratedPatterns?.length > 0 || r.aiGeneratedText) ? (
                                                <button
                                                    type="button"
                                                    title="タップで日報表示、長押しで再作成"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setTargetRecordForAi(r);
                                                        setAiGeneratedPatterns(r.aiGeneratedPatterns || []);
                                                        setAiGeneratedText(r.aiGeneratedText || '');
                                                        setShowAiModal(true);
                                                    }}
                                                    onPointerDown={(e) => {
                                                        e.stopPropagation();
                                                        if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
                                                        aiTimerRef.current = setTimeout(() => {
                                                            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                                                                navigator.vibrate([30, 50, 30]);
                                                            }
                                                            setTargetRecordForAi(r);
                                                            setAiInputData({
                                                                condition: r.aiInput_condition || '',
                                                                scenery: r.aiInput_scenery || '',
                                                                tide: r.aiInput_tide || '',
                                                                activity: r.aiInput_activity || '',
                                                                episode: r.aiInput_episode || '',
                                                                size: r.aiInput_size || '',
                                                                topAngler: r.aiInput_topAngler || '',
                                                                patterns: r.aiInput_patterns || [1]
                                                            });
                                                            setAiCurrentStep(0);
                                                            setShowAiInputModal(true);
                                                        }, 750);
                                                    }}
                                                    onPointerUp={() => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); }}
                                                    onPointerLeave={() => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); }}
                                                    onPointerCancel={() => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); }}
                                                    className="py-2 px-1 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1 bg-amber-100/80 hover:bg-amber-200/80 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-2xs active:scale-95 transition-all select-none animate-[fadeIn_0.15s_ease-out]"
                                                >
                                                    <IconStar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                    <span>日報済</span>
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setTargetRecordForAi(r);
                                                        setAiInputData({
                                                            condition: r.aiInput_condition || '',
                                                            scenery: r.aiInput_scenery || '',
                                                            tide: r.aiInput_tide || '',
                                                            activity: r.aiInput_activity || '',
                                                            episode: r.aiInput_episode || '',
                                                            size: r.aiInput_size || '',
                                                            topAngler: r.aiInput_topAngler || '',
                                                            patterns: r.aiInput_patterns || [1]
                                                        });
                                                        setAiCurrentStep(0);
                                                        setShowAiInputModal(true);
                                                    }}
                                                    className="py-2 px-1 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1 bg-white hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all select-none"
                                                >
                                                    <span>📄</span>
                                                    <span>日報作成</span>
                                                </button>
                                            )}

                                        </div>

                                        {/* 【下段】均等3分割：共有 ➔ 釣果ボード ➔ 削除（上段と同じサイズ・規格） */}
                                        <div className="grid grid-cols-3 gap-2 w-full pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                                            
                                            {/* 1. 共有 */}
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setSharedRecordId(sharedRecordId === r.id ? null : r.id); }}
                                                className="py-2 px-1 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1 bg-white hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-blue-700 dark:text-blue-300 border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all select-none"
                                            >
                                                <IconShare className="w-3.5 h-3.5 shrink-0" />
                                                <span>共有</span>
                                            </button>

                                            {/* 2. 釣果ボード */}
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setShareImageRecord(r); }}
                                                className="py-2 px-1 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1 bg-white hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 transition-all select-none"
                                            >
                                                <IconCamera className="w-3.5 h-3.5 shrink-0" />
                                                <span>釣果ボード</span>
                                            </button>

                                            {/* 3. 削除（濃いめ灰色デザイン） */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRecordToDelete(r);
                                                }}
                                                className="py-2 px-1 rounded-xl text-xs sm:text-sm font-black text-slate-700 dark:text-slate-200 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 shadow-2xs transition-all flex items-center justify-center gap-1 select-none active:scale-95"
                                                title="この日の記録を削除"
                                            >
                                                <IconTrash className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 shrink-0" />
                                                <span>削除</span>
                                            </button>

                                        </div>

                                    </div>
                                </div>
                            );
                        })}
                        <div className="h-16 shrink-0 pointer-events-none"></div>
                    </div>
                )}
            </div>

          {/* 下部ナビゲーションバー（底面密着 ＆ 全タブ等サイズ版） */}
            <div 
                onTouchStart={handleSwipeStart}
                onTouchEnd={handleSwipeEnd}
                className={`fixed bottom-0 inset-x-0 mx-auto w-full max-w-md bg-sky-200/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-sky-300 dark:border-slate-800 z-50 flex h-14 items-center justify-around px-2 transition-transform duration-300 ease-out select-none shadow-sm ${
                    isBottomNavVisible ? 'translate-y-0' : 'translate-y-full pointer-events-none'
                }`}
            >
                {/* 1. 釣り座タブ */}
                <button
                    className={`flex-1 flex flex-col items-center justify-center h-11 py-1 rounded-xl transition-all ${
                        activeTab === 'input' 
                            ? 'bg-white dark:bg-slate-800 shadow-xs border border-sky-300/80 dark:border-slate-700' 
                            : 'hover:bg-white/40 dark:hover:bg-slate-800/40 active:scale-95'
                    }`}
                    onClick={() => setActiveTab('input')}
                >
                    <IconAnchor className={`w-5 h-5 mb-0.5 transition-colors ${
                        activeTab === 'input' 
                            ? 'text-sky-600 dark:text-sky-400' 
                            : 'text-sky-700/70 dark:text-sky-400/60'
                    }`} />
                    <span className={`text-xs tracking-tight ${
                        activeTab === 'input' 
                            ? 'font-black text-slate-900 dark:text-white' 
                            : 'font-bold text-slate-700 dark:text-slate-300'
                    }`}>
                        釣り座
                    </span>
                </button>

                {/* 2. カウンタータブ */}
                <button
                    className={`flex-1 flex flex-col items-center justify-center h-11 py-1 rounded-xl transition-all relative ${
                        activeTab === 'counter' 
                            ? 'bg-white dark:bg-slate-800 shadow-xs border border-sky-300/80 dark:border-slate-700' 
                            : 'hover:bg-white/40 dark:hover:bg-slate-800/40 active:scale-95'
                    }`}
                    onClick={() => {
                        if (activeTab === 'counter') setCounterMode(prev => prev === 'tap' ? 'slide' : prev === 'slide' ? 'keypad' : 'tap');
                        else setActiveTab('counter');
                    }}
                >
                    <div className="relative flex items-center justify-center mb-0.5">
                        <span className={`text-[10px] font-black leading-none px-2 py-0.5 rounded-full h-4.5 flex items-center justify-center shadow-2xs transition-all tracking-widest ${
                            activeTab === 'counter'
                                ? 'bg-sky-500 text-white shadow-sky-500/20'
                                : 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300/60 dark:border-sky-800'
                        }`}>
                            {counterMode === 'tap' ? 'TAP' : counterMode === 'slide' ? 'SLIDE' : 'KEYPAD'}
                        </span>
                    </div>
                    <span className={`text-xs tracking-tight ${
                        activeTab === 'counter' 
                            ? 'font-black text-slate-900 dark:text-white' 
                            : 'font-bold text-slate-700 dark:text-slate-300'
                    }`}>
                        カウンター
                    </span>
                </button>

                {/* 3. 釣果・履歴タブ（フォントサイズを他と同じ text-xs に統一） */}
                <button
                    className={`flex-1 flex flex-col items-center justify-center h-11 py-1 rounded-xl transition-all ${
                        activeTab === 'history' 
                            ? 'bg-white dark:bg-slate-800 shadow-xs border border-sky-300/80 dark:border-slate-700' 
                            : 'hover:bg-white/40 dark:hover:bg-slate-800/40 active:scale-95'
                    }`}
                    onClick={() => setActiveTab('history')}
                >
                    <IconCalendar className={`w-5 h-5 mb-0.5 transition-colors ${
                        activeTab === 'history' 
                            ? 'text-amber-500 dark:text-amber-400' 
                            : 'text-amber-600/70 dark:text-amber-400/60'
                    }`} />
                    <span className={`text-xs tracking-tight ${
                        activeTab === 'history' 
                            ? 'font-black text-slate-900 dark:text-white' 
                            : 'font-bold text-slate-700 dark:text-slate-300'
                    }`}>
                        釣果・履歴
                    </span>
                </button>

                {/* ナビバー収納ボタン */}
                <button
                    type="button"
                    onClick={() => setIsBottomNavVisible(false)}
                    className="w-8 h-full flex items-center justify-center text-sky-900/60 hover:text-sky-950 dark:text-slate-400 dark:hover:text-slate-200 active:scale-90 transition-transform shrink-0"
                    title="ナビバーを隠す"
                >
                    <span className="text-lg leading-none font-bold">⌵</span>
                </button>
            </div>

            {/* ナビバーが隠れている時の透明スワイプエリア */}
            {!isBottomNavVisible && (
                <div
                    onTouchStart={handleSwipeStart}
                    onTouchEnd={handleSwipeEnd}
                    className="fixed bottom-0 inset-x-0 mx-auto w-full max-w-md h-6 z-40 bg-transparent"
                    title="左右スワイプでタブ切り替え"
                />
            )}

            {/* ナビバーが隠れている時の復帰ボタン */}
            {!isBottomNavVisible && (
                <button
                    type="button"
                    onClick={() => setIsBottomNavVisible(true)}
                    className="fixed bottom-3 right-3 z-40 bg-sky-200 hover:bg-sky-300 text-sky-900 dark:bg-slate-800 dark:text-sky-300 rounded-full w-10 h-10 flex flex-col items-center justify-center shadow-md shadow-sky-900/15 backdrop-blur-xs border border-sky-400/80 dark:border-slate-700 active:scale-95 transition-all animate-[fadeIn_0.2s_ease-out]"
                    title="ナビバーを表示する"
                >
                    <span className="text-base font-black leading-none -mt-0.5">⌃</span>
                    <span className="text-[8px] font-black leading-none scale-90">MENU</span>
                </button>
            )}
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));