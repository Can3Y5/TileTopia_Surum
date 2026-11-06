using System.Collections.Generic;
using UnityEngine;

namespace Kabileler
{
    /// <summary>
    /// Oyun durumunu 3B olarak cizer. Hazir asset kullanmaz: her sey
    /// Unity'nin temel sekillerinden (kup, kapsul, kure) ve kodla uretilen
    /// koni/piramitten olusur. Model eklemek istersen Build* metotlarini degistir.
    /// </summary>
    public class BoardView : MonoBehaviour
    {
        public const float LandHeight = 0.36f;
        public const float WaterHeight = 0.16f;

        GameState g;
        Transform root;
        Material mat;

        GameObject[] tileGo;
        Renderer[] tileRend;
        GameObject[] highlight;
        Renderer[] highlightRend;
        GameObject[] content;       // kaynak / yapi gostergesi
        int[] contentSig;
        GameObject[] cityGo;
        List<Renderer>[] cityRend;
        readonly Dictionary<int, GameObject> unitGo = new Dictionary<int, GameObject>();

        static MaterialPropertyBlock mpb;

        // ------------------------------------------------------------------ kurulum

        public void Build(GameState state)
        {
            g = state;
            if (root != null) Destroy(root.gameObject);
            unitGo.Clear();

            root = new GameObject("Board").transform;
            root.SetParent(transform, false);

            mat = new Material(FindShader());
            mat.name = "KabilelerBase";

            int n = g.Size * g.Size;
            tileGo = new GameObject[n];
            tileRend = new Renderer[n];
            highlight = new GameObject[n];
            highlightRend = new Renderer[n];
            content = new GameObject[n];
            contentSig = new int[n];
            cityGo = new GameObject[g.Cities.Count];
            cityRend = new List<Renderer>[g.Cities.Count];

            for (int y = 0; y < g.Size; y++)
                for (int x = 0; x < g.Size; x++)
                    BuildTile(x, y);

            for (int i = 0; i < g.Cities.Count; i++)
                BuildCity(g.Cities[i]);

            Refresh();
        }

        public static Shader FindShader()
        {
            // Hem URP hem de eski (Built-in) projede calissin diye sirayla dener
            var s = Shader.Find("Universal Render Pipeline/Lit");
            if (s == null) s = Shader.Find("Standard");
            if (s == null) s = Shader.Find("Legacy Shaders/Diffuse");
            if (s == null) s = Shader.Find("Unlit/Color");
            return s;
        }

        /// <summary>Renk atar. URP "_BaseColor", eski boru hatti "_Color" kullanir; ikisini de yazar.</summary>
        public static void Tint(Renderer r, Color c)
        {
            if (r == null) return;
            if (mpb == null) mpb = new MaterialPropertyBlock();
            r.GetPropertyBlock(mpb);
            mpb.SetColor("_BaseColor", c);
            mpb.SetColor("_Color", c);
            r.SetPropertyBlock(mpb);
        }

        public float HeightOf(Tile t) { return t.Terr == Terrain.Water ? WaterHeight : LandHeight; }
        public Vector3 TileTop(int x, int y) { return new Vector3(x, HeightOf(g.At(x, y)), y); }

        public Color ColorOf(Player p) { return new Color(p.Tribe.R, p.Tribe.G, p.Tribe.B); }

        void BuildTile(int x, int y)
        {
            int i = g.Idx(x, y);
            var t = g.At(x, y);
            float h = HeightOf(t);

            var holder = new GameObject("T_" + x + "_" + y);
            holder.transform.SetParent(root, false);
            holder.transform.localPosition = new Vector3(x, 0f, y);
            var tr = holder.AddComponent<TileRef>();
            tr.X = x; tr.Y = y;
            tileGo[i] = holder;

            var cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
            cube.name = "ground";
            cube.transform.SetParent(holder.transform, false);
            cube.transform.localPosition = new Vector3(0f, h * 0.5f - 0.02f, 0f);
            cube.transform.localScale = new Vector3(0.98f, h, 0.98f);
            var rend = cube.GetComponent<Renderer>();
            rend.sharedMaterial = mat;
            tileRend[i] = rend;

            // sabit arazi susleri
            if (t.Terr == Terrain.Forest)
            {
                int trees = 1 + (x * 7 + y * 13) % 2;
                for (int k = 0; k < trees; k++)
                {
                    float ox = ((x * 31 + y * 17 + k * 53) % 10) / 25f - 0.2f;
                    float oz = ((x * 19 + y * 29 + k * 11) % 10) / 25f - 0.2f;
                    MeshFactory.Make(MeshFactory.Cone(), mat, holder.transform,
                        new Vector3(ox, h, oz), new Vector3(0.44f, 0.5f, 0.44f),
                        new Color(0.13f, 0.42f, 0.2f));
                }
            }
            else if (t.Terr == Terrain.Mountain)
            {
                MeshFactory.Make(MeshFactory.Pyramid(), mat, holder.transform,
                    new Vector3(0f, h, 0f), new Vector3(0.8f, 0.55f, 0.8f),
                    new Color(0.55f, 0.54f, 0.52f));
            }

            // vurgu plakasi (hareket / saldiri / secim)
            var hl = GameObject.CreatePrimitive(PrimitiveType.Cube);
            hl.name = "hl";
            Destroy(hl.GetComponent<Collider>());
            hl.transform.SetParent(holder.transform, false);
            hl.transform.localPosition = new Vector3(0f, h + 0.015f, 0f);
            hl.transform.localScale = new Vector3(0.92f, 0.03f, 0.92f);
            var hr = hl.GetComponent<Renderer>();
            hr.sharedMaterial = mat;
            hl.SetActive(false);
            highlight[i] = hl;
            highlightRend[i] = hr;

            contentSig[i] = -1;
        }

        void BuildCity(City c)
        {
            var holder = new GameObject("City_" + c.Id);
            holder.transform.SetParent(root, false);
            holder.transform.localPosition = new Vector3(c.X, HeightOf(g.At(c.X, c.Y)), c.Y);
            var rends = new List<Renderer>();

            var b = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Destroy(b.GetComponent<Collider>());
            b.transform.SetParent(holder.transform, false);
            b.transform.localPosition = new Vector3(0f, 0.14f, 0f);
            b.transform.localScale = new Vector3(0.5f, 0.28f, 0.5f);
            b.GetComponent<Renderer>().sharedMaterial = mat;
            rends.Add(b.GetComponent<Renderer>());

            var top = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Destroy(top.GetComponent<Collider>());
            top.transform.SetParent(holder.transform, false);
            top.transform.localPosition = new Vector3(0.08f, 0.38f, 0.08f);
            top.transform.localScale = new Vector3(0.28f, 0.22f, 0.28f);
            top.GetComponent<Renderer>().sharedMaterial = mat;
            rends.Add(top.GetComponent<Renderer>());

            if (c.IsCapital)
            {
                var pole = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                Destroy(pole.GetComponent<Collider>());
                pole.transform.SetParent(holder.transform, false);
                pole.transform.localPosition = new Vector3(-0.16f, 0.45f, -0.16f);
                pole.transform.localScale = new Vector3(0.05f, 0.34f, 0.05f);
                pole.GetComponent<Renderer>().sharedMaterial = mat;
                rends.Add(pole.GetComponent<Renderer>());
            }

            cityGo[c.Id] = holder;
            cityRend[c.Id] = rends;
        }

        // ------------------------------------------------------------------ guncelleme

        public void Refresh()
        {
            if (g == null || root == null) return;

            for (int y = 0; y < g.Size; y++)
                for (int x = 0; x < g.Size; x++)
                {
                    int i = g.Idx(x, y);
                    var t = g.At(x, y);
                    bool seen = t.Seen[GameState.Human];

                    var td = DB.Terrains[t.Terr];
                    Color col = seen ? new Color(td.R, td.G, td.B) : new Color(0.14f, 0.17f, 0.2f);
                    if (seen && t.Owner >= 0)
                        col = Color.Lerp(col, ColorOf(g.Players[t.Owner]), 0.32f);
                    Tint(tileRend[i], col);

                    // sis altindaki agac/dag gorunmesin
                    for (int k = 0; k < tileGo[i].transform.childCount; k++)
                    {
                        var ch = tileGo[i].transform.GetChild(k);
                        if (ch.name == "ground" || ch.name == "hl") continue;
                        if (ch.gameObject.activeSelf != seen) ch.gameObject.SetActive(seen);
                    }

                    int sig = seen ? ((int)t.Res * 10 + (int)t.Bld) : -1;
                    if (sig != contentSig[i])
                    {
                        contentSig[i] = sig;
                        if (content[i] != null) Destroy(content[i]);
                        content[i] = sig <= 0 ? null : BuildContent(t);
                    }
                }

            foreach (var c in g.Cities)
            {
                bool seen = g.At(c.X, c.Y).Seen[GameState.Human];
                var go = cityGo[c.Id];
                if (go.activeSelf != seen) go.SetActive(seen);
                if (!seen) continue;
                Color col = c.Owner < 0 ? new Color(0.72f, 0.66f, 0.55f) : ColorOf(g.Players[c.Owner]);
                foreach (var r in cityRend[c.Id]) Tint(r, col);
                go.transform.localScale = Vector3.one * (1f + 0.12f * Mathf.Max(0, c.Level - 1));
            }

            RefreshUnits();
        }

        GameObject BuildContent(Tile t)
        {
            var holder = new GameObject("content");
            holder.transform.SetParent(tileGo[g.Idx(t.X, t.Y)].transform, false);
            float h = HeightOf(t);

            if (t.Bld != Bld.None)
            {
                Color c = new Color(0.85f, 0.75f, 0.4f);
                if (t.Bld == Bld.Mine) c = new Color(0.45f, 0.45f, 0.5f);
                else if (t.Bld == Bld.Lumber) c = new Color(0.5f, 0.35f, 0.2f);
                else if (t.Bld == Bld.Port) c = new Color(0.9f, 0.9f, 0.95f);
                Cube(holder.transform, new Vector3(0f, h + 0.08f, 0f), new Vector3(0.34f, 0.16f, 0.34f), c);
                return holder;
            }

            switch (t.Res)
            {
                case Res.Fruit:
                    Ball(holder.transform, new Vector3(0.12f, h + 0.1f, 0.1f), 0.18f, new Color(0.9f, 0.25f, 0.2f));
                    break;
                case Res.Crop:
                    Cube(holder.transform, new Vector3(0.1f, h + 0.08f, 0.1f), new Vector3(0.3f, 0.16f, 0.3f), new Color(0.93f, 0.8f, 0.3f));
                    break;
                case Res.Game:
                    Cube(holder.transform, new Vector3(0.18f, h + 0.1f, -0.12f), new Vector3(0.16f, 0.2f, 0.26f), new Color(0.6f, 0.4f, 0.22f));
                    break;
                case Res.Metal:
                    Ball(holder.transform, new Vector3(0.2f, h + 0.1f, 0.18f), 0.16f, new Color(0.6f, 0.8f, 0.9f));
                    break;
                case Res.Fish:
                    Cube(holder.transform, new Vector3(0f, h + 0.05f, 0f), new Vector3(0.28f, 0.08f, 0.14f), new Color(0.2f, 0.35f, 0.8f));
                    break;
            }
            return holder;
        }

        void RefreshUnits()
        {
            // olen birimleri temizle
            var gone = new List<int>();
            foreach (var kv in unitGo)
            {
                if (g.GetUnit(kv.Key) == null) { Destroy(kv.Value); gone.Add(kv.Key); }
            }
            foreach (var id in gone) unitGo.Remove(id);

            foreach (var u in g.Units)
            {
                bool seen = g.At(u.X, u.Y).Seen[GameState.Human];
                GameObject go;
                if (!unitGo.TryGetValue(u.Id, out go))
                {
                    go = BuildUnit(u);
                    unitGo[u.Id] = go;
                }
                if (go.activeSelf != seen) go.SetActive(seen);
                go.transform.localPosition = new Vector3(u.X, HeightOf(g.At(u.X, u.Y)), u.Y);
                var tr = go.GetComponent<TileRef>();
                tr.X = u.X; tr.Y = u.Y;
            }
        }

        GameObject BuildUnit(Unit u)
        {
            var holder = new GameObject("U_" + u.Id);
            holder.transform.SetParent(root, false);
            var tr = holder.AddComponent<TileRef>();
            tr.X = u.X; tr.Y = u.Y;

            Color col = ColorOf(g.Players[u.Owner]);
            float scale = u.Type == UnitType.Giant ? 1.5f : 1f;

            var body = GameObject.CreatePrimitive(
                u.Type == UnitType.Defender || u.Type == UnitType.Catapult ? PrimitiveType.Cube : PrimitiveType.Capsule);
            body.name = "body";
            body.transform.SetParent(holder.transform, false);
            body.transform.localPosition = new Vector3(0f, 0.22f * scale, 0f);
            body.transform.localScale = new Vector3(0.3f * scale, 0.22f * scale, 0.3f * scale);
            body.GetComponent<Renderer>().sharedMaterial = mat;
            Tint(body.GetComponent<Renderer>(), col);
            // tiklamayi kolaylastirmak icin birimin kendi collider'i kalsin
            var col2 = body.GetComponent<Collider>();
            if (col2 != null) col2.isTrigger = false;

            // birim tipini sekille ayirt et
            Color dark = col * 0.55f; dark.a = 1f;
            switch (u.Type)
            {
                case UnitType.Rider:
                case UnitType.Knight:
                    Cube(holder.transform, new Vector3(0f, 0.12f, 0.08f), new Vector3(0.4f, 0.1f, 0.18f), dark);
                    break;
                case UnitType.Archer:
                    Cube(holder.transform, new Vector3(0.16f, 0.3f, 0f), new Vector3(0.05f, 0.34f, 0.05f), dark);
                    break;
                case UnitType.Swordsman:
                    Cube(holder.transform, new Vector3(0.17f, 0.34f, 0f), new Vector3(0.06f, 0.3f, 0.06f), Color.white * 0.9f);
                    break;
                case UnitType.Catapult:
                    Ball(holder.transform, new Vector3(0f, 0.42f, 0f), 0.2f, dark);
                    break;
                case UnitType.Giant:
                    Ball(holder.transform, new Vector3(0f, 0.62f, 0f), 0.3f, dark);
                    break;
            }
            return holder;
        }

        void Cube(Transform parent, Vector3 pos, Vector3 scale, Color c)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Destroy(go.GetComponent<Collider>());
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            go.transform.localScale = scale;
            var r = go.GetComponent<Renderer>();
            r.sharedMaterial = mat;
            Tint(r, c);
        }

        void Ball(Transform parent, Vector3 pos, float size, Color c)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            Destroy(go.GetComponent<Collider>());
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            go.transform.localScale = Vector3.one * size;
            var r = go.GetComponent<Renderer>();
            r.sharedMaterial = mat;
            Tint(r, c);
        }

        // ------------------------------------------------------------------ vurgular

        public void ClearHighlights()
        {
            if (highlight == null) return;
            for (int i = 0; i < highlight.Length; i++)
                if (highlight[i] != null && highlight[i].activeSelf) highlight[i].SetActive(false);
        }

        public void ShowHighlights(Dictionary<int, int> moves, List<Unit> targets, int selX, int selY)
        {
            ClearHighlights();
            if (g == null) return;

            if (moves != null)
                foreach (var kv in moves) SetHl(kv.Key, new Color(1f, 1f, 1f, 1f));

            if (targets != null)
                foreach (var t in targets) SetHl(g.Idx(t.X, t.Y), new Color(0.9f, 0.25f, 0.2f));

            if (selX >= 0) SetHl(g.Idx(selX, selY), new Color(1f, 0.8f, 0.2f));
        }

        void SetHl(int i, Color c)
        {
            if (i < 0 || i >= highlight.Length || highlight[i] == null) return;
            highlight[i].SetActive(true);
            Tint(highlightRend[i], c);
        }
    }
}
