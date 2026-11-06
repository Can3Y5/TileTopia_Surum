using System.Collections.Generic;

// Bu dosya saf C# - icinde UnityEngine yok.
// Boylece oyun kurallarini Unity'den bagimsiz test edebilirsin.
namespace Kabileler
{
    public enum Terrain { Field, Forest, Mountain, Water }
    public enum Res { None, Fruit, Crop, Game, Metal, Fish }
    public enum Bld { None, Farm, Mine, Lumber, Port }
    public enum UnitType { Warrior, Rider, Archer, Defender, Swordsman, Knight, Catapult, Giant }
    public enum Tech
    {
        Organization, Hunting, Fishing, Climbing, Riding,
        Farming, Strategy, Archery, Forestry, Mining, Aquaculture,
        Smithery, Chivalry, Mathematics
    }
    public enum Bias { Field, Forest, Mountain, Water, Plain }
    public enum Reward { Workshop, Scout, Walls, Treasure, Boom, Border, Park, Giant }

    public class TerrainDef
    {
        public string Name;
        public float R, G, B;
        public bool Blocks;     // uzerinden gecilemez (su)
        public bool Stops;      // uzerine girince hareket biter (orman, dag)
        public float DefBonus;  // savunma carpani
    }

    public class ResDef
    {
        public string Name;
        public Terrain On;
        public Tech Need;
        public string Action;
        public int Cost;
        public int Pop;
        public Bld Build;       // Bld.None ise kaynak sadece toplanir
    }

    public class UnitDef
    {
        public string Name;
        public int Cost, Hp, Move, Range;
        public float Atk, Def;
        public bool Dash;       // hareket ettikten sonra saldirabilir
        public bool Persist;    // oldurunce tekrar saldirir (Sovalye)
        public bool Super;      // sehir odulu, satin alinamaz
        public bool NeedsTech;
        public Tech Need;
    }

    public class TechDef
    {
        public string Name;
        public int Tier;
        public bool HasReq;
        public Tech Req;
        public string Info;
    }

    public class TribeDef
    {
        public string Name;
        public float R, G, B;
        public Tech Start;
        public Bias Bias;
    }

    /// <summary>Tum sabit oyun verisi. Dengeyi buradan ayarlarsin.</summary>
    public static class DB
    {
        public static readonly Dictionary<Terrain, TerrainDef> Terrains = new Dictionary<Terrain, TerrainDef>
        {
            { Terrain.Field,    new TerrainDef { Name = "Ova",   R = 0.49f, G = 0.77f, B = 0.40f, DefBonus = 1f } },
            { Terrain.Forest,   new TerrainDef { Name = "Orman", R = 0.29f, G = 0.60f, B = 0.33f, Stops = true, DefBonus = 1.5f } },
            { Terrain.Mountain, new TerrainDef { Name = "Dag",   R = 0.65f, G = 0.64f, B = 0.60f, Stops = true, DefBonus = 1.5f } },
            { Terrain.Water,    new TerrainDef { Name = "Su",    R = 0.31f, G = 0.64f, B = 0.87f, Blocks = true, DefBonus = 1f } },
        };

        public static readonly Dictionary<Res, ResDef> Resources = new Dictionary<Res, ResDef>
        {
            { Res.Fruit, new ResDef { Name = "Meyve", On = Terrain.Field,    Need = Tech.Organization, Action = "Meyve topla", Cost = 2, Pop = 1, Build = Bld.None } },
            { Res.Crop,  new ResDef { Name = "Ekin",  On = Terrain.Field,    Need = Tech.Farming,      Action = "Ciftlik kur",  Cost = 5, Pop = 2, Build = Bld.Farm } },
            { Res.Game,  new ResDef { Name = "Av",    On = Terrain.Forest,   Need = Tech.Hunting,      Action = "Avlan",        Cost = 2, Pop = 1, Build = Bld.None } },
            { Res.Metal, new ResDef { Name = "Maden", On = Terrain.Mountain, Need = Tech.Mining,       Action = "Maden ocagi",  Cost = 5, Pop = 2, Build = Bld.Mine } },
            { Res.Fish,  new ResDef { Name = "Balik", On = Terrain.Water,    Need = Tech.Fishing,      Action = "Balik tut",    Cost = 2, Pop = 1, Build = Bld.None } },
        };

        // Kaynaksiz karelere kurulan yapilar
        public const int LumberCost = 3, LumberPop = 1;
        public const int PortCost = 6, PortPop = 2;

        public static readonly Dictionary<UnitType, UnitDef> Units = new Dictionary<UnitType, UnitDef>
        {
            { UnitType.Warrior,   new UnitDef { Name = "Savasci",  Cost = 2, Hp = 10, Atk = 2f,   Def = 2f, Move = 1, Range = 1, Dash = true } },
            { UnitType.Rider,     new UnitDef { Name = "Atli",     Cost = 3, Hp = 10, Atk = 2f,   Def = 1f, Move = 2, Range = 1, Dash = true, NeedsTech = true, Need = Tech.Riding } },
            { UnitType.Archer,    new UnitDef { Name = "Okcu",     Cost = 3, Hp = 10, Atk = 2f,   Def = 1f, Move = 1, Range = 2, Dash = true, NeedsTech = true, Need = Tech.Archery } },
            { UnitType.Defender,  new UnitDef { Name = "Muhafiz",  Cost = 3, Hp = 15, Atk = 1f,   Def = 3f, Move = 1, Range = 1, Dash = false, NeedsTech = true, Need = Tech.Strategy } },
            { UnitType.Swordsman, new UnitDef { Name = "Kilicci",  Cost = 5, Hp = 15, Atk = 3f,   Def = 3f, Move = 1, Range = 1, Dash = true, NeedsTech = true, Need = Tech.Smithery } },
            { UnitType.Knight,    new UnitDef { Name = "Sovalye",  Cost = 8, Hp = 10, Atk = 3.5f, Def = 1f, Move = 3, Range = 1, Dash = true, Persist = true, NeedsTech = true, Need = Tech.Chivalry } },
            { UnitType.Catapult,  new UnitDef { Name = "Mancinik", Cost = 8, Hp = 10, Atk = 4f,   Def = 0f, Move = 1, Range = 3, Dash = false, NeedsTech = true, Need = Tech.Mathematics } },
            { UnitType.Giant,     new UnitDef { Name = "Dev",      Cost = 0, Hp = 40, Atk = 5f,   Def = 4f, Move = 1, Range = 1, Dash = true, Super = true } },
        };

        public static readonly Dictionary<Tech, TechDef> Techs = new Dictionary<Tech, TechDef>
        {
            { Tech.Organization, new TechDef { Name = "Orgutlenme",  Tier = 1, Info = "Meyve toplamayi acar" } },
            { Tech.Hunting,      new TechDef { Name = "Avcilik",     Tier = 1, Info = "Av avlamayi acar" } },
            { Tech.Fishing,      new TechDef { Name = "Balikcilik",  Tier = 1, Info = "Balik tutmayi acar" } },
            { Tech.Climbing,     new TechDef { Name = "Tirmanis",    Tier = 1, Info = "Daglara cikarsin, dagdan gorus 2 kare" } },
            { Tech.Riding,       new TechDef { Name = "Binicilik",   Tier = 1, Info = "Atli birimini acar" } },

            { Tech.Farming,      new TechDef { Name = "Tarim",       Tier = 2, HasReq = true, Req = Tech.Organization, Info = "Ekine ciftlik: +2 nufus" } },
            { Tech.Strategy,     new TechDef { Name = "Strateji",    Tier = 2, HasReq = true, Req = Tech.Organization, Info = "Muhafiz birimini acar" } },
            { Tech.Archery,      new TechDef { Name = "Okculuk",     Tier = 2, HasReq = true, Req = Tech.Hunting,      Info = "Okcu birimini acar" } },
            { Tech.Forestry,     new TechDef { Name = "Ormancilik",  Tier = 2, HasReq = true, Req = Tech.Hunting,      Info = "Ormana kereste kulubesi: +1 nufus" } },
            { Tech.Mining,       new TechDef { Name = "Madencilik",  Tier = 2, HasReq = true, Req = Tech.Climbing,     Info = "Madene ocak: +2 nufus" } },
            { Tech.Aquaculture,  new TechDef { Name = "Su urunleri", Tier = 2, HasReq = true, Req = Tech.Fishing,      Info = "Suya liman: +2 nufus" } },

            { Tech.Smithery,     new TechDef { Name = "Demircilik",  Tier = 3, HasReq = true, Req = Tech.Farming, Info = "Kilicci birimini acar" } },
            { Tech.Chivalry,     new TechDef { Name = "Sovalyelik",  Tier = 3, HasReq = true, Req = Tech.Riding,  Info = "Sovalye birimini acar" } },
            { Tech.Mathematics,  new TechDef { Name = "Matematik",   Tier = 3, HasReq = true, Req = Tech.Mining,  Info = "Mancinik birimini acar" } },
        };

        public static readonly List<TribeDef> Tribes = new List<TribeDef>
        {
            new TribeDef { Name = "Alazlar",       R = 0.91f, G = 0.33f, B = 0.25f, Start = Tech.Climbing,     Bias = Bias.Mountain },
            new TribeDef { Name = "Ovalilar",      R = 0.25f, G = 0.53f, B = 0.88f, Start = Tech.Organization, Bias = Bias.Field },
            new TribeDef { Name = "Yabanlar",      R = 0.18f, G = 0.48f, B = 0.27f, Start = Tech.Hunting,      Bias = Bias.Forest },
            new TribeDef { Name = "Bozkirlar",     R = 0.91f, G = 0.69f, B = 0.16f, Start = Tech.Riding,       Bias = Bias.Plain },
            new TribeDef { Name = "Denizogullari", R = 0.10f, G = 0.71f, B = 0.79f, Start = Tech.Fishing,      Bias = Bias.Water },
        };

        /// <summary>Sehir seviyesine gore sunulan iki odul.</summary>
        public static Reward[] RewardsFor(int level)
        {
            if (level == 2) return new[] { Reward.Workshop, Reward.Scout };
            if (level == 3) return new[] { Reward.Walls, Reward.Treasure };
            if (level == 4) return new[] { Reward.Boom, Reward.Border };
            return new[] { Reward.Park, Reward.Giant };
        }

        public static string RewardName(Reward r)
        {
            switch (r)
            {
                case Reward.Workshop: return "Atolye";
                case Reward.Scout: return "Kasif";
                case Reward.Walls: return "Surlar";
                case Reward.Treasure: return "Hazine";
                case Reward.Boom: return "Nufus patlamasi";
                case Reward.Border: return "Sinir genislemesi";
                case Reward.Park: return "Anit park";
                default: return "Dev";
            }
        }

        public static string RewardInfo(Reward r)
        {
            switch (r)
            {
                case Reward.Workshop: return "Bu sehir her tur +1 yildiz uretir";
                case Reward.Scout: return "Sehrin cevresinde genis bir alani kesfeder";
                case Reward.Walls: return "Sehirdeki birimlerin savunmasi 3 katina cikar";
                case Reward.Treasure: return "Aninda +5 yildiz";
                case Reward.Boom: return "Sehre aninda +3 nufus";
                case Reward.Border: return "Sehrin siniri 1 kare buyur";
                case Reward.Park: return "+250 puan, sonsuza dek";
                default: return "Sehirde 40 canli bir Dev belirir";
            }
        }
    }
}
