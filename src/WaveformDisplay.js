import React, { useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { styled } from 'tonami';
import ResizeObserver from 'resize-observer-polyfill';

import { GROUP_PIXEL_WIDTH } from './utils/waveform.js';

const WaveformCanvas = styled.canvas({
  width: '100%',
  height: '100%',
  display: 'block',
});

/**
 * @param {HTMLCanvasElement} canvas
 */
function observeCanvas(canvas) {
  /**
   * @param {number} width
   * @param {number} height
   */
  function setCanvasSize(width, height) {
    canvas.width = width;
    canvas.height = height;
  }
  setCanvasSize(canvas.offsetWidth, canvas.offsetHeight);
  const observer = new ResizeObserver(([entry]) =>
    setCanvasSize(entry.contentRect.width, entry.contentRect.height)
  );
  observer.observe(canvas);
  return () => observer.disconnect();
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {import('./utils/waveform.js').SamplePeaks} peaks
 * @param {number} scaleCoefficient
 */
function drawWaveform(canvas, peaks, scaleCoefficient) {
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  const positiveHeight = Math.floor(height * (2 / 3)) + 1;
  ctx.fillStyle = 'red';
  peaks.positive.forEach((peak, i) => {
    const basePeakHeight = positiveHeight * peak; // float
    // make the positive bar always at least 1px tall to avoid empty sections
    const scaledPeakHeight = Math.max(
      Math.round(scaleCoefficient * basePeakHeight),
      1
    );
    ctx.fillRect(
      i * GROUP_PIXEL_WIDTH,
      positiveHeight - scaledPeakHeight,
      GROUP_PIXEL_WIDTH - 1,
      scaledPeakHeight
    );
  });
  const negativeHeight = height - positiveHeight;
  ctx.fillStyle = 'darkred';
  peaks.negative.forEach((peak, i) => {
    const basePeakHeight = negativeHeight * peak * -1; // float
    const scaledPeakHeight = Math.round(scaleCoefficient * basePeakHeight);
    ctx.fillRect(
      i * GROUP_PIXEL_WIDTH,
      positiveHeight,
      GROUP_PIXEL_WIDTH - 1,
      scaledPeakHeight
    );
  });
}

/**
 * @typedef {{
 *   peaks: import('./utils/waveform').SamplePeaks;
 *   scaleCoefficient: number;
 *   waveformRef?: React.Ref<HTMLElement | null>;
 * }} WaveformProps
 */

/**
 * @param {WaveformProps} props
 */
function WaveformDisplayCanvas({ peaks, scaleCoefficient, waveformRef }) {
  /**
   * @type {React.RefObject<HTMLCanvasElement>}
   */
  const canvasRef = useRef(null);
  useImperativeHandle(waveformRef, () => canvasRef.current);
  useLayoutEffect(() => {
    if (!canvasRef.current) {
      throw new Error('Canvas should be defined');
    }
    return observeCanvas(canvasRef.current);
  }, []);
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error('Canvas should be defined');
    }
    // wait for animation frame..
    let frame = requestAnimationFrame(() => {
      // just before animation frame..
      frame = requestAnimationFrame(() => {
        // after animation frame..
        // for some reason the draw doesn't reliably show up before this
        drawWaveform(canvas, peaks, scaleCoefficient);
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [peaks, scaleCoefficient]);
  return <WaveformCanvas ref={canvasRef} />;
}

export default WaveformDisplayCanvas;
