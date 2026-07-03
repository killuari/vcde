precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_epsilon;
uniform float u_show_offset;

float sdSphere(vec3 p, float r) { return length(p) - r; }

float map(vec3 p) {
    float dA = sdSphere(p - vec3(-0.65, 0.0, 0.0), 0.55);
    float dB = sdSphere(p - vec3( 0.65, 0.0, 0.0), 0.55);
    float dF = p.y + 0.85;
    return min(min(dA, dB), dF);
}

vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
    ));
}

// Sphere Tracing (Hart 1996)
float rayMarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    for (int i = 0; i < 150; i++) {
        float d = map(ro + t * rd);
        if (d < u_epsilon) return t;
        if (t > 20.0)      return -1.0;
        t += d;
    }
    return -1.0;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

    vec3 ro = vec3(0.0, 0.5, 3.5);
    vec3 rd = normalize(vec3(uv.x, uv.y - 0.10, -1.5));
    vec3 ld = normalize(vec3(0.5, 1.0, 0.8));

    vec3 col = mix(vec3(0.05, 0.06, 0.12), vec3(0.14, 0.17, 0.28),
                   clamp(uv.y + 0.3, 0.0, 1.0));

    float t = rayMarch(ro, rd);

    if (t > 0.0) {
        vec3 pos = ro + t * rd;
        vec3 nor = calcNormal(pos);

        float dA = sdSphere(pos - vec3(-0.65, 0.0, 0.0), 0.55);
        float dB = sdSphere(pos - vec3( 0.65, 0.0, 0.0), 0.55);
        float dF = pos.y + 0.85;

        if (u_show_offset > 0.5) {
            // Absoluten Abstand zur echten Oberfläche am Treffpunkt zeigen.
            // map(pos) ≈ d bei Abbruch, liegt in [0, epsilon).
            float heat = clamp(map(pos) / 0.13, 0.0, 1.0);
            col = mix(vec3(0.10, 0.42, 0.92), vec3(0.92, 0.18, 0.08), heat);
        } else {
            vec3 baseColor;
            if (dA <= dB && dA <= dF) {
                baseColor = vec3(0.88, 0.45, 0.18);
            } else if (dB <= dF) {
                baseColor = vec3(0.22, 0.52, 0.88);
            } else {
                float chk = mod(floor(pos.x * 1.5) + floor(pos.z * 1.5), 2.0);
                baseColor = mix(vec3(0.48, 0.50, 0.54), vec3(0.70, 0.72, 0.76), chk);
            }
            float diff = max(dot(nor, ld), 0.0);
            col = baseColor * (0.18 + diff * 0.82);
        }
    }

    col = pow(clamp(col, 0.0, 1.0), vec3(0.4545));
    gl_FragColor = vec4(col, 1.0);
}
