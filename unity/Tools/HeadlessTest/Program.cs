using System;
using System.Collections.Generic;
using Kabileler;

// Unity'yi hic acmadan oyun kurallarini test eder.
// Derlemek icin (Windows'ta Unity'nin mono'su veya .NET SDK ile):
//   mcs -out:test.exe Tools/HeadlessTest/Program.cs Assets/Kabileler/Scripts/Core/*.cs
//   mono test.exe 200
// Ciktisi: kim kac kez kazanmis, oyunlar kac turda bitmis, ortalama sehir/teknoloji sayisi.
// Denge degisikligi yaptiginda (birim gucu, yildiz maliyeti...) bunu tekrar calistir.
public static class Program
{
    public static void Main(string[] args)
    {
        int games = args.Length > 0 ? int.Parse(args[0]) : 50;
        var wins = new Dictionary<string, int>();
        var rnd = new Random(12345);
        double turnSum = 0, cities = 0, techs = 0;
        int earlyEnd = 0;

        for (int i = 0; i < games; i++)
        {
            int size = new[] { 10, 12, 14 }[i % 3];
            var g = new GameState(size, i % DB.Tribes.Count, (i % 2) + 1, i % 3, 25, rnd.Next());
            var ai = new AIBrain();

            int guard = 0;
            while (!g.Over && guard++ < 400)
            {
                var p = g.Current;
                foreach (var step in ai.Play(g, p)) { }      // hamleleri sonuna kadar oynat
                FlushRewards(g);
                if (g.Over) break;
                g.NextPlayer();
            }

            if (g.Turn <= 25) earlyEnd++;
            turnSum += g.Turn;
            var w = g.Winner();
            string key = w.Tribe.Name;
            wins[key] = (wins.ContainsKey(key) ? wins[key] : 0) + 1;
            cities += g.CityCount(w);
            techs += w.Techs.Count;
        }

        Console.WriteLine("Oyun sayisi: " + games);
        Console.WriteLine("Ortalama tur: " + (turnSum / games).ToString("0.0")
                          + "  |  sureden once biten: " + earlyEnd);
        Console.WriteLine("Kazananin ortalama sehri: " + (cities / games).ToString("0.0")
                          + "  |  teknolojisi: " + (techs / games).ToString("0.0"));
        Console.WriteLine("--- kabile galibiyetleri ---");
        foreach (var kv in wins)
            Console.WriteLine("  " + kv.Key.PadRight(16) + kv.Value + "  (%" + (100.0 * kv.Value / games).ToString("0") + ")");
    }

    // Insan oyuncunun odul secimini simulasyonda rastgele yapar
    static void FlushRewards(GameState g)
    {
        var r = new Random(g.Turn * 7 + 13);
        while (g.PendingRewards.Count > 0)
        {
            var c = g.PendingRewards[0];
            g.PendingRewards.RemoveAt(0);
            var opts = DB.RewardsFor(Math.Min(5, c.Level));
            g.ApplyReward(c, opts[r.Next(opts.Length)]);
        }
    }
}
