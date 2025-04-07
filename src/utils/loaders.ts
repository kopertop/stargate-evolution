import { useEffect, useState } from 'react';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { TextureLoader } from 'three/src/loaders/TextureLoader';
import * as THREE from 'three';

/**
 * Custom hook to load a GLTF model with loading state
 * @param url The URL of the model to load
 * @returns Object containing the loaded model and loading state
 */
export function useModelWithLoadingState(url: string) {
	const [loading, setLoading] = useState(true);
	const model = useLoader(GLTFLoader, url);

	useEffect(() => {
		if (model) {
			setLoading(false);
		}
	}, [model]);

	return { model, loading };
}

/**
 * Custom hook to load a texture with loading state
 * @param url The URL of the texture to load
 * @returns Object containing the loaded texture and loading state
 */
export function useTextureWithLoadingState(url: string) {
	const [loading, setLoading] = useState(true);
	const texture = useLoader(TextureLoader, url);

	useEffect(() => {
		if (texture) {
			setLoading(false);
		}
	}, [texture]);

	return { texture, loading };
}

/**
 * Preloads a list of assets
 * @param urls List of URLs to preload
 * @param type The type of asset to preload
 * @returns Promise that resolves when all assets are loaded
 */
export function preloadAssets(
	urls: string[],
	type: 'model' | 'texture' = 'model'
): Promise<(GLTF | THREE.Texture)[]> {
	if (type === 'model') {
		const loader = new GLTFLoader();
		return Promise.all(urls.map(url =>
			new Promise<GLTF>((resolve, reject) =>
				loader.load(url, resolve, undefined, reject)
			)
		));
	} else {
		const loader = new TextureLoader();
		return Promise.all(urls.map(url =>
			new Promise<THREE.Texture>((resolve, reject) =>
				loader.load(url, resolve, undefined, reject)
			)
		));
	}
}
