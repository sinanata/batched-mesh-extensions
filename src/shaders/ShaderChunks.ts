import { ShaderChunk } from 'three';

const instanced_skinning_pars_vertex = /* glsl */`
#ifdef USE_SKINNING

    uniform mat4 bindMatrix;
    uniform mat4 bindMatrixInverse;

    #ifdef USE_INSTANCING_SKINNING

        uniform highp sampler2D boneTexture;
        uniform int bonesPerInstance;

        mat4 getBoneMatrix( const in float i ) {

            int size = textureSize( boneTexture, 0 ).x;
            int j = ( bonesPerInstance * int( batchIndex ) + int( i ) ) * 4;
            int x = j % size;
            int y = j / size;
            vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
            vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
            vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
            vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
            return mat4( v1, v2, v3, v4 );

        }

    #else

    uniform highp sampler2D boneTexture;

    mat4 getBoneMatrix( const in float i ) {

        int j = int( i ) * 4;
        int x = j % textureSize( boneTexture, 0 ).x;
        int y = j / textureSize( boneTexture, 0 ).x;
        vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
        vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
        vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
            vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
            return mat4( v1, v2, v3, v4 );

        }

    #endif

#endif

`;

ShaderChunk.skinning_pars_vertex = instanced_skinning_pars_vertex;
