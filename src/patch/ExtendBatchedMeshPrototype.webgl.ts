import { BatchedMesh } from 'three';
import { getUniformAt, initUniformsPerInstance, setUniformAt } from '../core/feature/Uniforms.js';
import { extendBatchedMeshPrototypeCommon } from './ExtendBatchedMeshPrototype.common.js';

/**
 * Enhances the BatchedMesh prototype with additional methods.
 */
export function extendBatchedMeshPrototype(): void {
  extendBatchedMeshPrototypeCommon();

  BatchedMesh.prototype.getUniformAt = getUniformAt;
  BatchedMesh.prototype.setUniformAt = setUniformAt;
  BatchedMesh.prototype.initUniformsPerInstance = initUniformsPerInstance;
}
