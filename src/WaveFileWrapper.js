// @ts-check

import { WaveFile as _Wavefile } from 'wavefile';

/**
 * Passthrough wrapper for improving types
 */
export default class WaveFile extends _Wavefile {
  /**
   * @param {Uint8Array} [wavBuffer]
   */
  constructor(wavBuffer) {
    super(wavBuffer);
    /**
     * @type {{
     *   numChannels: number;
     *   sampleRate: number;
     * }}
     */
    // eslint-disable-next-line no-self-assign
    this.fmt = this.fmt;
  }

  /**
   * Return the samples packed in a Float64Array or array of Float64Arrays.
   * @template {Float64ArrayConstructor | Int16ArrayConstructor} C
   * @template {C extends Float64ArrayConstructor ? Float64Array : Int16Array} T
   * @param {boolean} [interleaved] True to return interleaved samples, false to return the samples de-interleaved.
   * @param {C} [ObjectType]  The sample container.
   * @returns {T | T[]}
   */
  // @ts-ignore
  getSamples(interleaved, ObjectType) {
    return /** @type {T | T[]} */ (
      super.getSamples(interleaved, ObjectType)
    );
  }
}
