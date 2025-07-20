import { BatchedMesh, WebGLProgramParametersWithUniforms, WebGLRenderer } from 'three';

export function patchBatchedMeshMaterial(batchedMesh: BatchedMesh): void {
  const material = batchedMesh.material;
  if ((material as any).isPatchedForUberMesh) return;
  (material as any).isPatchedForUberMesh = true;

  const onBeforeCompileBase = material.onBeforeCompile.bind(material);

  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer: WebGLRenderer): void => {
    let vertexDeclarations = '';
    let vertexMain = '';
    let fragmentDeclarations = '';
    let fragmentMain = '';

    if (batchedMesh.uniformsTexture || batchedMesh.boneTexture) {
      vertexDeclarations += `
        float batchIndex;
      `;
      vertexMain += `
        batchIndex = getIndirectIndex( gl_DrawID );
      `;
    }

    if (batchedMesh.uniformsTexture) {
      shader.uniforms.uniformsTexture = { value: batchedMesh.uniformsTexture };
      const { vertex, fragment } = batchedMesh.uniformsTexture.getUniformsGLSL('uniformsTexture', 'batchIndex', 'float');

      vertexDeclarations += vertex.declarations;
      vertexMain += vertex.main;
      fragmentDeclarations += fragment.declarations;
      fragmentMain += fragment.main;
    }

    if (batchedMesh.boneTexture) {
      shader.defines = shader.defines ?? {};
      shader.defines['USE_SKINNING'] = '';
      shader.defines['USE_INSTANCING_SKINNING'] = '';
      shader.uniforms.bindMatrix = { value: batchedMesh.bindMatrix };
      shader.uniforms.bindMatrixInverse = { value: batchedMesh.bindMatrixInverse };
      shader.uniforms.bonesPerInstance = { value: batchedMesh.maxBonesPerInstance };
      shader.uniforms.boneTexture = { value: batchedMesh.boneTexture };
    }

    shader.vertexShader = `
      ${vertexDeclarations}
      ${shader.vertexShader}
    `;
    shader.fragmentShader = `
      ${fragmentDeclarations}
      ${shader.fragmentShader}
    `;

    shader.vertexShader = shader.vertexShader.replace('void main() {', `void main() {\n${vertexMain}`);
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', `void main() {\n${fragmentMain}`);

    onBeforeCompileBase(shader, renderer);
  };
}
