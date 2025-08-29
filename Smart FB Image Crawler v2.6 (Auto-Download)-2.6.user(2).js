// ==UserScript==
// @name         Smart FB Image Crawler v2.6 (Auto-Download)
// @namespace    nyra-fb-crawler
// @version      2.6
// @description  FB crawler with CORS bypass, like filters, and auto-download for newly collected images.
// @author       Nyra (modified by Gemini)
// @match        https://*.facebook.com/*
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// ==/UserScript==

(function () {
    'use strict';
    let collectedImages = new Set();
    let isRunning = false;
    let clickCount = 0;
    let delayMs = 900;
    const maxClicks = 2000;
    // New counter for auto-downloads
    let autoDownloadCounter = 1;

    function log(msg) {
        const logBox = document.getElementById("nyra-logs");
        if (logBox) {
            logBox.value += msg + "\n";
            logBox.scrollTop = logBox.scrollHeight;
        }
        console.log("[Nyra] " + msg);
    }

    function updateStatus() {
        document.getElementById("nyra-status").innerText =
            `📷 ${collectedImages.size} images | 🔁 ${clickCount} clicks`;
        document.getElementById("nyra-progress").value = clickCount;
    }

    // New function to download a single image as it's found
    function downloadSingleImage(url) {
        const today = new Date().toISOString().split('T')[0];
        const filename = `FB-${today}_auto_${autoDownloadCounter}.jpg`;
        log(`⚡ Auto-downloading: ${filename}`);
        try {
            GM_download({
                url: url,
                name: filename,
                onerror: (err) => log(`❌ Auto-dl error: ${err.error}`),
            });
            autoDownloadCounter++;
        } catch (e) {
            log(`❌ Auto-download failed: ${e.message}`);
        }
    }


    function getCurrentImageURL() {
        const img = document.querySelector('img[src*="scontent"]');
        if (img && img.src) return img.src;
        const bgDiv = [...document.querySelectorAll('div[style*="background-image"]')]
        .find(div => div.style.backgroundImage.includes('scontent'));
        if (bgDiv) {
            const match = bgDiv.style.backgroundImage.match(/url\("([^"]+)"\)/);
            if (match) return match[1];
        }
        return null;
    }

    function highlightElement(el) {
        if (!el) return;
        el.style.outline = "2px solid red";
        setTimeout(() => (el.style.outline = ""), 400);
    }

    async function clickNextButton() {
        const tryFind = () => {
            return Array.from(document.querySelectorAll('div[role="button"][tabindex="0"]')).find(el => {
                const label = el.getAttribute('aria-label')?.toLowerCase() || '';
                const title = el.getAttribute('title')?.toLowerCase() || '';
                const combined = label + ' ' + title;
                return (
                    /next|berikut|selanjutnya|lanjut|→/.test(combined) &&
                    el.offsetParent !== null
                );
            });
        };
        for (let i = 0; i < 5; i++) {
            const btn = tryFind();
            if (btn) {
                highlightElement(btn);
                btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                btn.click();
                return true;
            }
            await new Promise(r => setTimeout(r, 300));
        }
        log("⚠️ 🔍 Next button not found after multiple attempts.");
        return false;
    }

    function getLikesCount() {
        const likeElement = document.querySelector('[aria-label*="Suka"], [aria-label*="Like"]');
        if (likeElement) {
            const text = likeElement.getAttribute('aria-label') || '';
            const match = text.match(/(\d+)/);
            if (match) return parseInt(match[1], 10);
        }
        return 0;
    }


    async function smartMacro() {
        if (isRunning) return;
        isRunning = true;
        clickCount = 0;
        log("🚀 Smart macro started...");
        for (let i = 0; i < maxClicks; i++) {
            if (!isRunning) {
                log("⛔ Macro stopped manually.");
                break;
            }
            updateStatus();
            const currentImage = getCurrentImageURL();
            if (currentImage && !collectedImages.has(currentImage)) {
                const likesFilterEnabled = document.getElementById('nyra-likes-filter')?.checked;
                const likesCount = getLikesCount();
                const minLikes = parseInt(document.getElementById('nyra-min-likes')?.value || "0");
                const maxLikes = parseInt(document.getElementById('nyra-max-likes')?.value || "999999");
                const withinRange = likesCount >= minLikes && likesCount <= maxLikes;

                if (!likesFilterEnabled || withinRange) {
                    collectedImages.add(currentImage);
                    log(`📸 ${collectedImages.size}: ${currentImage} (Likes: ${likesCount})`);

                    // *** MODIFICATION START ***
                    // Check if auto-download is enabled and trigger it
                    const autoDownloadEnabled = document.getElementById('nyra-auto-download')?.checked;
                    if (autoDownloadEnabled) {
                        downloadSingleImage(currentImage);
                    }
                    // *** MODIFICATION END ***

                } else {
                    log(`⏩ Skipped (Likes: ${likesCount} out of range)`);
                }
            } else if (currentImage) {
                log(`⚠️ Skipped duplicate: ${currentImage}`);
            }


            const clicked = await clickNextButton();
            if (!clicked) break;
            clickCount++;
            updateStatus();
            await new Promise(res => setTimeout(res, delayMs));
        }
        isRunning = false;
        log("✅ Macro complete.");
    }

    // CORS bypass using GM_xmlhttpRequest
    function fetchImageWithGM(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'blob',
                onload: function(response) {
                    if (response.status === 200) {
                        resolve(response.response);
                    } else {
                        reject(new Error(`HTTP ${response.status}`));
                    }
                },
                onerror: function() {
                    reject(new Error('Network error'));
                }
            });
        });
    }

    async function downloadAll() {
        const today = new Date().toISOString().split('T')[0];
        const downloadMode = document.querySelector('input[name="download-mode"]:checked')?.value || 'individual';

        if (collectedImages.size === 0) {
            log("❌ No images collected yet. Run the crawler first!");
            return;
        }

        if (downloadMode === 'individual') {
            // Individual downloads using GM_download
            log(`⬇️ Downloading ${collectedImages.size} images individually...`);
            let i = 1;
            for (const url of collectedImages) {
                try {
                    if (i > 1) await new Promise(r => setTimeout(r, 200));
                    GM_download({
                        url: url,
                        name: `FB-${today}_image_${i}.jpg`
                    });
                    if (i % 10 === 0) {
                        log(`📥 Queued ${i}/${collectedImages.size} downloads...`);
                    }
                    i++;
                } catch (error) {
                    log(`❌ Failed to download image ${i}: ${error.message}`);
                    i++;
                }
            }
            log(`✅ Individual downloads queued.`);

        } else if (downloadMode === 'zip-gm') {
            // ZIP using GM_xmlhttpRequest to bypass CORS
            log(`📦 Creating ZIP using CORS bypass for ${collectedImages.size} images...`);

            try {
                const zip = new JSZip();
                let completed = 0;
                let failed = 0;

                // Process images with GM_xmlhttpRequest
                for (const [index, url] of Array.from(collectedImages).entries()) {
                    const filename = `FB-${today}_image_${index + 1}.jpg`;
                    try {
                        log(`📥 Fetching with CORS bypass: ${filename}...`);
                        const blob = await fetchImageWithGM(url);

                        zip.file(filename, blob);
                        completed++;

                        if (completed % 5 === 0) {
                            log(`📥 Added ${completed}/${collectedImages.size} to ZIP...`);
                        }

                        // Small delay to avoid overwhelming
                        await new Promise(r => setTimeout(r, 150));

                    } catch (error) {
                        failed++;
                        log(`❌ Failed: ${filename} - ${error.message}`);
                    }
                }

                if (completed === 0) {
                    log("❌ No images were successfully added to ZIP!");
                    return;
                }

                log(`📦 Generating ZIP file with ${completed} images...`);
                const content = await zip.generateAsync({
                    type: "blob",
                    compression: "DEFLATE",
                    compressionOptions: { level: 1 }
                });

                const zipName = `FB-${today}_images_${completed}pics.zip`;

                // Try multiple download methods
                log("📥 Attempting ZIP download...");

                // Method 1: Try GM_download with blob
                try {
                    const blobUrl = URL.createObjectURL(content);
                    GM_download({
                        url: blobUrl,
                        name: zipName
                    });
                    log(`✅ ZIP download started via GM_download: ${zipName}`);
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                } catch (gmError) {
                    log(`⚠️ GM_download failed: ${gmError.message}`);

                    // Method 2: Fallback to regular download link
                    const url = URL.createObjectURL(content);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = zipName;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                    log(`✅ ZIP download started via fallback: ${zipName}`);
                }

                log(`📊 Summary: ${completed} images, ${failed} failed`);

            } catch (error) {
                log(`❌ ZIP creation failed: ${error.message}`);
                log("🔄 Try individual downloads instead.");
            }

        } else if (downloadMode === 'urls') {
            // Export URLs for external download managers
            const urlList = Array.from(collectedImages).map((url, index) =>
                                                            `${url}`
            ).join('\n');

            const textContent = `# Facebook Images Collected on ${today}\n` +
                `# Total: ${collectedImages.size} images\n` +
                `# Use with download managers like wget, aria2, or browser extensions\n\n` +
                urlList;

            const blob = new Blob([textContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `FB-${today}_image_urls.txt`;
            link.click();
            URL.revokeObjectURL(url);

            log(`✅ URL list saved: FB-${today}_image_urls.txt`);
            log(`📋 Use with download managers for batch downloading`);
        }
    }

    function resetEverything() {
        collectedImages.clear();
        clickCount = 0;
        isRunning = false;
        // *** MODIFICATION ***
        autoDownloadCounter = 1; // Reset counter
        document.getElementById("nyra-logs").value = "";
        updateStatus();
        log("🔄 Cache, logs, and counters reset.");
    }

    function stopMacro() {
        isRunning = false;
        log("⛔ Stop requested. Will halt after current iteration.");
    }

    function createUI() {
        const panel = document.createElement("div");
        panel.id = "nyra-panel";
        panel.innerHTML = `
    <div id="nyra-header" style="cursor:move;user-select:none;font-weight:bold;">
        📷 Nyra FB Crawler v2.6
        <button id="nyra-minimize" style="float:right;">🗕</button>
    </div>
    <div id="nyra-body">
        <small style="color:#666;">CORS bypass, like filters, and auto-download.</small><br/>
        <button id="nyra-start" style="margin-top:6px;">▶️ Start</button>
        <button id="nyra-stop">⛔ Stop</button>
        <button id="nyra-reset">🔄 Reset</button>
        <button id="nyra-download">⬇️ Download All</button>
        <br/><br/>
        <label for="nyra-delay">⚙️ Delay: <span id="nyra-delay-value">${delayMs}ms</span></label><br/>
        <input type="range" id="nyra-delay" min="200" max="2000" step="100" value="${delayMs}" style="width:100%"><br/>
        <br/>

        <label><input type="checkbox" id="nyra-auto-download"> <b>⚡ Auto-Download New Images</b></label><br/><br/>

        <label><input type="checkbox" id="nyra-likes-filter"> Enable Likes Filter</label><br/>
        <label>Min Likes: <span id="nyra-min-likes-value">100</span></label>
        <input type="range" id="nyra-min-likes" min="0" max="5000" step="10" value="100" style="width:100%"><br/>
        <label>Max Likes: <span id="nyra-max-likes-value">1000</span></label>
        <input type="range" id="nyra-max-likes" min="0" max="5000" step="10" value="1000" style="width:100%"><br/>
        <fieldset style="margin:8px 0; padding:8px;">
            <legend><b>Manual Download Mode:</b></legend>
            <label><input type="radio" name="download-mode" value="individual" checked> 📁 Individual files</label><br/>
            <label><input type="radio" name="download-mode" value="zip-gm"> 📦 ZIP (CORS bypass)</label><br/>
            <label><input type="radio" name="download-mode" value="urls"> 📋 URL list</label>
        </fieldset>

        <div id="nyra-status">📷 0 images | 🔁 0 clicks</div>
        <progress id="nyra-progress" value="0" max="${maxClicks}" style="width:100%"></progress>
        <textarea id="nyra-logs" style="margin-top:10px;width:100%;height:180px;font-size:11px;"></textarea>
    </div>`;

        // === Styles ===
        Object.assign(panel.style, {
            position: 'fixed',
            top: '10px',
            left: '10px',
            zIndex: 99999,
            background: '#fff',
            border: '2px solid #000',
            borderRadius: '10px',
            fontFamily: 'sans-serif',
            width: '420px',
            boxShadow: '2px 2px 10px rgba(0,0,0,0.3)',
            padding: '10px',
            transition: 'all 0.3s ease'
        });

        document.body.appendChild(panel);
        document.getElementById("nyra-min-likes").oninput = function () {
            document.getElementById("nyra-min-likes-value").textContent = this.value;
        };
        document.getElementById("nyra-max-likes").oninput = function () {
            document.getElementById("nyra-max-likes-value").textContent = this.value;
        };



        // === Drag & Dock ===
        let isDragging = false, offsetX = 0, offsetY = 0;
        const header = document.getElementById("nyra-header");

        header.onmousedown = function (e) {
            isDragging = true;
            offsetX = e.clientX - panel.offsetLeft;
            offsetY = e.clientY - panel.offsetTop;
            document.body.style.userSelect = "none";
        };

        document.onmousemove = function (e) {
            if (isDragging) {
                const newX = e.clientX - offsetX;
                const newY = e.clientY - offsetY;
                panel.style.left = `${newX}px`;
                panel.style.top = `${newY}px`;
            }
        };

        document.onmouseup = function () {
            if (isDragging) {
                isDragging = false;
                document.body.style.userSelect = "auto";

                // Dock to nearest edge
                const margin = 20;
                const winW = window.innerWidth;
                const winH = window.innerHeight;
                const pW = panel.offsetWidth;
                const pH = panel.offsetHeight;

                const left = panel.offsetLeft;
                const top = panel.offsetTop;

                // Snap horizontally
                if (left < winW / 2) panel.style.left = `${margin}px`;
                else panel.style.left = `${winW - pW - margin}px`;

                // Snap vertically
                if (top < margin) panel.style.top = `${margin}px`;
                else if (top + pH > winH - margin) panel.style.top = `${winH - pH - margin}px`;
            }
        };

        
        // === Minimize/Expand (starts minimized by default) ===
        const body = document.getElementById("nyra-body");
        const minimizeBtn = document.getElementById("nyra-minimize");

        function applyMinimized(min) {
            if (min) {
                body.style.display = "none";
                minimizeBtn.textContent = "🗖";
                panel.style.width = "100px";
            } else {
                body.style.display = "block";
                minimizeBtn.textContent = "🗕";
                panel.style.width = "420px";
            }
        }

        // Default to minimized on first run; persist user choice afterward
        (function initMinimizeState(){
            const saved = localStorage.getItem("nyraMinimized");
            const shouldMinimize = (saved === null) ? true : (saved === "1");
            applyMinimized(shouldMinimize);
        })();

        minimizeBtn.onclick = function () {
            const isHidden = body.style.display === "none";
            // Toggle
            applyMinimized(!isHidden);
            // Save preference
            localStorage.setItem("nyraMinimized", (!isHidden) ? "1" : "0");
        };

        // === Buttons + Slider ===
        document.getElementById("nyra-start").onclick = smartMacro;
        document.getElementById("nyra-stop").onclick = stopMacro;
        document.getElementById("nyra-reset").onclick = resetEverything;
        document.getElementById("nyra-download").onclick = downloadAll;

        const delaySlider = document.getElementById("nyra-delay");
        const delayLabel = document.getElementById("nyra-delay-value");
        delaySlider.oninput = function () {
            delayMs = parseInt(this.value);
            delayLabel.textContent = `${delayMs}ms`;
        };
    }


    window.addEventListener("load", () => {
        setTimeout(() => {
            createUI();
            log("🟢 Nyra ready with Auto-Download feature!");
            log("🎯 CORS issue identified and bypassed!");
            log("📦 ZIP mode now uses GM_xmlhttpRequest for protection.");
            log("💡 Enable Auto-Download or use the manual download button.");
        }, 2000);
    });
})();