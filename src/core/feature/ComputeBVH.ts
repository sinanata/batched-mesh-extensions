import { BatchedMesh } from 'three';
import { BatchedMeshBVH } from '../utils/BatchedMeshBVH.js';

/**
 * Parameters for configuring the BVH (Bounding Volume Hierarchy).
 */
export interface BVHParams {
  /**
   * Margin applied to accommodate animated or moving objects.
   * Improves BVH update performance but slows down frustum culling and raycasting.
   * For static objects, set to 0 to optimize culling and raycasting efficiency.
   * @default 0
   */
  margin?: number;
  /**
   * Enables accurate frustum culling by checking intersections without applying margin to the bounding box.
   * @default true
   */
  accurateCulling?: boolean;
}

declare module 'three' {
  interface BatchedMesh {
    /**
     * BVH structure for optimized culling and intersection testing.
     * It's possible to create the BVH using the `computeBVH` method. Once created it will be updated automatically.
     */
    bvh: BatchedMeshBVH;
    /**
     * Retrieves the position of a specific instance.
     * @param index The index of the instance.
     * @param target Optional `Vector3` to store the result.
     * @returns The position of the instance as a `Vector3`.
     */
    computeBVH(config?: BVHParams): void;
  }
}

BatchedMesh.prototype.computeBVH = function (config: BVHParams = {}): void {
  this.bvh = new BatchedMeshBVH(this, config.margin, config.accurateCulling);
  this.bvh.create();
  // this.geometry.computeBoundingBox(); // TODO
  // this.geometry.computeBoundingSphere();
};
