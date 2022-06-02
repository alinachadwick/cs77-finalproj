const renderer = new THREE.WebGLRenderer();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000);
const scene = new THREE.Scene();
const canvas = document.querySelector('scene_canvas');
var Mesh;
var light;

// var fragmentShader = createShaderObject(gl, fragmentShader, gl.FRAGMENT_SHADER);

function init() {
    scene.background = new THREE.Color('white');
    camera.position.set(0, 10, 20);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);
    
    var fragSource = `
    precision highp float;
    varying vec2 Coord;
    void main () {
        gl_FragColor = vec4(length(Coord - 0.), 0., 0., 1.,);
    }`

    const fragmentShader = `
        // pre-defined constants
        #define EPSILON 1e-4
        #define PI 3.1415926535897932384626433832795
        
        
        // shade mode
        #define GRID 0
        #define COST 1
        #define NORMAL 2
        #define AMBIENT 3
        #define DIFFUSE_POINT 4
        #define ENVIRONMENT_MAP 5
        
        
        //
        // Render Settings
        //
        struct settings
        {
            int shade_mode;
        };
        
        settings render_settings = settings(DIFFUSE_POINT);
        
        
        
        //float anim_speed = 0.35;
        float anim_speed = 0.35;
        int cost_norm = 200;
        
        vec3 two_tone_color_a = vec3(0.6 * 1.0, 0.6 * 1.0, 0.0 * 1.0);
        vec3 two_tone_color_b = vec3(0.2 * 1.0, 0.1 * 1.0, 0.9 * 1.0);
        //vec3 two_tone_color_a = vec3(0.9,0.7,0.6);
        //vec3 two_tone_color_b = vec3(0.0);
        vec3 two_tone_dir = vec3(1.0, 1.0, 0.0);
        
        ////////////////////////////////////////////////////
        // SDF evaluation code here:
        ////////////////////////////////////////////////////
        
        // returns the signed distance to a sphere from position p
        float sdSphere(vec3 p, float r)
        {
            return length(p) - r;
        }
        
        // returns the signed distance to a box from position p
        float sdBox( vec3 p, vec3 half_bounds )
        {
            vec3 q = abs(p) - half_bounds;
            float maxComponent = max(q.x, max(q.y, q.z));
            return length(max(q, 0.)) + min(maxComponent, 0.);
        }
        
        // returns the signed distance to a cylinder from position p
        float sdCylinder(vec3 p, vec3 a, vec3 b, float r)
        {
            float baMagnitudeSquared = dot(b-a,b-a);
            float x = length((p - a) * baMagnitudeSquared - (b - a) * dot(p - a, b - a)) - r * baMagnitudeSquared;
            float y = abs(dot(p - a, b - a) - baMagnitudeSquared * 0.5) - baMagnitudeSquared * 0.5;
            float dist = 0.0;
            
            
            if (max(x, y) < 0.0) {
                dist = -min(x * x, y * y * baMagnitudeSquared);
            } else {
                
                if (x > 0.0) {
                    x = x * x;
                } else {
                    x = 0.0;
                }
            
                if (y > 0.0) {
                    y = y * y * baMagnitudeSquared;
                } else {
                    y = 0.0;
                }
                dist = x + y;
            }
            
            
            return sign(dist) * sqrt(abs(dist)) / baMagnitudeSquared;
        }
        
        // returns the signed distance to a cone from position p
        float sdCone(vec3 p, vec3 a, vec3 b, float ra, float rb)
        {
            float tPrime = dot(p-a, b-a) / dot(b-a, b-a);
            float x = sqrt(dot(p-a, p-a) - tPrime * tPrime * dot(b-a, b-a));
            float ax = 0.0; 
            
            if (tPrime < 0.5) {
                ax = max(0.0, x-ra);
            } else {
                ax = max(0.0, x-rb);
            }
            
            float ay = abs(tPrime - 0.5) - 0.5;
            float k = (rb-ra) * (rb-ra) + dot(b-a,b-a);
            float d = min(max(((rb-ra) * (x-ra) + tPrime * dot(b-a,b-a)) / k, 0.0), 1.0);
            float bx = x-ra - d * (rb-ra);
            float by = tPrime - d;
            float y = 0.0; 
            
            if (bx < 0.0 && ay < 0.0) {
                y = -1.0;
            } else {
                y = 1.0;
            }
            
            return y * sqrt(min(ax*ax + ay*ay*dot(b-a,b-a), bx*bx + by*by*dot(b-a,b-a)));
        }
        
        float sdLine(in vec2 p, in vec2 a, in vec2 b)
        {
            float tPrime = min(1., max( 0., dot(p-a, b-a) / dot(b-a, b-a)));
            return length(p-a-(b-a)*tPrime);
        }
        
        float opSmoothUnion(float d1, float d2, float k)
        {
            float h = max(k - abs(d1 - d2), 0.0);
            return min(d1, d2) - h * h / (4.0 * k);
        }
        
        float opSmoothSubtraction(float d1, float d2, float k)
        {
            float h = clamp( 0.5 - 0.5*(d2+d1)/k, 0.0, 1.0 );
            return mix( d2, -d1, h ) + k*h*(1.0-h);
        }
        
        float opSmoothIntersection( float d1, float d2, float k )
        {
            float h = max(k - abs(d1 - d2), 0.0);
            return max(d1, d2) + (h * h / (4.0 * k));
        }
        
        float opRound(float d, float iso)
        {
            return d - iso;
        }
        
        //////////////////////////////////////////////////////////////////////////////////
        
        
        #define PROJECTION_ORTHOGRAPHIC 0
        #define PROJECTION_PERSPECTIVE  1
        
        int projection_func = PROJECTION_ORTHOGRAPHIC;
        
        ////////////////////////////////////////////////////
        // Write up your ray generation code here:
        ////////////////////////////////////////////////////
        struct ray { 
            vec3 origin;
            vec3 direction;
        };
        
        
        // TASK 2.1
        void compute_camera_frame(
            vec3 dir, vec3 up,
            out vec3 u, out vec3 v, out vec3 w ) {
            
            w = -dir / length(dir);
            u = cross(up, w) / length(cross(up, w));
            v = cross(w, u);
        
        }
        
        
        // TASK 2.2
        ray generate_ray_orthographic(vec2 uv, vec3 e, vec3 u, vec3 v, vec3 w) {
            return ray(vec3(e + uv.x * u + uv.y * v), vec3(-w));
        
        }
        
        // TASK 2.3
        ray generate_ray_perspective(vec2 uv, vec3 eye, vec3 u, vec3 v, vec3 w, float focal_length) {
            return ray(eye, normalize(vec3(-focal_length * w + uv.x * u + uv.y * v)));
        }
        ////////////////////////////////////////////////////
        
        // returns the signed distance to an infinate plane with a specific y value
        float sdPlane(vec3 p, float z)
        {
            return p.z - z;
        }
        
        float world_sdf(vec3 p, float time, settings setts)
        {
            float dist = 100000.0;
            
            dist = sdPlane(p.xzy, -0.15);
            
            
            dist = opSmoothUnion(dist, sdSphere(vec3(p.x+0.20, p.y, p.z), 0.20), 0.01);
            
            dist = opSmoothUnion(dist, sdSphere(vec3(p.x+0.20, p.y-0.2, p.z-0.1), 0.1), 0.01);
            
            dist = opSmoothUnion(dist, sdSphere(vec3(p.x+0.20, p.y-0.2, p.z+0.1), 0.1), 0.01);
            
            dist = opSmoothUnion(dist, sdSphere(vec3(p.x+0.20, p.y-0.2, p.z+0.1), 0.1), 0.01);
            
            dist = opSmoothUnion(dist, sdSphere(vec3(p.x+0.28, p.y-0.25, p.z+0.09), 0.02), 0.01);
            
            dist = opSmoothUnion(dist, sdSphere(vec3(p.x+0.28, p.y-0.25, p.z-0.08), 0.02), 0.01);
            
            dist = opSmoothUnion(dist, sdSphere(vec3(p.x+0.28, p.y-0.15, p.z), 0.05), 0.01);
            
            dist = opSmoothSubtraction(sdSphere(vec3(p.x+0.31, p.y-0.05, p.z-0.15), 0.02), dist , 0.01);
            
            dist = opSmoothSubtraction(sdSphere(vec3(p.x+0.33, p.y-0.03, p.z-0.13), 0.02), dist, 0.01);
            
            dist = opSmoothSubtraction(sdSphere(vec3(p.x+0.35, p.y-0.01, p.z-0.11), 0.02), dist, 0.01);
            
            dist = opSmoothSubtraction(sdSphere(vec3(p.x+0.37, p.y, p.z-0.08), 0.02), dist, 0.01);
            
            dist = opSmoothSubtraction(sdSphere(vec3(p.x+0.38, p.y+0.01, p.z-0.05), 0.02), dist, 0.01);
            
            
        
            return dist;
        }
        
        vec3 shade_progress_bar(vec2 p, vec2 res, float z)
        {
            // have to take account of the aspect ratio
            float xpos = p.x * res.y / res.x;
            
            if (xpos > z - 0.01 && xpos < z + 0.01) return vec3(1.0);
            else return vec3(0.0);
        }

        float map(vec3 p, settings setts)
        {
            return world_sdf(p, iTime, setts);
        }


        vec3 computeNormal(vec3 p, settings setts)
        {
            float h = 1e-4;
            float sdp = world_sdf(p, iTime, setts);
            return normalize(vec3(world_sdf(p + vec3(h, 0, 0), iTime, setts) - sdp,
                                world_sdf(p + vec3(0, h, 0), iTime, setts) - sdp,
                                world_sdf(p + vec3(0, 0, h), iTime, setts) - sdp));

            
        }

        bool sphere_tracing(ray r,
                            int max_iter,
                            settings setts,
                            out vec3 hit_loc,
                            out int iters)
        {
            hit_loc = r.origin + r.direction * (-r.origin.y / r.direction.y);
            iters = 1;
            float t = 0.;
            for (int i = 0; i < max_iter; i++) {
                vec3 p = r.origin + t * r.direction;
                float dist = world_sdf(p, iTime, setts);
                if (dist < EPSILON) {
                    hit_loc = p;
                    iters = i;
                    return true;
                }
                
                t += dist;
                
            }
            
            iters = max_iter;
            return false;
            
        }

        ///////////////////////////////////////////

        vec3 shade(ray r, int iters, settings setts)
        {
            vec3 p = r.origin;
            vec3 d = r.direction;
            
            if (setts.shade_mode == GRID)
            {
                float res = 0.2;
                float one = abs(mod(p.x, res) - res / 2.0);
                float two = abs(mod(p.y, res) - res / 2.0);
                float three = abs(mod(p.z, res) - res / 2.0);
                float interp = min(one, min(two, three)) / res;
                
                return mix( vec3(0.2, 0.5, 1.0), vec3(0.1, 0.1, 0.1), smoothstep(0.0,0.05,abs(interp)) );
            }
            else if (setts.shade_mode == COST)
            {
                return vec3(float(iters) / float(cost_norm));
            }
            else if (setts.shade_mode == NORMAL)
            {
                vec3 normal = computeNormal(p, setts);
                vec3 white = vec3(1., 1., 1.);
                return (normal + white) / 2.;

            }
            else if (setts.shade_mode == DIFFUSE_POINT)
            {
                vec3 light_pos = vec3(0.0, 5.0, 0.0);
                vec3 light_intensity = vec3(5.0);
                vec3 surface_color = vec3(0.5);
                
                vec3 lightDirection = normalize(light_pos - p);
                vec3 normal = computeNormal(p, setts);
                vec3 Li = light_intensity / pow(distance(light_pos, p), 2.0);
                return surface_color * max(0.0, dot(normal, lightDirection)) * Li;
            }
            else if (setts.shade_mode == ENVIRONMENT_MAP)
            {
                vec3 normal = computeNormal(p, setts);
                vec3 reflection = reflect(d, normal);
                //return vec3(texture(iChannel0, reflection));
            }
            else
            {
                return vec3(0.0);
            }
            
            return vec3(0.0);
        }


        vec3 render(settings setts, vec2 fragCoord)
        {
            vec2 p = (2.0*fragCoord-iResolution.xy)/iResolution.y;
            
            if (p.y < -0.95)
            {
                float val = cos(iTime * anim_speed);
                return shade_progress_bar(p, iResolution.xy, val);
            }
            
            float aspect = iResolution.x / iResolution.y;
            vec2 uv = fragCoord/iResolution.xy - 0.5;
            uv.x *= aspect;
        
            
            // Rotate the camera
            vec3 eye = vec3(-3.0*cos(iTime*0.2), 2.0 + 0.5*sin(iTime*0.1), -3.0*sin(iTime*0.2));
            vec3 dir = vec3(0.0, 0.0, 0.0) - eye;
            vec3 up = vec3(0, 1, 0);
            
            
            float focal_length = 2.;
            
            vec3 u,v,w;
            compute_camera_frame(dir, up, u, v, w);
            
            ray r;
            switch(projection_func) {
                case PROJECTION_ORTHOGRAPHIC:
                    r = generate_ray_orthographic(uv, eye, u, v, w);
                    break;
            
                case PROJECTION_PERSPECTIVE:
                    r = generate_ray_perspective(uv, eye, u, v, w, focal_length);
                    break;
            }
            
            
            int max_iter = 1000;
            
            vec3 col = vec3(0.0);
            
            vec3 hit_loc;
            int iters;
            bool hit;
            
            if (sphere_tracing(r, max_iter, setts, hit_loc, iters))
            {
                r.origin = hit_loc;
                col = shade(r, iters, setts);
            }
            

            
            return pow(col, vec3(1.0 / 2.2));
        }

        void mainImage(out vec4 fragColor, in vec2 fragCoord)
        {
            gl_fragColor = vec4(render(render_settings, fragCoord), 1.0);
        }
    `;

    const uniforms = {
        iTime: { value: 0 },
        iResolution:  { value: new THREE.Vector3() },
    };
    const material_one = new THREE.ShaderMaterial({
        fragmentShader,
        uniforms,
        });

    const geometry_one = new THREE.SphereGeometry(100, 64, 32);
    

    const plane_one =  new THREE.Mesh(geometry_one, material_one);
    scene.add( plane_one );
    plane_one.position.y = 10;

    //const controls = new THREE.OrbitControls(camera);
    // controls.enableZoom = false;
    // controls.enableDamping = true;

    // const tick = () => {
    //     renderer.render(scene, camera);
    //     window.requestAnimationFrame(tick);
    //     controls.update();
    // };
    


    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
        renderer.setSize(width, height, false);
        }
        return needResize;
    }

    function render() {
        time *= 0.001;  // convert to seconds

        resizeRendererToDisplaySize(renderer);

        const canvas = renderer.domElement;
        uniforms.iResolution.value.set(canvas.width, canvas.height, 1);
        uniforms.iTime.value = time;

        renderer.render(scene, camera);

        requestAnimationFrame(render);
    }

requestAnimationFrame(render);
}

function setLight() {
    light = new THREE.AmbientLight(0xffffff); // soft white light
    scene.add(light);
}

function loadGLTF() {
    var sceneLoader = new THREE.GLTFLoader();

    sceneLoader.load('./the_room.gltf', (gltf) => {
        Mesh = gltf.scene;
        Mesh.scale.set(0.9,0.9,0.9);
        scene.add(Mesh);
        Mesh.position.x = -0.7;
        Mesh.position.y = 6.5;
        Mesh.position.z = 4;
        Mesh.rotation.y -=4.7;
        
    });
    
}
function animate() {
    requestAnimationFrame(animate);
    const geometry_two = new THREE.PlaneGeometry( 10,  10);
    
    const material_two = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
    const plane_two = new THREE.Mesh( geometry_two, material_two );
    scene.add( plane_two );
    plane_two.position.y = 10;
    if (Mesh && Mesh.rotation) {
        camera.rotation.y -= 0.1;
    }
    renderer.render(scene, camera);
}

init();
setLight();
loadGLTF();
animate();
// tick();