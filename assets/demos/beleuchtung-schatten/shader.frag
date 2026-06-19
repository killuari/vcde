precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_light_az;
uniform float u_light_el;
uniform float u_shininess;
uniform float u_bx;
uniform float u_by;
uniform float u_bz;
uniform float u_blocker_shape;
uniform float u_shadows;
uniform float u_specular;
uniform float u_ao;

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float blockerSDF(vec3 brel) {
    return u_blocker_shape < 0.5
           ? sdSphere(brel, 0.35)
           : sdBox(brel, vec3(0.28));
}

float map(vec3 p) {
    float dMain = sdSphere(p, 0.6);
    float dGround = p.y + 1.0;
    float dBlocker = blockerSDF(p - vec3(u_bx, u_by, u_bz));
    return min(min(dMain, dGround), dBlocker);
}

float mapMaterial(vec3 p) {
    float dMain = sdSphere(p, 0.6);
    float dGround = p.y + 1.0;
    float dBlocker = blockerSDF(p - vec3(u_bx, u_by, u_bz));
    if (dMain <= dGround && dMain <= dBlocker) return 0.0;
    if (dGround <= dBlocker) return 1.0;
    return 2.0;
}

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
    for (int i = 0; i < 100; i++) {
        float d = map(ro + t * rd);
        if (d < 0.005) return t;
        if (t > 20.0) break;
        t += d;
    }
    return -1.0;
}

float hardShadow(vec3 ro, vec3 rd, float maxt) {
    float t = 0.02;
    for (int i = 0; i < 64; i++) {
        float h = map(ro + rd * t);
        if (h < 0.001) return 0.0;
        t += h;
        if (t >= maxt) break;
    }
    return 1.0;
}

float ambientOcclusion(vec3 pos, vec3 nor) {
    float occ = 0.0;
    float sca = 1.0;
    for (int i = 0; i < 5; i++) {
        float h = 0.01 + 0.12 * float(i) / 4.0;
        float d = map(pos + h * nor);
        occ += (h - d) * sca;
        sca *= 0.95;
    }
    return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

    vec3 ro = vec3(0.0, 0.5, 3.5);
    vec3 rd = normalize(vec3(uv.x, uv.y - 0.12, -1.5));

    vec3 ld = normalize(vec3(
        cos(u_light_az) * cos(u_light_el),
        sin(u_light_el),
        sin(u_light_az) * cos(u_light_el)
    ));

    vec3 col = vec3(0.07, 0.08, 0.13);

    float t = rayMarch(ro, rd);
    if (t > 0.0) {
        vec3 pos = ro + t * rd;
        vec3 nor = calcNormal(pos);

        float matID = mapMaterial(pos);
        vec3 baseColor;
        if (matID < 0.5) {
            baseColor = vec3(0.90, 0.52, 0.20);
        } else if (matID < 1.5) {
            float chk = mod(floor(pos.x * 1.5) + floor(pos.z * 1.5), 2.0);
            baseColor = mix(vec3(0.55, 0.57, 0.60), vec3(0.78, 0.80, 0.84), chk);
        } else {
            baseColor = vec3(0.38, 0.72, 0.90);
        }

        vec3 viewDir = normalize(ro - pos);
        vec3 halfDir = normalize(ld + viewDir);

        float amb = 0.20;
        float diff = max(dot(nor, ld), 0.0);

        float shad = 1.0;
        if (u_shadows > 0.5) {
            shad = hardShadow(pos + nor * 0.01, ld, 8.0);
        }

        float ao = 1.0;
        if (u_ao > 0.5) {
            ao = ambientOcclusion(pos, nor);
        }

        float spec = 0.0;
        if (u_specular > 0.5) {
            spec = pow(max(dot(nor, halfDir), 0.0), u_shininess);
        }

        float rim = pow(1.0 - max(dot(nor, viewDir), 0.0), 3.0);

        col = baseColor * (amb * ao + diff * shad * 0.80);
        col += vec3(1.0) * spec * shad * 0.55;
        col += baseColor * 0.22 * rim;
    }

    col = pow(clamp(col, 0.0, 1.0), vec3(0.4545));
    gl_FragColor = vec4(col, 1.0);
}
