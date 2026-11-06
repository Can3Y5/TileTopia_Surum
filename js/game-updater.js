/**
 * TileTopia - GitHub Otomatik Güncelleme Motoru (Game Updater)
 * Hedef Güncelleme Deposu: https://github.com/Can3Y5/TileTopia_Surum
 */

export class GameUpdater {
    constructor() {
        this.currentVersion = "1.0.0";
        this.updateRepo = "Can3Y5/TileTopia_Surum";
        this.versionJsonUrl = `https://raw.githubusercontent.com/${this.updateRepo}/main/version.json`;
        this.releasesApiUrl = `https://api.github.com/repos/${this.updateRepo}/releases/latest`;
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
     * Sürüm numaralarını karşılaştırır (örn: 1.0.1 > 1.0.0)
     */
    compareVersions(vNew, vCurrent) {
        const pNew = vNew.replace(/^v/, '').split('.').map(Number);
        const pCur = vCurrent.replace(/^v/, '').split('.').map(Number);

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
     */
    async checkForUpdates(silent = true) {
        try {
            // Önce version.json dosyasını kontrol et (en hızlı ve kotasız)
            const res = await fetch(`${this.versionJsonUrl}?t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                if (this.compareVersions(data.version, this.currentVersion) > 0) {
                    this.showUpdateDialog(data);
                    return true;
                }
            }

            // Ardından GitHub Releases API'yi kontrol et
            const apiRes = await fetch(this.releasesApiUrl);
            if (apiRes.ok) {
                const release = await apiRes.json();
                const latestTag = release.tag_name || release.name || "";
                if (this.compareVersions(latestTag, this.currentVersion) > 0) {
                    const platform = this.detectPlatform();
                    let downloadUrl = release.html_url;

                    // Platforma uygun indirme dosyasını bul (APK veya EXE)
                    if (release.assets && release.assets.length > 0) {
                        const targetExt = platform === 'android' ? '.apk' : (platform === 'windows' ? '.exe' : '');
                        const match = release.assets.find(a => a.name.toLowerCase().endsWith(targetExt));
                        if (match) downloadUrl = match.browser_download_url;
                    }

                    this.showUpdateDialog({
                        version: latestTag,
                        releaseNotes: release.body || "Yeni özellikler ve hata düzeltmeleri.",
                        apkUrl: downloadUrl,
                        exeUrl: downloadUrl
                    });
                    return true;
                }
            }

            if (!silent) {
                this.showToast(`✓ TileTopia en güncel sürümde! (v${this.currentVersion})`);
            }
            return false;
        } catch (err) {
            console.warn("Güncelleme kontrolü yapılamadı:", err);
            if (!silent) {
                this.showToast(`Güncelleme sunucusuna erişilemedi.`);
            }
            return false;
        }
    }

    showUpdateDialog(info) {
        const platform = this.detectPlatform();
        const targetUrl = platform === 'android' ? (info.apkUrl || info.exeUrl) : (info.exeUrl || info.apkUrl);
        const buttonText = platform === 'android' ? "📲 Yeni APK'yı İndir" : (platform === 'windows' ? "💻 Yeni EXE'yi İndir" : "🔄 Şimdi Güncelle");

        // Varsa eski güncelleme modalını kaldır
        const existing = document.getElementById('tiletopia-update-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'tiletopia-update-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-card" style="text-align: center; max-width: 460px; animation: modalPop 0.25s ease;">
                <div style="font-size: 42px; margin-bottom: 8px;">🚀</div>
                <h2 style="font-size: 22px; margin-bottom: 6px;">Yeni Güncelleme Bulundu!</h2>
                <div style="font-size: 14px; color: #00cec9; font-weight: 700; margin-bottom: 12px;">
                    Sürüm: ${info.version} (Şu anki: v${this.currentVersion})
                </div>
                <div style="background: rgba(255,255,255,0.06); border-radius: 10px; padding: 12px; font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.4; text-align: left; margin-bottom: 20px; max-height: 120px; overflow-y: auto;">
                    ${info.releaseNotes || 'TileTopia için yeni bir güncelleme yayınlandı.'}
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="btn-update-now" style="flex: 2; padding: 12px; background: linear-gradient(135deg, #00cec9, #0984e3); color: #fff; border: none; border-radius: 12px; font-weight: 700; cursor: pointer;">
                        ${buttonText}
                    </button>
                    <button id="btn-update-later" style="flex: 1; padding: 12px; background: rgba(255,255,255,0.1); color: #fff; border: none; border-radius: 12px; cursor: pointer;">
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
