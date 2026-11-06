using System;
using System.Collections.Generic;

namespace Kabileler
{
    /// <summary>
    /// Oyunun tum kurallari burada. UnityEngine kullanmaz, bu yuzden
    /// konsoldan da test edilebilir (bkz. Tools/HeadlessTest).
    /// </summary>
    public class GameState
    {
        public int Size;
        public int Turn = 1;
        public int MaxTurn = 25;
        public int Cur;                 // sirasi gelen oyuncunun indexi
        public int Difficulty = 1;      // 0 kolay, 1 normal, 2 zor
        public bool Over;
        public string OverReason = "";
        public const int Human = 0;     // insan oyuncu her zaman 0

        public Tile[] Tiles;
        public List<Player> Players = new List<Player>();
        public List<Unit> Units = new List<Unit>();
        public List<City> Cities = new List<City>();
        public List<City> PendingRewards = new List<City>();   // insanin secmesi gereken oduller
        public List<string> Log = new List<string>();

        readonly Random rng;
        int nextUnitId = 1;

        public Player Current { get { return Players[Cur]; } }
        public Player Me { get { return Players[Human]; } }

        // ---------------------------------------------------------------- kurulum

        public GameState(int size, int humanTribe, int opponents, int difficulty, int maxTurn, int seed)
        {
            Size = size;
            Difficulty = difficulty;
            MaxTurn = maxTurn;
            rng = new Random(seed);

            var used = new List<int> { humanTribe };
            Players.Add(MakePlayer(0, DB.Tribes[humanTribe], false));
            for (int i = 0; i < opponents; i++)
            {
                int t;
                do { t = rng.Next(DB.Tribes.Count); } while (used.Contains(t));
                used.Add(t);
                Players.Add(MakePlayer(i + 1, DB.Tribes[t], true));
            }

            GenerateMap();
            foreach (var u in Units) u.Fresh = false;   // ilk tur birimleri hemen oynar
        }

        Player MakePlayer(int id, TribeDef tribe, bool ai)
        {
            var p = new Player { Id = id, Tribe = tribe, Name = tribe.Name, IsAI = ai, Stars = 5 };
            p.Techs.Add(tribe.Start);
            return p;
        }

        // ---------------------------------------------------------------- harita

        public int Idx(int x, int y) { return y * Size + x; }
        public bool InB(int x, int y) { return x >= 0 && y >= 0 && x < Size && y < Size; }
        public Tile At(int x, int y) { return InB(x, y) ? Tiles[Idx(x, y)] : null; }
        public static int Cheb(int ax, int ay, int bx, int by)
        {
            return Math.Max(Math.Abs(ax - bx), Math.Abs(ay - by));
        }

        public IEnumerable<Tile> Nbrs(int x, int y)
        {
            for (int dy = -1; dy <= 1; dy++)
                for (int dx = -1; dx <= 1; dx++)
                {
                    if (dx == 0 && dy == 0) continue;
                    var t = At(x + dx, y + dy);
                    if (t != null) yield return t;
                }
        }

        void GenerateMap()
        {
            int s = Size;
            Tiles = new Tile[s * s];
            for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                    Tiles[Idx(x, y)] = new Tile { X = x, Y = y, Seen = new bool[Players.Count] };

            // baskent konumlari
            int o = Math.Max(2, (int)(s * 0.18f));
            int m = s / 2;
            var spots = new List<int[]>();
            if (Players.Count <= 2)
            {
                spots.Add(new[] { o, o });
                spots.Add(new[] { s - 1 - o, s - 1 - o });
            }
            else
            {
                spots.Add(new[] { o, o });
                spots.Add(new[] { s - 1 - o, o });
                spots.Add(new[] { m, s - 1 - o });
            }

            // 1) kara arazi, kabile egilimiyle
            for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                {
                    int wField = 46, wForest = 28, wMount = 14;
                    int near = -1, nd = 99;
                    for (int i = 0; i < Players.Count && i < spots.Count; i++)
                    {
                        int d = Cheb(x, y, spots[i][0], spots[i][1]);
                        if (d < nd) { nd = d; near = i; }
                    }
                    if (nd <= 4 && near >= 0)
                    {
                        switch (Players[near].Tribe.Bias)
                        {
                            case Bias.Mountain: wMount += 30; break;
                            case Bias.Forest: wForest += 34; break;
                            case Bias.Field: wField += 34; break;
                            case Bias.Plain: wField += 46; wForest -= 16; wMount -= 7; break;
                        }
                    }
                    At(x, y).Terr = WeightedTerrain(wField, wForest, wMount);
                }

            // 2) goller
            int lakes = Math.Max(3, (s * s) / 24);
            for (int i = 0; i < lakes; i++) MakeLake(rng.Next(s), rng.Next(s), 3 + rng.Next(6));
            for (int i = 0; i < Players.Count && i < spots.Count; i++)
            {
                if (Players[i].Tribe.Bias != Bias.Water) continue;
                for (int k = 0; k < 3; k++)
                    MakeLake(spots[i][0] - 2 + rng.Next(5), spots[i][1] - 2 + rng.Next(5), 4 + rng.Next(5));
            }

            // 3) kaynaklar
            foreach (var t in Tiles)
            {
                double r = rng.NextDouble();
                if (t.Terr == Terrain.Field) { if (r < 0.18) t.Res = Res.Fruit; else if (r < 0.33) t.Res = Res.Crop; }
                else if (t.Terr == Terrain.Forest) { if (r < 0.30) t.Res = Res.Game; }
                else if (t.Terr == Terrain.Mountain) { if (r < 0.38) t.Res = Res.Metal; }
                else if (t.Terr == Terrain.Water) { if (r < 0.26) t.Res = Res.Fish; }
            }

            // 4) baskentler
            for (int i = 0; i < Players.Count; i++)
            {
                int cx = spots[i][0], cy = spots[i][1];
                var cap = At(cx, cy);
                cap.Terr = Terrain.Field; cap.Res = Res.None;
                foreach (var n in Nbrs(cx, cy))
                    if (n.Terr == Terrain.Water) { n.Terr = Terrain.Field; n.Res = Res.None; }

                var city = AddCity(cx, cy, i, true);
                city.Level = 1; city.Pop = 0;
                SeedCapital(cx, cy, Players[i]);
                Spawn(UnitType.Warrior, cx, cy, i, city);
                Reveal(i, cx, cy, 3);
            }

            // 5) koyler
            int want = Math.Max(5, (s * s) / 16);
            int made = 0, guard = 0;
            while (made < want && guard++ < 900)
            {
                int x = rng.Next(s), y = rng.Next(s);
                var t = At(x, y);
                if (t.Terr == Terrain.Water || t.Terr == Terrain.Mountain || t.CityId >= 0) continue;
                bool ok = true;
                foreach (var c in Cities) if (Cheb(x, y, c.X, c.Y) < 3) { ok = false; break; }
                if (!ok) continue;
                t.Res = Res.None;
                AddCity(x, y, -1, false);
                made++;
            }
        }

        Terrain WeightedTerrain(int field, int forest, int mount)
        {
            int total = Math.Max(0, field) + Math.Max(0, forest) + Math.Max(0, mount);
            int r = rng.Next(Math.Max(1, total));
            if (r < Math.Max(0, field)) return Terrain.Field;
            if (r < Math.Max(0, field) + Math.Max(0, forest)) return Terrain.Forest;
            return Terrain.Mountain;
        }

        void MakeLake(int x, int y, int count)
        {
            var queue = new List<Tile>();
            var start = At(x, y);
            if (start == null) return;
            queue.Add(start);
            int made = 0, guard = 0;
            while (queue.Count > 0 && made < count && guard++ < 80)
            {
                int i = rng.Next(queue.Count);
                var t = queue[i];
                queue.RemoveAt(i);
                if (t == null || t.Terr == Terrain.Water) continue;
                t.Terr = Terrain.Water; t.Res = Res.None; made++;
                foreach (var n in Nbrs(t.X, t.Y))
                    if (rng.NextDouble() < 0.5) queue.Add(n);
            }
        }

        // Her baskentin cevresinde islenebilir kaynak olsun ki hicbir baslangic olu olmasin
        void SeedCapital(int x, int y, Player p)
        {
            var ring = new List<Tile>();
            foreach (var n in Nbrs(x, y)) if (n.CityId < 0) ring.Add(n);
            for (int i = ring.Count - 1; i > 0; i--)   // karistir
            {
                int j = rng.Next(i + 1);
                var tmp = ring[i]; ring[i] = ring[j]; ring[j] = tmp;
            }
            int k = 0;
            Action<Terrain, Res> put = (terr, res) =>
            {
                if (k >= ring.Count) return;
                var t = ring[k++];
                t.Terr = terr; t.Res = res; t.Bld = Bld.None;
            };
            put(Terrain.Field, Res.Fruit);
            put(Terrain.Field, Res.Fruit);
            put(Terrain.Field, Res.Crop);
            if (p.Tribe.Start == Tech.Hunting) put(Terrain.Forest, Res.Game);
            else if (p.Tribe.Start == Tech.Fishing) put(Terrain.Water, Res.Fish);
            else if (p.Tribe.Start == Tech.Climbing) put(Terrain.Mountain, Res.Metal);
            else put(Terrain.Field, Res.Fruit);
        }

        City AddCity(int x, int y, int owner, bool capital)
        {
            var c = new City { Id = Cities.Count, X = x, Y = y, Owner = owner, IsCapital = capital };
            Cities.Add(c);
            At(x, y).CityId = c.Id;
            if (owner >= 0) Claim(c);
            return c;
        }

        public void Claim(City c)
        {
            for (int dy = -c.Border; dy <= c.Border; dy++)
                for (int dx = -c.Border; dx <= c.Border; dx++)
                {
                    var t = At(c.X + dx, c.Y + dy);
                    if (t == null) continue;
                    if (t.CityId >= 0 && t.CityId != c.Id) continue;
                    if (t.Owner >= 0 && t.OwnCity != c.Id) continue;
                    t.Owner = c.Owner; t.OwnCity = c.Id;
                }
        }

        public void Reveal(int player, int x, int y, int r)
        {
            for (int dy = -r; dy <= r; dy++)
                for (int dx = -r; dx <= r; dx++)
                {
                    var t = At(x + dx, y + dy);
                    if (t != null) t.Seen[player] = true;
                }
        }

        public Unit Spawn(UnitType type, int x, int y, int owner, City home)
        {
            var def = DB.Units[type];
            var u = new Unit
            {
                Id = nextUnitId++,
                Type = type,
                Owner = owner,
                X = x,
                Y = y,
                Hp = def.Hp,
                MaxHp = def.Hp,
                Fresh = true,
                Home = home != null ? home.Id : -1
            };
            Units.Add(u);
            At(x, y).UnitId = u.Id;
            Reveal(owner, x, y, VisionRange(u));
            return u;
        }

        public int VisionRange(Unit u) { return At(u.X, u.Y).Terr == Terrain.Mountain ? 2 : 1; }

        public Unit GetUnit(int id)
        {
            for (int i = 0; i < Units.Count; i++) if (Units[i].Id == id) return Units[i];
            return null;
        }

        public Unit UnitAt(int x, int y)
        {
            var t = At(x, y);
            if (t == null || t.UnitId < 0) return null;
            return GetUnit(t.UnitId);
        }

        public City CityAt(int x, int y)
        {
            var t = At(x, y);
            if (t == null || t.CityId < 0) return null;
            return Cities[t.CityId];
        }

        // ---------------------------------------------------------------- hareket

        public bool Passable(Tile t, Unit u)
        {
            if (t == null) return false;
            if (DB.Terrains[t.Terr].Blocks) return false;
            if (t.Terr == Terrain.Mountain && !Players[u.Owner].Has(Tech.Climbing)) return false;
            return true;
        }

        /// <summary>Birimin bu tur gidebilecegi kareler: anahtar kare index'i, deger adim sayisi.</summary>
        public Dictionary<int, int> Moves(Unit u)
        {
            var result = new Dictionary<int, int>();
            if (u.Moved || u.Acted || u.Fresh) return result;

            var best = new Dictionary<int, int>();
            best[Idx(u.X, u.Y)] = 0;
            var queue = new Queue<Tile>();
            queue.Enqueue(At(u.X, u.Y));
            int move = u.Def.Move;

            while (queue.Count > 0)
            {
                var t = queue.Dequeue();
                int d = best[Idx(t.X, t.Y)];
                if (d >= move) continue;
                if (d > 0 && DB.Terrains[t.Terr].Stops) continue;   // orman/dag hareketi bitirir

                foreach (var n in Nbrs(t.X, t.Y))
                {
                    if (!Passable(n, u) || n.UnitId >= 0) continue;
                    int nd = d + 1, key = Idx(n.X, n.Y);
                    int had;
                    if (best.TryGetValue(key, out had) && had <= nd) continue;
                    best[key] = nd;
                    result[key] = nd;
                    queue.Enqueue(n);
                }
            }
            return result;
        }

        public List<Unit> Targets(Unit u)
        {
            var list = new List<Unit>();
            if (u.Acted || u.Fresh) return list;
            if (u.Moved && !u.Def.Dash) return list;
            int r = u.Def.Range;
            for (int dy = -r; dy <= r; dy++)
                for (int dx = -r; dx <= r; dx++)
                {
                    var v = UnitAt(u.X + dx, u.Y + dy);
                    if (v != null && v.Owner != u.Owner) list.Add(v);
                }
            return list;
        }

        public void MoveUnit(Unit u, int x, int y)
        {
            At(u.X, u.Y).UnitId = -1;
            u.X = x; u.Y = y;
            At(x, y).UnitId = u.Id;
            u.Moved = true;
            Reveal(u.Owner, x, y, VisionRange(u));
        }

        public void Rest(Unit u)
        {
            bool own = At(u.X, u.Y).Owner == u.Owner;
            u.Hp = Math.Min(u.MaxHp, u.Hp + (own ? 4 : 2));
            u.Moved = true; u.Acted = true;
        }

        // ---------------------------------------------------------------- savas

        public float DefenceBonus(Unit u)
        {
            var t = At(u.X, u.Y);
            if (t.CityId >= 0)
            {
                var c = Cities[t.CityId];
                if (c.Owner == u.Owner) return c.Walls ? 3f : 1.5f;
            }
            return DB.Terrains[t.Terr].DefBonus;
        }

        static int RoundHalfUp(float v) { return (int)Math.Floor(v + 0.5f); }

        public int PreviewDamage(Unit a, Unit d)
        {
            float aF = a.Def.Atk * ((float)a.Hp / a.MaxHp);
            float dF = d.Def.Def * ((float)d.Hp / d.MaxHp) * DefenceBonus(d);
            float total = aF + dF;
            if (total <= 0f) return 0;
            return RoundHalfUp((aF / total) * a.Def.Atk * 4.5f);
        }

        public int PreviewRetaliation(Unit a, Unit d)
        {
            if (Cheb(a.X, a.Y, d.X, d.Y) > d.Def.Range) return 0;
            float aF = a.Def.Atk * ((float)a.Hp / a.MaxHp);
            float dF = d.Def.Def * ((float)d.Hp / d.MaxHp) * DefenceBonus(d);
            float total = aF + dF;
            if (total <= 0f) return 0;
            return RoundHalfUp((dF / total) * d.Def.Def * 4.5f);
        }

        /// <summary>Polytopia'nin hasar formulu: guc = deger * (can / maks can).</summary>
        public void Attack(Unit a, Unit d)
        {
            int dmg = PreviewDamage(a, d);
            int ret = PreviewRetaliation(a, d);
            d.Hp -= dmg;
            a.Moved = true;

            if (d.Hp <= 0)
            {
                string victim = d.Def.Name;
                Kill(d);
                a.Kills++;
                if (a.Kills >= 3 && !a.Veteran && !a.Def.Super)
                {
                    a.Veteran = true; a.MaxHp += 5; a.Hp = a.MaxHp;
                    Say(a.Def.Name + " gazi oldu: +5 can");
                }
                if (a.Def.Persist) { a.Acted = false; a.Moved = true; }  // Sovalye tekrar vurur
                else a.Acted = true;
                Say(a.Def.Name + " " + victim + " birimini yok etti (" + dmg + " hasar)");
            }
            else
            {
                if (ret > 0) a.Hp -= ret;
                a.Acted = true;
                if (a.Hp <= 0) { Say(a.Def.Name + " karsi saldiride dustu"); Kill(a); }
                else Say(dmg + " hasar verildi, " + ret + " hasar alindi");
            }
        }

        public void Kill(Unit u)
        {
            var t = At(u.X, u.Y);
            if (t.UnitId == u.Id) t.UnitId = -1;
            Units.Remove(u);
        }

        // ---------------------------------------------------------------- sehirler

        public bool CanCapture(Unit u)
        {
            var c = CityAt(u.X, u.Y);
            return c != null && c.Owner != u.Owner && u.CanAct;
        }

        public void Capture(Unit u)
        {
            var c = CityAt(u.X, u.Y);
            if (c == null) return;
            int old = c.Owner;
            c.Owner = u.Owner;
            if (c.Level == 0) { c.Level = 1; c.Pop = 0; }
            Claim(c);
            foreach (var v in Units) if (v.Home == c.Id && v.Owner != c.Owner) v.Home = -1;
            u.Acted = true; u.Moved = true;
            Reveal(u.Owner, c.X, c.Y, c.IsCapital ? 2 : 1);
            Say(old < 0
                ? Players[u.Owner].Name + " bir koyu ele gecirdi"
                : Players[u.Owner].Name + ", " + Players[old].Name + " sehrini aldi");
            CheckElimination();
        }

        public int UnitsOf(City c)
        {
            int n = 0;
            foreach (var u in Units) if (u.Home == c.Id) n++;
            return n;
        }

        public int CityCount(Player p)
        {
            int n = 0;
            foreach (var c in Cities) if (c.Owner == p.Id) n++;
            return n;
        }

        public bool CanTrain(City c, UnitType type, out string why)
        {
            why = "";
            var def = DB.Units[type];
            var p = Players[c.Owner];
            if (def.Super) { why = "satin alinamaz"; return false; }
            if (def.NeedsTech && !p.Has(def.Need)) { why = DB.Techs[def.Need].Name + " gerekli"; return false; }
            if (p.Stars < def.Cost) { why = "yildiz yetmiyor"; return false; }
            if (UnitsOf(c) >= c.UnitCap) { why = "birim siniri dolu"; return false; }
            if (At(c.X, c.Y).UnitId >= 0) { why = "sehir karesi mesgul"; return false; }
            return true;
        }

        public bool Train(City c, UnitType type)
        {
            string why;
            if (!CanTrain(c, type, out why)) return false;
            var p = Players[c.Owner];
            p.Stars -= DB.Units[type].Cost;
            Spawn(type, c.X, c.Y, c.Owner, c);
            return true;
        }

        public void AddPop(City c, int n)
        {
            c.Pop += n;
            while (c.Pop >= c.PopNeeded)
            {
                c.Pop -= c.PopNeeded;
                c.Level++;
                if (c.Owner == Human) PendingRewards.Add(c);
                else AutoReward(c);
            }
        }

        public void ApplyReward(City c, Reward r)
        {
            var p = Players[c.Owner];
            switch (r)
            {
                case Reward.Workshop: c.Shop++; break;
                case Reward.Treasure: p.Stars += 5; break;
                case Reward.Walls: c.Walls = true; break;
                case Reward.Boom: AddPop(c, 3); break;
                case Reward.Border: c.Border = Math.Min(3, c.Border + 1); Claim(c); break;
                case Reward.Park: c.Park = true; break;
                case Reward.Giant:
                    if (At(c.X, c.Y).UnitId < 0) Spawn(UnitType.Giant, c.X, c.Y, c.Owner, c);
                    else p.Stars += 5;
                    break;
                case Reward.Scout:
                    Reveal(c.Owner, c.X + rng.Next(5) - 2, c.Y + rng.Next(5) - 2, 3);
                    Reveal(c.Owner, c.X, c.Y, 3);
                    break;
            }
        }

        void AutoReward(City c)
        {
            int lvl = Math.Min(5, c.Level);
            if (lvl == 2) ApplyReward(c, Reward.Workshop);
            else if (lvl == 3) ApplyReward(c, rng.NextDouble() < 0.45 ? Reward.Walls : Reward.Treasure);
            else if (lvl == 4) ApplyReward(c, Reward.Boom);
            else ApplyReward(c, rng.NextDouble() < 0.7 ? Reward.Giant : Reward.Park);
        }

        // ---------------------------------------------------------------- kaynak isleme

        /// <summary>Bu karede oyuncunun yapabilecegi is var mi? (meyve topla, ciftlik kur...)</summary>
        public bool CanWork(Tile t, Player p, out string label, out int cost)
        {
            label = ""; cost = 0;
            if (t == null || t.Owner != p.Id || t.CityId >= 0 || t.Bld != Bld.None) return false;
            if (t.OwnCity < 0) return false;

            if (t.Res != Res.None)
            {
                var r = DB.Resources[t.Res];
                if (!p.Has(r.Need)) return false;
                label = r.Action; cost = r.Cost;
                return true;
            }
            if (t.Terr == Terrain.Forest && p.Has(Tech.Forestry))
            {
                label = "Kereste kulubesi"; cost = DB.LumberCost; return true;
            }
            if (t.Terr == Terrain.Water && p.Has(Tech.Aquaculture))
            {
                label = "Liman kur"; cost = DB.PortCost; return true;
            }
            return false;
        }

        public bool Work(Tile t, Player p)
        {
            string label; int cost;
            if (!CanWork(t, p, out label, out cost)) return false;
            if (p.Stars < cost) return false;
            p.Stars -= cost;

            int pop;
            if (t.Res != Res.None)
            {
                var r = DB.Resources[t.Res];
                pop = r.Pop;
                if (r.Build != Bld.None) t.Bld = r.Build;
                t.Res = Res.None;
            }
            else if (t.Terr == Terrain.Forest) { t.Bld = Bld.Lumber; pop = DB.LumberPop; }
            else { t.Bld = Bld.Port; pop = DB.PortPop; }

            AddPop(Cities[t.OwnCity], pop);
            return true;
        }

        // ---------------------------------------------------------------- teknoloji

        public int TechCost(Player p, Tech t) { return DB.Techs[t].Tier * 4 + CityCount(p); }

        public bool CanResearch(Player p, Tech t)
        {
            if (p.Has(t)) return false;
            var def = DB.Techs[t];
            if (def.HasReq && !p.Has(def.Req)) return false;
            return p.Stars >= TechCost(p, t);
        }

        public bool Research(Player p, Tech t)
        {
            if (!CanResearch(p, t)) return false;
            p.Stars -= TechCost(p, t);
            p.Techs.Add(t);
            return true;
        }

        // ---------------------------------------------------------------- tur akisi

        public int Income(Player p)
        {
            int s = 0;
            foreach (var c in Cities)
                if (c.Owner == p.Id) s += c.Level + (c.IsCapital ? 1 : 0) + c.Shop;
            if (p.IsAI) s += Difficulty == 0 ? 0 : (Difficulty == 1 ? 1 : 3);
            return s;
        }

        public int Score(Player p)
        {
            int s = 0;
            foreach (var c in Cities)
                if (c.Owner == p.Id)
                    s += c.Level * 120 + (c.IsCapital ? 60 : 0) + c.Pop * 5
                       + (c.Walls ? 40 : 0) + (c.Park ? 250 : 0) + c.Shop * 40;
            foreach (var u in Units)
                if (u.Owner == p.Id) s += Math.Max(8, u.Def.Cost) * 6;
            foreach (var t in p.Techs) s += DB.Techs[t].Tier * 100;
            foreach (var t in Tiles) if (t.Owner == p.Id) s += 4;
            return s;
        }

        public void StartTurnFor(Player p)
        {
            p.Stars += Income(p);
            foreach (var u in Units)
                if (u.Owner == p.Id) { u.Moved = false; u.Acted = false; u.Fresh = false; }
        }

        /// <summary>Sirayi bir sonraki yasayan oyuncuya gecirir. Tur limiti dolarsa oyunu bitirir.</summary>
        public Player NextPlayer()
        {
            int next = Cur;
            do
            {
                next = (next + 1) % Players.Count;
                if (next == 0)
                {
                    Turn++;
                    if (Turn > MaxTurn) { Finish("Tur limiti doldu"); return Current; }
                }
            } while (!Players[next].Alive);

            Cur = next;
            StartTurnFor(Players[next]);
            return Players[next];
        }

        public void CheckElimination()
        {
            foreach (var p in Players)
            {
                if (!p.Alive || CityCount(p) > 0) continue;
                p.Alive = false;
                for (int i = Units.Count - 1; i >= 0; i--)
                    if (Units[i].Owner == p.Id) Kill(Units[i]);
                Say(p.Name + " elendi");
            }
            int alive = 0;
            foreach (var p in Players) if (p.Alive) alive++;
            if (alive <= 1 || !Me.Alive)
                Finish(Me.Alive ? "Tum rakipler elendi" : "Son sehrini kaybettin");
        }

        public void Finish(string reason)
        {
            if (Over) return;
            Over = true;
            OverReason = reason;
        }

        public Player Winner()
        {
            Player best = null;
            foreach (var p in Players)
            {
                if (!p.Alive) continue;
                if (best == null || Score(p) > Score(best)) best = p;
            }
            return best ?? Players[0];
        }

        public void Say(string msg)
        {
            Log.Add(msg);
            if (Log.Count > 40) Log.RemoveAt(0);
        }

        public int Rand(int n) { return rng.Next(n); }
        public double Rand01() { return rng.NextDouble(); }
    }
}
