using System;
using System.Collections.Generic;

namespace Kabileler
{
    /// <summary>
    /// Rakip oyuncunun beyni. Her hamleden sonra "yield return" yaptigi icin
    /// Unity tarafinda coroutine ile adim adim animasyon gosterebiliyoruz.
    /// </summary>
    public class AIBrain
    {
        static readonly Tech[] TechWishlist =
        {
            Tech.Organization, Tech.Hunting, Tech.Riding, Tech.Farming, Tech.Archery,
            Tech.Climbing, Tech.Mining, Tech.Strategy, Tech.Smithery, Tech.Chivalry,
            Tech.Forestry, Tech.Fishing, Tech.Mathematics, Tech.Aquaculture
        };

        public IEnumerable<AIStep> Play(GameState g, Player p)
        {
            // 1) ekonomi: kendi topragindaki kaynaklari isle
            int reserve = g.Difficulty == 0 ? 4 : 2;
            foreach (var t in g.Tiles)
            {
                string label; int cost;
                if (!g.CanWork(t, p, out label, out cost)) continue;
                if (p.Stars < cost + reserve) continue;
                g.Work(t, p);
                yield return new AIStep(p.Name + ": " + label);
            }

            // 2) teknoloji: listedeki sirasi gelen ilk teknolojiyi dener
            foreach (var tech in TechWishlist)
            {
                if (p.Has(tech)) continue;
                var def = DB.Techs[tech];
                if (def.HasReq && !p.Has(def.Req)) continue;
                if (p.Stars >= g.TechCost(p, tech) + 3)
                {
                    g.Research(p, tech);
                    yield return new AIStep(p.Name + ": " + def.Name + " arastirildi");
                }
                break;   // her tur en fazla bir teknoloji
            }

            // 3) birim uretimi
            foreach (var c in g.Cities)
            {
                if (c.Owner != p.Id) continue;
                UnitType best = UnitType.Warrior;
                int bestCost = -1;
                foreach (var kv in DB.Units)
                {
                    string why;
                    if (!g.CanTrain(c, kv.Key, out why)) continue;
                    if (kv.Value.Cost > bestCost) { bestCost = kv.Value.Cost; best = kv.Key; }
                }
                if (bestCost >= 0 && g.Train(c, best))
                    yield return new AIStep(p.Name + ": " + DB.Units[best].Name + " uretti");
            }

            // 4) birimleri oynat
            var mine = new List<Unit>();
            foreach (var u in g.Units) if (u.Owner == p.Id && !u.Fresh) mine.Add(u);

            foreach (var u in mine)
            {
                if (!g.Units.Contains(u)) continue;     // bu tur olduyse atla
                foreach (var step in PlayUnit(g, p, u)) yield return step;
                if (g.Over) yield break;
            }
        }

        IEnumerable<AIStep> PlayUnit(GameState g, Player p, Unit u)
        {
            // uzerinde ele gecirilecek sehir varsa once onu al
            if (g.CanCapture(u))
            {
                g.Capture(u);
                yield return new AIStep(p.Name + ": sehir ele gecirdi");
                yield break;
            }

            if (TryAttack(g, u)) { yield return new AIStep(p.Name + ": saldirdi"); yield break; }
            if (u.Moved || u.Acted) yield break;

            // cani azsa geri cekilip dinlen
            if (u.Hp < u.MaxHp * 0.35f && g.Rand01() < 0.7)
            {
                g.Rest(u);
                yield return new AIStep(p.Name + ": birim dinleniyor");
                yield break;
            }

            // hedef sec: once yakin koy/sehir, sonra dusman birimleri
            int gx = -1, gy = -1;
            float bestScore = float.MaxValue;
            foreach (var c in g.Cities)
            {
                if (c.Owner == p.Id) continue;
                float w = c.Owner < 0 ? 1.0f : (c.IsCapital ? 0.7f : 0.85f);
                float d = GameState.Cheb(u.X, u.Y, c.X, c.Y) * w;
                if (d < bestScore) { bestScore = d; gx = c.X; gy = c.Y; }
            }
            foreach (var v in g.Units)
            {
                if (v.Owner == p.Id) continue;
                float d = GameState.Cheb(u.X, u.Y, v.X, v.Y) * 1.35f;
                if (d < bestScore) { bestScore = d; gx = v.X; gy = v.Y; }
            }
            if (gx < 0) yield break;

            var moves = g.Moves(u);
            int pickX = -1, pickY = -1;
            int bestDist = GameState.Cheb(u.X, u.Y, gx, gy);
            foreach (var kv in moves)
            {
                int x = kv.Key % g.Size, y = kv.Key / g.Size;
                int d = GameState.Cheb(x, y, gx, gy);
                var c = g.CityAt(x, y);
                if (c != null && c.Owner != p.Id) d -= 2;      // bos koy cazip
                if (d < bestDist) { bestDist = d; pickX = x; pickY = y; }
            }

            if (pickX >= 0)
            {
                g.MoveUnit(u, pickX, pickY);
                yield return new AIStep(p.Name + ": ilerledi");

                if (g.CanCapture(u))
                {
                    g.Capture(u);
                    yield return new AIStep(p.Name + ": sehir ele gecirdi");
                    yield break;
                }
                if (u.Def.Dash && TryAttack(g, u)) yield return new AIStep(p.Name + ": saldirdi");
                u.Acted = true;
                yield break;
            }

            if (u.Hp < u.MaxHp) g.Rest(u);
            u.Acted = true;
        }

        /// <summary>En karli hedefi secer: hasar iki kat degerli, yenecegi karsilik ceza.</summary>
        bool TryAttack(GameState g, Unit u)
        {
            var targets = g.Targets(u);
            if (targets.Count == 0) return false;

            Unit best = null;
            float bestScore = -9999f;
            foreach (var t in targets)
            {
                int dmg = g.PreviewDamage(u, t);
                int ret = g.PreviewRetaliation(u, t);
                float score = dmg * 2f - ret;
                if (dmg >= t.Hp) score += 45f;        // oldurebiliyorsa cok degerli
                if (ret >= u.Hp) score -= 60f;        // intihar etme
                if (g.CityAt(t.X, t.Y) != null) score += 8f;
                if (score > bestScore) { bestScore = score; best = t; }
            }
            if (best == null || bestScore <= -10f) return false;
            g.Attack(u, best);
            return true;
        }
    }
}
