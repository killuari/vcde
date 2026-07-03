precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_shape; // 0=Torus 1=Box 2=Kapsel
uniform float u_spacing; // Gitter-Abstand
uniform float u_shadows; // Soft Shadows an/aus

// SDF-Primitive

float sdTorus(vec3 p, float r1, float r2) {
    vec2 q = vec2(length(p.xz) - r1, p.y);
    return length(q) - r2;
}

float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdCapsule(vec3 p, float h, float r) {
    p.y -= clamp(p.y, -h, h);
    return length(p) - r;
}

// Hash / Zellfarbe (Hash nach Quilez)

float hash(vec3 p) {
    p = fract(p * vec3(127.1, 311.7, 74.7));
    p += dot(p, p.yzx + 19.19);
    return fract(p.x * p.y * p.z);
}

// Cosine-Palette (Quilez)
vec3 palette(vec3 id) {
    float h = hash(id) * 6.2832;
    return 0.62 + 0.34 * vec3(cos(h), cos(h + 2.094), cos(h + 4.189));
}

// Szene mit Domain-Repetition
float objSDF(vec3 q) {
    if (u_shape < 0.5) return sdTorus(q, 0.40, 0.14);
    if (u_shape < 1.5) return sdBox(q, vec3(0.30));
                       return sdCapsule(q, 0.36, 0.13);
}

float map(vec3 p) {
    // Domain-Repetition: mod() faltet den gesamten Raum auf eine Zelle (Quilez)
    vec3 q = mod(p + 0.5 * u_spacing, u_spacing) - 0.5 * u_spacing;
    return objSDF(q);
}

vec3 getCellID(vec3 p) {
    return floor(p / u_spacing + 0.5);
}

// Ray Marching / Normale / Schatten / AO
vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
    ));
}

float rayMarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    for (int i = 0; i < 128; i++) {
        float d = map(ro + t * rd);
        if (d < 0.002) return t;
        if (t > 50.0) break;
        t += d;
    }
    return -1.0;
}

// Soft Shadows (Quilez)
float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
    float res = 1.0;
    float t = mint;
    for (int i = 0; i < 48; i++) {
        float h = map(ro + rd * t);
        if (h < 0.001) return 0.0;
        res = min(res, k * h / t);
        t += clamp(h, 0.02, 0.3);
        if (t > maxt) break;
    }
    return clamp(res, 0.0, 1.0);
}

// Ambient Occlusion (Quilez)
float calcAO(vec3 pos, vec3 nor) {
    float occ = 0.0, sca = 1.0;
    for (int i = 0; i < 5; i++) {
        float h = 0.01 + 0.15 * float(i) / 4.0;
        occ += (h - map(pos + h * nor)) * sca;
        sca *= 0.95;
    }
    return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

// Hauptfunktion
void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

    // Kamera fliegt vorwärts entlang -Z, leichtes Seitenschwingen
    float ta = u_time * 0.55;
    vec3 ro = vec3(sin(ta * 0.31) * u_spacing * 0.28, 0.35, -ta * 2.4);
    vec3 rd = normalize(vec3(uv.x + sin(ta * 0.17) * 0.03, uv.y - 0.06, -1.5));

    // Hintergrundgradient (tiefschwarz → dunkles Marineblau)
    vec3 col = mix(vec3(0.04, 0.05, 0.10), vec3(0.10, 0.14, 0.26), uv.y + 0.5);

    // Lichtrichtung (schräg von oben vorne)
    vec3 ld = normalize(vec3(0.6, 1.0, 0.4));

    float t = rayMarch(ro, rd);
    if (t > 0.0) {
        vec3 pos = ro + t * rd;
        vec3 nor = calcNormal(pos);
        vec3 base = palette(getCellID(pos));

        float diff = max(dot(nor, ld), 0.0);
        vec3 h_v = normalize(ld - rd);
        float spec = pow(max(dot(nor, h_v), 0.0), 40.0) * 0.45;

        float shad = 1.0;
        if (u_shadows > 0.5) shad = softShadow(pos + nor * 0.01, ld, 0.02, 8.0, 12.0);

        float ao = calcAO(pos, nor);

        float rim = pow(1.0 - max(dot(nor, -rd), 0.0), 4.0) * 0.22;

        col = base * (0.10 * ao + diff * shad * 0.85) + base * rim;
        col += vec3(1.0) * spec * shad;

        // Exponential-Fog (nach Quilez)
        col = mix(vec3(0.04, 0.05, 0.10), col, exp(-t * 0.044));
    }

    col = pow(clamp(col, 0.0, 1.0), vec3(0.4545));
    gl_FragColor = vec4(col, 1.0);
}
