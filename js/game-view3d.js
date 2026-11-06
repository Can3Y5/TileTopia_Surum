/**
 * Kabileler / The Battle of Polytopia - 3D İzometrik Görsel Motor (Three.js)
 * Polytopia'nın resmi mobil sanat stili: Uzayda yüzen ada, küp kafalı birimler,
 * çizgili sınır çitleri, yüzen şehir etiketleri, fenerler ve Android dokunmatik kontrolleri.
 */

import { Terrain, Res, Bld, UnitType, GameState, DB } from './game-core.js';

export class BoardView3D {
    constructor(container, gameState) {
        this.container = container;
        this.g = gameState;

        // Three.js nesneleri
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Harita ve Görsel Gruplar
        this.tileGroup = null;
        this.cliffGroup = null;
        this.fenceGroup = null;
        this.cloudGroup = null;
        this.unitGroup = null;
        this.highlightGroup = null;
        this.effectGroup = null;
        this.starGroup = null;

        this.tileMeshes = [];
        this.cloudMeshes = [];
        this.unitMeshes = new Map();
        this.highlightPlates = [];
        this.targetPlates = [];

        // Kamera durumu
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.cameraTarget = new THREE.Vector3(0, 0, 0);
        this.currentCameraTarget = new THREE.Vector3(0, 0, 0);
        this.zoom = 13;
        this.targetZoom = 13;

        // Dokunmatik Kontroller (Android Pinch & Drag)
        this.touchStartDist = 0;
        this.touchStartZoom = 13;
        this.touchMoved = false;
        this.touchStartTime = 0;
        this.lastTouchPos = { x: 0, y: 0 };

        // Tıklama callback
        this.onTileClick = null;

        // Animasyonlar
        this.clock = new THREE.Clock();
        this.particles = [];
        this.floatingTexts = [];

        this.init();
    }

    init() {
        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || window.innerHeight;

        // 1. Sahne (Kozmik Uzay Arka Planı)
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000); // Polytopia'nın simsiyah sonsuz uzay boşluğu

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
        const ambient = new THREE.AmbientLight(0xdde8f8, 0.75);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xfff8ee, 1.25);
        sun.position.set(28, 42, 22);
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
        sun.shadow.bias = -0.0004;
        this.scene.add(sun);

        const fillLight = new THREE.DirectionalLight(0x5588cc, 0.4);
        fillLight.position.set(-25, 20, -25);
        this.scene.add(fillLight);
    }

    buildStarfield() {
        const starGeo = new THREE.BufferGeometry();
        const starCount = 350;
        const pos = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount * 3; i += 3) {
            pos[i] = (Math.random() - 0.5) * 160;
            pos[i + 1] = (Math.random() - 0.5) * 120 - 20;
            pos[i + 2] = (Math.random() - 0.5) * 160;
        }

        starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const starMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.65,
            transparent: true,
            opacity: 0.8
        });

        const starPoints = new THREE.Points(starGeo, starMat);
        this.starGroup.add(starPoints);
    }

    updateCameraTransform() {
        const angleY = Math.PI / 4;
        const angleX = Math.atan(1 / Math.SQRT2); // ~35.264 derece tam izometrik açı
        const distance = 90;

        const cx = this.cameraTarget.x + distance * Math.cos(angleX) * Math.sin(angleY);
        const cy = this.cameraTarget.y + distance * Math.sin(angleX);
        const cz = this.cameraTarget.z + distance * Math.cos(angleX) * Math.cos(angleY);

        this.camera.position.set(cx, cy, cz);
        this.camera.lookAt(this.cameraTarget);

        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || window.innerHeight;
        const aspect = w / h;

        this.camera.left = -this.zoom * aspect;
        this.camera.right = this.zoom * aspect;
        this.camera.top = this.zoom;
        this.camera.bottom = -this.zoom;
        this.camera.updateProjectionMatrix();
    }

    focusOn(x, y, smooth = true) {
        if (smooth) {
            this.cameraTarget.set(x, 0, y);
        } else {
            this.cameraTarget.set(x, 0, y);
            this.currentCameraTarget.set(x, 0, y);
            this.updateCameraTransform();
        }
    }

    // ---------------------------------------------------------------- Harita ve Ada İnşası

    buildBoard() {
        while (this.tileGroup.children.length > 0) this.tileGroup.remove(this.tileGroup.children[0]);
        while (this.cliffGroup.children.length > 0) this.cliffGroup.remove(this.cliffGroup.children[0]);
        while (this.cloudGroup.children.length > 0) this.cloudGroup.remove(this.cloudGroup.children[0]);

        this.tileMeshes = new Array(this.g.size * this.g.size);
        this.cloudMeshes = new Array(this.g.size * this.g.size);

        // 1. Zemin Kareleri
        for (let y = 0; y < this.g.size; y++) {
            for (let x = 0; x < this.g.size; x++) {
                const idx = this.g.idx(x, y);
                const tile = this.g.at(x, y);

                const tileObj = this.createTileMesh(tile);
                this.tileGroup.add(tileObj);
                this.tileMeshes[idx] = tileObj;

                const cloudObj = this.createCloudMesh(x, y);
                this.cloudGroup.add(cloudObj);
                this.cloudMeshes[idx] = cloudObj;
            }
        }

        // 2. Uzayda Yüzen Ada Etekleri (Floating Island Cliff Underside)
        this.buildIslandCliffs();

        // 3. Kıyı Fenerleri (Lighthouses on Water Corners)
        this.buildLighthouses();

        this.refresh();
    }

    getTileHeight(tile) {
        if (tile.terr === Terrain.Water) return 0.22;
        if (tile.terr === Terrain.Mountain) return 0.75;
        if (tile.terr === Terrain.Forest) return 0.46;
        return 0.42;
    }

    createTileMesh(tile) {
        const group = new THREE.Group();
        group.position.set(tile.x, 0, tile.y);
        group.userData = { tileX: tile.x, tileY: tile.y, isTile: true };

        const h = this.getTileHeight(tile);
        const geo = new THREE.BoxGeometry(0.96, h, 0.96);
        const baseColor = DB.Terrains[tile.terr].color;

        const mat = new THREE.MeshLambertMaterial({
            color: baseColor,
            flatShading: true
        });

        const cube = new THREE.Mesh(geo, mat);
        cube.position.y = h / 2;
        cube.receiveShadow = true;
        cube.castShadow = (tile.terr !== Terrain.Water);
        group.add(cube);
        group.userData.baseCube = cube;

        // İçerik nesnesi (Ağaçlar, dağlar, binalar, şehirler)
        const contentGroup = new THREE.Group();
        group.add(contentGroup);
        group.userData.contentGroup = contentGroup;

        return group;
    }

    buildIslandCliffs() {
        const s = this.g.size;
        const cliffMat = new THREE.MeshLambertMaterial({ color: 0x2d3436, flatShading: true });
        const dirtMat = new THREE.MeshLambertMaterial({ color: 0x5a4231, flatShading: true });

        // Haritanın 4 dış kenarı boyunca uzaya doğru inen fasetli kaya uçurumları
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
        const t = this.g.at(x, y);
        const h = this.getTileHeight(t);
        const depth = 2.4;

        const cliffGeo = new THREE.BoxGeometry(0.96, depth, 0.96);
        const cliff = new THREE.Mesh(cliffGeo, cliffMat);
        cliff.position.set(x + dx * 0.12, -depth / 2, y + dy * 0.12);
        cliff.scale.set(0.94, 1, 0.94);
        this.cliffGroup.add(cliff);

        // Üst toprak katmanı
        const dirt = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.28, 0.98), dirtMat);
        dirt.position.set(x, -0.14, y);
        this.cliffGroup.add(dirt);
    }

    buildLighthouses() {
        const s = this.g.size;
        const corners = [
            [0, 0], [s - 1, 0], [0, s - 1], [s - 1, s - 1]
        ];

        corners.forEach(([cx, cy]) => {
            const t = this.g.at(cx, cy);
            if (!t || t.terr !== Terrain.Water) return;

            const lhGroup = new THREE.Group();
            lhGroup.position.set(cx, 0.22, cy);

            const redMat = new THREE.MeshLambertMaterial({ color: 0xe74c3c, flatShading: true });
            const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
            const lightMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });

            // Kırmızı-Beyaz çizgili gövde
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
        group.position.set(x, 0.65, y);

        const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });

        const p1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), cloudMat);
        p1.position.set(0, 0.15, 0);
        group.add(p1);

        const p2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), cloudMat);
        p2.position.set(-0.2, 0.1, 0.12);
        group.add(p2);

        const p3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), cloudMat);
        p3.position.set(0.22, 0.12, -0.1);
        group.add(p3);

        return group;
    }

    // ---------------------------------------------------------------- Çizgili Sınır Çitleri (Border Fences)

    refreshBorders() {
        while (this.fenceGroup.children.length > 0) {
            this.fenceGroup.remove(this.fenceGroup.children[0]);
        }

        const fenceGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.32, 4);

        for (const c of this.g.cities) {
            if (c.owner < 0) continue;
            const ownerColor = this.g.players[c.owner].tribe.colorHex;

            const postMat = new THREE.MeshLambertMaterial({ color: ownerColor, flatShading: true });
            const stripeMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });

            for (let dy = -c.border; dy <= c.border; dy++) {
                for (let dx = -c.border; dx <= c.border; dx++) {
                    const tx = c.x + dx;
                    const ty = c.y + dy;
                    const tile = this.g.at(tx, ty);
                    if (!tile || tile.ownCity !== c.id || !tile.seen[GameState.HUMAN]) continue;

                    // Eğer kenar karesiyse sınır boyunca minik çizgili direkler koy
                    const isEdge = (Math.abs(dx) === c.border || Math.abs(dy) === c.border);
                    if (isEdge) {
                        const h = this.getTileHeight(tile);
                        const post = new THREE.Mesh(fenceGeo, postMat);
                        post.position.set(tx + (dx === 0 ? 0 : Math.sign(dx) * 0.44), h + 0.16, ty + (dy === 0 ? 0 : Math.sign(dy) * 0.44));
                        this.fenceGroup.add(post);

                        // Beyaz çizgi
                        const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 4), stripeMat);
                        stripe.position.set(post.position.x, h + 0.22, post.position.z);
                        this.fenceGroup.add(stripe);
                    }
                }
            }
        }
    }

    // ---------------------------------------------------------------- Yenileme (Refresh)

    refresh() {
        if (!this.g) return;

        for (let y = 0; y < this.g.size; y++) {
            for (let x = 0; x < this.g.size; x++) {
                const idx = this.g.idx(x, y);
                const tile = this.g.at(x, y);
                const seen = tile.seen[GameState.HUMAN];

                const tileMesh = this.tileMeshes[idx];
                const cloudMesh = this.cloudMeshes[idx];

                if (cloudMesh) {
                    if (seen && cloudMesh.visible) {
                        this.dissipateCloud(cloudMesh);
                    } else if (!seen) {
                        cloudMesh.visible = true;
                        cloudMesh.scale.set(1, 1, 1);
                    }
                }

                if (!tileMesh) continue;

                const baseColor = DB.Terrains[tile.terr].color;
                const baseCube = tileMesh.userData.baseCube;

                if (!seen) {
                    baseCube.material.color.setHex(0x11161d);
                } else {
                    if (tile.owner >= 0) {
                        const ownerColor = this.g.players[tile.owner].tribe.colorHex;
                        const c = new THREE.Color(baseColor).lerp(new THREE.Color(ownerColor), 0.24);
                        baseCube.material.color.copy(c);
                    } else {
                        baseCube.material.color.setHex(baseColor);
                    }
                }

                const contentGroup = tileMesh.userData.contentGroup;
                if (contentGroup) {
                    if (!seen) {
                        contentGroup.visible = false;
                    } else {
                        contentGroup.visible = true;
                        this.updateTileContent(tile, contentGroup);
                    }
                }
            }
        }

        this.refreshBorders();
        this.refreshUnits();
    }

    dissipateCloud(cloudMesh) {
        if (window.TWEEN) {
            new TWEEN.Tween(cloudMesh.scale)
                .to({ x: 0.01, y: 0.01, z: 0.01 }, 420)
                .easing(TWEEN.Easing.Quadratic.Out)
                .onComplete(() => { cloudMesh.visible = false; })
                .start();

            new TWEEN.Tween(cloudMesh.position)
                .to({ y: 1.8 }, 420)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        } else {
            cloudMesh.visible = false;
        }
    }

    updateTileContent(tile, group) {
        const sig = `${tile.terr}_${tile.res}_${tile.bld}_${tile.cityId}`;
        if (group.userData.sig === sig) {
            if (tile.cityId >= 0) {
                const c = this.g.cities[tile.cityId];
                if (group.userData.cityLevel === c.level && group.userData.cityOwner === c.owner && group.userData.cityWalls === c.walls) {
                    return;
                }
            } else {
                return;
            }
        }

        group.userData.sig = sig;
        while (group.children.length > 0) group.remove(group.children[0]);

        const h = this.getTileHeight(tile);

        if (tile.cityId >= 0) {
            const city = this.g.cities[tile.cityId];
            group.userData.cityLevel = city.level;
            group.userData.cityOwner = city.owner;
            group.userData.cityWalls = city.walls;
            this.buildCityModel(group, city, h);
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
            this.buildForestDecor(group, h);
        } else if (tile.terr === Terrain.Mountain) {
            this.buildMountainDecor(group, h);
        }
    }

    buildForestDecor(group, h) {
        const treeMat = new THREE.MeshLambertMaterial({ color: 0x1f542a, flatShading: true });
        const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3525, flatShading: true });

        const offsets = [
            [-0.18, -0.16, 0.48],
            [0.2, 0.14, 0.55],
            [-0.15, 0.22, 0.42]
        ];

        offsets.forEach(([ox, oz, scale]) => {
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.18, 5), trunkMat);
            trunk.position.set(ox, h + 0.09, oz);
            group.add(trunk);

            const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.18 * scale, 0.42 * scale, 6), treeMat);
            foliage.position.set(ox, h + 0.18 + 0.18 * scale, oz);
            foliage.castShadow = true;
            group.add(foliage);
        });
    }

    buildMountainDecor(group, h) {
        const rockMat = new THREE.MeshLambertMaterial({ color: 0x63635f, flatShading: true });
        const snowMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });

        const peak1 = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.65, 5), rockMat);
        peak1.position.set(0.05, h + 0.32, 0.05);
        peak1.castShadow = true;
        group.add(peak1);

        const snow1 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.25, 5), snowMat);
        snow1.position.set(0.05, h + 0.52, 0.05);
        group.add(snow1);

        const peak2 = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.42, 5), rockMat);
        peak2.position.set(-0.2, h + 0.21, -0.18);
        peak2.castShadow = true;
        group.add(peak2);
    }

    buildResourceModel(group, res, h) {
        switch (res) {
            case Res.Fruit: {
                const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), new THREE.MeshLambertMaterial({ color: 0x27ae60, flatShading: true }));
                bush.position.set(0, h + 0.14, 0);
                group.add(bush);

                const berryMat = new THREE.MeshLambertMaterial({ color: 0x3498db, flatShading: true }); // Görsel 1'deki mavi meyveler
                const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), berryMat);
                b1.position.set(0.08, h + 0.22, 0.06);
                const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), berryMat);
                b2.position.set(-0.07, h + 0.2, -0.05);
                group.add(b1); group.add(b2);
                break;
            }
            case Res.Crop: {
                const wheatMat = new THREE.MeshLambertMaterial({ color: 0xf1c40f, flatShading: true });
                for (let i = -0.25; i <= 0.25; i += 0.16) {
                    const row = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.09, 0.08), wheatMat);
                    row.position.set(0, h + 0.05, i);
                    group.add(row);
                }
                break;
            }
            case Res.Game: {
                // Görsel 1'deki kahverengi ayı / yabani av
                const furMat = new THREE.MeshLambertMaterial({ color: 0x795548, flatShading: true });
                const bear = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.36), furMat);
                bear.position.set(0, h + 0.14, 0);
                group.add(bear);
                break;
            }
            case Res.Metal: {
                const oreMat = new THREE.MeshLambertMaterial({ color: 0x3498db, flatShading: true });
                const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), oreMat);
                c1.position.set(0.1, h + 0.16, 0.08);
                group.add(c1);
                break;
            }
            case Res.Fish: {
                const fishMat = new THREE.MeshLambertMaterial({ color: 0x2980b9, flatShading: true });
                const fish = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 4), fishMat);
                fish.rotation.z = Math.PI / 3;
                fish.position.set(0, h + 0.08, 0);
                group.add(fish);
                break;
            }
        }
    }

    buildBuildingModel(group, bld, h) {
        switch (bld) {
            case Bld.Farm: {
                const barnMat = new THREE.MeshLambertMaterial({ color: 0xd35400, flatShading: true });
                const barn = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.28), barnMat);
                barn.position.set(-0.1, h + 0.12, -0.1);
                group.add(barn);
                break;
            }
            case Bld.Mine: {
                const cave = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), new THREE.MeshLambertMaterial({ color: 0x485460, flatShading: true }));
                cave.position.set(0, h + 0.18, 0);
                group.add(cave);
                break;
            }
            case Bld.Lumber: {
                const logMat = new THREE.MeshLambertMaterial({ color: 0x5d4037, flatShading: true });
                const hut = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.24), logMat);
                hut.position.set(0, h + 0.1, 0);
                group.add(hut);
                break;
            }
            case Bld.Port: {
                const pier = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.52), new THREE.MeshLambertMaterial({ color: 0x795548, flatShading: true }));
                pier.position.set(-0.16, h + 0.06, 0);
                group.add(pier);

                const boat = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.34), new THREE.MeshLambertMaterial({ color: 0xd7ccc8, flatShading: true }));
                boat.position.set(0.14, h + 0.06, 0.04);
                group.add(boat);

                const sail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 3), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }));
                sail.position.set(0.14, h + 0.25, 0.04);
                group.add(sail);
                break;
            }
        }
    }

    buildCityModel(group, city, h) {
        const isNeutral = (city.owner < 0);
        const tribeColor = isNeutral ? 0x95a5a6 : this.g.players[city.owner].tribe.colorHex;

        const stoneMat = new THREE.MeshLambertMaterial({ color: isNeutral ? 0xbdc3c7 : 0xe0e6ed, flatShading: true });
        const roofMat = new THREE.MeshLambertMaterial({ color: tribeColor, flatShading: true });

        if (city.walls) {
            const wallMat = new THREE.MeshLambertMaterial({ color: 0x5a6268, flatShading: true });
            const s = 0.88, wh = 0.24, th = 0.08;
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

        if (isNeutral) {
            // Görsel 1'deki konik çatılı köy çadırları
            const tentMat = new THREE.MeshLambertMaterial({ color: 0xc89d6c, flatShading: true });
            const tent1 = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.3, 5), tentMat);
            tent1.position.set(-0.12, h + 0.15, -0.1);
            const tent2 = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.28, 5), tentMat);
            tent2.position.set(0.14, h + 0.14, 0.12);
            group.add(tent1); group.add(tent2);
            return;
        }

        // Çok katmanlı Polytopia şehir kalesi
        const baseH = 0.28 + city.level * 0.09;
        const baseW = 0.44 + Math.min(city.level * 0.05, 0.18);

        const keep = new THREE.Mesh(new THREE.BoxGeometry(baseW, baseH, baseW), stoneMat);
        keep.position.set(0, h + baseH / 2, 0);
        keep.castShadow = true;
        group.add(keep);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(baseW * 0.72, 0.36, 4), roofMat);
        roof.rotation.y = Math.PI / 4;
        roof.position.set(0, h + baseH + 0.18, 0);
        group.add(roof);

        // Görsel 4'teki Şehir İsmi ve Seviye Etiketi (Floating 3D Nameplate Sprite)
        this.createCityNameplate(group, city, h + baseH + 0.72);
    }

    createCityNameplate(group, city, yPos) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 70;
        const ctx = canvas.getContext('2d');

        // Koyu cam arka plan
        ctx.fillStyle = 'rgba(18, 25, 33, 0.88)';
        ctx.beginPath();
        ctx.roundRect(10, 10, 236, 50, 10);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = 'bold 24px "Segoe UI", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`${city.name} [${city.level}]`, 128, 42);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(0, yPos, 0);
        sprite.scale.set(1.4, 0.42, 1);
        group.add(sprite);
    }

    // ---------------------------------------------------------------- Küp Kafalı Birimler (Screenshot 1 & 4)

    refreshUnits() {
        const liveUnitIds = new Set(this.g.units.map(u => u.id));

        for (const [id, mesh] of this.unitMeshes.entries()) {
            if (!liveUnitIds.has(id)) {
                this.unitGroup.remove(mesh);
                this.unitMeshes.delete(id);
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
                this.updateUnitStatus(mesh, u);
            }
        }
    }

    buildCubeHeadUnit(u) {
        const group = new THREE.Group();
        group.userData = { unitId: u.id, isUnit: true };

        const player = this.g.players[u.owner];
        const tribeColor = player.tribe.colorHex;
        const skinColor = 0xf5cd79; // Sevimli sarı/bronz Polytopia ten rengi

        const skinMat = new THREE.MeshLambertMaterial({ color: skinColor, flatShading: true });
        const armorMat = new THREE.MeshLambertMaterial({ color: tribeColor, flatShading: true });
        const darkMat = new THREE.MeshLambertMaterial({ color: 0x2d3436, flatShading: true });
        const metalMat = new THREE.MeshLambertMaterial({ color: 0xdfe6e9, flatShading: true });

        const scale = (u.type === UnitType.Giant) ? 1.7 : 1.0;

        // 1. Gövde
        const bodyGeo = new THREE.BoxGeometry(0.24 * scale, 0.28 * scale, 0.2 * scale);
        const body = new THREE.Mesh(bodyGeo, armorMat);
        body.position.y = 0.2 * scale;
        body.castShadow = true;
        group.add(body);

        // 2. İKONİK POLYTROPIA KÜP KAFASI (Cube Head)
        const headGeo = new THREE.BoxGeometry(0.28 * scale, 0.28 * scale, 0.28 * scale);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 0.44 * scale;
        head.castShadow = true;
        group.add(head);

        // Gözler
        const eyeGeo = new THREE.BoxGeometry(0.04 * scale, 0.07 * scale, 0.02 * scale);
        const leftEye = new THREE.Mesh(eyeGeo, darkMat);
        leftEye.position.set(-0.06 * scale, 0.44 * scale, 0.145 * scale);
        const rightEye = new THREE.Mesh(eyeGeo, darkMat);
        rightEye.position.set(0.06 * scale, 0.44 * scale, 0.145 * scale);
        group.add(leftEye);
        group.add(rightEye);

        // 3. Kabileye ve Birime Özel Başlık / Miğfer
        this.addHeadwear(group, player.tribe, u.type, scale);

        // 4. Silahlar ve Binekler
        if (u.type === UnitType.Rider || u.type === UnitType.Knight) {
            const horseMat = new THREE.MeshLambertMaterial({ color: u.type === UnitType.Knight ? 0x2c3e50 : 0x8e44ad, flatShading: true });
            const horse = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.52), horseMat);
            horse.position.set(0, 0.16, 0);
            group.add(horse);
        } else if (u.type === UnitType.Archer) {
            const bow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.04), darkMat);
            bow.position.set(0.2, 0.32, 0.08);
            group.add(bow);
        } else if (u.type === UnitType.Defender) {
            const shield = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.06), armorMat);
            shield.position.set(0, 0.28, 0.18);
            group.add(shield);
        } else if (u.type === UnitType.Swordsman) {
            const sword = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.06), metalMat);
            sword.position.set(0.2, 0.36, 0.1);
            group.add(sword);
        }

        // 5. Üst Durum İndikatörü (Görsel 4'teki Dairesel Çapraz Kılıç Savaş İkonu)
        const badgeMat = new THREE.MeshBasicMaterial({ color: 0x00cec9 });
        const badge = new THREE.Mesh(new THREE.CircleGeometry(0.16 * scale, 16), badgeMat);
        badge.position.set(0, 0.78 * scale, 0);
        badge.name = "actionBadge";
        group.add(badge);

        return group;
    }

    addHeadwear(group, tribe, unitType, scale) {
        const tribeMat = new THREE.MeshLambertMaterial({ color: tribe.colorHex, flatShading: true });
        const darkMat = new THREE.MeshLambertMaterial({ color: 0x2d3436, flatShading: true });
        const whiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });

        // Görsel 2'deki Kabile Başlıkları
        switch (tribe.name) {
            case 'Bardur': {
                // Viking boynuzlu koyu miğfer
                const helm = new THREE.Mesh(new THREE.BoxGeometry(0.3 * scale, 0.1 * scale, 0.3 * scale), darkMat);
                helm.position.y = 0.58 * scale;
                group.add(helm);
                const horn1 = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 4), whiteMat);
                horn1.position.set(0.18 * scale, 0.62 * scale, 0);
                horn1.rotation.z = -Math.PI / 4;
                const horn2 = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 4), whiteMat);
                horn2.position.set(-0.18 * scale, 0.62 * scale, 0);
                horn2.rotation.z = Math.PI / 4;
                group.add(horn1); group.add(horn2);
                break;
            }
            case 'Xin-xi': {
                // Samuray kırmızı boynuzlu miğfer
                const kabuto = new THREE.Mesh(new THREE.BoxGeometry(0.32 * scale, 0.12 * scale, 0.32 * scale), darkMat);
                kabuto.position.y = 0.58 * scale;
                const crest = new THREE.Mesh(new THREE.BoxGeometry(0.16 * scale, 0.14 * scale, 0.04 * scale), tribeMat);
                crest.position.set(0, 0.68 * scale, 0.12 * scale);
                group.add(kabuto); group.add(crest);
                break;
            }
            case 'Imperius': {
                // Roma miğferi ve kırmızı sorguç
                const helm = new THREE.Mesh(new THREE.BoxGeometry(0.3 * scale, 0.1 * scale, 0.3 * scale), new THREE.MeshLambertMaterial({ color: 0xf1c40f }));
                helm.position.y = 0.58 * scale;
                const plume = new THREE.Mesh(new THREE.BoxGeometry(0.06 * scale, 0.16 * scale, 0.32 * scale), new THREE.MeshLambertMaterial({ color: 0xe74c3c }));
                plume.position.y = 0.68 * scale;
                group.add(helm); group.add(plume);
                break;
            }
            case 'Kickoo': {
                // Alın bandı ve renkli tropik tüyler
                const band = new THREE.Mesh(new THREE.BoxGeometry(0.3 * scale, 0.06 * scale, 0.3 * scale), new THREE.MeshLambertMaterial({ color: 0xe74c3c }));
                band.position.y = 0.52 * scale;
                const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.03 * scale, 0.22 * scale, 0.03 * scale), new THREE.MeshLambertMaterial({ color: 0x2ecc71 }));
                f1.position.set(0.08 * scale, 0.66 * scale, -0.1 * scale);
                group.add(band); group.add(f1);
                break;
            }
            default: {
                // Genel kabile kasketi
                const cap = new THREE.Mesh(new THREE.BoxGeometry(0.3 * scale, 0.08 * scale, 0.3 * scale), tribeMat);
                cap.position.y = 0.58 * scale;
                group.add(cap);
                break;
            }
        }
    }

    updateUnitStatus(mesh, u) {
        const badge = mesh.getObjectByName("actionBadge");
        if (badge) {
            badge.quaternion.copy(this.camera.quaternion);
            badge.visible = (u.owner === GameState.HUMAN && u.canAct);
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
                    this.refreshUnits();
                    if (onComplete) onComplete();
                })
                .start();
        } else {
            this.unitGroup.remove(mesh);
            this.unitMeshes.delete(unit.id);
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

    // ---------------------------------------------------------------- Android Dokunmatik & Fare Girdisi

    setupEvents() {
        const dom = this.renderer.domElement;

        // --- FARE KONTROLLERİ ---
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

        // --- ANDROID DOKUNMATİK KONTROLLERİ (Touch Events) ---
        dom.addEventListener('touchstart', (e) => {
            this.touchStartTime = Date.now();
            this.touchMoved = false;

            if (e.touches.length === 1) {
                this.lastTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                // İki parmakla kıstırma (Pinch to zoom)
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                this.touchStartDist = Math.hypot(dx, dy);
                this.touchStartZoom = this.targetZoom;
            }
        }, { passive: true });

        dom.addEventListener('touchmove', (e) => {
            this.touchMoved = true;

            if (e.touches.length === 1) {
                // Tek parmakla harita kaydırma
                const deltaX = e.touches[0].clientX - this.lastTouchPos.x;
                const deltaY = e.touches[0].clientY - this.lastTouchPos.y;

                const factor = this.zoom * 0.0035;
                const forward = new THREE.Vector3(-1, 0, -1).normalize();
                const right = new THREE.Vector3(1, 0, -1).normalize();

                this.cameraTarget.addScaledVector(right, -deltaX * factor);
                this.cameraTarget.addScaledVector(forward, deltaY * factor);
                this.lastTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2 && this.touchStartDist > 0) {
                // İki parmakla yakınlaştırma/uzaklaştırma
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const currentDist = Math.hypot(dx, dy);
                const scale = currentDist / this.touchStartDist;
                this.targetZoom = Math.max(5, Math.min(26, this.touchStartZoom / scale));
            }
        }, { passive: true });

        dom.addEventListener('touchend', (e) => {
            // Eğer sürüklenmediyse ve kısa süreli dokunuşsa -> Tıklama
            if (!this.touchMoved && Date.now() - this.touchStartTime < 300) {
                const touch = e.changedTouches[0];
                this.handleClick(touch.clientX, touch.clientY);
            }
        });

        window.addEventListener('resize', () => {
            const w = this.container.clientWidth || window.innerWidth;
            const h = this.container.clientHeight || window.innerHeight;
            this.renderer.setSize(w, h);
            this.updateCameraTransform();
        });

        dom.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    handleClick(clientX, clientY) {
        const dom = this.renderer.domElement;
        const rect = dom.getBoundingClientRect();
        this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.tileGroup.children, true);

        if (intersects.length > 0) {
            let obj = intersects[0].object;
            while (obj && !obj.userData.isTile) {
                obj = obj.parent;
            }
            if (obj && obj.userData.isTile) {
                const tx = obj.userData.tileX;
                const ty = obj.userData.tileY;
                if (this.onTileClick) this.onTileClick(tx, ty);
            }
        }
    }

    // ---------------------------------------------------------------- Render Döngüsü

    animate() {
        requestAnimationFrame(this.animate);

        const delta = this.clock.getDelta();

        if (window.TWEEN) {
            TWEEN.update();
        }

        this.zoom += (this.targetZoom - this.zoom) * 0.15;
        this.currentCameraTarget.lerp(this.cameraTarget, 0.12);
        this.updateCameraTransform();

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

        const time = this.clock.getElapsedTime();
        const pulse = 0.65 + Math.sin(time * 6) * 0.25;
        for (const p of this.targetPlates) {
            p.material.opacity = pulse;
        }

        this.renderer.render(this.scene, this.camera);
    }
}
