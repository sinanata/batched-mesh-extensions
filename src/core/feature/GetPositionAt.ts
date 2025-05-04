import { BatchedMesh, Vector3 } from 'three';

declare module 'three' {
  interface BatchedMesh {
    /**
     * Retrieves the position of a specific instance.
     * @param index The index of the instance.
     * @param target Optional `Vector3` to store the result.
     * @returns The position of the instance as a `Vector3`.
     */
    getPositionAt(index: number, target?: Vector3): Vector3;
  }
}

const _position = new Vector3();

BatchedMesh.prototype.getPositionAt = function (index: number, target = _position): Vector3 {
  const offset = index * 16;
  const array = this._matricesTexture.image.data as any;

  target.x = array[offset + 12];
  target.y = array[offset + 13];
  target.z = array[offset + 14];

  return target;
};
