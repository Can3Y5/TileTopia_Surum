using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Kabileler
{
    /// <summary>
    /// TEK KURULUM ADIMI: bos bir sahnede bos bir GameObject olustur,
    /// bu betigi ona ekle ve Play'e bas. Kamera, isik, tahta ve arayuz
    /// calisma aninda kendiliginden kurulur.
    /// </summary>
    public class GameBootstrap : MonoBehaviour
    {
        [Header("Oyun ayarlari")]
        public int MapSize = 11;
        public int Opponents = 1;
        public int Difficulty = 1;      // 0 kolay, 1 normal, 2 zor
        public int TribeIndex = 0;
        public int MaxTurn = 25;
        public float AiStepDelay = 0.35f;

        [Header("Kamera")]
        public float CameraAngle = 40f;
        public float ZoomSpeed = 4f;
        public float PanSpeed = 0.02f;

        public GameState G;
        public BoardView View;
        public GameHUD Hud;
        public bool AiRunning;

        // secim durumu
        public int SelX = -1, SelY = -1;
        public Unit SelUnit;
        public Dictionary<int, int> SelMoves;
        public List<Unit> SelTargets;

        readonly AIBrain ai = new AIBrain();
        Camera cam;
        Vector3 camTarget;
        Vector3 lastMouse;

        void Awake()
        {
            SetupScene();
            View = gameObject.AddComponent<BoardView>();
            Hud = gameObject.AddComponent<GameHUD>();
            Hud.Boot = this;
        }

        void SetupScene()
        {
            cam = Camera.main;
            if (cam == null)
            {
                var go = new GameObject("Main Camera");
                go.tag = "MainCamera";
                cam = go.AddComponent<Camera>();
            }
            cam.orthographic = true;
            cam.orthographicSize = 7f;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.06f, 0.09f, 0.12f);
            cam.transform.rotation = Quaternion.Euler(CameraAngle, 45f, 0f);
            cam.nearClipPlane = 0.1f;
            cam.farClipPlane = 200f;

            if (FindObjectOfType<Light>() == null)
            {
                var lgo = new GameObject("Sun");
                var light = lgo.AddComponent<Light>();
                light.type = LightType.Directional;
                light.intensity = 1.05f;
                light.color = new Color(1f, 0.97f, 0.9f);
                lgo.transform.rotation = Quaternion.Euler(52f, -35f, 0f);
            }
            RenderSettings.ambientLight = new Color(0.45f, 0.48f, 0.55f);
        }

        // ------------------------------------------------------------------ oyun akisi

        public void StartGame()
        {
            G = new GameState(MapSize, TribeIndex, Opponents, Difficulty, MaxTurn, Random.Range(1, 999999));
            View.Build(G);
            ClearSelection();

            var cap = G.Cities.Find(c => c.Owner == GameState.Human);
            camTarget = cap != null ? new Vector3(cap.X, 0f, cap.Y) : new Vector3(G.Size * 0.5f, 0f, G.Size * 0.5f);
            cam.orthographicSize = Mathf.Max(5f, G.Size * 0.42f);
            ApplyCamera();
            G.Say("Tur 1 - baskentin hazir. Koyleri ele gecirerek buyu.");
        }

        public void EndTurn()
        {
            if (G == null || G.Over || AiRunning) return;
            if (G.PendingRewards.Count > 0) return;      // once odulu sec
            ClearSelection();
            StartCoroutine(RunOpponents());
        }

        IEnumerator RunOpponents()
        {
            AiRunning = true;
            var p = G.NextPlayer();

            while (!G.Over && p.IsAI)
            {
                foreach (var step in ai.Play(G, p))
                {
                    View.Refresh();
                    Hud.Toast(step.Text);
                    yield return new WaitForSeconds(AiStepDelay);
                }
                if (G.Over) break;
                p = G.NextPlayer();
            }

            View.Refresh();
            AiRunning = false;
            if (!G.Over) G.Say("Tur " + G.Turn + " - +" + G.Income(G.Me) + " yildiz geldi");
        }

        // ------------------------------------------------------------------ secim ve eylemler

        public void ClearSelection()
        {
            SelX = SelY = -1;
            SelUnit = null;
            SelMoves = null;
            SelTargets = null;
            if (View != null) View.ClearHighlights();
        }

        public void SelectUnit(Unit u)
        {
            SelUnit = u;
            SelX = u.X; SelY = u.Y;
            SelMoves = G.Moves(u);
            SelTargets = G.Targets(u);
            View.ShowHighlights(SelMoves, SelTargets, SelX, SelY);
        }

        public void OnTileClick(int x, int y)
        {
            if (G == null || G.Over || AiRunning) return;
            if (G.Cur != GameState.Human) return;
            if (G.PendingRewards.Count > 0) return;

            int key = G.Idx(x, y);

            // hareket
            if (SelUnit != null && SelMoves != null && SelMoves.ContainsKey(key))
            {
                G.MoveUnit(SelUnit, x, y);
                if (SelUnit.Def.Dash && !SelUnit.Acted) SelectUnit(SelUnit);
                else { SelUnit.Acted = true; ClearSelection(); }
                View.Refresh();
                return;
            }

            // saldiri
            if (SelUnit != null && SelTargets != null)
            {
                foreach (var t in SelTargets)
                {
                    if (t.X != x || t.Y != y) continue;
                    G.Attack(SelUnit, t);
                    G.CheckElimination();
                    ClearSelection();
                    View.Refresh();
                    return;
                }
            }

            // secim
            ClearSelection();
            SelX = x; SelY = y;
            var u = G.UnitAt(x, y);
            if (u != null && u.Owner == GameState.Human && u.CanAct && G.At(x, y).Seen[GameState.Human])
                SelectUnit(u);
            else
                View.ShowHighlights(null, null, SelX, SelY);
        }

        public void DoCapture()
        {
            if (SelUnit == null || !G.CanCapture(SelUnit)) return;
            G.Capture(SelUnit);
            ClearSelection();
            View.Refresh();
        }

        public void DoRest()
        {
            if (SelUnit == null || !SelUnit.CanAct) return;
            G.Rest(SelUnit);
            ClearSelection();
            View.Refresh();
        }

        public void DoWait()
        {
            if (SelUnit == null || !SelUnit.CanAct) return;
            SelUnit.Moved = true; SelUnit.Acted = true;
            ClearSelection();
            View.Refresh();
        }

        public void DoWork()
        {
            if (SelX < 0) return;
            if (G.Work(G.At(SelX, SelY), G.Me)) View.Refresh();
        }

        // ------------------------------------------------------------------ girdi

        void Update()
        {
            if (G == null) return;
            HandleCamera();

            if (Input.GetMouseButtonDown(0) && !Hud.MouseOverUI(Input.mousePosition))
            {
                RaycastHit hit;
                if (Physics.Raycast(cam.ScreenPointToRay(Input.mousePosition), out hit, 500f))
                {
                    var tr = hit.collider.GetComponentInParent<TileRef>();
                    if (tr != null) OnTileClick(tr.X, tr.Y);
                }
            }

            if (Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.KeypadEnter)) EndTurn();
            if (Input.GetKeyDown(KeyCode.Escape)) ClearSelection();
        }

        void HandleCamera()
        {
            float scroll = Input.mouseScrollDelta.y;
            if (Mathf.Abs(scroll) > 0.01f)
            {
                cam.orthographicSize = Mathf.Clamp(cam.orthographicSize - scroll * ZoomSpeed, 2.5f, G.Size * 1.1f);
                ApplyCamera();
            }

            if (Input.GetMouseButtonDown(1) || Input.GetMouseButtonDown(2)) lastMouse = Input.mousePosition;
            if (Input.GetMouseButton(1) || Input.GetMouseButton(2))
            {
                Vector3 d = Input.mousePosition - lastMouse;
                lastMouse = Input.mousePosition;

                Vector3 right = cam.transform.right;
                Vector3 fwd = Vector3.ProjectOnPlane(cam.transform.forward, Vector3.up).normalized;
                float k = PanSpeed * cam.orthographicSize;
                camTarget -= (right * d.x + fwd * d.y) * k;
                camTarget.x = Mathf.Clamp(camTarget.x, -2f, G.Size + 2f);
                camTarget.z = Mathf.Clamp(camTarget.z, -2f, G.Size + 2f);
                ApplyCamera();
            }
        }

        public void ApplyCamera()
        {
            cam.transform.position = camTarget - cam.transform.forward * 40f;
        }

        public void FocusOn(int x, int y)
        {
            camTarget = new Vector3(x, 0f, y);
            ApplyCamera();
        }

        public Camera Cam { get { return cam; } }
    }
}
