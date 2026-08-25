// innerCoinsContent.js

const DELAY_TASK = 16000; // המתנה בעמודי משימות
const MAX_PASSES = 3; // מספר סיבובים מקסימלי

const delay = ms => new Promise(res => setTimeout(res, ms));

// מאזין להודעה מקובץ הרקע כדי להציג את כפתור ההתחלה מבלי לשבש את העמוד
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startAutoCollect") {
        chrome.storage.local.set({
            matbehAli_resumeCollect: true,
            matbehAli_userStarted: false,
            matbehAli_clickedCount: 0,
            matbehAli_passCount: 1,
            matbehAli_taskTime: 0
        }, () => {
            showStartButton();
            sendResponse({ status: "SUCCESS" });
        });
        return true;
    }
});

// מנגנון הניווט (חוזר ממשימות או שורד ריענון)
window.addEventListener('load', () => {
    chrome.storage.local.get(null, (state) => {
        if (!state.matbehAli_resumeCollect) return;

        // אם המשתמש עדיין לא התחיל (למשל העמוד התרענן בגלל התחברות לחשבון)
        if (!state.matbehAli_userStarted) {
            setTimeout(showStartButton, 3000);
            return;
        }

        const isCoinPage = window.location.href.includes('coin');

        if (!isCoinPage) {
            // אנחנו בעמוד של משימה, סופרים לאחור וחוזרים לאחור
            const startTime = parseInt(state.matbehAli_taskTime || Date.now());
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, DELAY_TASK - elapsed);
            let timeLeft = Math.ceil(remaining / 1000);
            
            const indicator = showIndicator(`מטבעלי: גולש באתר... ממתין ${timeLeft} שניות`, "#D32F2F");
            
            const timer = setInterval(() => {
                timeLeft--;
                if (timeLeft > 0) {
                    if (indicator) indicator.textContent = `מטבעלי: גולש באתר... ממתין ${timeLeft} שניות`;
                } else {
                    clearInterval(timer);
                    if (indicator) indicator.textContent = "מטבעלי: חוזר לאיסוף...";
                    setTimeout(() => {
                        window.location.href = "https://m.aliexpress.com/p/coin-index/index.html";
                    }, 1000);
                }
            }, 1000);
        } else {
            // חזרנו לעמוד המטבעות אחרי משימה - ממשיכים את הריצה
            if (state.matbehAli_taskTime) {
                chrome.storage.local.set({ matbehAli_taskTime: 0 });
            }
            showIndicator("מטבעלי: חוזר להמשך סריקה...", "#166534");
            setTimeout(runAutoClicker, 5000);
        }
    });
});

function showIndicator(text, bgColor) {
    let el = document.getElementById('matbehAli-indicator');
    if (!el) {
        el = document.createElement('div');
        el.id = 'matbehAli-indicator';
        el.style.cssText = `position:fixed;top:10px;right:10px;background:${bgColor};color:#FFF;padding:10px 15px;z-index:2147483647;border-radius:8px;font-weight:bold;box-shadow:0 4px 12px rgba(0,0,0,0.2);direction:rtl;font-family:sans-serif;font-size:14px;pointer-events:none;`;
        if (document.body) document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.background = bgColor;
    el.style.display = 'block';
    return el;
}

function showStartButton() {
    const existingInd = document.getElementById('matbehAli-indicator');
    if (existingInd) existingInd.style.display = 'none';

    let btn = document.getElementById('matbehAli-start-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'matbehAli-start-btn';
        btn.innerHTML = '▶ התחל איסוף עכשיו';
        btn.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            z-index: 2147483647; background: #166534; color: #FFF; padding: 16px 30px;
            border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 6px 20px rgba(0,0,0,0.4);
            border: 3px solid #bbf7d0; cursor: pointer; direction: rtl; font-family: sans-serif;
        `;
        if (document.body) document.body.appendChild(btn);
    }

    btn.onclick = () => {
        btn.remove();
        if (existingInd) existingInd.style.display = 'block';
        chrome.storage.local.set({ matbehAli_userStarted: true }, () => {
            runAutoClicker();
        });
    };
}

function showAskDialog(message) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:2147483647;display:flex;align-items:center;justify-content:center;';

        const box = document.createElement('div');
        box.style.cssText = 'background:#FFF;padding:24px;border-radius:12px;text-align:center;width:80%;max-width:320px;direction:rtl;font-family:sans-serif;box-shadow:0 10px 30px rgba(0,0,0,0.5);';

        const msg = document.createElement('div');
        msg.textContent = message;
        msg.style.cssText = 'margin-bottom:24px;font-size:16px;font-weight:bold;color:#333;line-height:1.4;';

        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display:flex;gap:12px;justify-content:center;';

        const btnRetry = document.createElement('button');
        btnRetry.textContent = 'נסה שוב';
        btnRetry.style.cssText = 'flex:1;background:#166534;color:#FFF;border:none;padding:12px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:15px;';
        btnRetry.onclick = () => { overlay.remove(); resolve(true); };

        const btnSkip = document.createElement('button');
        btnSkip.textContent = 'דלג';
        btnSkip.style.cssText = 'flex:1;background:#D32F2F;color:#FFF;border:none;padding:12px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:15px;';
        btnSkip.onclick = () => { overlay.remove(); resolve(false); };

        btnContainer.appendChild(btnRetry);
        btnContainer.appendChild(btnSkip);
        box.appendChild(msg);
        box.appendChild(btnContainer);
        overlay.appendChild(box);
        
        if (document.body) document.body.appendChild(overlay);
    });
}

function findInnerElementsWithText(tags, validTexts) {
    const elements = Array.from(document.querySelectorAll(tags)).filter(el => {
        const txt = el.textContent.trim().toLowerCase();
        return validTexts.some(t => txt === t || txt.includes(t));
    });
    return elements.filter(el => {
        return !Array.from(el.children).some(child => {
            const childTxt = child.textContent.trim().toLowerCase();
            return validTexts.some(t => childTxt === t || childTxt.includes(t));
        });
    });
}

const getTaskButtons = () => {
    return findInnerElementsWithText('div, button, span, a', ['go', 'collect', 'claim', 'בצע', 'קבל', 'go to'])
        .filter(btn => {
            const txt = btn.textContent.trim().toUpperCase();
            return ['GO', 'COLLECT', 'CLAIM', 'בצע', 'קבל', 'GO TO'].includes(txt);
        })
        .filter(btn => !btn.classList.contains('matbeh-ali-ignored'));
};

async function openTaskDrawerWithStuckHandling() {
    while (true) {
        let openTasksBtns = findInnerElementsWithText('button, div, span, p', ['earn more coins', 'get more coins', 'get more', 'הרווח עוד', 'more coins']);
        let visibleTaskButtons = getTaskButtons();
        
        if (visibleTaskButtons.length > 0) return true;

        if (openTasksBtns.length > 0) {
            let targetBtn = openTasksBtns[openTasksBtns.length - 1]; 
            targetBtn.click();
            showIndicator("מטבעלי: מצאתי תפריט, ממתין 4 שניות...", "#166534");
            await delay(4000);
            return true;
        } else {
            const retry = await showAskDialog("לא הצלחתי למצוא את כפתור 'Earn more coins'.\nלנסות שוב או לעצור?");
            if (!retry) return false; 
        }
    }
}

async function runAutoClicker() {
    let state = await new Promise(r => chrome.storage.local.get(null, r));
    let clickedCount = parseInt(state.matbehAli_clickedCount || "0");
    let passCount = parseInt(state.matbehAli_passCount || "1");

    let drawerOpen = await openTaskDrawerWithStuckHandling();
    if (!drawerOpen) {
        await finishExecution(clickedCount);
        return;
    }

    while (passCount <= MAX_PASSES) {
        showIndicator(`מטבעלי: מתחיל סיבוב ${passCount} מתוך ${MAX_PASSES}...`, "#F59E0B");
        await delay(2000);
        
        let taskButtons = getTaskButtons();
        
        for (let i = 0; i < taskButtons.length; i++) {
            let btn = taskButtons[i];
            let btnText = btn.textContent.trim().toUpperCase();
            
            if (btn.disabled || btn.offsetParent === null) continue;

            if (['COLLECT', 'CLAIM', 'קבל'].includes(btnText)) {
                btn.click();
                clickedCount++;
                await new Promise(r => chrome.storage.local.set({ matbehAli_clickedCount: clickedCount }, r));
                
                showIndicator(`מטבעלי: נאסף מטבע! ממתין...`, "#166534");
                await delay(3000); 

                if (btn.offsetParent !== null && !btn.disabled && btn.textContent.trim().toUpperCase() === btnText) {
                    let retry = await showAskDialog("לחצתי על איסוף, אבל הכפתור לא הגיב או לא נעלם.\nלנסות שוב או לדלג לבא?");
                    if (retry) {
                        i--; 
                        continue;
                    } else {
                        btn.classList.add('matbeh-ali-ignored'); 
                    }
                }
                
                taskButtons = getTaskButtons(); 
                i = -1; 
            } 
            else if (['GO', 'בצע', 'GO TO'].includes(btnText)) {
                await new Promise(r => chrome.storage.local.set({ matbehAli_taskTime: Date.now(), matbehAli_passCount: passCount }, r));
                btn.click();
                
                showIndicator(`מטבעלי: נכנס למשימה... (ממתין 6 שניות לתגובה)`, "#D32F2F");
                await delay(6000); 
                
                await new Promise(r => chrome.storage.local.set({ matbehAli_taskTime: 0 }, r)); 
                
                if (btn.offsetParent !== null && !btn.disabled) {
                    let retry = await showAskDialog("לחצתי GO, אבל העמוד לא עבר למשימה.\nלנסות שוב או לדלג לבא?");
                    if (retry) {
                        i--; 
                        continue;
                    } else {
                        btn.classList.add('matbeh-ali-ignored'); 
                    }
                }

                taskButtons = getTaskButtons();
                i = -1;
            }
        }
        
        passCount++;
        await new Promise(r => chrome.storage.local.set({ matbehAli_passCount: passCount }, r));
    }

    await finishExecution(clickedCount);
}

async function finishExecution(clickedCount) {
    chrome.storage.local.remove([
        'matbehAli_resumeCollect', 
        'matbehAli_userStarted',
        'matbehAli_taskTime', 
        'matbehAli_clickedCount',
        'matbehAli_passCount'
    ]);
    showIndicator(`מטבעלי: סיום מוחלט! נאספו ${clickedCount} משימות. תוכל לסגור את החלון.`, "#166534");
}