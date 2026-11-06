using UnityEngine;

namespace Kabileler
{
    /// <summary>
    /// Hazir model kullanmamak icin agac/dag sekillerini kodla uretir.
    /// Ileride gercek modellerle degistirmek istersen sadece burayi degistir.
    /// </summary>
    public static class MeshFactory
    {
        static Mesh coneMesh, pyramidMesh;

        public static Mesh Cone(int segments = 10)
        {
            if (coneMesh != null) return coneMesh;

            var verts = new Vector3[segments + 2];
            verts[0] = new Vector3(0f, 1f, 0f);          // tepe
            verts[1] = Vector3.zero;                      // taban merkezi
            for (int i = 0; i < segments; i++)
            {
                float a = (float)i / segments * Mathf.PI * 2f;
                verts[i + 2] = new Vector3(Mathf.Cos(a) * 0.5f, 0f, Mathf.Sin(a) * 0.5f);
            }

            var tris = new int[segments * 6];
            for (int i = 0; i < segments; i++)
            {
                int a = i + 2, b = (i + 1) % segments + 2;
                tris[i * 6 + 0] = 0; tris[i * 6 + 1] = b; tris[i * 6 + 2] = a;   // yan yuz
                tris[i * 6 + 3] = 1; tris[i * 6 + 4] = a; tris[i * 6 + 5] = b;   // taban
            }

            coneMesh = new Mesh { name = "Cone" };
            coneMesh.vertices = verts;
            coneMesh.triangles = tris;
            coneMesh.RecalculateNormals();
            coneMesh.RecalculateBounds();
            return coneMesh;
        }

        public static Mesh Pyramid()
        {
            if (pyramidMesh != null) return pyramidMesh;

            var v = new[]
            {
                new Vector3(-0.5f, 0f, -0.5f),
                new Vector3( 0.5f, 0f, -0.5f),
                new Vector3( 0.5f, 0f,  0.5f),
                new Vector3(-0.5f, 0f,  0.5f),
                new Vector3( 0f,   1f,  0f),
            };
            var t = new[]
            {
                0, 4, 1,
                1, 4, 2,
                2, 4, 3,
                3, 4, 0,
                0, 1, 2,
                0, 2, 3,
            };
            pyramidMesh = new Mesh { name = "Pyramid" };
            pyramidMesh.vertices = v;
            pyramidMesh.triangles = t;
            pyramidMesh.RecalculateNormals();
            pyramidMesh.RecalculateBounds();
            return pyramidMesh;
        }

        /// <summary>Verilen mesh ile bir GameObject kurar.</summary>
        public static GameObject Make(Mesh mesh, Material mat, Transform parent, Vector3 pos, Vector3 scale, Color color)
        {
            var go = new GameObject("shape");
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            go.transform.localScale = scale;
            var mf = go.AddComponent<MeshFilter>();
            mf.sharedMesh = mesh;
            var mr = go.AddComponent<MeshRenderer>();
            mr.sharedMaterial = mat;
            BoardView.Tint(mr, color);
            return go;
        }
    }
}
