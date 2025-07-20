import { BatchedMesh } from 'three';
import { getUniformAt, initUniformsPerInstance, setUniformAt } from '../core/feature/Uniforms.js';
import { extendBatchedMeshPrototypeCommon } from './ExtendBatchedMeshPrototype.common.js';
import { initSkinnedMeshes, setBonesAt, _multiplyBoneMatricesAt } from '../core/feature/Skeleton.js';

/**
 * Enhances the BatchedMesh prototype with additional methods.
 */
export function extendBatchedMeshPrototype(): void {
  extendBatchedMeshPrototypeCommon();

  BatchedMesh.prototype.getUniformAt = getUniformAt;
  BatchedMesh.prototype.setUniformAt = setUniformAt;
  BatchedMesh.prototype.initUniformsPerInstance = initUniformsPerInstance;
  BatchedMesh.prototype.initSkinnedMeshes = initSkinnedMeshes;
  BatchedMesh.prototype.setBonesAt = setBonesAt;
  BatchedMesh.prototype._multiplyBoneMatricesAt = _multiplyBoneMatricesAt;
}
