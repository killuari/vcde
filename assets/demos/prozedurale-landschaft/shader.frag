precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_cam_pos; // Kamera XZ-Position (vom JS gesteuert)
uniform float u_detail; // 0=grob 1=mittel 2=fein
uniform float u_fog; // Nebeldichte (0..0.08)

// Value Noise + FBM (Fractional Brownian Motion, nach Quilez / Hoskins-Hash)
float hash2(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x),
        mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

// FBM mit konditionellen Oktaven (kein variabler Loop-Bound nötig).
// Basis-Shape (2 Oktaven) bleibt bei allen Detail-Stufen gleich;
// höhere Stufen addieren feinere Details obenauf.
float fbm(vec2 p) {
    float h = noise(p * 0.50) * 0.600;
    h += noise(p * 1.00) * 0.300;
    float w2 = step(0.5, u_detail); // 1 bei mittel oder fein
    h += noise(p * 2.00) * 0.150 * w2;
    h += noise(p * 4.00) * 0.075 * w2;
    float w3 = step(1.5, u_detail); // 1 nur bei fein
    h += noise(p * 8.00) * 0.038 * w3;
    h += noise(p * 16.0) * 0.019 * w3;
    return h;
}

float terrainHeight(vec2 xz) {
    return fbm(xz * 0.28) * 4.2;
}

// SDF-Szene
float map(vec3 p) {
    // p.y > 0 → über dem Boden; p.y < 0 → im Boden
    return p.y - terrainHeight(p.xz);
}

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.004, 0.0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
    ));
}

// Terrain Ray Marching (Verfahren nach Quilez)
// Terrain-SDF ist nur approximativ (Gradient ≠ 1 bei Steigungen).
// Strategie: grobe Schritte bis zur Überquerung, dann Bisektions-Verfeinerung.

float rayMarchTerrain(vec3 ro, vec3 rd) {
    float t = 0.2;
    float prev = 0.0;

    for (int i = 0; i < 256; i++) {
        vec3 p = ro + t * rd;
        float h = p.y - terrainHeight(p.xz);

        if (h < 0.0) {
            // Überquerung erkannt: Bisektion zwischen prev (oberhalb) und t (unterhalb)
            float ta = prev, tb = t;
            for (int j = 0; j < 12; j++) {
                float tm = 0.5 * (ta + tb);
                vec3 pm = ro + tm * rd;
                if (pm.y < terrainHeight(pm.xz)) tb = tm;
                else ta = tm;
            }
            return 0.5 * (ta + tb);
        }

        if (t > 120.0) break;
        prev = t;
        t += h * 0.50 + 0.05;
    }
    return -1.0;
}

// Soft Shadows (Quilez)
float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
    float res = 1.0;
    float t = mint;
    for (int i = 0; i < 64; i++) {
        float h = map(ro + rd * t);
        if (h < 0.001) return 0.0;
        res = min(res, k * h / t);
        t += clamp(h, 0.05, 1.5);
        if (t > maxt) break;
    }
    return clamp(res, 0.0, 1.0);
}

// Terrain-Farbe
vec3 terrainColor(vec3 pos, vec3 nor) {
    float h = pos.y;
    float steep = 1.0 - nor.y; // 0=flach, 1=senkrecht

    vec3 grass = vec3(0.20, 0.44, 0.10);
    vec3 rock = vec3(0.50, 0.43, 0.30);
    vec3 snow = vec3(0.88, 0.92, 1.00);
    vec3 dirt = vec3(0.38, 0.29, 0.16);

    // Hangneigung: flach = Gras, steil = Fels
    vec3 col = mix(grass, rock, smoothstep(0.30, 0.65, steep));
    // Talboden: Erde bei sehr niedriger Höhe
    col = mix(dirt, col, smoothstep(0.0, 0.6, h));
    // Schnee auf flachen Gipfeln
    col = mix(col, snow, smoothstep(2.8, 3.6, h) * (1.0 - steep * 0.85));
    // Mikro-Rauschen für Textur-Eindruck
    col += (noise(pos.xz * 3.5) * 0.06 - 0.03);
    return clamp(col, 0.0, 1.0);
}

// Himmel
vec3 skyColor(vec3 rd, vec3 ld) {
    // Zenith = tiefblau, Horizont = hellblau
    float elev = clamp(rd.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 sky = mix(vec3(0.55, 0.72, 0.96), vec3(0.12, 0.38, 0.82), elev);
    float sun = max(0.0, dot(rd, ld));
    sky += vec3(1.00, 0.92, 0.60) * pow(sun, 9.0) * 0.55; // Gloriole
    sky += vec3(1.00, 0.96, 0.80) * step(0.9997, sun); // Sonnen-Scheibe
    return sky;
}

// Hauptfunktion
void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

    // Kamera: Y ergibt sich aus dem Terrain unter dem Spieler + Augenhöhe
    float camY = terrainHeight(u_cam_pos) + 1.6;
    vec3 ro = vec3(u_cam_pos.x, camY, u_cam_pos.y);

    // Blickrichtung: leicht nach unten (typische Ego-Perspektive)
    vec3 rd = normalize(vec3(uv.x, uv.y * 0.88 - 0.22, -1.5));

    // Sonnenrichtung (warmes Seitenlicht)
    vec3 ld = normalize(vec3(0.65, 0.55, -0.35));

    vec3 sky = skyColor(rd, ld);
    vec3 col = sky;

    float t = rayMarchTerrain(ro, rd);
    if (t > 0.0) {
        vec3 pos = ro + t * rd;
        vec3 nor = calcNormal(pos);

        vec3 base = terrainColor(pos, nor);
        float diff = max(dot(nor, ld), 0.0);
        float amb = 0.18;

        float shad = softShadow(pos + nor * 0.1, ld, 0.1, 60.0, 5.0);

        // Einfaches Ambient Occlusion über Normalen-Ausrichtung
        float ao = clamp(nor.y * 0.5 + 0.5, 0.0, 1.0);

        col = base * (amb * ao + diff * shad * 0.82);

        // Atmosphärischer Nebel (exponential, nach Quilez)
        float fogAmt = 1.0 - exp(-t * u_fog);
        col = mix(col, sky, fogAmt);
    }

    col = pow(clamp(col, 0.0, 1.0), vec3(0.4545));
    gl_FragColor = vec4(col, 1.0);
}
