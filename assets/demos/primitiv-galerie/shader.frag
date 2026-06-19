precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_shape;
uniform float u_param1;
uniform float u_param2;

float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

float sdCapsule(vec3 p, float h, float r) {
    p.y -= clamp(p.y, -h, h);
    return length(p) - r;
}

float sdCylinder(vec3 p, float h, float r) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float sdOctahedron(vec3 p, float s) {
    p = abs(p);
    float m = p.x + p.y + p.z - s;
    vec3 q;
    if (3.0 * p.x < m) q = p.xyz;
    else if (3.0 * p.y < m) q = p.yzx;
    else if (3.0 * p.z < m) q = p.zxy;
    else return m * 0.57735027;
    float k = clamp(0.5 * (q.z - q.y + s), 0.0, s);
    return length(vec3(q.x, q.y - s + k, q.z - k));
}

float map(vec3 p) {
    float a = u_time * 0.4;
    float sa = sin(a), ca = cos(a);
    vec3 rp = vec3(ca * p.x + sa * p.z, p.y, -sa * p.x + ca * p.z);

    if (u_shape < 0.5) return sdSphere (rp, u_param1);
    else if (u_shape < 1.5) return sdBox (rp, vec3(u_param1, u_param2, u_param1));
    else if (u_shape < 2.5) return sdTorus (rp, vec2(u_param1, u_param2));
    else if (u_shape < 3.5) return sdCapsule (rp, u_param1, u_param2);
    else if (u_shape < 4.5) return sdCylinder (rp, u_param1, u_param2);
    else return sdOctahedron(rp, u_param1);
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
        if (d < 0.001) return t;
        if (t > 20.0) break;
        t += d;
    }
    return -1.0;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
    vec3 ro = vec3(0.0, 0.0, 3.0);
    vec3 rd = normalize(vec3(uv, -1.5));
    vec3 col = vec3(0.05, 0.07, 0.13);

    float t = rayMarch(ro, rd);
    if (t > 0.0) {
        vec3 pos = ro + t * rd;
        vec3 nor = calcNormal(pos);

        vec3 lightPos = vec3(2.0, 3.0, 4.0);
        vec3 lightDir = normalize(lightPos - pos);
        vec3 viewDir = normalize(ro - pos);
        vec3 halfDir = normalize(lightDir + viewDir);

        float amb = 0.12;
        float diff = max(dot(nor, lightDir), 0.0);
        float spec = pow(max(dot(nor, halfDir), 0.0), 48.0);

        vec3 baseColor;
        if (u_shape < 0.5) baseColor = vec3(0.35, 0.72, 1.00);
        else if (u_shape < 1.5) baseColor = vec3(0.90, 0.55, 0.20);
        else if (u_shape < 2.5) baseColor = vec3(0.30, 0.85, 0.50);
        else if (u_shape < 3.5) baseColor = vec3(0.85, 0.30, 0.55);
        else if (u_shape < 4.5) baseColor = vec3(0.75, 0.70, 0.20);
        else baseColor = vec3(0.65, 0.35, 0.90);

        col = baseColor * (amb + diff * 0.88);
        col += vec3(1.0) * spec * 0.65;
    }

    col = pow(clamp(col, 0.0, 1.0), vec3(0.4545));
    gl_FragColor = vec4(col, 1.0);
}
