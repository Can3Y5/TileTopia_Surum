using System.Collections.Generic;

namespace Kabileler
{
    public class Tile
    {
        public int X, Y;
        public Terrain Terr = Terrain.Field;
        public Res Res = Res.None;
        public Bld Bld = Bld.None;
        public int CityId = -1;   // bu karede sehir/koy varsa id
        public int Owner = -1;    // toprak sahibi oyuncu
        public int OwnCity = -1;  // topragi tutan sehir
        public int UnitId = -1;   // karedeki birim
        public bool[] Seen;       // her oyuncu icin kesfedildi mi
    }

    public class City
    {
        public int Id, X, Y;
        public int Owner = -1;    // -1 = sahipsiz koy
        public int Level, Pop;
        public bool IsCapital, Walls, Park;
        public int Shop;          // atolye sayisi (her biri +1 yildiz)
        public int Border = 1;    // sinir yaricapi
        public int PopNeeded { get { return Level + 1; } }
        public int UnitCap { get { return Level + 1; } }
    }

    public class Unit
    {
        public int Id;
        public UnitType Type;
        public int Owner, X, Y;
        public int Hp, MaxHp;
        public int Kills;
        public bool Veteran;
        public bool Moved, Acted;
        public bool Fresh;        // bu tur uretildi, oynayamaz
        public int Home = -1;     // bagli oldugu sehir (birim limiti icin)

        public UnitDef Def { get { return DB.Units[Type]; } }
        public bool CanAct { get { return !Acted && !Fresh; } }
    }

    public class Player
    {
        public int Id;
        public TribeDef Tribe;
        public string Name;
        public int Stars = 5;
        public HashSet<Tech> Techs = new HashSet<Tech>();
        public bool IsAI;
        public bool Alive = true;

        public bool Has(Tech t) { return Techs.Contains(t); }
    }

    /// <summary>Yapay zekanin urettigi tek bir hamlenin aciklamasi (animasyon icin).</summary>
    public struct AIStep
    {
        public string Text;
        public AIStep(string text) { Text = text; }
    }
}
