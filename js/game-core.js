/**
 * Kabileler / The Battle of Polytopia - Oyun Kuralları ve Durum Yönetimi (Game Core)
 * Resmi Polytopia kuralları, 12 Regular Kabile ve Radyal Teknoloji Ağacı desteği.
 */

export const Terrain = {
    Field: 'Field',
    Forest: 'Forest',
    Mountain: 'Mountain',
    Water: 'Water'
};

export const Res = {
    None: 'None',
    Fruit: 'Fruit',
    Crop: 'Crop',
    Game: 'Game',
    Metal: 'Metal',
    Fish: 'Fish'
};

export const Bld = {
    None: 'None',
    Farm: 'Farm',
    Mine: 'Mine',
    Lumber: 'Lumber',
    Port: 'Port'
};

export const UnitType = {
    Warrior: 'Warrior',
    Rider: 'Rider',
    Archer: 'Archer',
    Defender: 'Defender',
    Swordsman: 'Swordsman',
    Knight: 'Knight',
    Catapult: 'Catapult',
    Giant: 'Giant'
};

export const Tech = {
    // 5 Temel Kademe 1 Dalı (Radyal Ağaç Merkezine Bağlı)
    Hunting: 'Hunting',
    Riding: 'Riding',
    Organization: 'Organization',
    Climbing: 'Climbing',
    Fishing: 'Fishing',

    // Kademe 2 Dalları
    Archery: 'Archery',
    Forestry: 'Forestry',
    Roads: 'Roads',
    FreeSpirit: 'FreeSpirit',
    Farming: 'Farming',
    Strategy: 'Strategy',
    Mining: 'Mining',
    Meditation: 'Meditation',
    Sailing: 'Sailing',
    Aquaculture: 'Aquaculture',

    // Kademe 3 Dalları
    Mathematics: 'Mathematics',
    Spiritualism: 'Spiritualism',
    Trade: 'Trade',
    Chivalry: 'Chivalry',
    Construction: 'Construction',
    Diplomacy: 'Diplomacy',
    Smithery: 'Smithery',
    Philosophy: 'Philosophy',
    Navigation: 'Navigation',
    Aquatism: 'Aquatism'
};

export const Bias = {
    Field: 'Field',
    Forest: 'Forest',
    Mountain: 'Mountain',
    Water: 'Water',
    Plain: 'Plain'
};

export const Reward = {
    Workshop: 'Workshop',
    Scout: 'Scout',
    Walls: 'Walls',
    Treasure: 'Treasure',
    Boom: 'Boom',
    Border: 'Border',
    Park: 'Park',
    Giant: 'Giant'
};

export const DB = {
    Terrains: {
        [Terrain.Field]: {
            name: "Ova",
            color: 0x72a550,
            defBonus: 1.0,
            blocks: false,
            stops: false,
            icon: "🌱",
            desc: "Verimli düz araziler; meyve ve ekin için idealdir."
        },
        [Terrain.Forest]: {
            name: "Orman",
            color: 0x2d6d37,
            defBonus: 1.5,
            blocks: false,
            stops: true,
            icon: "🌲",
            desc: "Sık ormanlık; hareketi sonlandırır, %50 savunma bonusu verir."
        },
        [Terrain.Mountain]: {
            name: "Dağ",
            color: 0x7c7c77,
            defBonus: 1.5,
            blocks: false,
            stops: true,
            icon: "⛰️",
            desc: "Sarp zirveler; Tırmanış gerektirir, +1 görüş mesafesi ve %50 savunma verir."
        },
        [Terrain.Water]: {
            name: "Su",
            color: 0x2980b9,
            defBonus: 1.0,
            blocks: true,
            stops: false,
            icon: "🌊",
            desc: "Mavi sular; limanlar ve balıkçılık için kullanılır."
        }
    },

    Resources: {
        [Res.Fruit]: {
            name: "Meyve",
            on: Terrain.Field,
            need: Tech.Organization,
            action: "Meyve Topla",
            cost: 2,
            pop: 1,
            build: Bld.None,
            icon: "🍎"
        },
        [Res.Crop]: {
            name: "Ekin",
            on: Terrain.Field,
            need: Tech.Farming,
            action: "Çiftlik Kur",
            cost: 5,
            pop: 2,
            build: Bld.Farm,
            icon: "🌾"
        },
        [Res.Game]: {
            name: "Yabani Av",
            on: Terrain.Forest,
            need: Tech.Hunting,
            action: "Avlan",
            cost: 2,
            pop: 1,
            build: Bld.None,
            icon: "🦌"
        },
        [Res.Metal]: {
            name: "Metal Cevheri",
            on: Terrain.Mountain,
            need: Tech.Mining,
            action: "Maden Ocağı Kur",
            cost: 5,
            pop: 2,
            build: Bld.Mine,
            icon: "⛏️"
        },
        [Res.Fish]: {
            name: "Balık",
            on: Terrain.Water,
            need: Tech.Fishing,
            action: "Balık Tut",
            cost: 2,
            pop: 1,
            build: Bld.None,
            icon: "🐟"
        }
    },

    LumberCost: 3,
    LumberPop: 1,
    PortCost: 6,
    PortPop: 2,

    Units: {
        [UnitType.Warrior]: {
            name: "Savaşçı",
            cost: 2,
            hp: 10,
            atk: 2.0,
            def: 2.0,
            move: 1,
            range: 1,
            dash: true,
            icon: "🗡️",
            desc: "Dengeli ve ekonomik temel piyade birliği."
        },
        [UnitType.Rider]: {
            name: "Atlı",
            cost: 3,
            hp: 10,
            atk: 2.0,
            def: 1.0,
            move: 2,
            range: 1,
            dash: true,
            needsTech: true,
            need: Tech.Riding,
            icon: "🐎",
            desc: "Yüksek hareket kabiliyeti; vur ve kaç taktikleri için ideal."
        },
        [UnitType.Archer]: {
            name: "Okçu",
            cost: 3,
            hp: 10,
            atk: 2.0,
            def: 1.0,
            move: 1,
            range: 2,
            dash: true,
            needsTech: true,
            need: Tech.Archery,
            icon: "🏹",
            desc: "2 kare menzilli keskin nişancı; misilleme almadan uzaktan vurur."
        },
        [UnitType.Defender]: {
            name: "Muhafız",
            cost: 3,
            hp: 15,
            atk: 1.0,
            def: 3.0,
            move: 1,
            range: 1,
            dash: false,
            needsTech: true,
            need: Tech.Strategy,
            icon: "🛡️",
            desc: "Yüksek can ve savunma; şehirleri korumak için mükemmel kalkan."
        },
        [UnitType.Swordsman]: {
            name: "Kılıççı",
            cost: 5,
            hp: 15,
            atk: 3.0,
            def: 3.0,
            move: 1,
            range: 1,
            dash: true,
            needsTech: true,
            need: Tech.Smithery,
            icon: "⚔️",
            desc: "Ağır zırhlı elit piyade; hem saldırıda hem savunmada üstün."
        },
        [UnitType.Knight]: {
            name: "Şövalye",
            cost: 8,
            hp: 10,
            atk: 3.5,
            def: 1.0,
            move: 3,
            range: 1,
            dash: true,
            persist: true,
            needsTech: true,
            need: Tech.Chivalry,
            icon: "🏇",
            desc: "Hızlı taarruz süvarisi; öldürdüğü her düşmandan sonra tekrar saldırabilir!"
        },
        [UnitType.Catapult]: {
            name: "Mancınık",
            cost: 8,
            hp: 10,
            atk: 4.0,
            def: 0.0,
            move: 1,
            range: 3,
            dash: false,
            needsTech: true,
            need: Tech.Mathematics,
            icon: "🎯",
            desc: "Yıkıcı 3 kare menzilli kuşatma silahı; hareket ettiği tur ateş edemez."
        },
        [UnitType.Giant]: {
            name: "Dev",
            cost: 0,
            hp: 40,
            atk: 5.0,
            def: 4.0,
            move: 1,
            range: 1,
            dash: true,
            super: true,
            icon: "👹",
            desc: "Şehir seviye 5 ödülü; 40 cana sahip devasa savaş makinesi."
        }
    },

    // Polytopia Resmi Radyal Teknoloji Ağacı Yapısı
    Techs: {
        // --- 1. DAL: AVCILIK (Hunting) ---
        [Tech.Hunting]: {
            name: "Avcılık",
            branch: 0,
            tier: 1,
            parent: null,
            icon: "🦌",
            info: "Ormanlarda yabani avlanmayı açar (+1 Nüfus)."
        },
        [Tech.Archery]: {
            name: "Okçuluk",
            branch: 0,
            tier: 2,
            parent: Tech.Hunting,
            icon: "🏹",
            info: "Okçu (Archer) birimini açar ve ormanda savunma bonusu sağlar."
        },
        [Tech.Forestry]: {
            name: "Ormancılık",
            branch: 0,
            tier: 2,
            parent: Tech.Hunting,
            icon: "🪓",
            info: "Ormanlara Kereste Kulübesi kurmayı açar (+1 Nüfus)."
        },
        [Tech.Spiritualism]: {
            name: "Ruhçuluk",
            branch: 0,
            tier: 3,
            parent: Tech.Archery,
            icon: "🌿",
            info: "Boş karelere orman dikmeyi açar."
        },
        [Tech.Mathematics]: {
            name: "Matematik",
            branch: 0,
            tier: 3,
            parent: Tech.Forestry,
            icon: "📐",
            info: "Mancınık (Catapult) kuşatma birimini ve kereste fabrikasını açar."
        },

        // --- 2. DAL: BİNİCİLİK (Riding) ---
        [Tech.Riding]: {
            name: "Binicilik",
            branch: 1,
            tier: 1,
            parent: null,
            icon: "🐎",
            info: "Atlı (Rider) birimini açar."
        },
        [Tech.FreeSpirit]: {
            name: "Özgür Ruh",
            branch: 1,
            tier: 2,
            parent: Tech.Riding,
            icon: "🕊️",
            info: "Birlikleri terhis ederek yarım yıldız iadesi almayı sağlar."
        },
        [Tech.Roads]: {
            name: "Yollar",
            branch: 1,
            tier: 2,
            parent: Tech.Riding,
            icon: "🛤️",
            info: "Şehirler arasında yol kurmayı sağlar (+1 hareket, şehir ağı bonusu)."
        },
        [Tech.Chivalry]: {
            name: "Şövalyelik",
            branch: 1,
            tier: 3,
            parent: Tech.FreeSpirit,
            icon: "🏇",
            info: "Şövalye (Knight) süvari birimini açar."
        },
        [Tech.Trade]: {
            name: "Ticaret",
            branch: 1,
            tier: 3,
            parent: Tech.Roads,
            icon: "⚖️",
            info: "Gümrük Binası kurmayı ve bol yıldız üretimini açar."
        },

        // --- 3. DAL: ÖRGÜTLENME (Organization) ---
        [Tech.Organization]: {
            name: "Örgütlenme",
            branch: 2,
            tier: 1,
            parent: null,
            icon: "🧺",
            info: "Meyve toplamayı açar (+1 Nüfus)."
        },
        [Tech.Farming]: {
            name: "Tarım",
            branch: 2,
            tier: 2,
            parent: Tech.Organization,
            icon: "🌾",
            info: "Ekine Çiftlik kurmayı açar (+2 Nüfus)."
        },
        [Tech.Strategy]: {
            name: "Strateji",
            branch: 2,
            tier: 2,
            parent: Tech.Organization,
            icon: "🛡️",
            info: "Muhafız (Defender) birimini açar."
        },
        [Tech.Construction]: {
            name: "İnşaat",
            branch: 2,
            tier: 3,
            parent: Tech.Farming,
            icon: "🏗️",
            info: "Yeldeğirmeni yapmayı ve ormanları temizlemeyi açar."
        },
        [Tech.Diplomacy]: {
            name: "Diplomasi",
            branch: 2,
            tier: 3,
            parent: Tech.Strategy,
            icon: "🕊️",
            info: "Diğer kabilelerle barış antlaşmaları ve elçilikleri açar."
        },

        // --- 4. DAL: TIRMANIŞ (Climbing) ---
        [Tech.Climbing]: {
            name: "Tırmanış",
            branch: 3,
            tier: 1,
            parent: null,
            icon: "🧗",
            info: "Dağlara çıkışı sağlar; dağdan görüş mesafesi 2 kareye çıkar."
        },
        [Tech.Mining]: {
            name: "Madencilik",
            branch: 3,
            tier: 2,
            parent: Tech.Climbing,
            icon: "⛏️",
            info: "Dağlara Maden Ocağı kurmayı açar (+2 Nüfus)."
        },
        [Tech.Meditation]: {
            name: "Meditasyon",
            branch: 3,
            tier: 2,
            parent: Tech.Climbing,
            icon: "🧘",
            info: "5 tur savaş açılmazsa Barış Anıtı ödülü kazandırır."
        },
        [Tech.Smithery]: {
            name: "Demircilik",
            branch: 3,
            tier: 3,
            parent: Tech.Mining,
            icon: "⚔️",
            info: "Kılıççı (Swordsman) elit birimini açar."
        },
        [Tech.Philosophy]: {
            name: "Felsefe",
            branch: 3,
            tier: 3,
            parent: Tech.Meditation,
            icon: "📖",
            info: "Tüm teknolojilerin yıldız maliyetini %33 oranında düşürür!"
        },

        // --- 5. DAL: BALIKÇILIK (Fishing) ---
        [Tech.Fishing]: {
            name: "Balıkçılık",
            branch: 4,
            tier: 1,
            parent: null,
            icon: "🎣",
            info: "Suda balık tutmayı açar (+1 Nüfus)."
        },
        [Tech.Sailing]: {
            name: "Yelkencilik",
            branch: 4,
            tier: 2,
            parent: Tech.Fishing,
            icon: "⛵",
            info: "Birliklerin suya tekneyle açılmasını sağlar."
        },
        [Tech.Aquaculture]: {
            name: "Su Ürünleri",
            branch: 4,
            tier: 2,
            parent: Tech.Fishing,
            icon: "⚓",
            info: "Sınır içindeki suya Liman kurmayı açar (+2 Nüfus)."
        },
        [Tech.Navigation]: {
            name: "Seyrüsefer",
            branch: 4,
            tier: 3,
            parent: Tech.Sailing,
            icon: "🧭",
            info: "Derin okyanuslara açılmayı ve zırhlı savaş gemilerini açar."
        },
        [Tech.Aquatism]: {
            name: "Su Büyüsü",
            branch: 4,
            tier: 3,
            parent: Tech.Aquaculture,
            icon: "🔱",
            info: "Suda ek savunma bonusu ve su tapınaklarını açar."
        }
    },

    // Polytopia Resmi 12 Regular Kabile Listesi (Görsel 2'deki tam liste)
    Tribes: [
        {
            id: 0,
            name: "Xin-xi",
            headType: "samurai",
            color: "#e84118",
            colorHex: 0xe84118,
            start: Tech.Climbing,
            bias: Bias.Mountain,
            lore: "Sarp dağların ve kiraz çiçeklerinin samuray kabileleri.",
            icon: "🏯"
        },
        {
            id: 1,
            name: "Imperius",
            headType: "roman",
            color: "#0984e3",
            colorHex: 0x0984e3,
            start: Tech.Organization,
            bias: Bias.Field,
            lore: "Disiplinli lejyonerleri ve görkemli mermer sütunlarıyla tanınan imparatorluk.",
            icon: "🏛️"
        },
        {
            id: 2,
            name: "Bardur",
            headType: "viking",
            color: "#27ae60",
            colorHex: 0x27ae60,
            start: Tech.Hunting,
            bias: Bias.Forest,
            lore: "Karlar altındaki çam ormanlarında iz süren usta Viking avcıları.",
            icon: "🌲"
        },
        {
            id: 3,
            name: "Oumaji",
            headType: "nomad",
            color: "#f39c12",
            colorHex: 0xf39c12,
            start: Tech.Riding,
            bias: Bias.Plain,
            lore: "Kızgın kum tepelerinde fırtına gibi koşan atlı çöl göçebeleri.",
            icon: "🐎"
        },
        {
            id: 4,
            name: "Kickoo",
            headType: "island",
            color: "#00cec9",
            colorHex: 0x00cec9,
            start: Tech.Fishing,
            bias: Bias.Water,
            lore: "Turkuaz mercan adalarının ve hindistan cevizi sahillerinin cesur denizcileri.",
            icon: "⛵"
        },
        {
            id: 5,
            name: "Hoodrick",
            headType: "archer",
            color: "#e67e22",
            colorHex: 0xe67e22,
            start: Tech.Archery,
            bias: Bias.Forest,
            lore: "Sonbahar ormanlarının tüylü şapkalı keskin nişancı okçuları.",
            icon: "🏹"
        },
        {
            id: 6,
            name: "Luxidoor",
            headType: "turban",
            color: "#9b59b6",
            colorHex: 0x9b59b6,
            start: Tech.Organization,
            bias: Bias.Field,
            lore: "Mücevherli saraylarda yaşayan zengin aristokratlar; surlu ve gelişmiş şehirle başlar.",
            icon: "💎"
        },
        {
            id: 7,
            name: "Vengir",
            headType: "dark",
            color: "#57606f",
            colorHex: 0x57606f,
            start: Tech.Smithery,
            bias: Bias.Mountain,
            lore: "Çorak dağlara sürgün edilmiş intikamcı kılıççılar ordusu.",
            icon: "💀"
        },
        {
            id: 8,
            name: "Zebasi",
            headType: "savanna",
            color: "#e1b12c",
            colorHex: 0xe1b12c,
            start: Tech.Farming,
            bias: Bias.Plain,
            lore: "Sıcak savanaların bereketli çiftçileri ve güneş çocukları.",
            icon: "🦒"
        },
        {
            id: 9,
            name: "Ai-Mo",
            headType: "monk",
            color: "#48dbfb",
            colorHex: 0x48dbfb,
            start: Tech.Meditation,
            bias: Bias.Mountain,
            lore: "Bulutların üzerindeki huzurlu tapınaklarda aydınlanma arayan keşişler.",
            icon: "🪷"
        },
        {
            id: 10,
            name: "Quetzali",
            headType: "bird",
            color: "#10ac84",
            colorHex: 0x10ac84,
            start: Tech.Strategy,
            bias: Bias.Forest,
            lore: "Kuş tüylü kalkanlarıyla tanrı kuşlara ibadet eden orman koruyucuları.",
            icon: "🦜"
        },
        {
            id: 11,
            name: "Yădakk",
            headType: "fez",
            color: "#c0392b",
            colorHex: 0xc0392b,
            start: Tech.Roads,
            bias: Bias.Plain,
            lore: "Fesli kervan tüccarları; imparatorluklarını taş döşeli yollarla birbirine bağlarlar.",
            icon: "🎪"
        }
    ],

    RewardsFor(level) {
        if (level === 2) return [Reward.Workshop, Reward.Scout];
        if (level === 3) return [Reward.Walls, Reward.Treasure];
        if (level === 4) return [Reward.Boom, Reward.Border];
        return [Reward.Park, Reward.Giant];
    },

    RewardName(r) {
        switch (r) {
            case Reward.Workshop: return "Atölye";
            case Reward.Scout: return "Kaşif";
            case Reward.Walls: return "Şehir Surları";
            case Reward.Treasure: return "Hazine Sandığı";
            case Reward.Boom: return "Nüfus Patlaması";
            case Reward.Border: return "Sınır Genişlemesi";
            case Reward.Park: return "Anıt Park";
            default: return "Süper Dev";
        }
    },

    RewardInfo(r) {
        switch (r) {
            case Reward.Workshop: return "Bu şehir her tur kalıcı +1 Yıldız üretir.";
            case Reward.Scout: return "Şehrin çevresindeki sisi geniş çapta anında dağıtır.";
            case Reward.Walls: return "Şehir karesindeki savunma gücünü 3 katına çıkarır.";
            case Reward.Treasure: return "Hazineye anında +5 Yıldız ekler.";
            case Reward.Boom: return "Şehre anında +3 Nüfus kazandırır.";
            case Reward.Border: return "Şehrin toprak sınırlarını 1 kare genişletir.";
            case Reward.Park: return "Şehre sonsuza dek +250 Zafer Puanı kazandırır.";
            default: return "Şehirde 40 Canlı yıkıcı bir Dev birliği belirir.";
        }
    },

    RewardIcon(r) {
        switch (r) {
            case Reward.Workshop: return "⚙️";
            case Reward.Scout: return "👁️";
            case Reward.Walls: return "🏰";
            case Reward.Treasure: return "💰";
            case Reward.Boom: return "👥";
            case Reward.Border: return "🗺️";
            case Reward.Park: return "🗽";
            default: return "👹";
        }
    }
};

/**
 * Harita Karesi
 */
export class Tile {
    constructor(x, y, playerCount) {
        this.x = x;
        this.y = y;
        this.terr = Terrain.Field;
        this.res = Res.None;
        this.bld = Bld.None;
        this.hasRoad = false;
        this.isCoast = false;
        this.cityId = -1;
        this.owner = -1;
        this.ownCity = -1;
        this.unitId = -1;
        this.seen = new Array(playerCount).fill(false);
    }
}

/**
 * Şehir / Köy
 */
export class City {
    constructor(id, x, y, owner, isCapital = false) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.owner = owner;
        this.isCapital = isCapital;
        this.level = 1;
        this.pop = 0;
        this.walls = false;
        this.park = false;
        this.shop = 0;
        this.border = 1;
        this.name = "";
    }

    get popNeeded() {
        return this.level + 1;
    }

    get unitCap() {
        return this.level + 1;
    }
}

/**
 * Askeri Birlik
 */
export class Unit {
    constructor(id, type, owner, x, y, homeId = -1) {
        this.id = id;
        this.type = type;
        this.owner = owner;
        this.x = x;
        this.y = y;
        this.home = homeId;
        const def = DB.Units[type];
        this.hp = def.hp;
        this.maxHp = def.hp;
        this.kills = 0;
        this.veteran = false;
        this.moved = false;
        this.acted = false;
        this.fresh = true;
    }

    get def() {
        return DB.Units[this.type];
    }

    get canAct() {
        return !this.acted && !this.fresh;
    }
}

/**
 * Oyuncu / Kabile
 */
export class Player {
    constructor(id, tribe, isAI = false) {
        this.id = id;
        this.tribe = tribe;
        this.name = tribe.name;
        this.stars = 5;
        this.techs = new Set();
        this.techs.add(tribe.start);
        this.isAI = isAI;
        this.alive = true;
    }

    has(tech) {
        return this.techs.has(tech);
    }
}

class SeededRNG {
    constructor(seed = 123456789) {
        this.s = [seed, seed ^ 0x6c62272e, seed ^ 0x3b20743b, seed ^ 0x5a1d198f];
        for (let i = 0; i < 20; i++) this.next();
    }

    next() {
        let [a, b, c, d] = this.s;
        const t = b << 9;
        let r = a * 5;
        r = ((r << 7) | (r >>> 25)) * 9;
        c ^= a;
        d ^= b;
        b ^= c;
        a ^= d;
        c ^= t;
        d = (d << 11) | (d >>> 21);
        this.s = [a >>> 0, b >>> 0, c >>> 0, d >>> 0];
        return (r >>> 0) / 4294967296;
    }

    range(min, max) {
        return min + Math.floor(this.next() * (max - min));
    }
}

export class GameState {
    static HUMAN = 0;

    constructor(options = {}) {
        const {
            size = 14,
            humanTribeIndex = 0,
            opponentCount = 2,
            difficulty = 1,
            maxTurn = 30,
            gameMode = 'perfection',
            seed = Math.floor(Math.random() * 10000000)
        } = options;

        this.size = size;
        this.turn = 1;
        this.maxTurn = maxTurn;
        this.gameMode = gameMode;
        this.difficulty = difficulty;
        this.seed = seed;
        this.rng = new SeededRNG(seed);
        this.cur = 0;
        this.over = false;
        this.overReason = "";
        this.nextUnitId = 1;

        this.players = [];
        this.units = [];
        this.cities = [];
        this.pendingRewards = [];
        this.log = [];

        // 1. Oyuncuları oluştur
        const usedTribes = [humanTribeIndex];
        this.players.push(new Player(0, DB.Tribes[humanTribeIndex], false));

        for (let i = 0; i < opponentCount; i++) {
            let tIdx;
            do {
                tIdx = Math.floor(this.rng.next() * DB.Tribes.length);
            } while (usedTribes.includes(tIdx) && usedTribes.length < DB.Tribes.length);
            usedTribes.push(tIdx);
            this.players.push(new Player(i + 1, DB.Tribes[tIdx], true));
        }

        // 2. Haritayı oluştur
        this.tiles = new Array(size * size);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                this.tiles[this.idx(x, y)] = new Tile(x, y, this.players.length);
            }
        }

        this.generateMap();

        // Luxidoor kabile avantajı (Seviye 3 başkent ve surlar)
        this.players.forEach(p => {
            if (p.tribe.name === 'Luxidoor') {
                const cap = this.cities.find(c => c.owner === p.id && c.isCapital);
                if (cap) {
                    cap.level = 3;
                    cap.walls = true;
                    this.claim(cap);
                }
            }
        });

        for (const u of this.units) {
            u.fresh = false;
        }

        this.say(`Hoş geldin! ${this.me.tribe.name} kabilesi hazır. Tur 1 başladı.`);
    }

    get current() {
        return this.players[this.cur];
    }

    get me() {
        return this.players[GameState.HUMAN];
    }

    idx(x, y) {
        return y * this.size + x;
    }

    inB(x, y) {
        return x >= 0 && y >= 0 && x < this.size && y < this.size;
    }

    at(x, y) {
        return this.inB(x, y) ? this.tiles[this.idx(x, y)] : null;
    }

    static cheb(ax, ay, bx, by) {
        return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
    }

    nbrs(x, y) {
        const list = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const t = this.at(x + dx, y + dy);
                if (t) list.push(t);
            }
        }
        return list;
    }

    generateMap() {
        const s = this.size;
        const pCount = this.players.length;

        const offset = Math.max(2, Math.floor(s * 0.16));
        const mid = Math.floor(s / 2);
        const spots = [];

        if (pCount === 2) {
            spots.push([offset, offset]);
            spots.push([s - 1 - offset, s - 1 - offset]);
        } else if (pCount === 3) {
            spots.push([offset, offset]);
            spots.push([s - 1 - offset, offset]);
            spots.push([mid, s - 1 - offset]);
        } else if (pCount === 4) {
            spots.push([offset, offset]);
            spots.push([s - 1 - offset, offset]);
            spots.push([offset, s - 1 - offset]);
            spots.push([s - 1 - offset, s - 1 - offset]);
        } else {
            spots.push([offset, offset]);
            spots.push([s - 1 - offset, offset]);
            spots.push([offset, s - 1 - offset]);
            spots.push([s - 1 - offset, s - 1 - offset]);
            spots.push([mid, mid]);
        }

        // 1. Arazi Ağırlıkları
        for (let y = 0; y < s; y++) {
            for (let x = 0; x < s; x++) {
                let wField = 46, wForest = 28, wMount = 14;
                let near = -1, nd = 999;

                for (let i = 0; i < pCount && i < spots.length; i++) {
                    const d = GameState.cheb(x, y, spots[i][0], spots[i][1]);
                    if (d < nd) { nd = d; near = i; }
                }

                if (nd <= 4 && near >= 0) {
                    switch (this.players[near].tribe.bias) {
                        case Bias.Mountain: wMount += 34; break;
                        case Bias.Forest: wForest += 36; break;
                        case Bias.Field: wField += 36; break;
                        case Bias.Plain: wField += 50; wForest -= 18; wMount -= 8; break;
                    }
                }

                this.at(x, y).terr = this.weightedTerrain(wField, wForest, wMount);
            }
        }

        // 2. Göller ve Denizler
        const lakes = Math.max(4, Math.floor((s * s) / 22));
        for (let i = 0; i < lakes; i++) {
            this.makeLake(this.rng.range(0, s), this.rng.range(0, s), 3 + this.rng.range(0, 5));
        }

        // 3. Kaynaklar
        for (const t of this.tiles) {
            const r = this.rng.next();
            if (t.terr === Terrain.Field) {
                if (r < 0.20) t.res = Res.Fruit;
                else if (r < 0.35) t.res = Res.Crop;
            } else if (t.terr === Terrain.Forest) {
                if (r < 0.32) t.res = Res.Game;
            } else if (t.terr === Terrain.Mountain) {
                if (r < 0.40) t.res = Res.Metal;
            } else if (t.terr === Terrain.Water) {
                if (r < 0.28) t.res = Res.Fish;
            }
        }

        // 4. Başkentler
        for (let i = 0; i < pCount; i++) {
            const [cx, cy] = spots[i];
            const cap = this.at(cx, cy);
            cap.terr = Terrain.Field;
            cap.res = Res.None;

            for (const n of this.nbrs(cx, cy)) {
                if (n.terr === Terrain.Water) {
                    n.terr = Terrain.Field;
                    n.res = Res.None;
                }
            }

            const city = this.addCity(cx, cy, i, true);
            city.level = 1;
            city.pop = 0;
            city.name = `${this.players[i].name}`;

            this.seedCapital(cx, cy, this.players[i]);
            this.spawn(UnitType.Warrior, cx, cy, i, city);
            this.reveal(i, cx, cy, 3);
        }

        // 5. Köyler
        const wantVillages = Math.max(6, Math.floor((s * s) / 16));
        let made = 0, guard = 0;

        while (made < wantVillages && guard++ < 1200) {
            const x = this.rng.range(0, s);
            const y = this.rng.range(0, s);
            const t = this.at(x, y);

            if (t.terr === Terrain.Water || t.terr === Terrain.Mountain || t.cityId >= 0) continue;

            let ok = true;
            for (const c of this.cities) {
                if (GameState.cheb(x, y, c.x, c.y) < 3) {
                    ok = false;
                    break;
                }
            }
            if (!ok) continue;

            t.res = Res.None;
            const village = this.addCity(x, y, -1, false);
            village.name = `Köy ${made + 1}`;
            made++;
        }
    }

    weightedTerrain(field, forest, mount) {
        const total = Math.max(1, field + forest + mount);
        const r = this.rng.range(0, total);
        if (r < field) return Terrain.Field;
        if (r < field + forest) return Terrain.Forest;
        return Terrain.Mountain;
    }

    makeLake(x, y, count) {
        const queue = [];
        const start = this.at(x, y);
        if (!start) return;
        queue.push(start);

        let made = 0, guard = 0;
        while (queue.length > 0 && made < count && guard++ < 80) {
            const idx = Math.floor(this.rng.next() * queue.length);
            const t = queue.splice(idx, 1)[0];
            if (!t || t.terr === Terrain.Water) continue;

            t.terr = Terrain.Water;
            t.res = Res.None;
            made++;

            for (const n of this.nbrs(t.x, t.y)) {
                if (this.rng.next() < 0.5) queue.push(n);
            }
        }
    }

    seedCapital(x, y, p) {
        const ring = [];
        for (const n of this.nbrs(x, y)) {
            if (n.cityId < 0) ring.push(n);
        }

        for (let i = ring.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng.next() * (i + 1));
            const tmp = ring[i];
            ring[i] = ring[j];
            ring[j] = tmp;
        }

        let k = 0;
        const put = (terr, res) => {
            if (k >= ring.length) return;
            const t = ring[k++];
            t.terr = terr;
            t.res = res;
            t.bld = Bld.None;
        };

        put(Terrain.Field, Res.Fruit);
        put(Terrain.Field, Res.Fruit);
        put(Terrain.Field, Res.Crop);

        if (p.tribe.start === Tech.Hunting) put(Terrain.Forest, Res.Game);
        else if (p.tribe.start === Tech.Fishing) put(Terrain.Water, Res.Fish);
        else if (p.tribe.start === Tech.Climbing) put(Terrain.Mountain, Res.Metal);
        else put(Terrain.Field, Res.Fruit);
    }

    addCity(x, y, owner, capital) {
        const c = new City(this.cities.length, x, y, owner, capital);
        this.cities.push(c);
        this.at(x, y).cityId = c.id;
        if (owner >= 0) this.claim(c);
        return c;
    }

    claim(c) {
        for (let dy = -c.border; dy <= c.border; dy++) {
            for (let dx = -c.border; dx <= c.border; dx++) {
                const t = this.at(c.x + dx, c.y + dy);
                if (!t) continue;
                if (t.cityId >= 0 && t.cityId !== c.id) continue;
                if (t.owner >= 0 && t.ownCity !== c.id) continue;
                t.owner = c.owner;
                t.ownCity = c.id;
            }
        }
    }

    reveal(playerIdx, x, y, radius) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const t = this.at(x + dx, y + dy);
                if (t) t.seen[playerIdx] = true;
            }
        }
    }

    spawn(type, x, y, owner, home) {
        const u = new Unit(this.nextUnitId++, type, owner, x, y, home ? home.id : -1);
        this.units.push(u);
        this.at(x, y).unitId = u.id;
        this.reveal(owner, x, y, this.visionRange(u));
        return u;
    }

    visionRange(u) {
        const t = this.at(u.x, u.y);
        return (t && t.terr === Terrain.Mountain) ? 2 : 1;
    }

    getUnit(id) {
        return this.units.find(u => u.id === id) || null;
    }

    unitAt(x, y) {
        const t = this.at(x, y);
        if (!t || t.unitId < 0) return null;
        return this.getUnit(t.unitId);
    }

    cityAt(x, y) {
        const t = this.at(x, y);
        if (!t || t.cityId < 0) return null;
        return this.cities[t.cityId] || null;
    }

    passable(t, u) {
        if (!t) return false;
        if (DB.Terrains[t.terr].blocks) return false;
        if (t.terr === Terrain.Mountain && !this.players[u.owner].has(Tech.Climbing)) return false;
        return true;
    }

    moves(u) {
        const result = new Map();
        if (u.moved || u.acted || u.fresh) return result;

        const best = new Map();
        best.set(this.idx(u.x, u.y), 0);
        const queue = [this.at(u.x, u.y)];
        const maxMove = u.def.move;

        while (queue.length > 0) {
            const t = queue.shift();
            const d = best.get(this.idx(t.x, t.y));
            if (d >= maxMove) continue;
            if (d > 0 && DB.Terrains[t.terr].stops) continue;

            for (const n of this.nbrs(t.x, t.y)) {
                if (!this.passable(n, u) || n.unitId >= 0) continue;
                const nd = d + 1;
                const key = this.idx(n.x, n.y);
                const had = best.get(key);
                if (had !== undefined && had <= nd) continue;

                best.set(key, nd);
                result.set(key, nd);
                queue.push(n);
            }
        }
        return result;
    }

    targets(u) {
        const list = [];
        if (u.acted || u.fresh) return list;
        if (u.moved && !u.def.dash) return list;

        const r = u.def.range;
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const v = this.unitAt(u.x + dx, u.y + dy);
                if (v && v.owner !== u.owner) {
                    list.push(v);
                }
            }
        }
        return list;
    }

    moveUnit(u, x, y) {
        const prev = this.at(u.x, u.y);
        if (prev && prev.unitId === u.id) prev.unitId = -1;

        u.x = x;
        u.y = y;
        this.at(x, y).unitId = u.id;
        u.moved = true;
        this.reveal(u.owner, x, y, this.visionRange(u));
    }

    rest(u) {
        const isOwnTerritory = (this.at(u.x, u.y).owner === u.owner);
        const heal = isOwnTerritory ? 4 : 2;
        u.hp = Math.min(u.maxHp, u.hp + heal);
        u.moved = true;
        u.acted = true;
    }

    defenseBonus(u) {
        const t = this.at(u.x, u.y);
        if (!t) return 1.0;

        if (t.cityId >= 0) {
            const c = this.cities[t.cityId];
            if (c.owner === u.owner) {
                return c.walls ? 3.0 : 1.5;
            }
        }
        return DB.Terrains[t.terr].defBonus;
    }

    previewDamage(a, d) {
        const aF = a.def.atk * (a.hp / a.maxHp);
        const dF = d.def.def * (d.hp / d.maxHp) * this.defenseBonus(d);
        const total = aF + dF;
        if (total <= 0) return 0;
        return Math.round((aF / total) * a.def.atk * 4.5);
    }

    previewRetaliation(a, d) {
        if (GameState.cheb(a.x, a.y, d.x, d.y) > d.def.range) return 0;
        const aF = a.def.atk * (a.hp / a.maxHp);
        const dF = d.def.def * (d.hp / d.maxHp) * this.defenseBonus(d);
        const total = aF + dF;
        if (total <= 0) return 0;
        return Math.round((dF / total) * d.def.def * 4.5);
    }

    attack(a, d) {
        const dmg = this.previewDamage(a, d);
        const ret = this.previewRetaliation(a, d);

        d.hp -= dmg;
        a.moved = true;

        const result = {
            damage: dmg,
            retaliation: ret,
            killed: false,
            veteran: false,
            persisted: false,
            attackerDied: false
        };

        if (d.hp <= 0) {
            result.killed = true;
            const victimName = d.def.name;
            this.kill(d);
            a.kills++;

            if (a.kills >= 3 && !a.veteran && !a.def.super) {
                a.veteran = true;
                a.maxHp += 5;
                a.hp = a.maxHp;
                result.veteran = true;
                this.say(`${a.def.name} gazi unvanı aldı! (+5 Can)`);
            }

            if (a.def.persist) {
                a.acted = false;
                a.moved = true;
                result.persisted = true;
            } else {
                a.acted = true;
            }
            this.say(`${a.def.name}, düşman ${victimName} birliğini yok etti! (-${dmg} can)`);
        } else {
            if (ret > 0) {
                a.hp -= ret;
            }
            a.acted = true;
            if (a.hp <= 0) {
                result.attackerDied = true;
                this.say(`${a.def.name} karşı saldırıda düştü.`);
                this.kill(a);
            } else {
                this.say(`${dmg} hasar verildi, ${ret} karşı hasar alındı.`);
            }
        }

        return result;
    }

    kill(u) {
        const t = this.at(u.x, u.y);
        if (t && t.unitId === u.id) t.unitId = -1;
        const idx = this.units.indexOf(u);
        if (idx >= 0) this.units.splice(idx, 1);
    }

    canCapture(u) {
        const c = this.cityAt(u.x, u.y);
        return c !== null && c.owner !== u.owner && u.canAct;
    }

    capture(u) {
        const c = this.cityAt(u.x, u.y);
        if (!c) return;

        const oldOwner = c.owner;
        c.owner = u.owner;
        if (c.level === 0) {
            c.level = 1;
            c.pop = 0;
        }

        this.claim(c);

        for (const v of this.units) {
            if (v.home === c.id && v.owner !== c.owner) {
                v.home = -1;
            }
        }

        u.acted = true;
        u.moved = true;
        this.reveal(u.owner, c.x, c.y, c.isCapital ? 2 : 1);

        if (oldOwner < 0) {
            this.say(`${this.players[u.owner].name} bir köyü fethetti!`);
        } else {
            this.say(`${this.players[u.owner].name}, ${this.players[oldOwner].name} şehrini ele geçirdi!`);
        }

        this.checkElimination();
    }

    unitsOf(c) {
        return this.units.filter(u => u.home === c.id).length;
    }

    cityCount(p) {
        return this.cities.filter(c => c.owner === p.id).length;
    }

    canTrain(c, type) {
        const def = DB.Units[type];
        const p = this.players[c.owner];

        if (def.super) return { ok: false, reason: "Süper birimler satın alınamaz." };
        if (def.needsTech && !p.has(def.need)) {
            return { ok: false, reason: `${DB.Techs[def.need].name} teknolojisi gerekli.` };
        }
        if (p.stars < def.cost) return { ok: false, reason: "Yetersiz Yıldız." };
        if (this.unitsOf(c) >= c.unitCap) return { ok: false, reason: "Şehir birim kapasitesi dolu." };
        if (this.at(c.x, c.y).unitId >= 0) return { ok: false, reason: "Şehir karesinde başka birim var." };

        return { ok: true, reason: "" };
    }

    train(c, type) {
        const check = this.canTrain(c, type);
        if (!check.ok) return false;

        const p = this.players[c.owner];
        p.stars -= DB.Units[type].cost;
        const u = this.spawn(type, c.x, c.y, c.owner, c);
        return u;
    }

    addPop(c, amount) {
        c.pop += amount;
        let leveledUp = false;

        while (c.pop >= c.popNeeded) {
            c.pop -= c.popNeeded;
            c.level++;
            leveledUp = true;

            if (c.owner === GameState.HUMAN) {
                this.pendingRewards.push(c);
            } else {
                this.autoReward(c);
            }
        }
        return leveledUp;
    }

    applyReward(c, reward) {
        const p = this.players[c.owner];
        switch (reward) {
            case Reward.Workshop:
                c.shop++;
                this.say(`${c.name || 'Şehir'}: Atölye kuruldu (+1 Yıldız/tur).`);
                break;
            case Reward.Treasure:
                p.stars += 5;
                this.say(`${p.name} hazine buldu (+5 Yıldız)!`);
                break;
            case Reward.Walls:
                c.walls = true;
                this.say(`${c.name || 'Şehir'} surlarla korundu!`);
                break;
            case Reward.Boom:
                this.addPop(c, 3);
                this.say(`${c.name || 'Şehir'}: Nüfus patlaması (+3 Nüfus).`);
                break;
            case Reward.Border:
                c.border = Math.min(3, c.border + 1);
                this.claim(c);
                this.say(`${c.name || 'Şehir'} sınırları genişledi.`);
                break;
            case Reward.Park:
                c.park = true;
                this.say(`${c.name || 'Şehir'}: Anıt Park inşa edildi (+250 Puan).`);
                break;
            case Reward.Giant:
                if (this.at(c.x, c.y).unitId < 0) {
                    this.spawn(UnitType.Giant, c.x, c.y, c.owner, c);
                    this.say(`${p.name} ordusuna bir Dev katıldı!`);
                } else {
                    p.stars += 5;
                    this.say(`Kare dolu olduğu için Dev yerine +5 Yıldız verildi.`);
                }
                break;
            case Reward.Scout:
                this.reveal(c.owner, c.x, c.y, 4);
                this.say(`Kaşifler çevredeki haritayı aydınlattı.`);
                break;
        }
    }

    autoReward(c) {
        const lvl = Math.min(5, c.level);
        if (lvl === 2) this.applyReward(c, Reward.Workshop);
        else if (lvl === 3) this.applyReward(c, this.rng.next() < 0.5 ? Reward.Walls : Reward.Treasure);
        else if (lvl === 4) this.applyReward(c, Reward.Boom);
        else this.applyReward(c, this.rng.next() < 0.7 ? Reward.Giant : Reward.Park);
    }

    canWork(t, p) {
        if (!t || t.owner !== p.id || t.cityId >= 0 || t.bld !== Bld.None) {
            return { ok: false, label: "", cost: 0, pop: 0 };
        }
        if (t.ownCity < 0) return { ok: false, label: "", cost: 0, pop: 0 };

        if (t.res !== Res.None) {
            const r = DB.Resources[t.res];
            if (!p.has(r.need)) return { ok: false, label: "", cost: 0, pop: 0 };
            return { ok: true, label: r.action, cost: r.cost, pop: r.pop };
        }

        if (t.terr === Terrain.Forest && p.has(Tech.Forestry)) {
            return { ok: true, label: "Kereste Kulübesi", cost: DB.LumberCost, pop: DB.LumberPop };
        }

        if (t.terr === Terrain.Water && p.has(Tech.Aquaculture)) {
            return { ok: true, label: "Liman İnşa Et", cost: DB.PortCost, pop: DB.PortPop };
        }

        return { ok: false, label: "", cost: 0, pop: 0 };
    }

    work(t, p) {
        const check = this.canWork(t, p);
        if (!check.ok || p.stars < check.cost) return false;

        p.stars -= check.cost;
        let pop = 0;

        if (t.res !== Res.None) {
            const r = DB.Resources[t.res];
            pop = r.pop;
            if (r.build !== Bld.None) t.bld = r.build;
            t.res = Res.None;
        } else if (t.terr === Terrain.Forest) {
            t.bld = Bld.Lumber;
            pop = DB.LumberPop;
        } else {
            t.bld = Bld.Port;
            pop = DB.PortPop;
        }

        const city = this.cities[t.ownCity];
        if (city) this.addPop(city, pop);
        return true;
    }

    techCost(p, tech) {
        const base = DB.Techs[tech].tier * 4 + this.cityCount(p);
        // Felsefe (Philosophy) %33 indirim sağlar (Görsel 3'teki resmi kural)
        if (p.has(Tech.Philosophy)) {
            return Math.max(1, Math.round(base * 0.67));
        }
        return base;
    }

    canResearch(p, tech) {
        if (p.has(tech)) return false;
        const def = DB.Techs[tech];
        if (def.parent && !p.has(def.parent)) return false;
        return p.stars >= this.techCost(p, tech);
    }

    research(p, tech) {
        if (!this.canResearch(p, tech)) return false;
        p.stars -= this.techCost(p, tech);
        p.techs.add(tech);
        this.say(`${p.name}, ${DB.Techs[tech].name} teknolojisini keşfetti!`);
        return true;
    }

    income(p) {
        let stars = 0;
        for (const c of this.cities) {
            if (c.owner === p.id) {
                stars += c.level + (c.isCapital ? 1 : 0) + c.shop;
            }
        }
        if (p.isAI) {
            if (this.difficulty === 1) stars += 1;
            else if (this.difficulty === 2) stars += 2;
            else if (this.difficulty === 3) stars += 4;
        }
        return Math.max(1, stars);
    }

    score(p) {
        let s = 0;
        for (const c of this.cities) {
            if (c.owner === p.id) {
                s += c.level * 120 + (c.isCapital ? 60 : 0) + c.pop * 5
                    + (c.walls ? 40 : 0) + (c.park ? 250 : 0) + c.shop * 40;
            }
        }
        for (const u of this.units) {
            if (u.owner === p.id) {
                s += Math.max(8, u.def.cost) * 6;
            }
        }
        for (const t of p.techs) {
            s += DB.Techs[t].tier * 100;
        }
        for (const t of this.tiles) {
            if (t.owner === p.id) s += 4;
        }
        return s;
    }

    startTurnFor(p) {
        p.stars += this.income(p);
        for (const u of this.units) {
            if (u.owner === p.id) {
                u.moved = false;
                u.acted = false;
                u.fresh = false;
            }
        }
    }

    nextPlayer() {
        let next = this.cur;
        do {
            next = (next + 1) % this.players.length;
            if (next === 0) {
                this.turn++;
                if (this.gameMode === 'perfection' && this.turn > this.maxTurn) {
                    this.finish("Tur limiti doldu! Oyun bitti.");
                    return this.current;
                }
            }
        } while (!this.players[next].alive);

        this.cur = next;
        this.startTurnFor(this.players[next]);
        return this.players[next];
    }

    checkElimination() {
        for (const p of this.players) {
            if (!p.alive || this.cityCount(p) > 0) continue;
            p.alive = false;
            for (let i = this.units.length - 1; i >= 0; i--) {
                if (this.units[i].owner === p.id) {
                    this.kill(this.units[i]);
                }
            }
            this.say(`${p.name} kabilesi elendi!`);
        }

        const aliveCount = this.players.filter(p => p.alive).length;
        if (aliveCount <= 1 || !this.me.alive) {
            this.finish(this.me.alive ? "Tüm rakipleri fethettiniz! Zafer sizin!" : "Son şehrinizi kaybettiniz! Yenilgi...");
        }
    }

    finish(reason) {
        if (this.over) return;
        this.over = true;
        this.overReason = reason;
        this.say(`OYUN BİTTİ: ${reason}`);
    }

    winner() {
        let best = null;
        for (const p of this.players) {
            if (!p.alive) continue;
            if (!best || this.score(p) > this.score(best)) {
                best = p;
            }
        }
        return best || this.players[0];
    }

    say(msg) {
        this.log.push(msg);
        if (this.log.length > 50) this.log.shift();
    }
}
