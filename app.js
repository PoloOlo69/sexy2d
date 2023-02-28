//
// GLOBAL ARRAY FOR VERTICES AND COLORS AND POINTSIZE
//
let vertices = 0;
let pointsize = 10;
let vArray = [], cArray = [];
let vBuffer, cBuffer, tBuffer;
//
// GLOBAL OPENGL OBJECTS
//
let canvas;
let gl;
let shader;
//
// GLOBAL VARIABLES FOR MOUSE TRACKING
//
let prevClientX;
let prevClientY;
let now;
let then;
let frametime = 0;
let counter = 0;
let fps = 0;
/** INITIALIZE WEBGL **/
window.onload = () =>
{

    // OBTAIN CANVAS
    canvas = document.querySelector( '#canvas' );

    // ERROR HANDLING
    gl = canvas.getContext( 'webgl2' );
    if( gl === null ) {
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

    // CREATE SHADER AND USE SHADER PROGRAM
    shader = initShader( vshadersource, fshadersource );
    gl.useProgram( shader.program );
    gl.depthFunc( gl.LEQUAL );

    // CREATE OPENGL BUFFERS
    vBuffer = gl.createBuffer( );
    cBuffer = gl.createBuffer( );

    // SET TIME
    then = Date.now() / 1000;

    // PUSH BUFFERS TO GPU
    updateBuffers( );

    // RENDER LOOP
    render();
}

//
// MAIN RENDER LOOP
//
function render( ) {
    // CLEAR CANVAS
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    // DRAW SCENE
    gl.drawArrays( gl.POINTS, 0, vertices );
    // UPDATE BUFFERS
    renderTime();
    requestAnimFrame( render );
}

//
// STES TIME DELTA BETWEEN CURRENT LAST AND CURRENT FRAME
//
function renderTime(){

    now = Date.now() / 1000;

    frametime = now - then;
    fps =  1 / frametime;
    then = now;

    if( ++counter >= 20 ){
        document.getElementById("frametime").innerHTML = 'frametime: ~'+ frametime.toFixed(4) +'s';
        document.getElementById("fps").innerHTML = 'frames: ~'+fps.toFixed()+'/s';
        counter = 0;
    }

    updateFrametime();

}

//
// MOUSE EVENT LISTENERS
// DRAWS NEW VERTEX AT MOUSE POSITION WHILE HOLDING LMB
//
let mouseDown = false;
window.addEventListener('mousedown', (e) => {
    if ( e.button === 0 && e.target === canvas ) { // LMB
        mouseDown = true;
        const ndc = getNormalDeviceCoords( e );
        addXYZVertex( [ndc.x, ndc.y, 0]);
        updateBuffers();
    }
});
window.addEventListener('mousemove', (e) => {
    if ( mouseDown && e.target === canvas ) {
        const ndc = getNormalDeviceCoords( e );
        addXYZVertex( [ndc.x, ndc.y, 0] );
        updateBuffers();
    }
});
window.addEventListener('mouseup', (e) => {
    if ( e.button === 0 ) { // LMB
        mouseDown = false;
    }
});
///
///
///

//
// ACCEPTS GL CONTEXT
// RETURNS COMPILED AND LINKED SHADER PROGRAM
//
function initShader( vshadersource, fshadersource ) {

    // COMPILE THE SOURCE CODE
    const vshader = compileShader( gl.VERTEX_SHADER, vshadersource );
    const fshader = compileShader( gl.FRAGMENT_SHADER, fshadersource );
    // CREATE WEBGL SHADER PROGRAM
    const shader = gl.createProgram();
    // ATTACH COMPILED SHADERS AND LINK TO CONTEXT
    gl.attachShader( shader, vshader );
    gl.attachShader( shader, fshader );
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
            vpos: gl.getAttribLocation( shader, 'a_vertex_position' ),
            vcol: gl.getAttribLocation( shader, 'a_vertex_color' ),
            size: gl.getUniformLocation( shader, 'u_point_size' ),
            time: gl.getUniformLocation( shader, 'u_time' ),
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

//
// PUSHES BUFFERS TO WEBGL
//
function updateBuffers( ) {

    //
    //   UNIFOMRS
    //
    {
        updatePointSize( );
        updateFrametime( );
    }
    //
    // ATTRIBUTES
    //
    {

        // SELECT BUFFER
        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
        gl.enableVertexAttribArray( shader.pointers.vpos );
        // FILL THE LAST BOUND BUFFER WITH DATA
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(vArray), gl.STATIC_DRAW );
        // SPECIFY THE DATA LAYOUT OF THE LAST BOUND BUFFER
        gl.vertexAttribPointer(
            shader.pointers.vpos,
            3,
            gl.FLOAT,
            false,
            0,
            0
        )

        gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
        gl.enableVertexAttribArray( shader.pointers.vcol );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(cArray), gl.STATIC_DRAW );
        gl.vertexAttribPointer(
            shader.pointers.vcol,
            4,
            gl.FLOAT,
            false,
            0,
            0
        )

        // gl.vertexAttrib1f()
        //
        // gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer );
        // gl.bufferData( (gl.ARRAY_BUFFER, new Float32Array(tArray), gl))
    }
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

//
// ADDS A VERTEX AT XYZ WITH RGBA COLOR
//
function addVertex( xyz, rgba ){
    vArray.push(xyz[0],xyz[1],xyz[2]);
    cArray.push(rgba[0],rgba[1],rgba[2],rgba[3]);
    vertices += 1;
}

//
// ADDS A VERTEX AT XYZ WITH RANDOM COLOR
//
function addXYZVertex( xyz ) {
    addVertex( xyz, [rand(),rand(),rand(),1.0] );
}

//
// Random Number [0,1]
//
function rand( ) {
    return Math.random( );
}

//
// Random Number [-1,1]
//
function randi( ) {
    return Math.random( ) * 2 - 1;
}

function updatePointSize( ){
    gl.uniform1f( shader.pointers.size, pointsize );
}

//
// SETS UNIFORM FRAMETIME INSIDE SHADER
//
function updateFrametime( ){
    gl.uniform1f( shader.pointers.time, frametime );
}