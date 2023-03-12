//
// GLOBAL ARRAY FOR VERTICES, COLORS AND POINTSIZE
//
let vertices;
let pointSize;
let vBufferData;
let cBufferData;
let fBufferData;
//
// GLOBAL OPENGL OBJECTS
//
let vBuffer;
let cBuffer;
let fBuffer;
let canvas;
let shader;
let vbo;
let fbo;
let gl;

//
// GLOBAL TIMER
//
let now;
let then;
let fps;
let counter;
let frametime;

/** INITIALIZE WEBGL **/
window.onload = () =>
{

    // SETUP CANVAS
    canvas = document.querySelector( '#canvas' );

    // SETUP GL CONTEXT
    gl = canvas.getContext( 'webgl2' );
    if( !gl ) {
        alert( 'error: Unable to initialize WebGL! Your browser or device may not be supported.' );
        return null;
    }

    // SET COLOR_BUFFER_BIT
    gl.clearColor( 0.8,0.8,0.8,0.95 );

    // CLEAR CANVAS COLOR BUFFER
    gl.clear( gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT );

    // OBTAIN SHADER SOURCE CODE
    const vshadersource = document.querySelector( '#vshader' ).textContent;
    const fshadersource = document.querySelector( '#fshader' ).textContent;

    // SETUP SHADER SHADER PROGRAM
    shader = initShader( vshadersource, fshadersource );
    gl.useProgram( shader.program );
    gl.depthFunc( gl.LEQUAL );

    // SET TIME
    now = then = performance.now() / 1000;
    counter = frametime = fps = 0;
    // SETUP OPENGL BUFFERS
    setupBuffers();

    updateBuffers();

    // FIT TO VIEWPORT
    resize( );

    // MAIN RENDER LOOP
    render();
}
//
// MAIN RENDER LOOP
//
function render( ) {
    // CLEAR CANVAS
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    // UPDATE BUFFERS
    renderTime();

    gl.bindBufferBase( gl.TRANSFORM_FEEDBACK_BUFFER, 0, fbo );
    gl.bindBuffer( gl.ARRAY_BUFFER, vbo );

    gl.vertexAttribPointer( shader.pointers.apos,4, gl.FLOAT, false, 0, 0) ;
    gl.enableVertexAttribArray( shader.pointers.apos );

    gl.beginTransformFeedback( gl.POINTS );
    gl.drawArrays( gl.POINTS, 0, vertices );
    gl.endTransformFeedback( );

    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.bindBuffer( gl.ARRAY_BUFFER, null);

    vbo===vBuffer? vbo = fBuffer :
        vbo = vBuffer;
    fbo===fBuffer? fbo = vBuffer :
        fbo = fBuffer;

    requestAnimFrame( render );
}

//
// SETS TIME DELTA BETWEEN CURRENT LAST AND CURRENT FRAME
//
function renderTime(){

    now = performance.now() / 1000;

    // SAME AS getuniform1f BUT DESIGNED TO BE CALLED FREQUENTLY
    gl.vertexAttrib1f( shader.pointers.time, now );

    frametime = now - then;
    fps =  1 / frametime;
    then = now;

    if( ++counter >= 20 ){
        document.getElementById("frametime")
            .innerHTML = 'frametime: ~'+ frametime.toFixed(4) +'s';
        document.getElementById("fps")
            .innerHTML = 'frames: ~'+fps.toFixed()+'/s';
        counter = 0;
    }

}

//
// EVENT LISTENERS
//

let mouseDown = false;
window.addEventListener('mousedown', e => {
    if ( e.button === 0 && e.target === canvas ) { // LMB
        mouseDown = true;
        const ndc = getNormalDeviceCoords( e );
        addXYVertex( [ndc.x, ndc.y, 0]);
        updateBuffers();
    }
});
window.addEventListener('touchstart', e => {
    if ( e.button === 0 && e.target === canvas ) { // LMB
        mouseDown = true;
        const ndc = getNormalDeviceCoords( e );
        addXYVertex( [ndc.x, ndc.y, 0]);
        updateBuffers();
    }
});
window.addEventListener('mousemove', e => {
    if ( mouseDown && e.target === canvas ) {
        const ndc = getNormalDeviceCoords( e );
        addXYVertex( [ndc.x, ndc.y] );
        updateBuffers();
    }
});
window.addEventListener('touchmove', e => {
    if ( mouseDown && e.target === canvas ) {
        const ndc = getNormalDeviceCoords( e );
        addXYVertex( [ndc.x, ndc.y] );
        updateBuffers();
    }
});
window.addEventListener('mouseup', e => {
    if ( e.button === 0 ) { // LMB
        mouseDown = false;
    }
});
window.addEventListener('touchend', e => {
    if ( e.button === 0 ) { // LMB
        mouseDown = false;
    }
});
window.addEventListener('resize', () => {
    resize( );
});

//
// RESIZES CANVAS TO PREFERRED SIZE
// FILLS VIEWPORT IF UNDEFINED ARGS
//
function resize( w,h ) {
    canvas.width  = w
        ?? window.innerWidth;
    canvas.height = h
        ?? window.innerHeight;
    gl.viewport( 0, 0, canvas.width, canvas.height );
}

//
// ACCEPTS GL CONTEXT
// RETURNS COMPILED AND LINKED SHADER PROGRAM
//
function initShader( vshadersource, fshadersource ) {

    // CREATE WEBGL SHADER PROGRAM
    const shader = gl.createProgram();
    // COMPILE THE SOURCE CODE
    const vshader = compileShader( gl.VERTEX_SHADER, vshadersource );
    const fshader = compileShader( gl.FRAGMENT_SHADER, fshadersource );
    // ATTACH COMPILED SHADERS AND LINK TO CONTEXT
    gl.attachShader( shader, vshader );
    gl.attachShader( shader, fshader );
    // SPECIFY FEEDBACK VARIABLES THIS CALL HAS TO HAPPEN BEFORE LINKING PROGRAM
    // YOU COULD CALL THIS AT SOME OTHER POINT BUT YOU WOULD HAVE TO RELINK THE PROGRAM
    gl.transformFeedbackVaryings( shader,["position_feedback"], gl.SEPARATE_ATTRIBS);
    gl.linkProgram( shader );
    // ERROR HANDLING
    if ( !gl.getProgramParameter(shader,gl.LINK_STATUS) ) {
        alert( `Unable to initialize the shader program: ${gl.getProgramInfoLog(shader)}` );
        return null;
    }
    // VALIDATE SHADER
    gl.validateProgram(shader);
    if( !gl.getProgramParameter(shader,gl.VALIDATE_STATUS) ) {
        alert( 'error: invalid shader' );
    }

    // RELEASE RESOURCES
    gl.detachShader( shader, vshader );
    gl.detachShader( shader, fshader );
    gl.deleteShader( vshader );
    gl.deleteShader( fshader );

    return {
        program: shader,
        pointers: {
            apos: gl.getAttribLocation( shader, 'a_vertex_position_velocity' ),
            acol: gl.getAttribLocation( shader, 'a_vertex_color' ),
            size: gl.getUniformLocation( shader, 'u_point_size' ),
            time: gl.getUniformLocation( shader, 'u_time' ),
            ures: gl.getUniformLocation( shader, 'u_resolution' )
        }
    };
}

//
// ACCEPTS GL CONTEXT, SHADER TYPE, SHADER SOURCE CODE
// RETURNS COMPILED SHADER OBJECT
//
function compileShader( type, code ) {

    // CREATE SHADER PROGRAM
    const shader = gl.createShader( type );
    // SUPPLY LOGIC
    gl.shaderSource( shader, code );
    // COMPILE
    gl.compileShader( shader );
    // ERROR HANDLING
    if ( !gl.getShaderParameter(shader, gl.COMPILE_STATUS) ) {
        alert(
            `error: ${gl.getShaderInfoLog(shader)}`
        );
        gl.deleteShader( shader );
        return null;
    }

    return shader;
}

function setupBuffers() {

    vertices = 0;
    pointSize = 10;
    vBufferData = [];
    cBufferData = [];
    fBufferData = [];

    // DEMO
    addVertex([0,0], [1.0,0.2,0.5,1.0]);
    addVertex([0.55,0.55], [1.0,0.2,0.5,1.0]);
    addVertex([0.55,-0.55], [1.0,0.2,0.5,1.0]);
    addVertex([-0.55,0.55], [1.0,0.2,0.5,1.0]);
    addVertex([-0.55,-0.55], [1.0,0.2,0.5,1.0]);
    //

    {
        // CREATE BUFFER
        vBuffer = gl.createBuffer( );
        // SELECT WHICH BUFFER TO USE
        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
        // FILL BOUND BUFFER WITH DATA
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(vBufferData), gl.STATIC_DRAW );
        // SPECIFY DATA LAYOUT
        gl.vertexAttribPointer( shader.pointers.apos,4, gl.FLOAT, false, 0, 0) ;
        // "CONNECT" ATTRIBUTE AND BUFFER
        gl.enableVertexAttribArray( shader.pointers.apos );
    }

    gl.bindBuffer( gl.ARRAY_BUFFER, null);

    {
        // CREATE BUFFER
        cBuffer = gl.createBuffer();
        // SELECT WHICH BUFFER TO USE
        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        // FILL WITH DATA
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cBufferData), gl.STATIC_DRAW );
        // SPECIFY DATA LAYOUT
        gl.vertexAttribPointer(shader.pointers.acol,4,gl.FLOAT,false,0, 0);
        // ENABLE ATTRIBUTE
        gl.enableVertexAttribArray(shader.pointers.acol);
    }

    gl.bindBuffer( gl.ARRAY_BUFFER, null);

    {
        // CREATE BUFFER
        fBuffer = gl.createBuffer( );
        // SELECT BUFFER
        gl.bindBuffer( gl.ARRAY_BUFFER, fBuffer );
        // FILL WITH DATA
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(fBufferData), gl.STATIC_DRAW );
        // "CONNECT" ATTRIBUTE AND BUFFER
        gl.vertexAttribPointer( shader.pointers.apos,4, gl.FLOAT, false, 0, 0) ;
        // "CONNECT" ATTRIBUTE AND BUFFER
        gl.enableVertexAttribArray( shader.pointers.apos );
    }

    gl.bindBuffer( gl.ARRAY_BUFFER, null);

    gl.uniform1f( shader.pointers.size, pointSize );
    gl.uniform1f( shader.pointers.time, now );
    gl.uniform2fv( shader.pointers.ures, [canvas.width, canvas.height] );

    vbo = vBuffer;
    fbo = fBuffer;

}
//
// PUSHES BUFFERS TO WEBGL
//
function updateBuffers( ) {

        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(vBufferData), gl.STATIC_DRAW );

        gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(cBufferData), gl.STATIC_DRAW );

        gl.bindBuffer( gl.ARRAY_BUFFER, fBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, 4*4*vertices, gl.STATIC_DRAW );

        gl.bindBuffer( gl.ARRAY_BUFFER, null);

        vbo = vBuffer;
        fbo = fBuffer;
}

//
// RETURNS NORMAL DEVICE COORDINATES NDC FOR OPENGL CANVAS
//
function getNormalDeviceCoords( e ) {
    const rect = e.target.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) / canvas.width * 2 - 1,
        y: (rect.bottom - e.clientY) / canvas.height * 2 - 1
    };
}
const velocity = 0.1 ;
const instances = 13;
//
// ADDS A VERTEX AT XYZ WITH RGBA COLOR
//
function addVertex( xy, rgba ){
    for (let i = 0; i < instances; i++) {
        const alpha = (i / instances) * Math.PI * 2;
        const vx = Math.cos(alpha) * velocity;
        const vy = Math.sin(alpha) * velocity;
        vBufferData.push(xy[0], xy[1], vx, vy);
        cBufferData.push(rgba[0], rgba[1], rgba[2], rgba[3]);
    }
    vertices += instances;
}

//
// ADDS A VERTEX AT XYZ WITH RANDOM COLOR
//
function addXYVertex( xy ) {
    addVertex( xy, [rand(),rand(),rand(),1.0] );
}

//
// Random Number [0,1]
//
function rand( ) { return Math.random( ); }