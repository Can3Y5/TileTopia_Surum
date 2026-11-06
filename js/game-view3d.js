/**
 * Kabileler / The Battle of Polytopia - 3D Sahne Motoru (Three.js)
 * Düşük Poligonlu (Low-Poly) İzometrik 3D Dünya, 12 Kabileye Özel Mimari ve Küp Kafa Savaşçılar
 */

import { GameState, DB, Terrain, Res, Bld, UnitType } from './game-core.js';

export class BoardView3D {
    constructor(container, gameState) {
        this.container = container;
        this.g = gameState;

        // Üç Boyutlu Sahne ve Render
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Katman Grupları
        this.tileGroup = null;
        this.cliffGroup = null;
        this.fenceGroup = null;
        this.cloudGroup = null;
        this.unitGroup = null;
        this.highlightGroup = null;
        this.effectGroup = null;
        this.starGroup = null;

        // Önbellekler (Cache)
        this.tileMeshes = new Map();
        this.cloudMeshes = new Map();
        this.unitMeshes = new Map();
        this.unitHealthSprites = new Map();
        this.highlightPlates = [];
        this.targetPlates = [];

        // Kamera ve İzometrik Açı
        this.zoom = 13.5;
        this.targetZoom = 13.5;
        this.cameraAngle = Math.PI / 4;
        this.cameraPitch = Math.atan(Math.SQRT1_2);
        this.cameraTarget = new THREE.Vector3(this.g.size / 2, 0, this.g.size / 2);
        this.currentCameraTarget = new THREE.Vector3().copy(this.cameraTarget);

        // Girdi Kontrolleri (Fare ve Dokunmatik)
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.touchStartTime = 0;
        this.touchStartPos = { x: 0, y: 0 };
        this.touchMoved = false;
        this.lastTouchDistance = 0;
        this.lastTouchPos = { x: 0, y: 0 };

        // Tıklama callback
        this.onTileClick = null;

        // Animasyonlar
        this.clock = new THREE.Clock();
        this.floatingTexts = [];

        this.init();
    }

    init() {
        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || window.innerHeight;

        // 1. Sahne (Kozmik Uzay Arka Planı)
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000205); // Derin uzay siyahı

        // 2. İzometrik Ortografik Kamera
        const aspect = w / h;
        this.camera = new THREE.OrthographicCamera(
            -this.zoom * aspect, this.zoom * aspect,
            this.zoom, -this.zoom,
            0.1, 1000
        );

        this.updateCameraTransform();

        // 3. WebGL Render Motoru
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // 4. Işıklandırma
        this.setupLights();

        // 5. Gruplar
        this.starGroup = new THREE.Group();
        this.cliffGroup = new THREE.Group();
        this.tileGroup = new THREE.Group();
        this.fenceGroup = new THREE.Group();
        this.cloudGroup = new THREE.Group();
        this.unitGroup = new THREE.Group();
        this.highlightGroup = new THREE.Group();
        this.effectGroup = new THREE.Group();

        this.scene.add(this.starGroup);
        this.scene.add(this.cliffGroup);
        this.scene.add(this.tileGroup);
        this.scene.add(this.fenceGroup);
        this.scene.add(this.cloudGroup);
        this.scene.add(this.unitGroup);
        this.scene.add(this.highlightGroup);
        this.scene.add(this.effectGroup);

        // 6. Arka Planda Parıldayan Yıldızlar
        this.buildStarfield();

        // 7. Olay Dinleyicileri (Fare + Mobil Dokunmatik)
        this.setupEvents();

        // 8. Haritayı İnşa Et
        this.buildBoard();

        // 9. Başkente Odaklan
        const cap = this.g.cities.find(c => c.owner === GameState.HUMAN);
        if (cap) {
            this.focusOn(cap.x, cap.y);
        } else {
            this.focusOn(this.g.size / 2, this.g.size / 2);
        }

        // 10. Render Döngüsü
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0xe8f0f8, 0.85);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xfff5e6, 1.35);
        sun.position.set(32, 45, 24);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 140;
        const d = 32;
        sun.shadow.camera.left = -d;
        sun.shadow.camera.right = d;
        sun.shadow.camera.top = d;
        sun.shadow.camera.bottom = -d;
        sun.shadow.bias = -0.0003;
        this.scene.add(sun);

        const fillLight = new THREE.DirectionalLight(0x6c5ce7, 0.35);
        fillLight.position.set(-25, 20, -25);
        this.scene.add(fillLight);
    }

    buildStarfield() {
        const starGeo = new THREE.BufferGeometry();
        const starCount = 450;
        const pos = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);

        const palette = [
            [1.0, 1.0, 1.0],
            [0.5, 0.8, 1.0],
            [1.0, 0.9, 0.6],
            [0.9, 0.6, 1.0]
        ];

        for (let i = 0; i < starCount; i++) {
            const idx = i * 3;
            pos[idx] = (Math.random() - 0.5) * 180;
            pos[idx + 1] = (Math.random() - 0.5) * 130 - 25;
            pos[idx + 2] = (Math.random() - 0.5) * 180;

            const c = palette[Math.floor(Math.random() * palette.length)];
            colors[idx] = c[0];
            colors[idx + 1] = c[1];
            colors[idx + 2] = c[2];
        }

        starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const starMat = new THREE.PointsMaterial({
            size: 0.75,
            vertexColors: true,
            transparent: true,
            opacity: 0.85
        });

        const starPoints = new THREE.Points(starGeo, starMat);
        this.starGroup.add(starPoints);
    }

    updateCameraTransform() {
        const distance = 40;
        const x = this.currentCameraTarget.x + distance * Math.cos(this.cameraPitch) * Math.sin(this.cameraAngle);
        const y = this.currentCameraTarget.y + distance * Math.sin(this.cameraPitch);
        const z = this.currentCameraTarget.z + distance * Math.cos(this.cameraPitch) * Math.cos(this.cameraAngle);

        this.camera.position.set(x, y, z);
        this.camera.lookAt(this.currentCameraTarget);

        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || window.innerHeight;
        const aspect = w / h;
        this.camera.left = -this.zoom * aspect;
        this.camera.right = this.zoom * aspect;
        this.camera.top = this.zoom;
        this.camera.bottom = -this.zoom;
        this.camera.updateProjectionMatrix();
    }

    focusOn(x, y) {
        this.cameraTarget.set(x, 0, y);
    }

    buildBoard() {
        while (this.tileGroup.children.length > 0) this.tileGroup.remove(this.tileGroup.children[0]);
        while (this.cliffGroup.children.length > 0) this.cliffGroup.remove(this.cliffGroup.children[0]);
        while (this.cloudGroup.children.length > 0) this.cloudGroup.remove(this.cloudGroup.children[0]);

        this.tileMeshes.clear();
        this.cloudMeshes.clear();

        const s = this.g.size;

        // 1. Zemin Blokları
        for (let y = 0; y < s; y++) {
            for (let x = 0; x < s; x++) {
                const tile = this.g.at(x, y);
                const mesh = this.createTileMesh(tile);
                this.tileGroup.add(mesh);
                this.tileMeshes.set(this.g.idx(x, y), mesh);

                // Sis Bulutu
                const cloud = this.createCloudMesh(x, y);
                this.cloudGroup.add(cloud);
                this.cloudMeshes.set(this.g.idx(x, y), cloud);
            }
        }

        // 2. Uzayda Yüzen Ada Uçurumları
        this.buildIslandCliffs();

        // 3. Köşelerdeki Deniz Fenerleri
        this.buildLighthouses();

        // 4. Güncelle
        this.refresh();
    }

    getTileHeight(tile) {
        if (!tile) return 0.22;
        if (tile.terr === Terrain.Water) return 0.22;
        if (tile.terr === Terrain.Mountain) return 0.72;
        if (tile.terr === Terrain.Forest) return 0.44;
        return 0.40;
    }

    createTileMesh(tile) {
        const group = new THREE.Group();
        group.position.set(tile.x, 0, tile.y);
        group.userData = { tileX: tile.x, tileY: tile.y, isTile: true };

        const h = this.getTileHeight(tile);
        const geo = new THREE.BoxGeometry(0.96, h, 0.96);
        const baseColor = DB.Terrains[tile.terr].color;

        const mat = new THREE.MeshStandardMaterial({
            color: baseColor,
            roughness: 0.75,
            metalness: 0.08,
            flatShading: true
        });

        const cube = new THREE.Mesh(geo, mat);
        cube.position.y = h / 2;
        cube.receiveShadow = true;
        cube.castShadow = (tile.terr !== Terrain.Water);
        group.add(cube);
        group.userData.baseCube = cube;

        const contentGroup = new THREE.Group();
        group.add(contentGroup);
        group.userData.contentGroup = contentGroup;

        return group;
    }

    buildIslandCliffs() {
        const s = this.g.size;
        const cliffMat = new THREE.MeshStandardMaterial({ color: 0x242b35, roughness: 0.85, flatShading: true });
        const dirtMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9, flatShading: true });

        for (let x = 0; x < s; x++) {
            this.createCliffBlock(x, 0, 0, -1, cliffMat, dirtMat);
            this.createCliffBlock(x, s - 1, 0, 1, cliffMat, dirtMat);
        }
        for (let y = 0; y < s; y++) {
            this.createCliffBlock(0, y, -1, 0, cliffMat, dirtMat);
            this.createCliffBlock(s - 1, y, 1, 0, cliffMat, dirtMat);
        }
    }

    createCliffBlock(x, y, dx, dy, cliffMat, dirtMat) {
        const depth = 2.6;
        const cliffGeo = new THREE.BoxGeometry(0.96, depth, 0.96);
        const cliff = new THREE.Mesh(cliffGeo, cliffMat);
        cliff.position.set(x + dx * 0.12, -depth / 2, y + dy * 0.12);
        cliff.scale.set(0.94, 1, 0.94);
        this.cliffGroup.add(cliff);

        const dirt = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.28, 0.98), dirtMat);
        dirt.position.set(x, -0.14, y);
        this.cliffGroup.add(dirt);
    }

    buildLighthouses() {
        const s = this.g.size;
        const corners = [[0, 0], [s - 1, 0], [0, s - 1], [s - 1, s - 1]];

        corners.forEach(([cx, cy]) => {
            const t = this.g.at(cx, cy);
            if (!t || t.terr !== Terrain.Water) return;

            const lhGroup = new THREE.Group();
            lhGroup.position.set(cx, 0.22, cy);

            const redMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, flatShading: true });
            const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
            const lightMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });

            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.25, 6), redMat);
            base.position.y = 0.12;
            lhGroup.add(base);

            const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.25, 6), whiteMat);
            mid.position.y = 0.37;
            lhGroup.add(mid);

            const top = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.2, 6), redMat);
            top.position.y = 0.58;
            lhGroup.add(top);

            const lantern = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), lightMat);
            lantern.position.y = 0.74;
            lhGroup.add(lantern);

            this.tileGroup.add(lhGroup);
        });
    }

    createCloudMesh(x, y) {
        const group = new THREE.Group();
        group.position.set(x, 0.72, y);

        const cloudMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.3,
            metalness: 0.05,
            flatShading: true
        });

        // 3D Organik pofuduk bulut öbeği
        const p1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 0), cloudMat);
        p1.position.set((x % 3 - 1) * 0.06, 0.14, (y % 3 - 1) * 0.06);
        group.add(p1);

        const p2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), cloudMat);
        p2.position.set(-0.18, 0.1, 0.14);
        group.add(p2);

        const p3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), cloudMat);
        p3.position.set(0.2, 0.12, -0.12);
        group.add(p3);

        group.userData = { baseX: x, baseY: y, seed: x * 13 + y * 7 };
        return group;
    }

    refreshBorders() {
        while (this.fenceGroup.children.length > 0) {
            this.fenceGroup.remove(this.fenceGroup.children[0]);
        }

        const fenceGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.32, 4);

        for (const c of this.g.cities) {
            if (c.owner < 0) continue;
            const ownerColor = this.g.players[c.owner].tribe.colorHex;

            const postMat = new THREE.MeshStandardMaterial({ color: ownerColor, flatShading: true });
            const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });

            for (let dy = -c.border; dy <= c.border; dy++) {
                for (let dx = -c.border; dx <= c.border; dx++) {
                    const tx = c.x + dx;
                    const ty = c.y + dy;
                    const tile = this.g.at(tx, ty);
                    if (!tile || tile.ownCity !== c.id || !tile.seen[GameState.HUMAN]) continue;

                    const isEdge = (Math.abs(dx) === c.border || Math.abs(dy) === c.border);
                    if (isEdge) {
                        const h = this.getTileHeight(tile);
                        const post = new THREE.Mesh(fenceGeo, postMat);
                        post.position.set(tx + (dx === 0 ? 0 : Math.sign(dx) * 0.44), h + 0.16, ty + (dy === 0 ? 0 : Math.sign(dy) * 0.44));
                        this.fenceGroup.add(post);

                        const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 4), stripeMat);
                        stripe.position.set(post.position.x, h + 0.22, post.position.z);
                        this.fenceGroup.add(stripe);
                    }
                }
            }
        }
    }

    refresh() {
        if (!this.g) return;

        for (let y = 0; y < this.g.size; y++) {
            for (let x = 0; x < this.g.size; x++) {
                const idx = this.g.idx(x, y);
                const tile = this.g.at(x, y);
                const seen = tile.seen[GameState.HUMAN];

                const cloud = this.cloudMeshes.get(idx);
                if (cloud) {
                    if (seen && cloud.visible) {
                        // Sis açılınca pürüzsüzce küçülerek kaybol
                        if (window.TWEEN) {
                            new TWEEN.Tween(cloud.scale)
                                .to({ x: 0.01, y: 0.01, z: 0.01 }, 300)
                                .onComplete(() => { cloud.visible = false; })
                                .start();
                        } else {
                            cloud.visible = false;
                        }
                    } else if (!seen) {
                        cloud.visible = true;
                        cloud.scale.set(1, 1, 1);
                    }
                }

                const mesh = this.tileMeshes.get(idx);
                if (mesh) {
                    mesh.visible = seen;
                    if (seen) {
                        const content = mesh.userData.contentGroup;
                        this.refreshDecorations(tile, content, this.getTileHeight(tile));
                    }
                }
            }
        }

        this.refreshBorders();
        this.refreshUnits();
    }

    refreshDecorations(tile, group, h) {
        while (group.children.length > 0) group.remove(group.children[0]);

        if (tile.city) {
            this.buildCityMesh(group, tile.city, h);
            return;
        }

        if (tile.bld !== Bld.None) {
            this.buildBuildingModel(group, tile.bld, h);
            return;
        }

        if (tile.res !== Res.None) {
            this.buildResourceModel(group, tile.res, h);
            return;
        }

        if (tile.terr === Terrain.Forest) {
            this.buildForestDecor(group, h, tile);
        } else if (tile.terr === Terrain.Mountain) {
            this.buildMountainDecor(group, h);
        }
    }

    buildForestDecor(group, h, tile) {
        const treeMat = new THREE.MeshStandardMaterial({ color: 0x1f542a, flatShading: true });
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, flatShading: true });

        const offsets = [
            [-0.18, -0.16, 0.52],
            [0.2, 0.14, 0.62],
            [-0.14, 0.22, 0.46]
        ];

        offsets.forEach(([ox, oz, scale]) => {
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.2, 5), trunkMat);
            trunk.position.set(ox, h + 0.1, oz);
            group.add(trunk);

            // Çift katmanlı koni ağaç yapısı
            const foliage1 = new THREE.Mesh(new THREE.ConeGeometry(0.22 * scale, 0.35 * scale, 6), treeMat);
            foliage1.position.set(ox, h + 0.22 + 0.15 * scale, oz);
            foliage1.castShadow = true;
            group.add(foliage1);

            const foliage2 = new THREE.Mesh(new THREE.ConeGeometry(0.16 * scale, 0.28 * scale, 6), treeMat);
            foliage2.position.set(ox, h + 0.32 + 0.22 * scale, oz);
            foliage2.castShadow = true;
            group.add(foliage2);
        });
    }

    buildMountainDecor(group, h) {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a6268, roughness: 0.9, flatShading: true });
        const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, flatShading: true });

        // Ana Zirve
        const peak1 = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.75, 5), rockMat);
        peak1.position.set(0.04, h + 0.36, 0.04);
        peak1.castShadow = true;
        group.add(peak1);

        const snow1 = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.32, 5), snowMat);
        snow1.position.set(0.04, h + 0.58, 0.04);
        group.add(snow1);

        // Yan Zirve
        const peak2 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.48, 5), rockMat);
        peak2.position.set(-0.22, h + 0.24, -0.18);
        peak2.castShadow = true;
        group.add(peak2);

        const snow2 = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.20, 5), snowMat);
        snow2.position.set(-0.22, h + 0.38, -0.18);
        group.add(snow2);
    }

    buildResourceModel(group, res, h) {
        switch (res) {
            case Res.Fruit: {
                const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.19, 0), new THREE.MeshStandardMaterial({ color: 0x27ae60, flatShading: true }));
                bush.position.set(0, h + 0.14, 0);
                group.add(bush);

                const berryMat = new THREE.MeshStandardMaterial({ color: 0x3498db, flatShading: true });
                const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 4, 4), berryMat);
                b1.position.set(0.09, h + 0.24, 0.07);
                const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), berryMat);
                b2.position.set(-0.08, h + 0.22, -0.06);
                group.add(b1); group.add(b2);
                break;
            }
            case Res.Crop: {
                const wheatMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, flatShading: true });
                for (let i = -0.28; i <= 0.28; i += 0.16) {
                    const row = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.09, 0.08), wheatMat);
                    row.position.set(0, h + 0.05, i);
                    group.add(row);
                }
                break;
            }
            case Res.Animal: {
                // Low-poly sevimli yaban geyiği/bizonu
                const animalMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, flatShading: true });
                const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.36), animalMat);
                body.position.set(0, h + 0.18, 0);
                body.castShadow = true;
                group.add(body);

                const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), animalMat);
                head.position.set(0, h + 0.28, 0.18);
                group.add(head);

                const hornMat = new THREE.MeshStandardMaterial({ color: 0xecd599, flatShading: true });
                const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), hornMat);
                h1.position.set(0.07, h + 0.38, 0.16);
                const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), hornMat);
                h2.position.set(-0.07, h + 0.38, 0.16);
                group.add(h1); group.add(h2);
                break;
            }
            case Res.Metal: {
                // Dağda parıldayan mavi cevher kristalleri
                const oreMat = new THREE.MeshStandardMaterial({ color: 0x00cec9, roughness: 0.2, metalness: 0.8, flatShading: true });
                const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), new THREE.MeshStandardMaterial({ color: 0x3d3d3d, flatShading: true }));
                rock.position.set(0, h + 0.14, 0);
                group.add(rock);

                const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 4), oreMat);
                c1.position.set(0.08, h + 0.22, 0.06);
                c1.rotation.z = -0.3;
                const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.20, 4), oreMat);
                c2.position.set(-0.07, h + 0.20, -0.05);
                c2.rotation.z = 0.4;
                group.add(c1); group.add(c2);
                break;
            }
            case Res.Fish: {
                const fishMat = new THREE.MeshStandardMaterial({ color: 0x0984e3, flatShading: true });
                const f = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 4), fishMat);
                f.rotation.x = Math.PI / 2.2;
                f.position.set(0, h + 0.08, 0);
                group.add(f);
                break;
            }
        }
    }

    buildBuildingModel(group, bld, h) {
        switch (bld) {
            case Bld.Farm: {
                const barnMat = new THREE.MeshStandardMaterial({ color: 0xd63031, flatShading: true });
                const barn = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.42), barnMat);
                barn.position.set(0, h + 0.13, 0);
                barn.castShadow = true;
                group.add(barn);
                break;
            }
            case Bld.Mine: {
                const cave = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), new THREE.MeshStandardMaterial({ color: 0x2d3436, flatShading: true }));
                cave.position.set(0, h + 0.16, 0);
                group.add(cave);
                break;
            }
            case Bld.LumberHut: {
                const logMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, flatShading: true });
                const hut = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.34), logMat);
                hut.position.set(0, h + 0.11, 0);
                group.add(hut);
                break;
            }
            case Bld.Port: {
                const pier = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.54), new THREE.MeshStandardMaterial({ color: 0x795548, flatShading: true }));
                pier.position.set(0, h + 0.04, 0);
                group.add(pier);

                const boat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.38), new THREE.MeshStandardMaterial({ color: 0xd7ccc8, flatShading: true }));
                boat.position.set(0.24, h + 0.06, 0.06);
                group.add(boat);

                const sail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 3), new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true }));
                sail.position.set(0.24, h + 0.28, 0.06);
                group.add(sail);
                break;
            }
        }
    }

    // ---------------------------------------------------------------- 12 KABİLEYE ÖZEL 3B ŞEHİR MİMARİSİ
    buildCityMesh(group, city, h) {
        const isNeutral = (city.owner < 0);
        const tribe = isNeutral ? null : this.g.players[city.owner].tribe;
        const tribeColor = isNeutral ? 0x95a5a6 : tribe.colorHex;

        if (isNeutral) {
            // Tarafsız Köy: Konik deri çadırlar ve kamp ateşi
            const tentMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c, flatShading: true });
            const tent1 = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.34, 5), tentMat);
            tent1.position.set(-0.14, h + 0.17, -0.1);
            const tent2 = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.3, 5), tentMat);
            tent2.position.set(0.16, h + 0.15, 0.14);
            group.add(tent1); group.add(tent2);

            const fire = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), new THREE.MeshBasicMaterial({ color: 0xe67e22 }));
            fire.position.set(0.02, h + 0.06, -0.04);
            group.add(fire);
            return;
        }

        // Sur Duvarı (City Walls)
        if (city.walls) {
            const wallMat = new THREE.MeshStandardMaterial({ color: 0x485460, roughness: 0.9, flatShading: true });
            const s = 0.9, wh = 0.26, th = 0.08;
            const w1 = new THREE.Mesh(new THREE.BoxGeometry(s, wh, th), wallMat);
            w1.position.set(0, h + wh / 2, -s / 2);
            const w2 = new THREE.Mesh(new THREE.BoxGeometry(s, wh, th), wallMat);
            w2.position.set(0, h + wh / 2, s / 2);
            const w3 = new THREE.Mesh(new THREE.BoxGeometry(th, wh, s), wallMat);
            w3.position.set(-s / 2, h + wh / 2, 0);
            const w4 = new THREE.Mesh(new THREE.BoxGeometry(th, wh, s), wallMat);
            w4.position.set(s / 2, h + wh / 2, 0);
            group.add(w1); group.add(w2); group.add(w3); group.add(w4);
        }

        const stoneMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, flatShading: true });
        const tribeMat = new THREE.MeshStandardMaterial({ color: tribeColor, flatShading: true });
        const darkStone = new THREE.MeshStandardMaterial({ color: 0x2d3436, flatShading: true });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.6, roughness: 0.2, flatShading: true });

        const baseH = 0.32 + city.level * 0.08;
        const baseW = 0.46 + Math.min(city.level * 0.06, 0.2);

        // Kabileye özel mimari yapı
        switch (tribe.name) {
            case 'Vengir': {
                // Kara Obsidiyen Şövalye Kalesi (Sivri Gotik Kuleler ve Kırmızı Fırın Işıkları)
                const keep = new THREE.Mesh(new THREE.BoxGeometry(baseW, baseH, baseW), darkStone);
                keep.position.set(0, h + baseH / 2, 0);
                keep.castShadow = true;
                group.add(keep);

                // Sivri Gotik Kule
                const spire = new THREE.Mesh(new THREE.ConeGeometry(baseW * 0.45, 0.52, 4), new THREE.MeshStandardMaterial({ color: 0x7b1113, flatShading: true }));
                spire.position.set(0, h + baseH + 0.26, 0);
                group.add(spire);

                // 4 Köşe Sivri Burç
                for (const [bx, bz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
                    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, baseH + 0.16, 0.12), darkStone);
                    post.position.set(bx * baseW * 0.48, h + (baseH + 0.16) / 2, bz * baseW * 0.48);
                    group.add(post);
                    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), new THREE.MeshStandardMaterial({ color: 0x800020, flatShading: true }));
                    tip.position.set(bx * baseW * 0.48, h + baseH + 0.24, bz * baseW * 0.48);
                    group.add(tip);
                }
                break;
            }
            case 'Xin-xi': {
                // Japon Çok Katlı Pagodası (Kıvrımlı Kırmızı Çatılar ve Altın Alem)
                const keep = new THREE.Mesh(new THREE.BoxGeometry(baseW, baseH * 0.7, baseW), stoneMat);
                keep.position.set(0, h + (baseH * 0.7) / 2, 0);
                group.add(keep);

                const roof1 = new THREE.Mesh(new THREE.ConeGeometry(baseW * 0.85, 0.22, 4), tribeMat);
                roof1.rotation.y = Math.PI / 4;
                roof1.position.set(0, h + baseH * 0.7 + 0.11, 0);
                group.add(roof1);

                const tier2 = new THREE.Mesh(new THREE.BoxGeometry(baseW * 0.6, 0.25, baseW * 0.6), stoneMat);
                tier2.position.set(0, h + baseH * 0.7 + 0.32, 0);
                group.add(tier2);

                const roof2 = new THREE.Mesh(new THREE.ConeGeometry(baseW * 0.62, 0.24, 4), tribeMat);
                roof2.rotation.y = Math.PI / 4;
                roof2.position.set(0, h + baseH * 0.7 + 0.54, 0);
                group.add(roof2);

                const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.18, 4), goldMat);
                spire.position.set(0, h + baseH * 0.7 + 0.72, 0);
                group.add(spire);
                break;
            }
            case 'Bardur': {
                // İskandinav Ahşap Ejder Başlıklı Kütük Kilisesi (Stave Church)
                const keep = new THREE.Mesh(new THREE.BoxGeometry(baseW, baseH, baseW), new THREE.MeshStandardMaterial({ color: 0x4a3728, flatShading: true }));
                keep.position.set(0, h + baseH / 2, 0);
                group.add(keep);

                const roof = new THREE.Mesh(new THREE.ConeGeometry(baseW * 0.75, 0.48, 4), new THREE.MeshStandardMaterial({ color: 0x222f3e, flatShading: true }));
                roof.rotation.y = Math.PI / 4;
                roof.position.set(0, h + baseH + 0.24, 0);
                group.add(roof);
                break;
            }
            case 'Imperius': {
                // Roma Bazilikası ve Mermer Sütunlu Kubbe
                const keep = new THREE.Mesh(new THREE.BoxGeometry(baseW, baseH, baseW), stoneMat);
                keep.position.set(0, h + baseH / 2, 0);
                group.add(keep);

                const dome = new THREE.Mesh(new THREE.SphereGeometry(baseW * 0.44, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), goldMat);
                dome.position.set(0, h + baseH, 0);
                group.add(dome);
                break;
            }
            case 'Oumaji': {
                // Çöl Kerpiç Sarayı ve Altın Kubbe
                const keep = new THREE.Mesh(new THREE.BoxGeometry(baseW, baseH, baseW), new THREE.MeshStandardMaterial({ color: 0xecf0f1, flatShading: true }));
                keep.position.set(0, h + baseH / 2, 0);
                group.add(keep);

                const dome = new THREE.Mesh(new THREE.SphereGeometry(baseW * 0.38, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), goldMat);
                dome.position.set(0, h + baseH, 0);
                group.add(dome);
                break;
            }
            case 'Quetzali': {
                // Aztek Basamaklı Güneş Piramidi
                const step1 = new THREE.Mesh(new THREE.BoxGeometry(baseW * 1.1, baseH * 0.45, baseW * 1.1), new THREE.MeshStandardMaterial({ color: 0x27ae60, flatShading: true }));
                step1.position.set(0, h + (baseH * 0.45) / 2, 0);
                group.add(step1);

                const step2 = new THREE.Mesh(new THREE.BoxGeometry(baseW * 0.7, baseH * 0.45, baseW * 0.7), new THREE.MeshStandardMaterial({ color: 0x16a085, flatShading: true }));
                step2.position.set(0, h + baseH * 0.45 + (baseH * 0.45) / 2, 0);
                group.add(step2);

                const altar = new THREE.Mesh(new THREE.BoxGeometry(baseW * 0.35, 0.22, baseW * 0.35), goldMat);
                altar.position.set(0, h + baseH * 0.9 + 0.11, 0);
                group.add(altar);
                break;
            }
            default: {
                // Genel Kabile Şehir Şatosu
                const keep = new THREE.Mesh(new THREE.BoxGeometry(baseW, baseH, baseW), stoneMat);
                keep.position.set(0, h + baseH / 2, 0);
                group.add(keep);

                const roof = new THREE.Mesh(new THREE.ConeGeometry(baseW * 0.72, 0.38, 4), tribeMat);
                roof.rotation.y = Math.PI / 4;
                roof.position.set(0, h + baseH + 0.19, 0);
                group.add(roof);
                break;
            }
        }

        // Şehir İsmi ve Seviye Etiketi (Gelişmiş 3B İsimlik)
        this.createCityNameplate(group, city, h + baseH + 0.85);
    }

    createCityNameplate(group, city, yPos) {
        const canvas = document.createElement('canvas');
        canvas.width = 280;
        canvas.height = 76;
        const ctx = canvas.getContext('2d');

        const ownerColor = (city.owner >= 0) ? this.g.players[city.owner].tribe.color : '#74b9ff';

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.beginPath();
        ctx.roundRect(8, 8, 264, 60, 14);
        ctx.fill();

        ctx.strokeStyle = ownerColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = 'bold 24px "Segoe UI", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`${city.name} [Lv.${city.level}] ⭐+${city.level}`, 140, 46);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(0, yPos, 0);
        sprite.scale.set(1.5, 0.42, 1);
        group.add(sprite);
    }

    // ---------------------------------------------------------------- KÜP KAFA SAVAŞÇILAR & CAN ÇUBUKLARI
    refreshUnits() {
        const liveUnitIds = new Set(this.g.units.map(u => u.id));

        for (const [id, mesh] of this.unitMeshes.entries()) {
            if (!liveUnitIds.has(id)) {
                this.unitGroup.remove(mesh);
                this.unitMeshes.delete(id);
                this.unitHealthSprites.delete(id);
            }
        }

        for (const u of this.g.units) {
            const seen = this.g.at(u.x, u.y).seen[GameState.HUMAN];
            let mesh = this.unitMeshes.get(u.id);

            if (!mesh) {
                mesh = this.buildCubeHeadUnit(u);
                this.unitGroup.add(mesh);
                this.unitMeshes.set(u.id, mesh);
            }

            mesh.visible = seen;
            if (seen) {
                const targetY = this.getTileHeight(this.g.at(u.x, u.y));
                if (!mesh.userData.animating) {
                    mesh.position.set(u.x, targetY, u.y);
                }
                mesh.userData.baseY = targetY;
                this.updateUnitStatus(mesh, u);
            }
        }
    }

    buildCubeHeadUnit(u) {
        const group = new THREE.Group();
        group.userData = { unitId: u.id, isUnit: true, baseY: 0 };

        const player = this.g.players[u.owner];
        const tribe = player.tribe;
        const tribeColor = tribe.colorHex;

        // Kabileye Özgü Ten Rengi
        let skinColor = 0xf5cd79;
        if (tribe.name === 'Vengir') skinColor = 0xd5dbdb; // Vengir kül rengi ten
        else if (tribe.name === 'Oumaji' || tribe.name === 'Zebasi') skinColor = 0xb07d56;
        else if (tribe.name === 'Ai-Mo') skinColor = 0xf39c12;

        const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8, flatShading: true });
        const armorMat = new THREE.MeshStandardMaterial({ color: tribeColor, roughness: 0.6, flatShading: true });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.8, flatShading: true });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0xd2dae2, roughness: 0.3, metalness: 0.7, flatShading: true });

        const scale = (u.type === UnitType.Giant) ? 1.75 : 1.0;

        // 1. Zırhlı Gövde
        const bodyGeo = new THREE.BoxGeometry(0.26 * scale, 0.3 * scale, 0.22 * scale);
        const body = new THREE.Mesh(bodyGeo, armorMat);
        body.position.y = 0.2 * scale;
        body.castShadow = true;
        group.add(body);

        // 2. İKONİK POLYTROPIA KÜP KAFASI (Cube Head)
        const headGeo = new THREE.BoxGeometry(0.3 * scale, 0.3 * scale, 0.3 * scale);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 0.46 * scale;
        head.castShadow = true;
        group.add(head);

        // Gözler
        const eyeGeo = new THREE.BoxGeometry(0.04 * scale, 0.08 * scale, 0.02 * scale);
        const leftEye = new THREE.Mesh(eyeGeo, darkMat);
        leftEye.position.set(-0.07 * scale, 0.46 * scale, 0.155 * scale);
        const rightEye = new THREE.Mesh(eyeGeo, darkMat);
        rightEye.position.set(0.07 * scale, 0.46 * scale, 0.155 * scale);
        group.add(leftEye);
        group.add(rightEye);

        // 3. 12 Kabileye Özel Başlık / Miğfer
        this.addHeadwear(group, tribe, u.type, scale);

        // 4. Silahlar ve Binekler
        if (u.type === UnitType.Rider || u.type === UnitType.Knight) {
            const mountColor = (tribe.name === 'Zebasi') ? 0xf5f6fa : (u.type === UnitType.Knight ? 0x2c3e50 : 0x8d6e63);
            const horse = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.58), new THREE.MeshStandardMaterial({ color: mountColor, flatShading: true }));
            horse.position.set(0, 0.16, 0);
            horse.castShadow = true;
            group.add(horse);

            const horseHead = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.26), new THREE.MeshStandardMaterial({ color: mountColor, flatShading: true }));
            horseHead.position.set(0, 0.32, 0.34);
            group.add(horseHead);

            if (u.type === UnitType.Knight) {
                // Şövalye Gönder Mızrağı (Lance)
                const lance = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.9, 5), metalMat);
                lance.rotation.x = Math.PI / 3;
                lance.position.set(0.24, 0.45, 0.22);
                group.add(lance);
            }
        } else if (u.type === UnitType.Archer) {
            // Yay ve Sırt Sadakı
            const bow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.48, 0.04), darkMat);
            bow.position.set(0.22, 0.36, 0.1);
            group.add(bow);

            const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.32, 5), new THREE.MeshStandardMaterial({ color: 0x795548, flatShading: true }));
            quiver.position.set(-0.1, 0.32, -0.15);
            quiver.rotation.z = 0.3;
            group.add(quiver);
        } else if (u.type === UnitType.Defender) {
            // Büyük Kule Kalkanı
            const shield = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.54, 0.06), armorMat);
            shield.position.set(0, 0.3, 0.2);
            shield.castShadow = true;
            group.add(shield);
        } else if (u.type === UnitType.Swordsman || u.type === UnitType.Warrior) {
            // Kılıç
            const sword = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.54, 0.04), metalMat);
            sword.position.set(0.22, 0.38, 0.1);
            group.add(sword);

            const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.06), new THREE.MeshStandardMaterial({ color: 0xf1c40f, flatShading: true }));
            guard.position.set(0.22, 0.22, 0.1);
            group.add(guard);
        } else if (u.type === UnitType.Catapult) {
            const frame = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.54), new THREE.MeshStandardMaterial({ color: 0x5d4037, flatShading: true }));
            frame.position.set(0, 0.12, 0);
            group.add(frame);
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), metalMat);
            arm.position.set(0, 0.34, -0.1);
            arm.rotation.x = -0.5;
            group.add(arm);
        }

        // 5. Üst Can Çubuğu (Health Bar) & Seviye Rozeti
        this.createUnitHealthBar(group, u, scale);

        return group;
    }

    addHeadwear(group, tribe, unitType, scale) {
        const tribeMat = new THREE.MeshStandardMaterial({ color: tribe.colorHex, flatShading: true });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.8, flatShading: true });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.6, flatShading: true });

        switch (tribe.name) {
            case 'Vengir': {
                // Kara Demir Kafatası Miğferi ve Boynuzlar
                const helm = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, 0.14 * scale, 0.34 * scale), darkMat);
                helm.position.y = 0.62 * scale;
                group.add(helm);

                const h1 = new THREE.Mesh(new THREE.ConeGeometry(0.05 * scale, 0.24 * scale, 4), new THREE.MeshStandardMaterial({ color: 0x800020, flatShading: true }));
                h1.position.set(0.2 * scale, 0.72 * scale, 0);
                h1.rotation.z = -Math.PI / 4;
                const h2 = new THREE.Mesh(new THREE.ConeGeometry(0.05 * scale, 0.24 * scale, 4), new THREE.MeshStandardMaterial({ color: 0x800020, flatShading: true }));
                h2.position.set(-0.2 * scale, 0.72 * scale, 0);
                h2.rotation.z = Math.PI / 4;
                group.add(h1); group.add(h2);
                break;
            }
            case 'Bardur': {
                // Viking Boynuzlu Miğfer ve Omuz Kürk Mantosu
                const helm = new THREE.Mesh(new THREE.BoxGeometry(0.32 * scale, 0.12 * scale, 0.32 * scale), darkMat);
                helm.position.y = 0.61 * scale;
                group.add(helm);

                const horn1 = new THREE.Mesh(new THREE.ConeGeometry(0.05 * scale, 0.18 * scale, 4), whiteMat);
                horn1.position.set(0.2 * scale, 0.68 * scale, 0);
                horn1.rotation.z = -Math.PI / 4;
                const horn2 = new THREE.Mesh(new THREE.ConeGeometry(0.05 * scale, 0.18 * scale, 4), whiteMat);
                horn2.position.set(-0.2 * scale, 0.68 * scale, 0);
                horn2.rotation.z = Math.PI / 4;
                group.add(horn1); group.add(horn2);
                break;
            }
            case 'Xin-xi': {
                // Japon Samuray Kabuto Miğferi
                const kabuto = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, 0.14 * scale, 0.34 * scale), darkMat);
                kabuto.position.y = 0.61 * scale;
                const crest = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.16 * scale, 0.04 * scale), tribeMat);
                crest.position.set(0, 0.72 * scale, 0.14 * scale);
                group.add(kabuto); group.add(crest);
                break;
            }
            case 'Imperius': {
                // Roma Centurion Miğferi ve Kırmızı Sorguç (Crista)
                const helm = new THREE.Mesh(new THREE.BoxGeometry(0.32 * scale, 0.12 * scale, 0.32 * scale), goldMat);
                helm.position.y = 0.61 * scale;
                const plume = new THREE.Mesh(new THREE.BoxGeometry(0.06 * scale, 0.18 * scale, 0.34 * scale), new THREE.MeshStandardMaterial({ color: 0xd63031, flatShading: true }));
                plume.position.y = 0.72 * scale;
                group.add(helm); group.add(plume);
                break;
            }
            case 'Oumaji': {
                // Beyaz Çöl Sarığı (Keffiyeh)
                const turban = new THREE.Mesh(new THREE.BoxGeometry(0.36 * scale, 0.16 * scale, 0.36 * scale), whiteMat);
                turban.position.y = 0.62 * scale;
                const band = new THREE.Mesh(new THREE.BoxGeometry(0.38 * scale, 0.05 * scale, 0.38 * scale), goldMat);
                band.position.y = 0.58 * scale;
                group.add(turban); group.add(band);
                break;
            }
            case 'Kickoo': {
                // Tropikal Tüy Başlığı
                const band = new THREE.Mesh(new THREE.BoxGeometry(0.32 * scale, 0.06 * scale, 0.32 * scale), new THREE.MeshStandardMaterial({ color: 0xe67e22, flatShading: true }));
                band.position.y = 0.56 * scale;
                const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.03 * scale, 0.24 * scale, 0.03 * scale), new THREE.MeshStandardMaterial({ color: 0x2ecc71, flatShading: true }));
                f1.position.set(0.1 * scale, 0.7 * scale, -0.1 * scale);
                const f2 = new THREE.Mesh(new THREE.BoxGeometry(0.03 * scale, 0.28 * scale, 0.03 * scale), new THREE.MeshStandardMaterial({ color: 0x0984e3, flatShading: true }));
                f2.position.set(0.04 * scale, 0.74 * scale, -0.1 * scale);
                group.add(band); group.add(f1); group.add(f2);
                break;
            }
            case 'Hoodrick': {
                // Robin Hood Yeşil Avcı Kasketi ve Kırmızı Tüy
                const cap = new THREE.Mesh(new THREE.ConeGeometry(0.24 * scale, 0.24 * scale, 4), new THREE.MeshStandardMaterial({ color: 0x27ae60, flatShading: true }));
                cap.rotation.x = -0.4;
                cap.position.set(0, 0.65 * scale, -0.06 * scale);
                const feather = new THREE.Mesh(new THREE.BoxGeometry(0.02 * scale, 0.25 * scale, 0.04 * scale), new THREE.MeshStandardMaterial({ color: 0xe74c3c, flatShading: true }));
                feather.position.set(0.12 * scale, 0.72 * scale, 0);
                feather.rotation.z = -0.3;
                group.add(cap); group.add(feather);
                break;
            }
            case 'Luxidoor': {
                // Zümrüt Taşlı Kraliyet Beyaz Türbanı
                const turban = new THREE.Mesh(new THREE.SphereGeometry(0.22 * scale, 6, 6), whiteMat);
                turban.position.y = 0.68 * scale;
                const gem = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06 * scale, 0), new THREE.MeshStandardMaterial({ color: 0x00b894, flatShading: true }));
                gem.position.set(0, 0.68 * scale, 0.2 * scale);
                group.add(turban); group.add(gem);
                break;
            }
            case 'Yădakk': {
                // Kırmızı Osmanlı Fesi ve Altın Püskül
                const fez = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * scale, 0.18 * scale, 0.18 * scale, 8), new THREE.MeshStandardMaterial({ color: 0xb71540, flatShading: true }));
                fez.position.y = 0.66 * scale;
                const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, 0.12 * scale, 4), goldMat);
                tassel.position.set(0.12 * scale, 0.68 * scale, 0.08 * scale);
                group.add(fez); group.add(tassel);
                break;
            }
            case 'Quetzali': {
                // Aztek Tüylü Güneş Başlığı
                const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.34 * scale, 0.34 * scale, 0.04 * scale, 8, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x00cec9, flatShading: true }));
                fan.rotation.x = Math.PI / 2;
                fan.position.set(0, 0.72 * scale, -0.05 * scale);
                group.add(fan);
                break;
            }
            default: {
                const cap = new THREE.Mesh(new THREE.BoxGeometry(0.32 * scale, 0.1 * scale, 0.32 * scale), tribeMat);
                cap.position.y = 0.61 * scale;
                group.add(cap);
                break;
            }
        }
    }

    createUnitHealthBar(group, u, scale) {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 42;
        const ctx = canvas.getContext('2d');

        // Arka plan
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.beginPath();
        ctx.roundRect(4, 4, 152, 34, 8);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Can Çubuğu Dolgusu
        const ratio = Math.max(0, Math.min(1, u.hp / u.maxHp));
        const barWidth = 140 * ratio;
        let barColor = '#00b894';
        if (ratio < 0.3) barColor = '#d63031';
        else if (ratio < 0.6) barColor = '#fdcb6e';

        ctx.fillStyle = barColor;
        ctx.beginPath();
        ctx.roundRect(10, 10, barWidth, 22, 5);
        ctx.fill();

        // Can Metni
        ctx.font = 'bold 16px "Segoe UI", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`${u.hp}/${u.maxHp}`, 80, 27);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(0, 0.88 * scale, 0);
        sprite.scale.set(0.9, 0.24, 1);
        sprite.name = "healthBar";
        group.add(sprite);

        this.unitHealthSprites.set(u.id, sprite);
    }

    updateUnitStatus(mesh, u) {
        // Can Çubuğunu Güncelle
        const sprite = mesh.getObjectByName("healthBar");
        if (sprite && sprite.material && sprite.material.map) {
            const canvas = sprite.material.map.image;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
                ctx.beginPath();
                ctx.roundRect(4, 4, 152, 34, 8);
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();

                const ratio = Math.max(0, Math.min(1, u.hp / u.maxHp));
                const barWidth = 140 * ratio;
                let barColor = '#00b894';
                if (ratio < 0.3) barColor = '#d63031';
                else if (ratio < 0.6) barColor = '#fdcb6e';

                ctx.fillStyle = barColor;
                ctx.beginPath();
                ctx.roundRect(10, 10, barWidth, 22, 5);
                ctx.fill();

                ctx.font = 'bold 16px "Segoe UI", sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.fillText(`${u.hp}/${u.maxHp}`, 80, 27);

                sprite.material.map.needsUpdate = true;
            }
        }
    }

    // ---------------------------------------------------------------- Vurgular (Highlights)
    clearHighlights() {
        while (this.highlightGroup.children.length > 0) this.highlightGroup.remove(this.highlightGroup.children[0]);
        this.highlightPlates = [];
        this.targetPlates = [];
    }

    showHighlights(moves, targets, selX, selY) {
        this.clearHighlights();

        if (selX >= 0 && selY >= 0) {
            const h = this.getTileHeight(this.g.at(selX, selY));
            const selPlate = new THREE.Mesh(
                new THREE.RingGeometry(0.38, 0.47, 16),
                new THREE.MeshBasicMaterial({ color: 0xf1c40f, side: THREE.DoubleSide })
            );
            selPlate.rotation.x = -Math.PI / 2;
            selPlate.position.set(selX, h + 0.05, selY);
            this.highlightGroup.add(selPlate);
        }

        if (moves) {
            const moveMat = new THREE.MeshBasicMaterial({
                color: 0x00cec9,
                transparent: true,
                opacity: 0.75,
                side: THREE.DoubleSide
            });

            for (const [key] of moves) {
                const x = key % this.g.size;
                const y = Math.floor(key / this.g.size);
                const h = this.getTileHeight(this.g.at(x, y));

                const plate = new THREE.Mesh(new THREE.CircleGeometry(0.34, 16), moveMat.clone());
                plate.rotation.x = -Math.PI / 2;
                plate.position.set(x, h + 0.04, y);
                this.highlightGroup.add(plate);
                this.highlightPlates.push(plate);
            }
        }

        if (targets) {
            const targetMat = new THREE.MeshBasicMaterial({
                color: 0xff3838,
                transparent: true,
                opacity: 0.85,
                side: THREE.DoubleSide
            });

            for (const v of targets) {
                const h = this.getTileHeight(this.g.at(v.x, v.y));
                const plate = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.46, 16), targetMat.clone());
                plate.rotation.x = -Math.PI / 2;
                plate.position.set(v.x, h + 0.05, v.y);
                this.highlightGroup.add(plate);
                this.targetPlates.push(plate);
            }
        }
    }

    // ---------------------------------------------------------------- Animasyonlar
    animateUnitMove(unit, targetX, targetY, onComplete) {
        const mesh = this.unitMeshes.get(unit.id);
        if (!mesh) { if (onComplete) onComplete(); return; }

        mesh.userData.animating = true;
        const targetH = this.getTileHeight(this.g.at(targetX, targetY));

        if (window.TWEEN) {
            const midH = Math.max(mesh.position.y, targetH) + 0.35;
            new TWEEN.Tween(mesh.position)
                .to({ x: targetX, z: targetY }, 260)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();

            new TWEEN.Tween(mesh.position)
                .to({ y: midH }, 130)
                .easing(TWEEN.Easing.Quadratic.Out)
                .chain(
                    new TWEEN.Tween(mesh.position)
                        .to({ y: targetH }, 130)
                        .easing(TWEEN.Easing.Quadratic.In)
                        .onComplete(() => {
                            mesh.userData.animating = false;
                            if (onComplete) onComplete();
                        })
                )
                .start();
        } else {
            mesh.position.set(targetX, targetH, targetY);
            mesh.userData.animating = false;
            if (onComplete) onComplete();
        }
    }

    animateAttack(attacker, defender, result, onComplete) {
        const aMesh = this.unitMeshes.get(attacker.id);
        const dMesh = this.unitMeshes.get(defender.id);

        if (!aMesh || !dMesh) { if (onComplete) onComplete(); return; }

        const origX = aMesh.position.x;
        const origZ = aMesh.position.z;
        const lungeX = origX + (dMesh.position.x - origX) * 0.45;
        const lungeZ = origZ + (dMesh.position.z - origZ) * 0.45;

        if (window.TWEEN) {
            new TWEEN.Tween(aMesh.position)
                .to({ x: lungeX, z: lungeZ }, 110)
                .easing(TWEEN.Easing.Quadratic.In)
                .chain(
                    new TWEEN.Tween(aMesh.position)
                        .to({ x: origX, z: origZ }, 140)
                        .easing(TWEEN.Easing.Quadratic.Out)
                )
                .onComplete(() => {
                    this.spawnDamageText(dMesh.position.x, dMesh.position.y + 0.7, dMesh.position.z, `-${result.damage}`);
                    if (result.killed) {
                        this.animateUnitDeath(defender, onComplete);
                    } else {
                        this.refreshUnits();
                        if (onComplete) onComplete();
                    }
                })
                .start();
        } else {
            this.refreshUnits();
            if (onComplete) onComplete();
        }
    }

    animateUnitDeath(unit, onComplete) {
        const mesh = this.unitMeshes.get(unit.id);
        if (!mesh) { this.refreshUnits(); if (onComplete) onComplete(); return; }

        if (window.TWEEN) {
            new TWEEN.Tween(mesh.scale)
                .to({ x: 0.01, y: 0.01, z: 0.01 }, 220)
                .easing(TWEEN.Easing.Back.In)
                .onComplete(() => {
                    this.unitGroup.remove(mesh);
                    this.unitMeshes.delete(unit.id);
                    this.unitHealthSprites.delete(unit.id);
                    this.refreshUnits();
                    if (onComplete) onComplete();
                })
                .start();
        } else {
            this.unitGroup.remove(mesh);
            this.unitMeshes.delete(unit.id);
            this.unitHealthSprites.delete(unit.id);
            this.refreshUnits();
            if (onComplete) onComplete();
        }
    }

    spawnDamageText(x, y, z, text) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 38px "Segoe UI", sans-serif';
        ctx.fillStyle = '#ff3838';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.textAlign = 'center';
        ctx.strokeText(text, 64, 44);
        ctx.fillText(text, 64, 44);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(x, y, z);
        sprite.scale.set(0.9, 0.45, 1);
        sprite.userData = { life: 1.0, vy: 0.018 };

        this.effectGroup.add(sprite);
        this.floatingTexts.push(sprite);
    }

    // ---------------------------------------------------------------- Girdi Olayları (Events)
    setupEvents() {
        const dom = this.renderer.domElement;

        dom.addEventListener('mousedown', (e) => {
            if (e.button === 0 || e.button === 1 || e.button === 2) {
                this.isDragging = true;
                this.previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        dom.addEventListener('mousemove', (e) => {
            const rect = dom.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            if (this.isDragging) {
                const deltaX = e.clientX - this.previousMousePosition.x;
                const deltaY = e.clientY - this.previousMousePosition.y;

                const factor = this.zoom * 0.0035;
                const forward = new THREE.Vector3(-1, 0, -1).normalize();
                const right = new THREE.Vector3(1, 0, -1).normalize();

                this.cameraTarget.addScaledVector(right, -deltaX * factor);
                this.cameraTarget.addScaledVector(forward, deltaY * factor);
                this.previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        });

        dom.addEventListener('click', (e) => {
            this.handleClick(e.clientX, e.clientY);
        });

        dom.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomDelta = e.deltaY * 0.012;
            this.targetZoom = Math.max(5, Math.min(26, this.targetZoom + zoomDelta));
        }, { passive: false });

        dom.addEventListener('touchstart', (e) => {
            this.touchStartTime = Date.now();
            this.touchMoved = false;

            if (e.touches.length === 1) {
                this.lastTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                this.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                this.lastTouchDistance = Math.hypot(dx, dy);
            }
        }, { passive: true });

        dom.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const currentX = e.touches[0].clientX;
                const currentY = e.touches[0].clientY;
                const deltaX = currentX - this.lastTouchPos.x;
                const deltaY = currentY - this.lastTouchPos.y;

                if (Math.hypot(currentX - this.touchStartPos.x, currentY - this.touchStartPos.y) > 8) {
                    this.touchMoved = true;
                }

                const factor = this.zoom * 0.0035;
                const forward = new THREE.Vector3(-1, 0, -1).normalize();
                const right = new THREE.Vector3(1, 0, -1).normalize();

                this.cameraTarget.addScaledVector(right, -deltaX * factor);
                this.cameraTarget.addScaledVector(forward, deltaY * factor);

                this.lastTouchPos = { x: currentX, y: currentY };
            } else if (e.touches.length === 2) {
                this.touchMoved = true;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const currentDistance = Math.hypot(dx, dy);

                if (this.lastTouchDistance > 0) {
                    const diff = this.lastTouchDistance - currentDistance;
                    const zoomDelta = diff * 0.04;
                    this.targetZoom = Math.max(5, Math.min(26, this.targetZoom + zoomDelta));
                }
                this.lastTouchDistance = currentDistance;
            }
        }, { passive: true });

        dom.addEventListener('touchend', (e) => {
            const touchDuration = Date.now() - this.touchStartTime;
            if (!this.touchMoved && touchDuration < 350 && e.changedTouches.length === 1) {
                const t = e.changedTouches[0];
                this.handleClick(t.clientX, t.clientY);
            }
            this.lastTouchDistance = 0;
        }, { passive: true });

        window.addEventListener('resize', () => {
            const nw = this.container.clientWidth || window.innerWidth;
            const nh = this.container.clientHeight || window.innerHeight;
            this.renderer.setSize(nw, nh);
            this.updateCameraTransform();
        });
    }

    handleClick(clientX, clientY) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const candidates = [];
        for (const mesh of this.unitMeshes.values()) {
            if (mesh.visible) candidates.push(mesh);
        }
        for (const mesh of this.tileMeshes.values()) {
            if (mesh.visible) candidates.push(mesh);
        }

        const intersects = this.raycaster.intersectObjects(candidates, true);
        if (intersects.length > 0) {
            let obj = intersects[0].object;
            while (obj && !obj.userData?.isTile && !obj.userData?.isUnit) {
                obj = obj.parent;
            }

            if (obj && obj.userData) {
                let tx = -1, ty = -1;
                if (obj.userData.isTile) {
                    tx = obj.userData.tileX;
                    ty = obj.userData.tileY;
                } else if (obj.userData.isUnit) {
                    const u = this.g.units.find(unit => unit.id === obj.userData.unitId);
                    if (u) { tx = u.x; ty = u.y; }
                }

                if (tx >= 0 && ty >= 0 && this.onTileClick) {
                    this.onTileClick(tx, ty);
                }
            }
        }
    }

    // ---------------------------------------------------------------- Render Döngüsü
    animate() {
        requestAnimationFrame(this.animate);

        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        if (window.TWEEN) {
            TWEEN.update();
        }

        this.zoom += (this.targetZoom - this.zoom) * 0.15;
        this.currentCameraTarget.lerp(this.cameraTarget, 0.12);
        this.updateCameraTransform();

        // 1. Canlı Küp Kafa Birlik Animasyonları (Hafif Nefes Alma ve Yaylanma)
        for (const mesh of this.unitMeshes.values()) {
            if (mesh.visible && !mesh.userData.animating) {
                const uId = mesh.userData.unitId || 0;
                const bob = Math.sin(time * 3.2 + uId * 1.5) * 0.032;
                mesh.position.y = mesh.userData.baseY + bob;
            }
        }

        // 2. Hasar Metinlerinin Yükselmesi
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const t = this.floatingTexts[i];
            t.position.y += t.userData.vy;
            t.userData.life -= delta * 1.5;
            t.material.opacity = Math.max(0, t.userData.life);
            if (t.userData.life <= 0) {
                this.effectGroup.remove(t);
                this.floatingTexts.splice(i, 1);
            }
        }

        // 3. Hedef Kare Nabız Efekti
        const pulse = 0.65 + Math.sin(time * 6) * 0.25;
        for (const p of this.targetPlates) {
            p.material.opacity = pulse;
        }

        // 4. Yıldızların ve Sis Bulutlarının Hafif Süzülmesi
        this.starGroup.rotation.y = time * 0.005;

        this.renderer.render(this.scene, this.camera);
    }
}
