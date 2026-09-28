// ==========================================
// report.js : 詳細メモ・AI日報ウィザード・多角分析モーダル群
// ==========================================

// 詳細メモモーダル
const MemoModal = ({
    showMemoModal,
    setShowMemoModal,
    tempMemo,
    setTempMemo,
    copyMemoToClipboard,
    saveMemo
}) => {
    if (!showMemoModal) return null;

    return (
        <div className="fixed inset-0 z-[110] flex flex-col justify-end items-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMemoModal(false)}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col h-[85vh] animate-slideUpModal overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-indigo-50 dark:bg-slate-800 rounded-t-3xl shrink-0">
                    <h2 className="text-base font-black text-indigo-800 dark:text-indigo-400 flex items-center">
                        📝 詳細メモ・釣行メモ
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={copyMemoToClipboard} className="bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg text-xs font-bold border shadow-sm active:bg-indigo-50">コピー</button>
                        <button onClick={() => setShowMemoModal(false)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-full font-bold shadow-sm text-gray-500">✕</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-slate-900/50 space-y-3 flex flex-col">
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-bold shrink-0">
                        当日の詳細な状況、仕掛け、ヒットパターン、お客様の様子などを自由に記録できます。
                    </p>
                    <textarea
                        className="w-full flex-1 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm font-medium text-gray-800 dark:text-slate-100 resize-none shadow-inner"
                        placeholder="ここに自由にメモを入力してください..."
                        value={tempMemo}
                        onChange={(e) => setTempMemo(e.target.value)}
                        autoFocus
                    ></textarea>
                </div>
                <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 pb-safe shrink-0 flex gap-2">
                    <button onClick={saveMemo} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl shadow-md active:bg-indigo-800 transition-colors flex justify-center items-center text-sm">
                        メモを保存して閉じる
                    </button>
                </div>
            </div>
        </div>
    );
};

// =======================================================
// AI日報用インタビューウィザードモーダル（船長専用クイックチップ・文字拡大版）
// =======================================================

// 各ステップでパッと選べる単語タグ（クイックチップ）
const WIZARD_TAGS = {
    scenery: [
        "ベタ凪", "穏やかなナギ",  "心地よい風",  "風波強く荒天",
        "ソヨソヨ", "風波パチャつく", "うねり残る", "肌寒いスタート", 
        "ポカポカ陽気", "爽快な青空", "どんより曇天", "小雨混じり"
    ],
    tide: [
        "トロリ流れる", "トロトロ", "適度に流れる", "ピリッと効いた", 
        "潮かっ飛ぶ", "上潮だけ速い", "二枚潮", "底潮動かず", 
        "潮止まり", "素直な好潮", "たるい流れ", "終日動かず"
    ],
    activity: [
        "朝イチ連発", "中盤から加速", "拾い釣り", "一日ポツポツ継続", 
        "食い渋り", "アタリ遠い",  "エサ取り活発", "お土産十分"
    ],
    episode: [
        "一荷（ダブル）","ダブル・トリプル",  "良型交じり", "ゲスト多彩", 
        "沖上がり間際に好調", "初挑戦健闘",  "特大サイズ浮上"
    ],
    size: [
        "良型主体", "中型揃い", "大小交じり", "中小型交じり", 
        "小型・ワッペン交じり", "型揃い", "サイズまちまち"
    ],
    topAngler: [
        "スローな誘い", "長めのステイ", "底から1m浮かせ", "ベタ底キープ", 
        "手返しの早さ", "マメなエサ付け", "微細アタリ感知", "ちょい宙"
    ]
};

const AiInputWizardModal = ({
    showAiInputModal,
    setShowAiInputModal,
    aiCurrentStep,
    setAiCurrentStep,
    wizardSteps,
    aiInputData,
    setAiInputData,
    targetRecordForAi,
    updateAiInputForRecord,
    userApiKey,
    setUserApiKey,
    handleAiGenerate
}) => {
    if (!showAiInputModal) return null;

    const currentStep = wizardSteps[aiCurrentStep];
    const currentTags = WIZARD_TAGS[currentStep.id] || [];

    // タグをタップして入力欄へ追加する関数
    const handleAddTag = (tagText) => {
        const fieldKey = currentStep.id;
        const currentVal = aiInputData[fieldKey] || '';
        let newVal = '';
        if (!currentVal.trim()) {
            newVal = tagText;
        } else if (currentVal.endsWith('、') || currentVal.endsWith('。') || currentVal.endsWith(' ')) {
            newVal = `${currentVal}${tagText}`;
        } else {
            newVal = `${currentVal}、${tagText}`;
        }

        setAiInputData(prev => ({ ...prev, [fieldKey]: newVal }));
        if (targetRecordForAi) {
            updateAiInputForRecord(targetRecordForAi.id, fieldKey, newVal);
        }

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(15);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex flex-col justify-end items-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAiInputModal(false)}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col h-[90vh] animate-slideUpModal overflow-hidden">
                
                {/* ヘッダー */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-amber-50 dark:bg-slate-800 rounded-t-3xl shrink-0">
                    <div className="flex flex-col">
                        <h2 className="text-lg font-black text-amber-800 dark:text-amber-400 flex items-center">
                            <IconStar className="w-5 h-5 mr-1 text-amber-500" /> 日報用インタビュー
                        </h2>
                        <span className="text-xs font-bold text-amber-600/70 dark:text-amber-400/70 mt-0.5">ステップ {aiCurrentStep + 1} / {wizardSteps.length}</span>
                    </div>
                    <button onClick={() => setShowAiInputModal(false)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-full shadow-sm text-gray-500 font-bold active:bg-gray-100 transition-colors">✕</button>
                </div>

                {/* メインエリア */}
                <div className="flex-1 overflow-y-auto p-4 no-scrollbar flex flex-col">
                    <div className="flex-1 flex flex-col space-y-3 animate-[fadeIn_0.2s_ease-out]">
                        <div className="mb-1 shrink-0">
                            <h3 className="text-base sm:text-lg font-black text-gray-800 dark:text-slate-100 mb-1">{currentStep.title}</h3>
                            <p className="text-xs sm:text-sm font-bold text-gray-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{currentStep.desc}</p>
                        </div>

                        {/* 1. パターン選択（Step 8: 複数選択・文字拡大版） */}
                        {currentStep.isMultiSelect ? (
                            <div className="flex flex-col gap-2 flex-1 overflow-y-auto no-scrollbar pr-0.5">
                                {currentStep.options.map((opt) => {
                                    const isSelected = (aiInputData.patterns || []).includes(opt.id);
                                    return (
                                        <button key={opt.id} onClick={() => {
                                            let next = [...(aiInputData.patterns || [])];
                                            if (isSelected) {
                                                next = next.filter(id => id !== opt.id);
                                                if (next.length === 0) next = [opt.id];
                                            } else {
                                                next.push(opt.id);
                                                next.sort((a,b) => a - b);
                                            }
                                            setAiInputData(prev => ({ ...prev, patterns: next }));
                                            if(targetRecordForAi) updateAiInputForRecord(targetRecordForAi.id, 'patterns', next);
                                        }} className={`p-3.5 rounded-xl border-2 text-left font-black transition-all ${isSelected ? 'bg-amber-100 border-amber-500 text-amber-900 dark:bg-amber-900/40 dark:border-amber-500 dark:text-amber-100' : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'} flex items-center justify-between`}>
                                            {/* 文字サイズを text-sm sm:text-base へ拡大 */}
                                            <span className="text-sm sm:text-base leading-snug pr-2">{opt.label}</span>
                                            <span className="text-xl shrink-0">{isSelected ? '☑' : '☐'}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : currentStep.isSelect ? (
                            /* 2. 釣況選択（単一選択） */
                            <div className="flex flex-col gap-2 my-auto">
                                {currentStep.options.map((opt, i) => (
                                    <button key={i} onClick={() => {
                                        setAiInputData(prev => ({ ...prev, [currentStep.id]: opt }));
                                        if (targetRecordForAi) updateAiInputForRecord(targetRecordForAi.id, currentStep.id, opt);
                                        setTimeout(() => setAiCurrentStep(prev => prev + 1), 200);
                                    }} className={`p-4 rounded-xl border-2 text-left font-black text-base sm:text-lg transition-all ${aiInputData[currentStep.id] === opt ? 'bg-amber-100 border-amber-500 text-amber-900 dark:bg-amber-900/40 dark:border-amber-500 dark:text-amber-100' : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'}`}>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            /* 3. 自由記述 ＋ クイックチップ（Step 2〜7: 入力欄・チップ文字拡大版） */
                            <div className="flex-1 flex flex-col min-h-0 gap-3">
                                {/* テキスト入力欄：文字サイズを text-base sm:text-lg へ拡大 */}
                                <div className="flex-1 min-h-[140px]">
                                    <textarea
                                        placeholder={currentStep.placeholder}
                                        className="w-full h-full border-2 border-gray-200 dark:border-slate-700 rounded-2xl p-3.5 bg-gray-50 dark:bg-slate-800 text-base sm:text-lg font-bold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none shadow-inner leading-relaxed"
                                        value={aiInputData[currentStep.id] || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setAiInputData(prev => ({ ...prev, [currentStep.id]: val }));
                                            if(targetRecordForAi) updateAiInputForRecord(targetRecordForAi.id, currentStep.id, val);
                                        }}
                                        autoFocus
                                    ></textarea>
                                </div>

                                {/* クイックチップ群：チップ文字を text-sm sm:text-base へ拡大 */}
                                {currentTags.length > 0 && (
                                    <div className="shrink-0 pt-1">
                                        <div className="text-xs sm:text-sm font-black text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                                            <span>🏷️</span>
                                            <span>タップで入力（単語チップ）：</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto no-scrollbar py-0.5">
                                            {currentTags.map((tag, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => handleAddTag(tag)}
                                                    className="px-3 py-2 rounded-xl border border-amber-200 dark:border-slate-700 bg-amber-50/70 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm sm:text-base font-bold text-amber-950 dark:text-amber-200 active:scale-95 transition-all shadow-2xs flex items-center gap-1.5"
                                                >
                                                    <span className="text-amber-600 dark:text-amber-400 font-black text-xs">＋</span>
                                                    <span>{tag}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 最後のステップのAPIキー入力 */}
                    {aiCurrentStep === wizardSteps.length - 1 && (
                        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700 shrink-0">
                            <label className="text-xs font-black text-gray-500 dark:text-slate-400 flex justify-between items-center mb-1">
                                <span>🔑 Gemini APIキー</span>
                                {userApiKey.trim() && <span className="text-[10px] font-bold text-emerald-500">✓ 入力済</span>}
                            </label>
                            <input type="password" placeholder="APIキー" className="w-full border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-gray-50 dark:bg-slate-800 text-sm font-medium text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-200" value={userApiKey} onChange={(e) => { setUserApiKey(e.target.value); localStorage.setItem('fishing_api_key', e.target.value); }} />
                        </div>
                    )}
                </div>

                {/* モーダルフッター */}
                <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 pb-safe shrink-0 flex gap-2">
                    {aiCurrentStep > 0 && (
                        <button onClick={() => setAiCurrentStep(prev => prev - 1)} className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 font-black py-3 rounded-xl shadow-sm flex justify-center items-center text-sm">
                            <IconChevronLeft className="w-4 h-4 mr-1" /> 戻る
                        </button>
                    )}
                    {aiCurrentStep < wizardSteps.length - 1 ? (
                        <button onClick={() => setAiCurrentStep(prev => prev + 1)} className="flex-[2] bg-amber-500 dark:bg-amber-600 text-white font-black py-3 rounded-xl shadow-md flex justify-center items-center text-sm">
                            次へ <IconChevronRight className="w-4 h-4 ml-1" />
                        </button>
                    ) : (
                        <button onClick={() => {
                            setShowAiInputModal(false);
                            handleAiGenerate(
                                targetRecordForAi,
                                aiInputData.condition,
                                aiInputData.scenery,
                                aiInputData.tide,
                                aiInputData.activity,
                                aiInputData.episode,
                                aiInputData.size,
                                aiInputData.topAngler,
                                aiInputData.patterns,
                                userApiKey
                            );
                        }} className="flex-[2] bg-amber-500 dark:bg-amber-600 text-white font-black py-3 rounded-xl shadow-md flex justify-center items-center text-sm">
                            文章を作成する
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// AI日報表示モーダル
const AiResultModal = ({
    showAiModal,
    setShowAiModal,
    aiGeneratedPatterns,
    aiGeneratedText,
    handleCopyPattern
}) => {
    if (!showAiModal) return null;

    return (
        <div className="fixed inset-0 z-[110] flex flex-col justify-end items-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAiModal(false)}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col h-[85vh] animate-slideUpModal">
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-amber-50 dark:bg-slate-800 rounded-t-3xl shrink-0">
                    <h2 className="text-lg font-black text-amber-800 dark:text-amber-400 flex items-center">
                        <IconStar className="w-5 h-5 mr-1 text-amber-500" /> AI釣行日報
                    </h2>
                    <button onClick={() => setShowAiModal(false)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-full shadow-sm text-gray-500 font-bold">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-slate-900/50 space-y-4 font-medium">
                    {aiGeneratedPatterns.length > 0 ? (
                        aiGeneratedPatterns.map((pattern, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                                <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100 dark:border-slate-700">
                                    <h3 className="font-bold text-sky-700 dark:text-sky-400 text-sm leading-tight pr-2">{pattern.title}</h3>
                                    <button onClick={() => handleCopyPattern(pattern.content)} className="bg-sky-100 text-sky-600 dark:bg-slate-700 dark:text-sky-400 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0">コピー</button>
                                </div>
                                <p className="text-gray-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{pattern.content}</p>
                            </div>
                        ))
                    ) : (
                        <textarea readOnly className="w-full h-full min-h-[500px] bg-transparent resize-none focus:outline-none text-gray-800 dark:text-slate-200 leading-relaxed font-medium" value={aiGeneratedText}></textarea>
                    )}
                </div>
                <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 pb-safe shrink-0">
                    <button onClick={() => setShowAiModal(false)} className="w-full bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 font-black py-3 rounded-xl shadow-sm flex justify-center items-center text-base">
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
};

// AI多角分析カルテモーダル
const AiAnalysisModal = ({
    showAnalysisModal,
    setShowAnalysisModal,
    currentAnalysis,
    handleRunAiAnalysis,
    copyAnalysisText,
    handleCopyPattern
}) => {
    if (!showAnalysisModal || !currentAnalysis) return null;

    return (
        <div className="fixed inset-0 z-[120] flex flex-col justify-end items-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAnalysisModal(false)}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col h-[85vh] animate-slideUpModal overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-emerald-50 dark:bg-slate-800 rounded-t-3xl shrink-0">
                    <h2 className="text-base font-black text-emerald-800 dark:text-emerald-400 flex items-center">
                        <IconChart className="w-5 h-5 mr-1.5" /> AI釣況・多角分析カルテ
                    </h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                if (window.confirm(`${currentAnalysis.record.date} の釣況・メモデータをもとに再分析を実行しますか？`)) {
                                    handleRunAiAnalysis(currentAnalysis.record);
                                }
                            }} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm active:bg-emerald-800 flex items-center gap-1"
                        >
                            <span>🔄</span> 再分析
                        </button>
                        <button onClick={copyAnalysisText} className="bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-lg text-xs font-bold border shadow-sm">コピー</button>
                        <button onClick={() => setShowAnalysisModal(false)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-full font-bold shadow-sm">✕</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                    {/* 難易度判定 */}
                    <div className="bg-emerald-100/60 dark:bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 block mb-1">📊 釣況難易度判定</span>
                        <p className="font-black text-sm text-gray-800 dark:text-slate-100">{currentAnalysis.data.difficulty}</p>
                    </div>

                    {/* トータル状況日報（総括文章 約400字） */}
                    {currentAnalysis.data.totalSummaryReport && (
                        <div className="bg-gradient-to-br from-amber-50 via-white to-amber-50/40 dark:from-slate-800 dark:via-slate-800/90 dark:to-amber-950/20 p-4 rounded-xl border-2 border-amber-300 dark:border-amber-700/60 shadow-md space-y-2">
                            <div className="flex justify-between items-center border-b border-amber-200/80 dark:border-slate-700 pb-2">
                                <h4 className="text-xs font-black text-amber-800 dark:text-amber-400 flex items-center">
                                    <IconStar className="w-4 h-4 mr-1 text-amber-500" /> 📝 トータル状況日報（公式HP・日報用 400字要約）
                                </h4>
                                <button 
                                    onClick={() => handleCopyPattern(currentAnalysis.data.totalSummaryReport)} 
                                    className="bg-amber-100 dark:bg-slate-700 hover:bg-amber-200 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-lg text-xs font-black shrink-0 border border-amber-300 dark:border-slate-600 active:scale-95 transition-all"
                                >
                                    日報をコピー
                                </button>
                            </div>
                            <p className="text-xs sm:text-sm leading-relaxed text-gray-800 dark:text-slate-200 font-medium whitespace-pre-wrap pt-0.5">
                                {currentAnalysis.data.totalSummaryReport}
                            </p>
                        </div>
                    )}

                    {/* 釣り座・座席バイアス分析 */}
                    <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-1.5">
                        <h4 className="text-xs font-black text-sky-600 dark:text-sky-400 flex items-center">🧭 釣り座・座席バイアス分析</h4>
                        <p className="text-xs leading-relaxed text-gray-700 dark:text-slate-300 font-medium">{currentAnalysis.data.seatBiasAnalysis}</p>
                    </div>

                    {/* 海況・潮時相関分析 */}
                    <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-1.5">
                        <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 flex items-center">🌊 海況・潮時相関分析</h4>
                        <p className="text-xs leading-relaxed text-gray-700 dark:text-slate-300 font-medium">{currentAnalysis.data.environmentCorrelation}</p>
                    </div>

                    {/* 竿頭の勝因・テクニカル考察 */}
                    <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-1.5">
                        <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center">👑 竿頭の勝因・テクニカル考察</h4>
                        <p className="text-xs leading-relaxed text-gray-700 dark:text-slate-300 font-medium">{currentAnalysis.data.topAnglerFactors}</p>
                    </div>

                    {/* 次回攻略へのアドバイス＆船長カルテ */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm space-y-1.5">
                        <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center">💡 次回攻略へのアドバイス＆船長カルテ</h4>
                        <p className="text-xs leading-relaxed text-gray-800 dark:text-slate-200 font-bold">{currentAnalysis.data.captainAdvice}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

window.MemoModal = MemoModal;
window.AiInputWizardModal = AiInputWizardModal;
window.AiResultModal = AiResultModal;
window.AiAnalysisModal = AiAnalysisModal;