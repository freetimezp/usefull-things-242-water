export const simulationVertexShader = `
    varying vec2 vUv;
    
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const simulationFragmentShader = `
    uniform sampler2D textureA;
    uniform vec2 mouse;
    uniform vec2 resolution;
    uniform float time;
    uniform int frame;
    varying vec2 vUv;

    const float delta = 1.4;

    void main() {
        vec2 uv = vUv;
        
        // Initialize on first frame
        if(frame == 0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }

        // Sample current data (pressure, velocity)
        vec4 data = texture2D(textureA, uv);
        float pressure = data.x;
        float pVel = data.y;

        // Sample neighboring pressure values
        vec2 texelSize = 1.0 / resolution;
        float p_right = texture2D(textureA, uv + vec2(texelSize.x, 0.0)).x;
        float p_left = texture2D(textureA, uv - vec2(texelSize.x, 0.0)).x;
        float p_up = texture2D(textureA, uv + vec2(0.0, texelSize.y)).x;
        float p_down = texture2D(textureA, uv - vec2(0.0, texelSize.y)).x;

        // Boundary conditions - reflect at edges
        if(uv.x <= texelSize.x) p_left = p_right;
        if(uv.x >= 1.0 - texelSize.x) p_right = p_left;
        if(uv.y <= texelSize.y) p_down = p_up;
        if(uv.y >= 1.0 - texelSize.y) p_up = p_down;

        // Wave equation - acceleration based on pressure gradient
        pVel += delta * (-2.0 * pressure + p_right + p_left) / 4.0;
        pVel += delta * (-2.0 * pressure + p_up + p_down) / 4.0;

        // Update pressure based on velocity
        pressure += delta * pVel;

        // Damping - reduces oscillations over time
        pVel -= 0.005 * delta * pressure;

        // Friction - reduces velocity
        pVel *= 1.0 - 0.002 * delta;
        pressure *= 0.999;

        // Mouse interaction - add ripples
        vec2 mouseUV = mouse / resolution;

        if(mouse.x > 0.0) {
            float dist = distance(uv, mouseUV);
            
            if(dist <= 0.02) {
                pressure += 2.0 * (1.0 - dist / 0.02);
            }
        }

        // Store: pressure, velocity, horizontal gradient, vertical gradient
        gl_FragColor = vec4(
            pressure, 
            pVel, 
            (p_right - p_left) / 2.0, 
            (p_up - p_down) / 2.0
        );
    }
`;

export const renderVertexShader = `
    varying vec2 vUv;
    
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const renderFragmentShader = `
    uniform sampler2D textureA;
    uniform sampler2D textureB;
    varying vec2 vUv;

    void main() {
        // Sample wave simulation data
        vec4 data = texture2D(textureA, vUv);
        
        // Use pressure gradients for distortion
        vec2 distortion = 0.3 * data.zw;
        vec4 color = texture2D(textureB, vUv + distortion);
        
        // Create normal from gradients for lighting
        vec3 normal = normalize(vec3(-data.z * 2.0, 0.5, -data.w * 2.0));
        vec3 lightDir = normalize(vec3(-3.0, 10.0, 3.0));
        
        // Calculate specular highlight
        float specular = pow(max(0.0, dot(normal, lightDir)), 60.0) * 1.5;
        
        gl_FragColor = color + vec4(specular, specular, specular, 0.0);
    }
`;
