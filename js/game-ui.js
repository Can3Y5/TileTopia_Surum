/**
 * Kabileler / The Battle of Polytopia - Arayüz ve Kullanıcı Deneyimi Yöneticisi (Game UI)
 * Görsel 2 (Pick Your Tribe), Görsel 3 (Radial Tech Tree) ve Görsel 4 (In-Game HUD) ile birebir uyumlu.
 */

import { GameState, DB, Terrain, Res, Bld, UnitType, Tech, Reward } from './game-core.js';
import { BoardView3D } from './game-view3d.js';
import { AIBrain } from './game-ai.js';
import { AudioEngine } from './game-audio.js';
import { GameUpdater } from './game-updater.js';

export class GameUI {
    constructor() {
        this.g = null;
        this.view = null;
        this.ai = new AIBrain();
        this.audio = new AudioEngine();
        this.updater = new GameUpdater();

        // Seçim durumu
        this.selX = -1;
        this.selY = -1;
        this.selUnit = null;
        this.selMoves = new Map();
        this.selTargets = [];

        // DOM Elementleri
        this.screenTribePicker = document.getElementById('screen-tribe-picker');
        this.screenTechRadial = document.getElementById('screen-tech-radial');
        this.canvasContainer = document.getElementById('canvas-container');
        this.topHudBar = document.getElementById('top-hud-bar');
        this.bottomActionBar = document.getElementById('bottom-action-bar');
        this.contextDrawer = document.getElementById('context-drawer');
        this.rewardModal = document.getElementById('reward-modal');
        this.gameOverModal = document.getElementById('game-over-modal');
        this.settingsModal = document.getElementById('settings-modal');
        this.statsModal = document.getElementById('stats-modal');
        this.toastContainer = document.getElementById('toast-container');

        // Ayarlar
        this.selectedTribeIdx = 2; // Bardur (Varsayılan)
        this.selectedMapSize = 14;
        this.selectedDifficulty = 1;
        this.selectedOpponents = 3;
        this.selectedGameMode = 'perfection';

        // Radyal Ağaç Nesneleri
        this.radialCanvas = document.getElementById('radial-tree-canvas');
        this.radialCtx = this.radialCanvas ? this.radialCanvas.getContext('2d') : null;
        this.radialNodes = [];
        this.selectedTechKey = null;

        this.initTribePicker();
        this.initHUDButtons();
        this.initRadialTreeEvents();
    }

    // ---------------------------------------------------------------- GÖRSEL 2: KABİLE SEÇİM EKRANI

    initTribePicker() {
        const grid = document.getElementById('tribe-grid-container');
        grid.innerHTML = '';

        DB.Tribes.forEach((tribe, idx) => {
            const card = document.createElement('div');
            card.className = `tribe-portrait-card ${idx === this.selectedTribeIdx ? 'selected' : ''}`;
            card.innerHTML = `
                <div class="tribe-avatar-circle" style="background: radial-gradient(circle, #ffffff 10%, ${tribe.color} 100%);">
                    ${tribe.icon}
                </div>
                <div class="tribe-avatar-name">${tribe.name}</div>
            `;

            card.onclick = () => {
                this.audio.playClick();
                document.querySelectorAll('.tribe-portrait-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedTribeIdx = idx;

                document.getElementById('picker-tribe-desc').textContent =
                    `${tribe.lore} Başlangıç Teknolojisi: ${DB.Techs[tribe.start].name}.`;
            };

            grid.appendChild(card);
        });

        document.getElementById('btn-play-game').onclick = () => {
            this.audio.playClick();
            this.audio.startMusic();
            this.selectedMapSize = parseInt(document.getElementById('select-map-size').value);
            this.selectedDifficulty = parseInt(document.getElementById('select-difficulty').value);
            this.selectedOpponents = parseInt(document.getElementById('select-opponents').value);
            this.selectedGameMode = document.getElementById('select-game-mode').value;

            this.startGame();
        };

        // Tam Ekran Desteği (Android İçin)
        document.getElementById('btn-fullscreen-toggle').onclick = () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        };
    }

    startGame() {
        this.screenTribePicker.classList.add('hidden');
        this.topHudBar.classList.remove('hidden');
        this.bottomActionBar.classList.remove('hidden');

        this.g = new GameState({
            size: this.selectedMapSize,
            humanTribeIndex: this.selectedTribeIdx,
            opponentCount: this.selectedOpponents,
            difficulty: this.selectedDifficulty,
            maxTurn: this.selectedGameMode === 'blitz' ? 15 : (this.selectedGameMode === 'perfection' ? 30 : 999),
            gameMode: this.selectedGameMode
        });

        this.view = new BoardView3D(this.canvasContainer, this.g);
        this.view.onTileClick = (x, y) => this.handleTileClick(x, y);

        this.clearSelection();
        this.updateHUD();
        this.toast(`Tur 1 başladı. ${this.g.me.name} imparatorluğu kuruldu!`);
    }

    // ---------------------------------------------------------------- GÖRSEL 4: OYUN İÇİ HUD VE BUTONLAR

    initHUDButtons() {
        // 1. Ayarlar Butonu (☰)
        document.getElementById('btn-circle-settings').onclick = () => {
            this.audio.playClick();
            this.settingsModal.classList.remove('hidden');
        };

        // 2. Oyun İstatistikleri (Stats / Sıralama)
        document.getElementById('btn-circle-stats').onclick = () => {
            this.audio.playClick();
            this.showStatsModal();
        };

        // 3. Radyal Teknoloji Ağacı Butonu (🏛️)
        document.getElementById('btn-circle-tech').onclick = () => {
            this.audio.playClick();
            this.openRadialTechTree();
        };

        // 4. Turu Bitir Butonu (✓)
        document.getElementById('btn-circle-end-turn').onclick = () => {
            this.endTurn();
        };

        // Çekmece Kapat
        document.getElementById('drawer-close').onclick = () => {
            this.clearSelection();
        };

        // Modal Kapatmaları
        document.getElementById('settings-close').onclick = () => {
            this.settingsModal.classList.add('hidden');
        };
        document.getElementById('stats-close').onclick = () => {
            this.statsModal.classList.add('hidden');
        };
        document.getElementById('btn-sound-toggle').onclick = () => {
            const muted = this.audio.toggleMute();
            document.getElementById('btn-sound-toggle').textContent = muted ? "Ses: KAPALI" : "Ses: AÇIK";
        };

        const checkBtn = document.getElementById('btn-check-update');
        if (checkBtn) {
            checkBtn.onclick = () => {
                this.audio.playClick();
                this.updater.checkForUpdates(false);
            };
        }

        // Açılışta sessizce güncellemeyi denetle
        setTimeout(() => {
            this.updater.checkForUpdates(true);
        }, 1500);
        };
    }

    // ---------------------------------------------------------------- GÖRSEL 3: RADYAL TEKNOLOJİ AĞACI MOTORU

    openRadialTechTree() {
        this.screenTechRadial.classList.remove('hidden');
        this.selectedTechKey = null;
        document.getElementById('tech-detail-sheet').classList.add('hidden');

        // Üst Bilgileri Güncelle
        document.getElementById('radial-score-val').textContent = this.g.score(this.g.me).toLocaleString();
        document.getElementById('radial-stars-val').textContent = `⭐ ${this.g.me.stars}`;
        document.getElementById('radial-income-val').textContent = `(+${this.g.income(this.g.me)})`;
        document.getElementById('radial-turn-val').textContent = this.g.turn;

        this.renderRadialTree();
    }

    renderRadialTree() {
        const canvas = this.radialCanvas;
        const ctx = this.radialCtx;
        const w = canvas.width = window.innerWidth;
        const h = canvas.height = window.innerHeight;

        ctx.clearRect(0, 0, w, h);

        const centerX = w / 2;
        const centerY = h / 2 - 10;
        const radiusT1 = Math.min(w, h) * 0.17;
        const radiusT2 = Math.min(w, h) * 0.28;
        const radiusT3 = Math.min(w, h) * 0.39;

        this.radialNodes = [];

        // 5 Dalın Açıları (72 derecelik dilimler)
        const branchAngles = [
            -Math.PI / 2,                  // 0: Avcılık (Yukarı)
            -Math.PI / 2 + (2 * Math.PI) / 5,  // 1: Binicilik (Sağ Üst)
            -Math.PI / 2 + (4 * Math.PI) / 5,  // 2: Örgütlenme (Sağ Alt)
            -Math.PI / 2 + (6 * Math.PI) / 5,  // 3: Tırmanış (Sol Alt)
            -Math.PI / 2 + (8 * Math.PI) / 5   // 4: Balıkçılık (Sol Üst)
        ];

        // 1. Merkez Düğüm (Kabile Avatarı)
        ctx.beginPath();
        ctx.arc(centerX, centerY, 34, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = this.g.me.tribe.color;
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.font = '32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.g.me.tribe.icon, centerX, centerY);

        // 2. Düğümleri ve Bağlantı Çizgilerini Çiz
        const nodePositions = new Map();

        // Kademe 1 Düğümleri
        for (const [key, def] of Object.entries(DB.Techs)) {
            if (def.tier === 1) {
                const angle = branchAngles[def.branch];
                const nx = centerX + Math.cos(angle) * radiusT1;
                const ny = centerY + Math.sin(angle) * radiusT1;
                nodePositions.set(key, { x: nx, y: ny });

                // Merkezden Kademe 1'e çizgi
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(nx, ny);
                ctx.strokeStyle = this.g.me.has(key) ? '#2ecc71' : 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }

        // Kademe 2 Düğümleri
        for (const [key, def] of Object.entries(DB.Techs)) {
            if (def.tier === 2) {
                const baseAngle = branchAngles[def.branch];
                // İki alt dal için hafif sağa-sola açılma
                const isSubA = (key === Tech.Archery || key === Tech.FreeSpirit || key === Tech.Farming || key === Tech.Mining || key === Tech.Sailing);
                const subOffset = isSubA ? -0.22 : 0.22;
                const angle = baseAngle + subOffset;

                const nx = centerX + Math.cos(angle) * radiusT2;
                const ny = centerY + Math.sin(angle) * radiusT2;
                nodePositions.set(key, { x: nx, y: ny });

                const parentPos = nodePositions.get(def.parent);
                if (parentPos) {
                    ctx.beginPath();
                    ctx.moveTo(parentPos.x, parentPos.y);
                    ctx.lineTo(nx, ny);
                    ctx.strokeStyle = this.g.me.has(key) ? '#2ecc71' : 'rgba(255, 255, 255, 0.2)';
                    ctx.lineWidth = 2.5;
                    ctx.stroke();
                }
            }
        }

        // Kademe 3 Düğümleri
        for (const [key, def] of Object.entries(DB.Techs)) {
            if (def.tier === 3) {
                const parentPos = nodePositions.get(def.parent);
                if (parentPos) {
                    const angle = Math.atan2(parentPos.y - centerY, parentPos.x - centerX);
                    const nx = centerX + Math.cos(angle) * radiusT3;
                    const ny = centerY + Math.sin(angle) * radiusT3;
                    nodePositions.set(key, { x: nx, y: ny });

                    ctx.beginPath();
                    ctx.moveTo(parentPos.x, parentPos.y);
                    ctx.lineTo(nx, ny);
                    ctx.strokeStyle = this.g.me.has(key) ? '#2ecc71' : 'rgba(255, 255, 255, 0.2)';
                    ctx.lineWidth = 2.5;
                    ctx.stroke();
                }
            }
        }

        // 3. Daire Düğüm Butonlarını Çiz (Görsel 3'teki Yeşil Dairesel İkonlar)
        for (const [key, pos] of nodePositions.entries()) {
            const def = DB.Techs[key];
            const researched = this.g.me.has(key);
            const canRes = this.g.canResearch(this.g.me, key);
            const r = 24;

            this.radialNodes.push({ key, def, x: pos.x, y: pos.y, r });

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);

            if (researched) {
                ctx.fillStyle = '#2ecc71'; // Canlı yeşil
                ctx.shadowColor = 'rgba(46, 204, 113, 0.6)';
                ctx.shadowBlur = 12;
            } else if (canRes) {
                ctx.fillStyle = '#00cec9'; // Parlak turkuaz
                ctx.shadowColor = 'rgba(0, 206, 201, 0.7)';
                ctx.shadowBlur = 14;
            } else {
                ctx.fillStyle = '#2d3436'; // Kilitli koyu gri
                ctx.shadowBlur = 0;
            }
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.strokeStyle = (key === this.selectedTechKey) ? '#ffffff' : 'rgba(255,255,255,0.4)';
            ctx.lineWidth = (key === this.selectedTechKey) ? 3.5 : 1.5;
            ctx.stroke();

            // İkon
            ctx.font = '18px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(def.icon, pos.x, pos.y);
        }
    }

    initRadialTreeEvents() {
        document.getElementById('radial-back-btn').onclick = () => {
            this.screenTechRadial.classList.add('hidden');
        };

        this.radialCanvas.addEventListener('click', (e) => {
            const rect = this.radialCanvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            for (const node of this.radialNodes) {
                const dist = Math.hypot(mx - node.x, my - node.y);
                if (dist <= node.r) {
                    this.audio.playClick();
                    this.selectTechNode(node.key);
                    return;
                }
            }

            document.getElementById('tech-detail-sheet').classList.add('hidden');
            this.selectedTechKey = null;
            this.renderRadialTree();
        });

        window.addEventListener('resize', () => {
            if (!this.screenTechRadial.classList.contains('hidden')) {
                this.renderRadialTree();
            }
        });
    }

    selectTechNode(techKey) {
        this.selectedTechKey = techKey;
        this.renderRadialTree();

        const def = DB.Techs[techKey];
        const researched = this.g.me.has(techKey);
        const canRes = this.g.canResearch(this.g.me, techKey);
        const cost = this.g.techCost(this.g.me, techKey);

        const sheet = document.getElementById('tech-detail-sheet');
        sheet.classList.remove('hidden');

        document.getElementById('tech-sheet-icon').textContent = def.icon;
        document.getElementById('tech-sheet-title').textContent = def.name;
        document.getElementById('tech-sheet-desc').textContent = def.info;

        const actionArea = document.getElementById('tech-sheet-action');
        actionArea.innerHTML = '';

        if (researched) {
            actionArea.innerHTML = `<span style="color: #2ecc71; font-weight: 700;">✓ Keşfedildi</span>`;
        } else if (canRes) {
            const btn = document.createElement('button');
            btn.className = 'btn-research-action';
            btn.textContent = `Araştır (⭐ ${cost})`;
            btn.onclick = () => {
                this.audio.playTech();
                this.g.research(this.g.me, techKey);
                this.view.refresh();
                this.updateHUD();
                this.openRadialTechTree();
                this.toast(`${def.name} keşfedildi!`);
            };
            actionArea.appendChild(btn);
        } else {
            const reqName = def.parent ? DB.Techs[def.parent].name : "";
            actionArea.innerHTML = `<span style="color: rgba(255,255,255,0.5); font-size: 13px;">${reqName ? `${reqName} gerekli` : 'Yetersiz Yıldız'}</span>`;
        }
    }

    // ---------------------------------------------------------------- TIKLAMA VE BİRLİK YÖNETİMİ

    handleTileClick(x, y) {
        if (this.g.over || this.g.cur !== GameState.HUMAN) return;

        const tile = this.g.at(x, y);
        if (!tile) return;

        if (this.selUnit && this.selUnit.owner === GameState.HUMAN) {
            const targetUnit = this.selTargets.find(v => v.x === x && v.y === y);
            if (targetUnit) {
                this.executeAttack(this.selUnit, targetUnit);
                return;
            }

            const moveKey = this.g.idx(x, y);
            if (this.selMoves.has(moveKey)) {
                this.executeMove(this.selUnit, x, y);
                return;
            }
        }

        this.selectTile(x, y);
    }

    selectTile(x, y) {
        this.selX = x;
        this.selY = y;
        const tile = this.g.at(x, y);
        this.selUnit = this.g.unitAt(x, y);

        if (this.selUnit && this.selUnit.owner === GameState.HUMAN && this.selUnit.canAct) {
            this.selMoves = this.g.moves(this.selUnit);
            this.selTargets = this.g.targets(this.selUnit);
            this.audio.playClick();
        } else {
            this.selMoves = new Map();
            this.selTargets = [];
        }

        this.view.showHighlights(this.selMoves, this.selTargets, x, y);
        this.renderDrawer(tile);
    }

    clearSelection() {
        this.selX = -1;
        this.selY = -1;
        this.selUnit = null;
        this.selMoves = new Map();
        this.selTargets = [];
        if (this.view) this.view.clearHighlights();
        this.contextDrawer.classList.add('hidden');
    }

    executeMove(unit, targetX, targetY) {
        this.audio.playMove();
        this.view.animateUnitMove(unit, targetX, targetY, () => {
            this.g.moveUnit(unit, targetX, targetY);
            this.view.refresh();

            if (this.g.canCapture(unit)) {
                this.audio.playCapture();
                this.g.capture(unit);
                this.view.refresh();
                this.toast("Şehir fethedildi!");
            }

            this.selectTile(targetX, targetY);
            this.updateHUD();
        });
    }

    executeAttack(attacker, defender) {
        if (attacker.type === UnitType.Archer) this.audio.playArrow();
        else if (attacker.type === UnitType.Catapult) this.audio.playCatapult();
        else if (attacker.type === UnitType.Giant) this.audio.playGiant();
        else this.audio.playAttack();

        const result = this.g.attack(attacker, defender);

        this.view.animateAttack(attacker, defender, result, () => {
            this.view.refresh();
            this.updateHUD();

            if (result.killed) {
                this.toast(`Düşman ${defender.def.name} yok edildi!`);
                if (result.veteran) {
                    this.audio.playLevelUp();
                    this.toast(`${attacker.def.name} Gazi oldu! (+5 Can)`);
                }
            }

            if (result.persisted && !attacker.acted) {
                this.selectTile(attacker.x, attacker.y);
            } else {
                this.clearSelection();
            }

            this.checkGameStatus();
        });
    }

    // ---------------------------------------------------------------- ALT KARE BİLGİ VE ASKER ÜRETİM PANELİ

    renderDrawer(tile) {
        if (!tile) {
            this.contextDrawer.classList.add('hidden');
            return;
        }

        const unit = this.g.unitAt(tile.x, tile.y);
        const city = this.g.cityAt(tile.x, tile.y);
        const drawerBody = document.getElementById('drawer-body');
        drawerBody.innerHTML = '';

        this.contextDrawer.classList.remove('hidden');

        const terrainDef = DB.Terrains[tile.terr];
        document.getElementById('drawer-icon').textContent = terrainDef.icon;
        document.getElementById('drawer-title').textContent = terrainDef.name;
        document.getElementById('drawer-subtitle').textContent =
            `Savunma: %${Math.round((terrainDef.defBonus - 1) * 100)} ${tile.owner >= 0 ? `• ${this.g.players[tile.owner].name}` : ''}`;

        // Birlik Kartı
        if (unit) {
            const unitDef = unit.def;
            const hpRatio = Math.round((unit.hp / unit.maxHp) * 100);

            const card = document.createElement('div');
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong>${unitDef.icon} ${unitDef.name} ${unit.veteran ? '⭐' : ''}</strong>
                    <span style="color: #2ecc71; font-weight: 700;">${unit.hp}/${unit.maxHp} HP</span>
                </div>
                <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                    <div style="width: ${hpRatio}%; height: 100%; background: ${hpRatio > 35 ? '#2ecc71' : '#e74c3c'};"></div>
                </div>
            `;
            drawerBody.appendChild(card);

            if (unit.owner === GameState.HUMAN && unit.canAct && unit.hp < unit.maxHp) {
                const restBtn = document.createElement('button');
                restBtn.className = 'btn-research-action';
                restBtn.style.padding = '6px 14px';
                restBtn.textContent = '💤 Dinlen (+Can)';
                restBtn.onclick = () => {
                    this.audio.playClick();
                    this.g.rest(unit);
                    this.view.refresh();
                    this.selectTile(tile.x, tile.y);
                    this.updateHUD();
                };
                drawerBody.appendChild(restBtn);
            }
        }

        // Şehir Birim Üretimi
        if (city && city.owner === GameState.HUMAN) {
            const cityPanel = document.createElement('div');
            cityPanel.innerHTML = `
                <div style="font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.7); margin: 8px 0 6px 0;">BİRLİK YETİŞTİR:</div>
            `;

            const btnRow = document.createElement('div');
            btnRow.style.display = 'flex';
            btnRow.style.gap = '8px';
            btnRow.style.flexWrap = 'wrap';

            for (const [typeKey, uDef] of Object.entries(DB.Units)) {
                if (uDef.super) continue;
                const check = this.g.canTrain(city, typeKey);

                const btn = document.createElement('button');
                btn.style.padding = '6px 12px';
                btn.style.borderRadius = '16px';
                btn.style.border = '1px solid rgba(255,255,255,0.2)';
                btn.style.background = check.ok ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)';
                btn.style.color = check.ok ? '#ffffff' : 'rgba(255,255,255,0.3)';
                btn.style.cursor = check.ok ? 'pointer' : 'not-allowed';
                btn.innerHTML = `${uDef.icon} ${uDef.name} (⭐${uDef.cost})`;

                if (check.ok) {
                    btn.onclick = () => {
                        this.audio.playClick();
                        this.g.train(city, typeKey);
                        this.view.refresh();
                        this.selectTile(tile.x, tile.y);
                        this.updateHUD();
                    };
                }
                btnRow.appendChild(btn);
            }
            cityPanel.appendChild(btnRow);
            drawerBody.appendChild(cityPanel);
        }

        // Kaynak Toplama / Yapı
        const work = this.g.canWork(tile, this.g.me);
        if (work.ok && this.g.me.stars >= work.cost) {
            const workBtn = document.createElement('button');
            workBtn.className = 'btn-research-action';
            workBtn.style.marginTop = '10px';
            workBtn.style.width = '100%';
            workBtn.innerHTML = `🔨 ${work.label} (⭐${work.cost}) [+${work.pop} Nüfus]`;
            workBtn.onclick = () => {
                this.audio.playHarvest();
                this.g.work(tile, this.g.me);
                this.view.refresh();
                this.selectTile(tile.x, tile.y);
                this.updateHUD();
                this.checkPendingRewards();
            };
            drawerBody.appendChild(workBtn);
        }
    }

    // ---------------------------------------------------------------- TUR BİTİRME VE AI

    endTurn() {
        if (this.g.over || this.g.cur !== GameState.HUMAN) return;

        if (this.g.pendingRewards.length > 0) {
            this.checkPendingRewards();
            return;
        }

        this.audio.playEndTurn();
        this.clearSelection();
        this.runAITurns();
    }

    async runAITurns() {
        let p = this.g.nextPlayer();

        while (p.isAI && !this.g.over) {
            for (const step of this.ai.play(this.g, p)) {
                this.view.refresh();
                this.updateHUD();
                await new Promise(r => setTimeout(r, 180));
                if (this.g.over) break;
            }
            if (this.g.over) break;
            p = this.g.nextPlayer();
        }

        this.view.refresh();
        this.updateHUD();
        this.checkGameStatus();

        if (!this.g.over) {
            this.toast(`Tur ${this.g.turn} başladı! (+${this.g.income(this.g.me)} ⭐)`);
            this.checkPendingRewards();
        }
    }

    // ---------------------------------------------------------------- ŞEHİR GELİŞİM ÖDÜLLERİ

    checkPendingRewards() {
        if (this.g.pendingRewards.length === 0) return;

        const city = this.g.pendingRewards[0];
        const rewards = DB.RewardsFor(Math.min(5, city.level));
        const container = document.getElementById('reward-choices');
        container.innerHTML = '';

        document.getElementById('reward-modal-subtitle').textContent =
            `${city.name} Seviye ${city.level}'e ulaştı! Bir ödül seçin:`;

        rewards.forEach(r => {
            const card = document.createElement('div');
            card.className = 'action-circle-group';
            card.style.cursor = 'pointer';
            card.innerHTML = `
                <div class="action-circle-btn" style="width: 80px; height: 80px; font-size: 36px; background: rgba(255,255,255,0.08); border-color: var(--gold);">
                    ${DB.RewardIcon(r)}
                </div>
                <div style="font-size: 15px; font-weight: 700; margin-top: 6px;">${DB.RewardName(r)}</div>
                <div style="font-size: 12px; color: rgba(255,255,255,0.7); max-width: 140px; text-align: center;">${DB.RewardInfo(r)}</div>
            `;
            card.onclick = () => {
                this.audio.playLevelUp();
                this.g.applyReward(city, r);
                this.g.pendingRewards.shift();
                this.rewardModal.classList.add('hidden');
                this.view.refresh();
                this.updateHUD();

                if (this.g.pendingRewards.length > 0) {
                    setTimeout(() => this.checkPendingRewards(), 200);
                }
            };
            container.appendChild(card);
        });

        this.rewardModal.classList.remove('hidden');
    }

    // ---------------------------------------------------------------- İSTATİSTİKLER VE AYARLAR

    showStatsModal() {
        const list = document.getElementById('stats-leaderboard');
        list.innerHTML = '';

        const sorted = [...this.g.players].filter(p => p.alive).sort((a, b) => this.g.score(b) - this.g.score(a));

        sorted.forEach((p, rank) => {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.padding = '8px 0';
            item.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            item.innerHTML = `
                <span>#${rank + 1} <strong style="color: ${p.tribe.color};">${p.name}</strong></span>
                <span>🏆 ${this.g.score(p)} Puan • 🏛️ ${this.g.cityCount(p)} Şehir</span>
            `;
            list.appendChild(item);
        });

        this.statsModal.classList.remove('hidden');
    }

    checkGameStatus() {
        if (!this.g.over) return;

        const winner = this.g.winner();
        const isMe = (winner.id === GameState.HUMAN);

        if (isMe) this.audio.playVictory();
        else this.audio.playDefeat();

        document.getElementById('game-over-title').textContent = isMe ? "🏆 ZAFER!" : "💀 YENİLGİ...";
        document.getElementById('game-over-reason').textContent = this.g.overReason;

        document.getElementById('btn-play-again').onclick = () => location.reload();
        this.gameOverModal.classList.remove('hidden');
    }

    updateHUD() {
        if (!this.g) return;

        // Görsel 3 & 4: Top Center Stats
        document.getElementById('hud-score-val').textContent = this.g.score(this.g.me).toLocaleString();
        document.getElementById('hud-stars-val').textContent = `⭐ ${this.g.me.stars}`;
        document.getElementById('hud-income-val').textContent = `(+${this.g.income(this.g.me)})`;
        document.getElementById('hud-turn-val').textContent = this.g.turn;

        // Görsel 4: Sıralama Rozeti (1st, 2nd, etc.)
        const sorted = [...this.g.players].filter(p => p.alive).sort((a, b) => this.g.score(b) - this.g.score(a));
        const rank = sorted.findIndex(p => p.id === GameState.HUMAN) + 1;
        document.getElementById('hud-rank-badge').textContent = `${rank}${rank === 1 ? 'st' : (rank === 2 ? 'nd' : 'rd')}`;

        // Kabile Avatar İkonu
        document.getElementById('hud-avatar-icon').textContent = this.g.me.tribe.icon;

        // Turu Bitir Butonu
        const endBtn = document.getElementById('btn-circle-end-turn');
        const hasActions = this.g.units.some(u => u.owner === GameState.HUMAN && u.canAct);
        if (hasActions) endBtn.classList.add('has-actions');
        else endBtn.classList.remove('has-actions');
    }

    toast(text) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = text;
        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(30px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }
}
