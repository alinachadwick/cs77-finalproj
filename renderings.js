// const renderer = new THREE.WebGLRenderer();
// const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000);
// const scene = new THREE.Scene();
// const canvas = document.querySelector('scene_canvas');
// var Mesh;
// var light;


var VertexSource = `
    uniform vec2 Offset;
    
    attribute vec2 Position;

    varying vec2 Coord;
    
    void main() {
        Coord = Position;
        gl_Position = vec4(Position, 0.0, 1.0);
    }
`;
var FragmentSource = `
    precision highp float;

    varying vec2 Coord;
    
    void main() {
        gl_FragColor = vec4(Coord + 0.5, 0., 1.);
    }
`;

function createShaderObject(gl, shaderSource, shaderType) {
    // Create a shader object of the requested type
    var shaderObject = gl.createShader(shaderType);
    // Pass the source code to the shader object
    gl.shaderSource(shaderObject, shaderSource);
    // Compile the shader
    gl.compileShader(shaderObject);
    
    // Check if there were any compile errors
    if (!gl.getShaderParameter(shaderObject, gl.COMPILE_STATUS)) {
        // If so, get the error and output some diagnostic info
        // Add some line numbers for convenience
        var lines = shaderSource.split("\n");
        for (var i = 0; i < lines.length; ++i)
            lines[i] = ("   " + (i + 1)).slice(-4) + " | " + lines[i];
        shaderSource = lines.join("\n");
    
        throw new Error(
            (shaderType == gl.FRAGMENT_SHADER ? "Fragment" : "Vertex") + " shader compilation error for shader '" + name + "':\n\n    " +
            gl.getShaderInfoLog(shaderObject).split("\n").join("\n    ") +
            "\nThe shader source code was:\n\n" +
            shaderSource);
    }
    
    return shaderObject;
}

function createShaderProgram(gl, vertexSource, fragmentSource) {
    // Create shader objects for vertex and fragment shader
    var   vertexShader = createShaderObject(gl,   vertexSource, gl.  VERTEX_SHADER);
    var fragmentShader = createShaderObject(gl, fragmentSource, gl.FRAGMENT_SHADER);
    
    // Create a shader program
    var program = gl.createProgram();
    // Attach the vertex and fragment shader to the program
    gl.attachShader(program,   vertexShader);
    gl.attachShader(program, fragmentShader);
    // Link the shaders together into a program
    gl.linkProgram(program);
    
    return program;
}

function createVertexBuffer(gl, vertexData) {
    // Create a buffer
    var vbo = gl.createBuffer();
    // Bind it to the ARRAY_BUFFER target
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    // Copy the vertex data into the buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);
    // Return created buffer
    return vbo;
}
function createIndexBuffer(gl, indexData) {
    // Create a buffer
    var ibo = gl.createBuffer();
    // Bind it to the ELEMENT_ARRAY_BUFFER target
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    // Copy the index data into the buffer
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
    // Return created buffer
    return ibo;
}

// Basic class to render a mesh with OpenGL
var TriangleMesh = function(gl, vertexPositions, indices, vertexSource, fragmentSource) {
    // Create OpenGL buffers for the vertex and index data of the triangle mesh
    this.positionVbo = createVertexBuffer(gl, vertexPositions);
    this.indexIbo = createIndexBuffer(gl, indices);
    
    // Create the shader program that will render the mesh
    this.shaderProgram = createShaderProgram(gl, vertexSource, fragmentSource);
    
    // Store the number of indices for later
    this.indexCount = indices.length;
}

TriangleMesh.prototype.render = function(gl, offset) {
    // Bind shader program
    gl.useProgram(this.shaderProgram);
    // Pass vector to shader uniform
    gl.uniform2fv(gl.getUniformLocation(this.shaderProgram, "Offset"), offset); 
    
    // Bind the two buffers with our mesh data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionVbo);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexIbo);
    
    // OpenGL boiler plate: link shader attribute and buffer correctly
    var positionAttrib = gl.getAttribLocation(this.shaderProgram, "Position");
    if (positionAttrib >= 0) {
        gl.enableVertexAttribArray(positionAttrib);
        gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);
    }
    
    // Draw the mesh!
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
}

var MeshOne = function(canvas, gl)
{
    var vertexPositions = [
        -1, -1,
        1., 1, 
        1, -1,
        -1, 1
    ];

    var vertexIdx = [
        0, 1, 2,
        0, 3, 1
    ];

    this.mesh1 = new TriangleMesh(gl, vertexPositions, vertexIdx, VertexSource, FragmentSource);

    this.cameraAngle = 0;
}

MeshOne.prototype.render = function(canvas, gl, w, h)
{
    var time = Date.now()/1000;
    
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var offset = [0,0];

    this.mesh1.render(gl, offset);
}

MeshOne.prototype.dragCamera = function(dy)
{
    this.cameraAngle = Math.min(Math.max(this.cameraAngle - dy*0.5, -90), 90);
}



// function init() {
//     scene.background = new THREE.Color('white');
//     camera.position.set(0, 10, 20);
//     renderer.setSize(window.innerWidth, window.innerHeight);
//     renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
//     document.body.appendChild(renderer.domElement);
    

//     const uniforms = {
//         iTime: { value: 0 },
//         iResolution:  { value: new THREE.Vector3() },
//     };
//     const material_one = new THREE.ShaderMaterial({
//         fragmentShader,
//         uniforms,
//     });

//     const geometry_one = new THREE.SphereGeometry(100, 64, 32);
    

//     const plane_one =  new THREE.Mesh(geometry_one, material_one);
//     scene.add( plane_one );
//     plane_one.position.y = 10;

//     const controls = new OrbitControls(camera, renderer);
//     // controls.enableZoom = false;
//     // controls.enableDamping = true;

//     // const tick = () => {
//     //     renderer.render(scene, camera);
//     //     window.requestAnimationFrame(tick);
//     //     controls.update();
//     // };
    


//     function resizeRendererToDisplaySize(renderer) {
//         const canvas = renderer.domElement;
//         const width = canvas.clientWidth;
//         const height = canvas.clientHeight;
//         const needResize = canvas.width !== width || canvas.height !== height;
//         if (needResize) {
//         renderer.setSize(width, height, false);
//         }
//         return needResize;
//     }

//     function render() {
//         time *= 0.001;  // convert to seconds

//         resizeRendererToDisplaySize(renderer);

//         const canvas = renderer.domElement;
//         uniforms.iResolution.value.set(canvas.width, canvas.height, 1);
//         uniforms.iTime.value = time;

//         renderer.render(scene, camera);

//         requestAnimationFrame(render);
//     }

// requestAnimationFrame(render);
// }

// function setLight() {
//     light = new THREE.AmbientLight(0xffffff); // soft white light
//     scene.add(light);
// }

// function loadGLTF() {
//     var sceneLoader = new THREE.GLTFLoader();

//     sceneLoader.load('./the_room.gltf', (gltf) => {
//         Mesh = gltf.scene;
//         Mesh.scale.set(0.9,0.9,0.9);
//         scene.add(Mesh);
//         Mesh.position.x = -0.7;
//         Mesh.position.y = 6.5;
//         Mesh.position.z = 4;
//         Mesh.rotation.y -=4.7;
        
//     });
    
// }
// function animate() {
//     requestAnimationFrame(animate);
//     const geometry_two = new THREE.PlaneGeometry( 10,  10);
    
//     const material_two = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
//     const plane_two = new THREE.Mesh( geometry_two, material_two );
//     scene.add( plane_two );
//     plane_two.position.y = 10;
//     if (Mesh && Mesh.rotation) {
//         //camera.rotation.y -= 0.1;
//     }
//     renderer.render(scene, camera);
// }

// init();
// setLight();
// loadGLTF();
// animate();
// // tick();