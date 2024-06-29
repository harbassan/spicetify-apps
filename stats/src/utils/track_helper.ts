import { getAudioFeatures } from "../api/spotify";

export const batchRequest = <T>(size: number, request: (batch: string[]) => Promise<T[]>) => {
	return (ids: string[]) => {
		const chunks = [];
		for (let i = 0; i < ids.length; i += size) {
			chunks.push(ids.slice(i, i + size));
		}

		return Promise.all(chunks.map(request)).then((res) => res.flat());
	};
};

export const getMeanAudioFeatures = async (ids: string[]) => {
	const audioFeaturesSum = {
		danceability: 0,
		energy: 0,
		loudness: 0,
		speechiness: 0,
		acousticness: 0,
		instrumentalness: 0,
		liveness: 0,
		valence: 0,
		tempo: 0,
	};

	const audioFeaturesList = await batchRequest(50, (batch) => getAudioFeatures(batch))(ids);

	for (const audioFeatures of audioFeaturesList) {
		if (!audioFeatures) continue;
		for (const f of Object.keys(audioFeaturesSum) as (keyof typeof audioFeaturesSum)[]) {
			audioFeaturesSum[f] += audioFeatures[f];
		}
	}

	for (const f of Object.keys(audioFeaturesSum) as (keyof typeof audioFeaturesSum)[]) {
		audioFeaturesSum[f] /= audioFeaturesList.length;
	}

	return audioFeaturesSum;
};
