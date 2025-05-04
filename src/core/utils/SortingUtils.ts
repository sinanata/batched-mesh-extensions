import { BatchedMesh } from 'three';
import { radixSort, RadixSortOptions } from 'three/addons/utils/SortUtils.js';
import { MultiDrawRenderItem } from './MultiDrawRenderList.js';

/**
 * Creates a radix sort function specifically for sorting `BatchedMesh` instances.
 * The sorting is based on the `depth` property of each `MultiDrawRenderItem`.
 * This function dynamically adjusts for transparent materials by reversing the sort order if necessary.
 * @param target The `BatchedMesh` instance that contains the instances to be sorted.
 * @returns A radix sort function.
 */
// Reference: https://github.com/mrdoob/three.js/blob/master/examples/webgl_mesh_batch.html#L291
export function createRadixSort(target: BatchedMesh): typeof radixSort<MultiDrawRenderItem> {
  const options: RadixSortOptions<MultiDrawRenderItem> = {
    get: (el) => el.depthSort,
    aux: new Array(target.maxInstanceCount),
    reversed: null
  };

  return function sortFunction(list: MultiDrawRenderItem[]): void {
    options.reversed = target.material.transparent;

    if (target.maxInstanceCount > options.aux.length) {
      options.aux.length = target.maxInstanceCount;
    }

    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const { depth } of list) {
      if (depth > maxZ) maxZ = depth;
      if (depth < minZ) minZ = depth;
    }

    const depthDelta = maxZ - minZ;
    const factor = (2 ** 32 - 1) / depthDelta;

    for (const item of list) {
      item.depthSort = (item.depth - minZ) * factor;
    }

    radixSort(list, options);
  };
}

/** @internal */
export function sortOpaque(a: MultiDrawRenderItem, b: MultiDrawRenderItem): number {
  return a.depth - b.depth;
}

/** @internal */
export function sortTransparent(a: MultiDrawRenderItem, b: MultiDrawRenderItem): number {
  return b.depth - a.depth;
}
