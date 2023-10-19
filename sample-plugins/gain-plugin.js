/**
 * GAIN PLUGIN for Volca Sampler
 * 
 * Created by Ben Wiley 2023
 */

const sampleParams = {
  Gain: {
    value: 1,
    min: 0.1,
    max: 5,
  },
};

/**
 * @param {AudioBuffer} audioBuffer
 */
function samplePlugin(audioBuffer) {
  const gain = sampleParams.Gain.value;
  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < channelData.length; i++) {
    channelData[i] *= gain;
  }
  return audioBuffer;
}
