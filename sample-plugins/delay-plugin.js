/**
 * DELAY PLUGIN for Volca Sampler
 *
 * Created by Ben Wiley 2023
 */

const sampleParams = {
  'Delay time': {
    value: 0.1,
    min: 0.01,
    max: 1,
  },
  'Level': {
    value: 0.5,
    min: 0,
    max: 1,
  },
  'Feedback': {
    value: 0.2,
    min: 0,
    max: 1.2,
  },
};

/**
 * @param {AudioBuffer} audioBuffer
 */
async function samplePlugin(audioBuffer) {
  const { numberOfChannels, sampleRate, length } = audioBuffer;
  const delayTime = sampleParams['Delay time'].value;
  const level = sampleParams.Level.value;
  const feedback = sampleParams.Feedback.value;

  const audioContext = new OfflineAudioContext({
    numberOfChannels,
    sampleRate,
    length,
  });

  const bufferSource = audioContext.createBufferSource();
  bufferSource.buffer = audioBuffer;

  const levelGain = audioContext.createGain();
  levelGain.gain.value = level;

  const delay = audioContext.createDelay();
  delay.delayTime.value = delayTime;

  const feedbackGain = audioContext.createGain();
  feedbackGain.gain.value = feedback;

  bufferSource.connect(levelGain);
  levelGain.connect(delay);
  delay.connect(feedbackGain);
  feedbackGain.connect(delay);

  bufferSource.connect(audioContext.destination);
  delay.connect(audioContext.destination);

  bufferSource.start();

  const newAudioBuffer = await audioContext.startRendering();

  delay.disconnect(audioContext.destination);
  bufferSource.disconnect(audioContext.destination);

  feedbackGain.disconnect(delay);
  delay.disconnect(feedbackGain);
  levelGain.disconnect(delay);
  bufferSource.disconnect(levelGain);

  return newAudioBuffer;
}
