using System.Collections.Generic;
using UnityEngine;

namespace Kabileler
{
    /// <summary>
    /// Arayuz. Sahnede Canvas kurmaya gerek kalmasin diye OnGUI ile cizilir.
    /// Gorsel olarak daha iyisini istedigin zaman bunun yerine uGUI/UI Toolkit
    /// kullanabilirsin; oyun mantigi bu dosyaya hic bagli degil.
    /// </summary>
    public class GameHUD : MonoBehaviour
    {
        public GameBootstrap Boot;

        enum Window { None, Tech, City, Reward, Over }
        Window window = Window.None;
        City openCity;
        Vector2 techScroll;

        readonly List<string> toasts = new List<string>();
        readonly List<float> toastTime = new List<float>();
        int logSeen;

        GUIStyle sLabel, sSmall, sTitle, sBtn, sBtnGold, sPanel, sBar;
        Texture2D texPanel, texDark, texGold, texWhite, texRed, texGreen;

        float S { get { return Mathf.Max(1f, Screen.height / 800f); } }
        float TopH { get { return 42f * S; } }
        float BarH { get { return 72f * S; } }

        GameState G { get { return Boot != null ? Boot.G : null; } }

        // ------------------------------------------------------------------ stil

        Texture2D Solid(Color c)
        {
            var t = new Texture2D(1, 1);
            t.SetPixel(0, 0, c);
            t.Apply();
            return t;
        }

        void EnsureStyles()
        {
            if (sLabel != null) return;

            texPanel = Solid(new Color(0.09f, 0.13f, 0.16f, 0.96f));
            texDark = Solid(new Color(0.13f, 0.18f, 0.22f, 1f));
            texGold = Solid(new Color(0.95f, 0.69f, 0.2f, 1f));
            texWhite = Solid(Color.white);
            texRed = Solid(new Color(0.88f, 0.35f, 0.29f));
            texGreen = Solid(new Color(0.37f, 0.79f, 0.54f));

            sLabel = new GUIStyle(GUI.skin.label);
            sLabel.fontSize = Mathf.RoundToInt(15 * S);
            sLabel.normal.textColor = new Color(0.93f, 0.96f, 0.98f);

            sSmall = new GUIStyle(sLabel);
            sSmall.fontSize = Mathf.RoundToInt(12 * S);
            sSmall.normal.textColor = new Color(0.62f, 0.70f, 0.76f);
            sSmall.wordWrap = true;

            sTitle = new GUIStyle(sLabel);
            sTitle.fontSize = Mathf.RoundToInt(21 * S);
            sTitle.fontStyle = FontStyle.Bold;

            sBtn = new GUIStyle(GUI.skin.button);
            sBtn.fontSize = Mathf.RoundToInt(14 * S);
            sBtn.normal.background = texDark;
            sBtn.hover.background = texDark;
            sBtn.active.background = texGold;
            sBtn.normal.textColor = Color.white;
            sBtn.hover.textColor = new Color(1f, 0.87f, 0.55f);
            sBtn.wordWrap = true;

            sBtnGold = new GUIStyle(sBtn);
            sBtnGold.normal.background = texGold;
            sBtnGold.hover.background = texGold;
            sBtnGold.normal.textColor = new Color(0.1f, 0.13f, 0.16f);
            sBtnGold.hover.textColor = new Color(0.1f, 0.13f, 0.16f);
            sBtnGold.fontStyle = FontStyle.Bold;

            sPanel = new GUIStyle(GUI.skin.box);
            sPanel.normal.background = texPanel;

            sBar = new GUIStyle(sPanel);
        }

        public void Toast(string text)
        {
            if (string.IsNullOrEmpty(text)) return;
            toasts.Add(text);
            toastTime.Add(Time.time);
            while (toasts.Count > 4) { toasts.RemoveAt(0); toastTime.RemoveAt(0); }
        }

        void PullLog()
        {
            if (G == null) return;
            for (int i = logSeen; i < G.Log.Count; i++) Toast(G.Log[i]);
            logSeen = G.Log.Count;
        }

        /// <summary>Fare arayuzun uzerindeyse tahtaya tiklamayi engelleriz.</summary>
        public bool MouseOverUI(Vector3 mousePos)
        {
            if (G == null) return true;
            if (window != Window.None) return true;
            float y = Screen.height - mousePos.y;
            if (y < TopH || y > Screen.height - BarH) return true;
            return false;
        }

        // ------------------------------------------------------------------ cizim

        void OnGUI()
        {
            EnsureStyles();
            if (Boot == null) return;

            if (G == null) { DrawMenu(); return; }

            PullLog();
            DrawWorldLabels();
            DrawTopBar();
            DrawActionBar();
            DrawToasts();

            if (G.PendingRewards.Count > 0) window = Window.Reward;
            if (G.Over && window != Window.Over) window = Window.Over;

            switch (window)
            {
                case Window.Tech: DrawTech(); break;
                case Window.City: DrawCity(); break;
                case Window.Reward: DrawReward(); break;
                case Window.Over: DrawOver(); break;
            }
        }

        void DrawMenu()
        {
            float w = Mathf.Min(560f * S, Screen.width - 20f);
            float h = Mathf.Min(560f * S, Screen.height - 20f);
            var r = new Rect((Screen.width - w) / 2f, (Screen.height - h) / 2f, w, h);
            GUI.Box(r, "", sPanel);

            float x = r.x + 18f * S, y = r.y + 16f * S, iw = w - 36f * S;
            GUI.Label(new Rect(x, y, iw, 34f * S), "KABILELER", sTitle); y += 34f * S;
            GUI.Label(new Rect(x, y, iw, 22f * S), "tur bazli fetih - bir tur, bir hamle, bir kita", sSmall);
            y += 30f * S;

            GUI.Label(new Rect(x, y, iw, 20f * S), "Kabile", sLabel); y += 24f * S;
            float bw = iw / DB.Tribes.Count - 4f * S;
            for (int i = 0; i < DB.Tribes.Count; i++)
            {
                var t = DB.Tribes[i];
                var br = new Rect(x + i * (bw + 4f * S), y, bw, 54f * S);
                GUI.backgroundColor = Boot.TribeIndex == i ? new Color(t.R, t.G, t.B) : Color.white;
                if (GUI.Button(br, t.Name + "\n" + DB.Techs[t.Start].Name, Boot.TribeIndex == i ? sBtnGold : sBtn))
                    Boot.TribeIndex = i;
                GUI.backgroundColor = Color.white;
            }
            y += 64f * S;

            y = Row(x, y, iw, "Rakip", new[] { "1 rakip", "2 rakip" }, Boot.Opponents - 1, v => Boot.Opponents = v + 1);
            y = Row(x, y, iw, "Zorluk", new[] { "Kolay", "Normal", "Zor" }, Boot.Difficulty, v => Boot.Difficulty = v);
            y = Row(x, y, iw, "Harita", new[] { "Kucuk", "Orta", "Genis" },
                    Boot.MapSize == 10 ? 0 : (Boot.MapSize == 12 ? 1 : 2),
                    v => Boot.MapSize = v == 0 ? 10 : (v == 1 ? 12 : 14));

            y += 8f * S;
            if (GUI.Button(new Rect(x, y, iw, 48f * S), "Oyunu baslat", sBtnGold))
            {
                Boot.StartGame();
                window = Window.None;
                logSeen = 0;
                toasts.Clear(); toastTime.Clear();
            }
            y += 58f * S;
            GUI.Label(new Rect(x, y, iw, 90f * S),
                "Sol tik: kare sec / hareket / saldiri.  Sag tik suruklemek: haritayi kaydir.  " +
                "Tekerlek: yakinlastir.  Enter: turu bitir.", sSmall);
        }

        float Row(float x, float y, float iw, string title, string[] options, int current, System.Action<int> onPick)
        {
            GUI.Label(new Rect(x, y, iw, 20f * S), title, sLabel);
            y += 24f * S;
            float bw = iw / options.Length - 4f * S;
            for (int i = 0; i < options.Length; i++)
            {
                var br = new Rect(x + i * (bw + 4f * S), y, bw, 34f * S);
                if (GUI.Button(br, options[i], current == i ? sBtnGold : sBtn)) onPick(i);
            }
            return y + 44f * S;
        }

        void DrawTopBar()
        {
            GUI.Box(new Rect(0, 0, Screen.width, TopH), "", sBar);
            var p = G.Me;
            float x = 10f * S;

            GUI.color = new Color(p.Tribe.R, p.Tribe.G, p.Tribe.B);
            GUI.DrawTexture(new Rect(x, TopH * 0.32f, 14f * S, 14f * S), texWhite);
            GUI.color = Color.white;
            x += 20f * S;

            string txt = p.Name + "   *" + p.Stars + " (+" + G.Income(p) + ")   Tur " + G.Turn + "/" + G.MaxTurn
                         + "   Puan " + G.Score(p);
            GUI.Label(new Rect(x, TopH * 0.22f, Screen.width * 0.6f, TopH), txt, sLabel);

            float bw = 110f * S;
            if (GUI.Button(new Rect(Screen.width - bw * 2 - 18f * S, 5f * S, bw, TopH - 10f * S), "Teknoloji", sBtn))
                window = window == Window.Tech ? Window.None : Window.Tech;

            GUI.enabled = !Boot.AiRunning && !G.Over && G.Cur == GameState.Human;
            if (GUI.Button(new Rect(Screen.width - bw - 10f * S, 5f * S, bw, TopH - 10f * S),
                Boot.AiRunning ? "Rakip..." : "Turu bitir", sBtnGold)) Boot.EndTurn();
            GUI.enabled = true;
        }

        void DrawActionBar()
        {
            var r = new Rect(0, Screen.height - BarH, Screen.width, BarH);
            GUI.Box(r, "", sBar);

            float x = 12f * S, y = r.y + 8f * S;
            if (Boot.SelX < 0)
            {
                GUI.Label(new Rect(x, y, 400f * S, 24f * S), "Bir kareye tikla", sLabel);
                return;
            }

            var tile = G.At(Boot.SelX, Boot.SelY);
            if (!tile.Seen[GameState.Human])
            {
                GUI.Label(new Rect(x, y, 400f * S, 24f * S), "Bilinmeyen bolge", sLabel);
                return;
            }

            var city = G.CityAt(Boot.SelX, Boot.SelY);
            var unit = G.UnitAt(Boot.SelX, Boot.SelY);

            string title = DB.Terrains[tile.Terr].Name;
            string sub = "";
            if (tile.Res != Res.None) sub = DB.Resources[tile.Res].Name;
            if (tile.Bld != Bld.None) sub = tile.Bld.ToString();
            if (city != null)
            {
                title = city.Owner < 0 ? "Koy" : (city.IsCapital ? "Baskent" : "Sehir");
                sub = (city.Owner < 0 ? "sahipsiz" : G.Players[city.Owner].Name)
                      + (city.Owner >= 0 ? "  sv " + city.Level + "  nufus " + city.Pop + "/" + city.PopNeeded : "");
            }
            if (unit != null)
            {
                title = unit.Def.Name + (unit.Veteran ? " (gazi)" : "");
                sub = unit.Hp + "/" + unit.MaxHp + " can   " + G.Players[unit.Owner].Name;
            }
            GUI.Label(new Rect(x, y, 300f * S, 24f * S), title, sLabel);
            GUI.Label(new Rect(x, y + 22f * S, 300f * S, 24f * S), sub, sSmall);

            if (G.Cur != GameState.Human || G.Over || Boot.AiRunning) return;

            float bx = x + 260f * S, bw = 150f * S, bh = BarH - 20f * S;
            if (unit != null && unit.Owner == GameState.Human && unit.CanAct)
            {
                if (G.CanCapture(unit) && GUI.Button(new Rect(bx, r.y + 10f * S, bw, bh), "Ele gecir", sBtnGold)) { Boot.DoCapture(); return; }
                if (G.CanCapture(unit)) bx += bw + 6f * S;

                if (unit.Hp < unit.MaxHp && GUI.Button(new Rect(bx, r.y + 10f * S, bw, bh), "Dinlen", sBtn)) { Boot.DoRest(); return; }
                if (unit.Hp < unit.MaxHp) bx += bw + 6f * S;

                if (GUI.Button(new Rect(bx, r.y + 10f * S, bw, bh), "Bekle", sBtn)) { Boot.DoWait(); return; }
                bx += bw + 6f * S;
            }

            if (city != null && city.Owner == GameState.Human)
            {
                if (GUI.Button(new Rect(bx, r.y + 10f * S, bw, bh), "Birim egit", sBtnGold))
                {
                    openCity = city; window = Window.City; return;
                }
                bx += bw + 6f * S;
            }

            string label; int cost;
            if (G.CanWork(tile, G.Me, out label, out cost))
            {
                GUI.enabled = G.Me.Stars >= cost;
                if (GUI.Button(new Rect(bx, r.y + 10f * S, bw + 30f * S, bh), label + "\n" + cost + " yildiz", sBtn))
                    Boot.DoWork();
                GUI.enabled = true;
            }
        }

        void DrawToasts()
        {
            float y = TopH + 8f * S;
            for (int i = 0; i < toasts.Count; i++)
            {
                if (Time.time - toastTime[i] > 4f) continue;
                var size = sSmall.CalcSize(new GUIContent(toasts[i]));
                float w = size.x + 24f * S;
                var r = new Rect((Screen.width - w) / 2f, y, w, 24f * S);
                GUI.Box(r, "", sPanel);
                GUI.Label(new Rect(r.x + 12f * S, r.y + 3f * S, r.width, r.height), toasts[i], sSmall);
                y += 28f * S;
            }
        }

        /// <summary>Birimlerin uzerine can cubugu ve hareket hakki noktasi cizer.</summary>
        void DrawWorldLabels()
        {
            var cam = Boot.Cam;
            if (cam == null) return;

            foreach (var u in G.Units)
            {
                var tile = G.At(u.X, u.Y);
                if (!tile.Seen[GameState.Human]) continue;

                Vector3 world = new Vector3(u.X, BoardView.LandHeight + 0.75f, u.Y);
                Vector3 sp = cam.WorldToScreenPoint(world);
                if (sp.z < 0f) continue;
                float sy = Screen.height - sp.y;

                float w = 34f * S, h = 5f * S;
                var back = new Rect(sp.x - w / 2f, sy, w, h);
                GUI.color = new Color(0f, 0f, 0f, 0.6f);
                GUI.DrawTexture(back, texWhite);
                GUI.color = Color.white;

                float frac = Mathf.Clamp01((float)u.Hp / u.MaxHp);
                GUI.DrawTexture(new Rect(back.x, back.y, w * frac, h), frac > 0.4f ? texGreen : texRed);

                if (u.Owner == GameState.Human && u.CanAct && G.Cur == GameState.Human)
                    GUI.DrawTexture(new Rect(sp.x - 3f * S, sy - 12f * S, 6f * S, 6f * S), texGold);
            }

            foreach (var c in G.Cities)
            {
                if (c.Owner < 0) continue;
                var tile = G.At(c.X, c.Y);
                if (!tile.Seen[GameState.Human]) continue;
                Vector3 sp = Boot.Cam.WorldToScreenPoint(new Vector3(c.X, BoardView.LandHeight + 1.1f, c.Y));
                if (sp.z < 0f) continue;
                string txt = "sv" + c.Level + " " + c.Pop + "/" + c.PopNeeded + (c.Walls ? " #" : "");
                GUI.Label(new Rect(sp.x - 40f * S, Screen.height - sp.y - 16f * S, 90f * S, 20f * S), txt, sSmall);
            }
        }

        // ------------------------------------------------------------------ pencereler

        Rect Centered(float w, float h)
        {
            w = Mathf.Min(w * S, Screen.width - 20f);
            h = Mathf.Min(h * S, Screen.height - 20f);
            var r = new Rect((Screen.width - w) / 2f, (Screen.height - h) / 2f, w, h);
            GUI.Box(r, "", sPanel);
            return r;
        }

        void DrawTech()
        {
            var r = Centered(620f, 560f);
            var p = G.Me;
            GUI.Label(new Rect(r.x + 16f * S, r.y + 12f * S, r.width, 30f * S), "Teknoloji", sTitle);
            GUI.Label(new Rect(r.x + 16f * S, r.y + 40f * S, r.width - 32f * S, 22f * S),
                p.Stars + " yildiz elinde - maliyet sehir sayinla birlikte artar", sSmall);
            if (GUI.Button(new Rect(r.xMax - 42f * S, r.y + 10f * S, 32f * S, 28f * S), "X", sBtn)) window = Window.None;

            var view = new Rect(r.x + 10f * S, r.y + 68f * S, r.width - 20f * S, r.height - 82f * S);
            float rowH = 44f * S;
            int rows = DB.Techs.Count;
            var content = new Rect(0, 0, view.width - 20f * S, rows * rowH + 10f * S);
            techScroll = GUI.BeginScrollView(view, techScroll, content);

            float y = 0f;
            foreach (var kv in DB.Techs)
            {
                if (kv.Value.Tier != 1) continue;
                y = TechRow(kv.Key, 0f, y, content.width, rowH);
                foreach (var kv2 in DB.Techs)
                {
                    if (!kv2.Value.HasReq || kv2.Value.Req != kv.Key) continue;
                    y = TechRow(kv2.Key, 20f * S, y, content.width, rowH);
                    foreach (var kv3 in DB.Techs)
                    {
                        if (!kv3.Value.HasReq || kv3.Value.Req != kv2.Key) continue;
                        y = TechRow(kv3.Key, 40f * S, y, content.width, rowH);
                    }
                }
            }
            GUI.EndScrollView();
        }

        float TechRow(Tech t, float indent, float y, float width, float rowH)
        {
            var p = G.Me;
            var def = DB.Techs[t];
            bool have = p.Has(t);
            int cost = G.TechCost(p, t);
            bool can = G.CanResearch(p, t);

            var r = new Rect(indent, y, width - indent, rowH - 4f * S);
            GUI.enabled = can;
            string label = def.Name + "   -   " + def.Info + "      " + (have ? "alindi" : cost + " yildiz");
            if (GUI.Button(r, label, have ? sBtn : (can ? sBtnGold : sBtn)) && can)
                G.Research(p, t);
            GUI.enabled = true;
            return y + rowH;
        }

        void DrawCity()
        {
            if (openCity == null) { window = Window.None; return; }
            var c = openCity;
            var r = Centered(560f, 420f);
            GUI.Label(new Rect(r.x + 16f * S, r.y + 12f * S, r.width, 30f * S),
                (c.IsCapital ? "Baskent" : "Sehir") + " - seviye " + c.Level, sTitle);
            GUI.Label(new Rect(r.x + 16f * S, r.y + 42f * S, r.width - 32f * S, 22f * S),
                "Nufus " + c.Pop + "/" + c.PopNeeded + "   birim " + G.UnitsOf(c) + "/" + c.UnitCap
                + "   " + G.Me.Stars + " yildiz", sSmall);
            if (GUI.Button(new Rect(r.xMax - 42f * S, r.y + 10f * S, 32f * S, 28f * S), "X", sBtn)) window = Window.None;

            float y = r.y + 72f * S;
            foreach (var kv in DB.Units)
            {
                if (kv.Value.Super) continue;
                var d = kv.Value;
                string why;
                bool ok = G.CanTrain(c, kv.Key, out why);
                var br = new Rect(r.x + 16f * S, y, r.width - 32f * S, 38f * S);
                GUI.enabled = ok;
                string txt = d.Name + "  " + d.Cost + " yildiz   |  can " + d.Hp + "  sal " + d.Atk
                             + "  sav " + d.Def + "  hrk " + d.Move + "  mnz " + d.Range
                             + (ok ? "" : "   (" + why + ")");
                if (GUI.Button(br, txt, ok ? sBtnGold : sBtn) && ok)
                {
                    G.Train(c, kv.Key);
                    Boot.View.Refresh();
                    window = Window.None;
                }
                GUI.enabled = true;
                y += 42f * S;
            }
        }

        void DrawReward()
        {
            var c = G.PendingRewards[0];
            var r = Centered(520f, 300f);
            GUI.Label(new Rect(r.x + 16f * S, r.y + 14f * S, r.width, 30f * S),
                (c.IsCapital ? "Baskent" : "Sehir") + " seviye " + c.Level, sTitle);
            GUI.Label(new Rect(r.x + 16f * S, r.y + 46f * S, r.width, 24f * S), "Bir odul sec", sSmall);

            var opts = DB.RewardsFor(Mathf.Min(5, c.Level));
            float y = r.y + 82f * S;
            foreach (var o in opts)
            {
                if (GUI.Button(new Rect(r.x + 16f * S, y, r.width - 32f * S, 72f * S),
                    DB.RewardName(o) + "\n" + DB.RewardInfo(o), sBtn))
                {
                    G.PendingRewards.RemoveAt(0);
                    G.ApplyReward(c, o);
                    if (G.PendingRewards.Count == 0) window = Window.None;
                    Boot.View.Refresh();
                    return;
                }
                y += 80f * S;
            }
        }

        void DrawOver()
        {
            var r = Centered(520f, 400f);
            var win = G.Winner();
            bool youWin = win.Id == GameState.Human && G.Me.Alive;
            GUI.Label(new Rect(r.x + 16f * S, r.y + 14f * S, r.width, 32f * S),
                youWin ? "Kazandin" : "Kaybettin", sTitle);
            GUI.Label(new Rect(r.x + 16f * S, r.y + 48f * S, r.width - 32f * S, 24f * S), G.OverReason, sSmall);

            float y = r.y + 82f * S;
            foreach (var p in G.Players)
            {
                GUI.Label(new Rect(r.x + 16f * S, y, r.width - 32f * S, 24f * S),
                    p.Name + (p.Id == GameState.Human ? " (sen)" : "") + (p.Alive ? "" : " - elendi")
                    + "   " + G.Score(p) + " puan   " + G.CityCount(p) + " sehir   "
                    + p.Techs.Count + " teknoloji", sLabel);
                y += 28f * S;
            }

            if (GUI.Button(new Rect(r.x + 16f * S, r.yMax - 58f * S, r.width - 32f * S, 44f * S), "Yeni oyun", sBtnGold))
            {
                Boot.G = null;
                Boot.ClearSelection();
                window = Window.None;
            }
        }
    }
}
