/**
 * LIMITER PLUGIN for Volca Sampler
 * 
 * Created by Ben Wiley 2023
 */

const sampleParams = {
  'Gain reduction': {
    value: 3,
    min: 0,
    max: 100,
  },
};

/**
 * @param {AudioBuffer} audioBuffer
 */
async function samplePlugin(audioBuffer) {
  const { numberOfChannels, sampleRate, length } = audioBuffer;
  const gainReduction = sampleParams['Gain reduction'].value;

  const audioContext = new OfflineAudioContext({
    numberOfChannels,
    sampleRate,
    length,
  });

  const bufferSource = audioContext.createBufferSource();
  bufferSource.buffer = audioBuffer;

  const limiter = audioContext.createDynamicsCompressor();
  limiter.ratio.value = 20;
  limiter.attack.value = 0;
  limiter.threshold.value = 0 - gainReduction;

  bufferSource.connect(limiter);
  limiter.connect(audioContext.destination);
  bufferSource.start();

  const newAudioBuffer = await audioContext.startRendering();

  limiter.disconnect(audioContext.destination);
  bufferSource.disconnect(limiter);

  return newAudioBuffer;
}
