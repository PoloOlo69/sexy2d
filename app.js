//
// GLOBAL ARRAY FOR VERTICES, COLORS AND POINTSIZE
//
let vertices = 0;
let pointsize = 10;
let vBufferData = [], cBufferData = [];
let vFeedbackData = [], cFeedback = [];
let vBuffer, cBuffer, tBuffer;
let vFeedback, cFeedbackBuffer;

//
// GLOBAL OPENGL OBJECTS
//
let canvas;
let gl;
let shader;

//
// GLOBAL TIMER
//
let now, then;


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

    // RESIZE CANVAS
    fullscreen();

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

    // SET TIME
    now = then = performance.now() / 1000;

    // CREATE OPENGL BUFFERS
    initBuffers();

    // RENDER LOOP
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

    gl.bindBufferBase( gl.TRANSFORM_FEEDBACK_BUFFER, 0, vFeedback );
    gl.beginTransformFeedback( gl.POINTS );

    gl.drawArrays( gl.POINTS, 0, vertices );

    gl.endTransformFeedback();
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);

    // getBufferContents(vBuffer);
    // getBufferContents(vFeedback);

    requestAnimFrame( render );
}

//-- BIG SHOUT OUT TO MR ANDREW ADAMSON REALLY HELPED ME TO GRASP HOW TO WEBGL --//
// !!!! https://www.youtube.com/watch?v=ro4bDXcISms !!!!
const getBufferContents = (buffer) => {
    // Consider this `sync` object as a flag. It will be dropped
    // into WebGL's instruction pipeline. When WebGL reaches
    // this sync object, it will set its status two one of FOUR
    // values.
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);

    const checkStatus = () => {
        // Get the status
        const status = gl.clientWaitSync(sync, gl.SYNC_FLUSH_COMMANDS_BIT, 0);

        if (status === gl.TIMEOUT_EXPIRED) {
            console.log('GPU is still busy. Let\'s wait some more.');
            setTimeout(checkStatus);
        } else if (status === gl.WAIT_FAILED) {
            console.error('Something bad happened and we won\'t get any response.');
        } else  {
            // This code will be reached if the status is either
            // CONDITION_SATISFIED or SIGNALED_ALREADY. We don't
            // really care which status it is as long as one of
            // these was found. So we can safely read the buffer data
            // (assuming another draw call hasn't initiated more
            // changes....)
            const view = new Float32Array(vertices*3);
            gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, buffer);
            gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, view);
            gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null);
            console.log(view);
        }
    };

    setTimeout(checkStatus);
};

//
// UPDATES UNIFORMS AND HANDLES FEEDBACK
//
function update( ){

}

//
// SETS TIME DELTA BETWEEN CURRENT LAST AND CURRENT FRAME
//
let frametime = 0,
    fps = 0,
    counter = 0;
function renderTime(){

    now = performance.now() / 1000;

    // SAME AS getuniform1f BUT DESIGNED TO BE CALLED FREQUENTLY
    gl.vertexAttrib1f( shader.pointers.time, now );

    frametime = now - then;
    fps =  1 / frametime;
    then = now;

    if( ++counter >= 20 ){
        document.getElementById("frametime").innerHTML = 'frametime: ~'+ frametime.toFixed(4) +'s';
        document.getElementById("fps").innerHTML = 'frames: ~'+fps.toFixed()+'/s';
        counter = 0;
    }

}

//
// MOUSE EVENT LISTENERS
// DRAWS NEW VERTEX AT MOUSE POSITION WHILE HOLDING LMB
//
let mouseDown = false;
window.addEventListener('mousedown', e => {
    if ( e.button === 0 && e.target === canvas ) { // LMB
        mouseDown = true;
        const ndc = getNormalDeviceCoords( e );
        addXYZVertex( [ndc.x, ndc.y, 0]);
        updateBuffers();
    }
});
window.addEventListener('mousemove', e => {
    if ( mouseDown && e.target === canvas ) {
        const ndc = getNormalDeviceCoords( e );
        addXYZVertex( [ndc.x, ndc.y, 0] );
        updateBuffers();
    }
});
window.addEventListener('mouseup', e => {
    if ( e.button === 0 ) { // LMB
        mouseDown = false;
    }
});

window.addEventListener('resize', () => {
    fullscreen();
})
//
// SET CANVAS SIZE
//
function resize( w,h ) {
    canvas.width  = w;
    canvas.height = h;
    gl.viewport( 0, 0, w, h );
}
//
// FITS CANVAS TO VIEWPORT
//
function fullscreen( ) {
    resize( window.innerWidth, window.innerHeight )
}

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
            apos: gl.getAttribLocation( shader, 'a_vertex_position' ),
            acol: gl.getAttribLocation( shader, 'a_vertex_color' ),
            size: gl.getUniformLocation( shader, 'u_point_size' ),
            time: gl.getUniformLocation( shader, 'u_time' )
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

function initBuffers() {

    gl.uniform1f( shader.pointers.size, pointsize );
    gl.uniform1f( shader.pointers.time, now );

    {
        // CREATE BUFFER
        vBuffer = gl.createBuffer( );
        // SELECT WHICH BUFFER TO USE
        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
        // FILL BOUND BUFFER WITH DATA
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(vBufferData), gl.STATIC_DRAW );
        // SPECIFY DATA LAYOUT
        gl.vertexAttribPointer( shader.pointers.apos,3, gl.FLOAT, false, 0, 0) ;
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
        vFeedback = gl.createBuffer( );
        // SELECT BUFFER
        gl.bindBuffer( gl.ARRAY_BUFFER, vFeedback );
        // FILL WITH DATA
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(vFeedbackData), gl.STATIC_DRAW );
    }

    gl.bindBuffer( gl.ARRAY_BUFFER, null);


}
//
// PUSHES BUFFERS TO WEBGL
//
function updateBuffers( ) {

        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(vBufferData), gl.STATIC_DRAW );

        gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(cBufferData), gl.STATIC_DRAW );
        // gl.bufferSubData( gl.ARRAY_BUFFER, vertices, new Float32Array(cBufferData),0 , cBufferData.length );
        gl.bindBuffer( gl.ARRAY_BUFFER, vFeedback );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(vFeedbackData), gl.STATIC_DRAW );

        gl.bindBuffer( gl.ARRAY_BUFFER, null);

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
    vBufferData.push(xyz[0],xyz[1],xyz[2]);
    cBufferData.push(rgba[0],rgba[1],rgba[2],rgba[3]);
    vFeedbackData.push(xyz[0],xyz[1],xyz[2]);
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

