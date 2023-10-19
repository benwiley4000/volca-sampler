/**
 * LOWPASS FILTER PLUGIN for Volca Sampler
 * 
 * Created by Ben Wiley 2023
 */

const sampleParams = {
  'Cutoff frequency': {
    value: 1000,
    min: 30,
    max: 20000,
  },
  Q: {
    value: 3,
    min: 0,
    max: 25,
  },
};

/**
 * @param {AudioBuffer} audioBuffer
 */
async function samplePlugin(audioBuffer) {
  const { numberOfChannels, sampleRate, length } = audioBuffer;
  const frequency = sampleParams['Cutoff frequency'].value;
  const q = sampleParams.Q.value;

  const audioContext = new OfflineAudioContext({
    numberOfChannels,
    sampleRate,
    length,
  });

  const bufferSource = audioContext.createBufferSource();
  bufferSource.buffer = audioBuffer;

  const biquadFilter = audioContext.createBiquadFilter();
  biquadFilter.frequency.value = frequency;
  biquadFilter.Q.value = q;
  biquadFilter.type = 'lowpass';

  bufferSource.connect(biquadFilter);
  biquadFilter.connect(audioContext.destination);
  bufferSource.start();

  const newAudioBuffer = await audioContext.startRendering();

  biquadFilter.disconnect(audioContext.destination);
  bufferSource.disconnect(biquadFilter);

  return newAudioBuffer;
}
