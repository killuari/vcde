precision mediump float;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_iter;  // 0 = 1 Iteration, 1 = 2 Iterationen, 2 = 3 Iterationen
uniform float u_cut;   // Schnittansicht an/aus

// Quader-SDF

float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}

// Menger-Schwamm
// Jede Iteration subtrahiert per max() eine Kreuzform (CSG-Differenz).
// r = abs(1 - 3*|mod(p*s,2)-1|) markiert die mittleren 1/3-Zellen jeder Achse.

float sdMenger(vec3 p) {
    float d = sdBox(p, vec3(1.0));

    // Iteration 1 (immer aktiv)
    float s = 1.0;
    vec3 a = mod(p * s, 2.0) - 1.0;
    vec3 r = abs(1.0 - 3.0 * abs(a));
    float c = (min(min(max(r.x, r.y), max(r.y, r.z)), max(r.z, r.x)) - 1.0) / (s * 3.0);
    d = max(d, c);

    // Iteration 2
    s = 3.0;
    a = mod(p * s, 2.0) - 1.0;
    r = abs(1.0 - 3.0 * abs(a));
    c = (min(min(max(r.x, r.y), max(r.y, r.z)), max(r.z, r.x)) - 1.0) / (s * 3.0);
    if (u_iter > 0.5) d = max(d, c);

    // Iteration 3
    s = 9.0;
    a = mod(p * s, 2.0) - 1.0;
    r = abs(1.0 - 3.0 * abs(a));
    c = (min(min(max(r.x, r.y), max(r.y, r.z)), max(r.z, r.x)) - 1.0) / (s * 3.0);
    if (u_iter > 1.5) d = max(d, c);

    return d;
}

float map(vec3 p) {
    float d = sdMenger(p);
    if (u_cut > 0.5) d = max(d, p.x);  // Schnittebene bei x = 0
    return d;
}

// Normalen via finite Differenzen

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
    ));
}

// Ray Marching

float rayMarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    for (int i = 0; i < 128; i++) {
        float d = map(ro + t * rd);
        if (d < 0.002) return t;
        if (t > 20.0)  break;
        t += d;
    }
    return -1.0;
}

// Soft Shadows (Quilez)

float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
    float res = 1.0;
    float t   = mint;
    for (int i = 0; i < 48; i++) {
        float h = map(ro + rd * t);
        if (h < 0.001) return 0.0;
        res = min(res, k * h / t);
        t  += clamp(h, 0.01, 0.3);
        if (t > maxt) break;
    }
    return clamp(res, 0.0, 1.0);
}

// Ambient Occlusion

float calcAO(vec3 pos, vec3 nor) {
    float occ = 0.0, sca = 1.0;
    for (int i = 0; i < 5; i++) {
        float h = 0.01 + 0.12 * float(i) / 4.0;
        occ += (h - map(pos + h * nor)) * sca;
        sca *= 0.95;
    }
    return clamp(1.0 - 2.5 * occ, 0.0, 1.0);
}

// Hauptfunktion

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

    // Kamera umkreist den Schwamm langsam
    float t  = u_time * 0.4;
    vec3  ro = vec3(cos(t) * 3.2, 0.9 + sin(t * 0.5) * 0.6, sin(t) * 3.2);
    vec3  ta = vec3(0.0, -0.1, 0.0);

    vec3 cw = normalize(ta - ro);
    vec3 cu = normalize(cross(cw, vec3(0.0, 1.0, 0.0)));
    vec3 cv = cross(cu, cw);
    vec3 rd = normalize(uv.x * cu + uv.y * cv + 1.5 * cw);

    // Hintergrund: dunkelblauer Gradient
    vec3 col = mix(vec3(0.02, 0.03, 0.08), vec3(0.08, 0.12, 0.22), clamp(uv.y + 0.5, 0.0, 1.0));

    // Hauptlicht von oben vorne links
    vec3 ld = normalize(vec3(0.7, 1.0, -0.5));

    float dist = rayMarch(ro, rd);
    if (dist > 0.0) {
        vec3 pos  = ro + dist * rd;
        vec3 nor  = calcNormal(pos);

        // Farbe aus Normalenrichtung: hebt fraktale Kanten und Tunnel hervor
        vec3 base = 0.5 + 0.5 * nor;

        float diff = max(dot(nor, ld), 0.0);
        float spec = pow(max(dot(reflect(-ld, nor), -rd), 0.0), 32.0) * 0.5;
        float ao   = calcAO(pos, nor);
        float shad = softShadow(pos + nor * 0.01, ld, 0.02, 6.0, 8.0);
        float rim  = pow(1.0 - max(dot(nor, -rd), 0.0), 4.0) * 0.15;

        col  = base * (0.06 * ao + diff * shad * 0.82 * ao);
        col += vec3(0.9, 0.95, 1.0) * spec * shad;
        col += base * rim;
    }

    col = pow(clamp(col, 0.0, 1.0), vec3(0.4545));
    gl_FragColor = vec4(col, 1.0);
}
