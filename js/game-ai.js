/**
 * Kabileler / Polytopia - Yapay Zekâ Motoru (AIBrain)
 * Akıllı, çok katmanlı, adım adım gözlemlenebilir taktiksel yapay zekâ.
 */

import { DB, Tech, UnitType, GameState } from './game-core.js';

export class AIBrain {
    constructor() {
        this.techWishlist = [
            Tech.Organization, Tech.Hunting, Tech.Riding, Tech.Climbing,
            Tech.Farming, Tech.Archery, Tech.Strategy, Tech.Mining,
            Tech.Forestry, Tech.Fishing, Tech.Smithery, Tech.Chivalry,
            Tech.Mathematics, Tech.Aquaculture
        ];
    }

    /**
     * AI turunu adım adım yield eden jeneratör fonksiyonu.
     * Bu sayede kullanıcı AI'nin hamlelerini animasyonlu olarak izleyebilir.
     */
    *play(g, p) {
        if (!p.alive || g.over) return;

        // 1. Ekonomi: Topraklarındaki kaynakları değerlendir
        const reserve = g.difficulty === 0 ? 5 : (g.difficulty === 1 ? 2 : 0);
        for (const t of g.tiles) {
            const check = g.canWork(t, p);
            if (!check.ok) continue;
            if (p.stars < check.cost + reserve) continue;

            const label = check.label;
            const worked = g.work(t, p);
            if (worked) {
                yield {
                    type: 'work',
                    text: `${p.name}: ${label}`,
                    tile: t
                };
            }
        }

        // 2. Teknoloji: İhtiyaca ve kabileye göre teknoloji araştır
        for (const tech of this.techWishlist) {
            if (p.has(tech)) continue;
            const def = DB.Techs[tech];
            if (def.hasReq && !p.has(def.req)) continue;

            const cost = g.techCost(p, tech);
            if (p.stars >= cost + (g.difficulty > 1 ? 0 : 2)) {
                g.research(p, tech);
                yield {
                    type: 'research',
                    text: `${p.name}: ${def.name} araştırıldı`,
                    tech: tech
                };
                break; // Her tur en fazla 1 teknoloji
            }
        }

        // 3. Birim Eğitimi: Şehirlerde ordu kur
        for (const c of g.cities) {
            if (c.owner !== p.id) continue;

            let bestType = UnitType.Warrior;
            let bestCost = -1;

            // Şehir karesinde düşman varsa savunmacı öncelikli
            const hasEnemyNear = g.nbrs(c.x, c.y).some(n => {
                const u = g.unitAt(n.x, n.y);
                return u && u.owner !== p.id;
            });

            const candidateTypes = [
                UnitType.Knight,
                UnitType.Catapult,
                UnitType.Swordsman,
                UnitType.Archer,
                UnitType.Rider,
                hasEnemyNear ? UnitType.Defender : UnitType.Warrior
            ];

            for (const t of candidateTypes) {
                const check = g.canTrain(c, t);
                if (check.ok) {
                    const cost = DB.Units[t].cost;
                    if (cost > bestCost && p.stars >= cost) {
                        bestCost = cost;
                        bestType = t;
                        break;
                    }
                }
            }

            if (bestCost >= 0) {
                const spawned = g.train(c, bestType);
                if (spawned) {
                    yield {
                        type: 'train',
                        text: `${p.name}: ${DB.Units[bestType].name} yetiştirdi`,
                        unit: spawned
                    };
                }
            }
        }

        // 4. Askeri Manevralar: Birimleri akıllıca oynat
        const myUnits = g.units.filter(u => u.owner === p.id && !u.fresh);

        for (const u of myUnits) {
            if (!g.units.includes(u)) continue; // Tur içinde ölmüş olabilir

            yield* this.playUnit(g, p, u);
            if (g.over) break;
        }
    }

    *playUnit(g, p, u) {
        // A) Eğer üzerinde boş/düşman şehir varsa önce ele geçir
        if (g.canCapture(u)) {
            g.capture(u);
            yield {
                type: 'capture',
                text: `${p.name}: Şehir fethetti!`,
                unit: u,
                pos: { x: u.x, y: u.y }
            };
            return;
        }

        // B) Doğrudan vurabileceğin avantajlı düşman var mı?
        const immediateAttack = this.findBestTarget(g, u);
        if (immediateAttack) {
            const result = g.attack(u, immediateAttack);
            yield {
                type: 'attack',
                text: `${p.name}: Saldırı düzenledi!`,
                attacker: u,
                defender: immediateAttack,
                result: result
            };

            // Şövalye öldürdüyse ve tekrar saldırabiliyorsa
            if (result.persisted && !u.acted) {
                const nextTarget = this.findBestTarget(g, u);
                if (nextTarget) {
                    const secondRes = g.attack(u, nextTarget);
                    yield {
                        type: 'attack',
                        text: `${p.name}: Şövalye zincirleme saldırdı!`,
                        attacker: u,
                        defender: nextTarget,
                        result: secondRes
                    };
                }
            }
            return;
        }

        if (u.moved || u.acted) return;

        // C) Canı kritik derecede azsa geri çekilip dinlensin
        if (u.hp < u.maxHp * 0.35 && g.rng.next() < 0.75) {
            g.rest(u);
            yield {
                type: 'rest',
                text: `${p.name}: Yaralı birim dinleniyor`,
                unit: u
            };
            return;
        }

        // D) Stratejik Hedef Seçimi (Köy > Düşman Başkenti > Sıradan Şehir > Düşman Birliği)
        let targetX = -1, targetY = -1;
        let bestDist = 9999;

        // Sahipsiz köyler en yüksek öncelik
        for (const c of g.cities) {
            if (c.owner === p.id) continue;
            const mult = (c.owner < 0) ? 0.8 : (c.isCapital ? 0.9 : 1.1);
            const dist = GameState.cheb(u.x, u.y, c.x, c.y) * mult;
            if (dist < bestDist) {
                bestDist = dist;
                targetX = c.x;
                targetY = c.y;
            }
        }

        // Düşman birlikleri
        for (const v of g.units) {
            if (v.owner === p.id) continue;
            const dist = GameState.cheb(u.x, u.y, v.x, v.y) * 1.35;
            if (dist < bestDist) {
                bestDist = dist;
                targetX = v.x;
                targetY = v.y;
            }
        }

        if (targetX < 0) return;

        // E) Hedefe doğru en iyi kareyi bul
        const moves = g.moves(u);
        let bestTileX = -1, bestTileY = -1;
        let minTargetDist = GameState.cheb(u.x, u.y, targetX, targetY);

        for (const [key] of moves) {
            const x = key % g.size;
            const y = Math.floor(key / g.size);
            let d = GameState.cheb(x, y, targetX, targetY);

            // Boş köye basmak ekstra cazip
            const c = g.cityAt(x, y);
            if (c && c.owner !== p.id) d -= 3;

            // Dağ veya orman savunması avantajlı
            const t = g.at(x, y);
            if (t.terr === 'Mountain' || t.terr === 'Forest') d -= 0.5;

            if (d < minTargetDist) {
                minTargetDist = d;
                bestTileX = x;
                bestTileY = y;
            }
        }

        // F) Hareket et
        if (bestTileX >= 0) {
            const fromX = u.x, fromY = u.y;
            g.moveUnit(u, bestTileX, bestTileY);

            yield {
                type: 'move',
                text: `${p.name}: İlerledi`,
                unit: u,
                from: { x: fromX, y: fromY },
                to: { x: bestTileX, y: bestTileY }
            };

            // Vardığı karede şehir/köy varsa hemen al
            if (g.canCapture(u)) {
                g.capture(u);
                yield {
                    type: 'capture',
                    text: `${p.name}: Şehir ele geçirdi!`,
                    unit: u,
                    pos: { x: u.x, y: u.y }
                };
                return;
            }

            // Dash özelliği varsa vardığı yerden saldırabilir
            if (u.def.dash) {
                const dashTarget = this.findBestTarget(g, u);
                if (dashTarget) {
                    const result = g.attack(u, dashTarget);
                    yield {
                        type: 'attack',
                        text: `${p.name}: Hareket edip saldırdı!`,
                        attacker: u,
                        defender: dashTarget,
                        result: result
                    };
                }
            }
            u.acted = true;
            return;
        }

        // Hareket edemediyse ve yaralıysa dinlen
        if (u.hp < u.maxHp) {
            g.rest(u);
            yield {
                type: 'rest',
                text: `${p.name}: Dinlendi`,
                unit: u
            };
        }
        u.acted = true;
    }

    /**
     * En avantajlı saldırı hedefini belirler
     */
    findBestTarget(g, u) {
        const targets = g.targets(u);
        if (targets.length === 0) return null;

        let best = null;
        let bestScore = -999;

        for (const v of targets) {
            const dmg = g.previewDamage(u, v);
            const ret = g.previewRetaliation(u, v);

            // Hedefi öldürmek çok yüksek puan
            const kills = (dmg >= v.hp);
            // Karşı saldırıdan ölmek büyük ceza
            const dies = (ret >= u.hp && !kills);

            let score = dmg * 2.2 - ret * 1.5;
            if (kills) score += 25;
            if (dies) score -= 50;

            // Şehir karesindeki düşmanı temizlemek ekstra değerli
            const onCity = (g.at(v.x, v.y).cityId >= 0);
            if (onCity) score += 15;

            if (score > bestScore) {
                bestScore = score;
                best = v;
            }
        }

        // Zararlı bir takas ise saldırma
        if (bestScore < -5 && targets.length > 0) return null;
        return best;
    }
}
