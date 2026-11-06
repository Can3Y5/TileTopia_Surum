/**
 * TileTopia - GitHub Otomatik Güncelleme Motoru (Game Updater)
 * Hedef Güncelleme Deposu: https://github.com/Can3Y5/TileTopia_Surum
 */

export const CURRENT_GAME_VERSION = "1.0.2";

export class GameUpdater {
    constructor(version = CURRENT_GAME_VERSION) {
        this.currentVersion = version;
        this.updateRepo = "Can3Y5/TileTopia_Surum";
        this.versionJsonUrl = `https://raw.githubusercontent.com/${this.updateRepo}/main/version.json`;
        this.releasesApiUrl = `https://api.github.com/repos/${this.updateRepo}/releases/latest`;
        this.latestReleaseData = null;
        this.hasUpdate = false;
    }

    /**
     * Kullanıcının çalıştığı platformu tespit eder (Android, Windows, Web)
     */
    detectPlatform() {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('android')) return 'android';
        if (ua.includes('windows') || ua.includes('win32') || ua.includes('win64')) return 'windows';
        return 'web';
    }

    /**
     * Sürüm numaralarını karşılaştırır (örn: 1.0.2 > 1.0.1)
     */
    compareVersions(vNew, vCurrent) {
        if (!vNew || !vCurrent) return 0;
        const pNew = vNew.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
        const pCur = vCurrent.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);

        for (let i = 0; i < Math.max(pNew.length, pCur.length); i++) {
            const a = pNew[i] || 0;
            const b = pCur[i] || 0;
            if (a > b) return 1;
            if (a < b) return -1;
        }
        return 0;
    }

    /**
     * Güncellemeleri kontrol eder
     * silent: false ise bildirim toast'u basar
     */
    async checkForUpdates(silent = true) {
        try {
            let updateFound = false;
            let updateInfo = null;

            // 1. Önce raw version.json dosyasını kontrol et (en hızlı ve API limitsiz)
            try {
                const res = await fetch(`${this.versionJsonUrl}?t=${Date.now()}`);
                if (res.ok) {
                    const data = await res.json();
                    if (this.compareVersions(data.version, this.currentVersion) > 0) {
                        updateFound = true;
                        updateInfo = data;
                    }
                }
            } catch (e) {
                // version.json fallback
            }

            // 2. Ardından GitHub Releases API kontrolü
            if (!updateFound) {
                try {
                    const apiRes = await fetch(this.releasesApiUrl);
                    if (apiRes.ok) {
                        const release = await apiRes.json();
                        const latestTag = release.tag_name || release.name || "";
                        if (this.compareVersions(latestTag, this.currentVersion) > 0) {
                            updateFound = true;
                            const platform = this.detectPlatform();
                            let downloadUrl = release.html_url;

                            if (release.assets && release.assets.length > 0) {
                                const targetExt = platform === 'android' ? '.apk' : (platform === 'windows' ? '.exe' : '');
                                const match = release.assets.find(a => a.name.toLowerCase().endsWith(targetExt));
                                if (match) downloadUrl = match.browser_download_url;
                            }

                            updateInfo = {
                                version: latestTag,
                                releaseNotes: release.body || "Yeni özellikler ve görsel iyileştirmeler.",
                                apkUrl: downloadUrl,
                                exeUrl: downloadUrl
                            };
                        }
                    }
                } catch (e) {
                    // GitHub API fallback
                }
            }

            this.hasUpdate = updateFound;
            this.latestReleaseData = updateInfo;

            // Ana Ekrandaki (Title Screen) Güncelleme Kartını Güncelle
            this.renderMainMenuUpdateSection(updateFound, updateInfo);

            if (updateFound) {
                // Eğer daha önce bu sürümü "Daha Sonra" diyerek ertelediyse ve silent ise açılır pencere gösterme
                const dismissed = localStorage.getItem('tiletopia_dismissed_update');
                if (!silent || dismissed !== updateInfo.version) {
                    this.showUpdateDialog(updateInfo);
                }
                return true;
            } else {
                if (!silent) {
                    this.showToast(`✓ TileTopia en güncel sürümde! (v${this.currentVersion})`);
                }
                return false;
            }
        } catch (err) {
            console.warn("Güncelleme kontrolü yapılamadı:", err);
            if (!silent) {
                this.showToast("Güncelleme sunucusuna erişilemedi.");
            }
            return false;
        }
    }

    /**
     * Ana Ekrandaki (Title Screen) Güncelleme Paneli DOM Bileşeni
     */
    renderMainMenuUpdateSection(updateFound, info) {
        const container = document.getElementById('main-menu-update-card');
        if (!container) return;

        const curVerEl = document.getElementById('main-current-version');
        if (curVerEl) curVerEl.textContent = `v${this.currentVersion}`;

        if (updateFound && info) {
            const platform = this.detectPlatform();
            const downloadUrl = platform === 'android' ? (info.apkUrl || info.exeUrl) : (info.exeUrl || info.apkUrl);
            const btnText = platform === 'android' ? "📲 Yeni APK'yı İndir" : (platform === 'windows' ? "💻 Yeni EXE'yi İndir" : "🔄 Şimdi Güncelle");

            container.innerHTML = `
                <div class="update-alert-card active">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                        <span style="font-weight: 700; color: #ff7675; display: flex; align-items: center; gap: 6px;">
                            🚀 Yeni Güncelleme: <span style="color: #55efc4;">${info.version}</span>
                        </span>
                        <span style="font-size: 11px; color: rgba(255,255,255,0.6);">(Şu anki: v${this.currentVersion})</span>
                    </div>
                    <div class="patch-notes-box">
                        ${info.releaseNotes || 'Yeni kabile binaları, gelişmiş savaşçı başlıkları ve can barları eklendi.'}
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 10px;">
                        <a href="${downloadUrl}" target="_blank" class="btn-primary-action" style="flex: 2; text-decoration: none; display: flex; align-items: center; justify-content: center; padding: 10px; font-size: 13px;">
                            ${btnText}
                        </a>
                        <button id="btn-menu-check-again" class="btn-secondary-action" style="flex: 1; padding: 10px; font-size: 13px;">
                            🔄 Yenile
                        </button>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="update-alert-card latest">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-weight: 700; color: #00b894; display: flex; align-items: center; gap: 6px;">
                            ✓ En Son Sürümdesiniz: <span style="color: #ffffff;">v${this.currentVersion}</span>
                        </span>
                        <button id="btn-menu-check-again" class="btn-check-pill">
                            🔄 Denetle
                        </button>
                    </div>
                    <details style="margin-top: 8px; font-size: 12px; color: rgba(255,255,255,0.7); cursor: pointer;">
                        <summary style="font-weight: 600; color: #74b9ff; margin-bottom: 4px;">📋 Sürüm v${this.currentVersion} Notları</summary>
                        <ul style="padding-left: 18px; margin-top: 4px; line-height: 1.5; color: rgba(255,255,255,0.85);">
                            <li><strong>Yeni Ana Ekran:</strong> Oyun açılış menüsü, sürüm kontrol kartı ve rehber eklendi.</li>
                            <li><strong>3B Kabile Mimarisi:</strong> 12 kabileye özel tapınaklar, çatılar ve kaleler oluşturuldu.</li>
                            <li><strong>Küp Kafa Savaşçılar:</strong> Her kabilenin miğferi, silahı, can çubuğu ve nefes alma animasyonu eklendi.</li>
                            <li><strong>Organik Sis ve Bulutlar:</strong> Haritayı kaplayan dalgalı ve yumuşak sis kümeleri geliştirildi.</li>
                        </ul>
                    </details>
                </div>
            `;
        }

        const checkBtn = document.getElementById('btn-menu-check-again');
        if (checkBtn) {
            checkBtn.onclick = () => {
                checkBtn.textContent = "Denetleniyor...";
                this.checkForUpdates(false);
            };
        }
    }

    showUpdateDialog(info) {
        const platform = this.detectPlatform();
        const targetUrl = platform === 'android' ? (info.apkUrl || info.exeUrl) : (info.exeUrl || info.apkUrl);
        const buttonText = platform === 'android' ? "📲 Yeni APK'yı İndir" : (platform === 'windows' ? "💻 Yeni EXE'yi İndir" : "🔄 Şimdi Güncelle");

        const existing = document.getElementById('tiletopia-update-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'tiletopia-update-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-card" style="text-align: center; max-width: 440px; animation: modalPop 0.25s ease;">
                <div style="font-size: 42px; margin-bottom: 8px;">🚀</div>
                <h2 style="font-size: 22px; margin-bottom: 4px;">Yeni Güncelleme Bulundu!</h2>
                <div style="font-size: 13px; color: #55efc4; font-weight: 700; margin-bottom: 12px;">
                    Sürüm: ${info.version} (Şu anki: v${this.currentVersion})
                </div>
                <div style="background: rgba(255,255,255,0.06); border-radius: 10px; padding: 12px; font-size: 13px; color: rgba(255,255,255,0.85); line-height: 1.4; text-align: left; margin-bottom: 18px; max-height: 120px; overflow-y: auto;">
                    ${info.releaseNotes || 'TileTopia için yeni bir güncelleme yayınlandı.'}
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="btn-update-now" style="flex: 2; padding: 12px; background: linear-gradient(135deg, #00cec9, #0984e3); color: #fff; border: none; border-radius: 12px; font-weight: 700; cursor: pointer;">
                        ${buttonText}
                    </button>
                    <button id="btn-update-later" style="flex: 1; padding: 12px; background: rgba(255,255,255,0.12); color: #fff; border: none; border-radius: 12px; cursor: pointer;">
                        Daha Sonra
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('btn-update-now').onclick = () => {
            window.open(targetUrl, '_blank');
            modal.remove();
        };

        document.getElementById('btn-update-later').onclick = () => {
            // Bir sonraki açılışta tekrar rahatsız etmemesi için sürümü kaydet
            localStorage.setItem('tiletopia_dismissed_update', info.version);
            modal.remove();
        };
    }

    showToast(text) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = text;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3200);
    }
}
