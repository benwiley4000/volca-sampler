import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getSyroBindings } from './getSyroBindings.js';
import {
  getTargetWavForSample,
  getAudioBufferForAudioFileData,
  useAudioPlaybackContext,
} from './audioData.js';

/**
 * @param {(import('../store').SampleContainer)[]} sampleContainers
 * @param {(progress: number) => void} onProgress
 * @returns {{
 *   syroBufferPromise: Promise<{
 *     syroBuffer: Uint8Array;
 *     dataStartPoints: number[];
 *   }>;
 *   cancelWork: () => void;
 * }}
 */
export function getSyroSampleBuffer(sampleContainers, onProgress) {
  let cancelled = false;
  let onCancel = () => {};
  return {
    cancelWork() {
      cancelled = true;
      onCancel();
    },
    syroBufferPromise: (async () => {
      const {
        allocateSyroData,
        createSyroDataFromWavData,
        prepareSampleBufferFromSyroData,
        getSampleBufferChunkPointer,
        getSampleBufferChunkSize,
        getSampleBufferProgress,
        getSampleBufferTotalSize,
        getSampleBufferDataStartPointsPointer,
        cancelSampleBufferWork,
        registerUpdateCallback,
        unregisterUpdateCallback,
        heap8Buffer,
      } = await getSyroBindings();
      const emptyResponse = {
        syroBuffer: new Uint8Array(),
        dataStartPoints: [],
      };
      if (cancelled) {
        return emptyResponse;
      }
      /** @type {Uint8Array[]} */
      const targetWavs = [];
      for (const sampleContainer of sampleContainers) {
        const { data } = await getTargetWavForSample(sampleContainer);
        if (cancelled) {
          return emptyResponse;
        }
        targetWavs.push(data);
      }
      /** @type {Uint8Array | undefined} */
      let syroBuffer;
      let progress = 0;
      const dataStartPoints = new Uint32Array(sampleContainers.length);
      const onUpdate = registerUpdateCallback((sampleBufferUpdatePointer) => {
        if (cancelled) {
          return;
        }
        const totalSize = getSampleBufferTotalSize(sampleBufferUpdatePointer);
        if (!syroBuffer) {
          syroBuffer = new Uint8Array(totalSize);
        }
        const chunkPointer = getSampleBufferChunkPointer(
          sampleBufferUpdatePointer
        );
        const chunkSize = getSampleBufferChunkSize(sampleBufferUpdatePointer);
        const bytesProgress = getSampleBufferProgress(
          sampleBufferUpdatePointer
        );
        // save a new copy of the data so it doesn't disappear
        syroBuffer.set(
          new Uint8Array(heap8Buffer(), chunkPointer, chunkSize),
          bytesProgress - chunkSize
        );
        progress = bytesProgress / totalSize;
        const dataStartPointsPointer = getSampleBufferDataStartPointsPointer(
          sampleBufferUpdatePointer
        );
        dataStartPoints.set(
          new Uint32Array(
            heap8Buffer(),
            dataStartPointsPointer,
            sampleContainers.length
          ),
          0
        );
      });
      const syroDataHandle = allocateSyroData(sampleContainers.length);
      sampleContainers.forEach((sampleContainer, i) => {
        const data = targetWavs[i];
        createSyroDataFromWavData(
          syroDataHandle,
          i,
          data,
          data.length,
          sampleContainer.metadata.slotNumber,
          sampleContainer.metadata.qualityBitDepth,
          sampleContainer.metadata.useCompression ? 1 : 0
        );
      });
      const workHandle = prepareSampleBufferFromSyroData(
        syroDataHandle,
        sampleContainers.length,
        onUpdate
      );
      onProgress(progress);
      try {
        await /** @type {Promise<void>} */ (
          new Promise((resolve) => {
            /**
             * @type {number}
             */
            let frame;
            onCancel = () => {
              cancelAnimationFrame(frame);
              cancelSampleBufferWork(workHandle);
              resolve();
            };
            checkProgress();
            function checkProgress() {
              // TODO: find a way to detect if the web worker failed to load, in
              // which case we should reject the promise
              if (progress) {
                onProgress(progress);
                if (progress >= 1) {
                  resolve();
                  return;
                }
              }
              frame = requestAnimationFrame(checkProgress);
            }
          })
        );
      } finally {
        onCancel = () => {};
        unregisterUpdateCallback(onUpdate);
      }
      if (cancelled) {
        return emptyResponse;
      }
      if (!syroBuffer) {
        throw new Error('Unexpected condition: syroBuffer should be defined');
      }
      return {
        syroBuffer,
        dataStartPoints: [...dataStartPoints],
      };
    })(),
  };
}

/**
 * @param {number[]} slotNumbers
 * @returns {Promise<{ syroBuffer: Uint8Array; dataStartPoints: number[] }>}
 */
export async function getSyroDeleteBuffer(slotNumbers) {
  const {
    allocateSyroData,
    createEmptySyroData,
    getDeleteBufferFromSyroData,
    getSampleBufferChunkPointer,
    getSampleBufferChunkSize,
    getSampleBufferDataStartPointsPointer,
    freeDeleteBuffer,
    heap8Buffer,
  } = await getSyroBindings();
  const syroDataHandle = allocateSyroData(slotNumbers.length);
  slotNumbers.forEach((slotNumber, i) => {
    createEmptySyroData(syroDataHandle, i, slotNumber);
  });
  const deleteBufferUpdatePointer = getDeleteBufferFromSyroData(
    syroDataHandle,
    slotNumbers.length
  );
  const chunkPointer = getSampleBufferChunkPointer(deleteBufferUpdatePointer);
  const chunkSize = getSampleBufferChunkSize(deleteBufferUpdatePointer);
  // save a new copy of the data so it doesn't disappear
  const syroBuffer = new Uint8Array(
    new Uint8Array(heap8Buffer(), chunkPointer, chunkSize)
  );
  const dataStartPointsPointer = getSampleBufferDataStartPointsPointer(
    deleteBufferUpdatePointer
  );
  const dataStartPoints = [
    ...new Uint32Array(
      heap8Buffer(),
      dataStartPointsPointer,
      slotNumbers.length
    ),
  ];
  freeDeleteBuffer(deleteBufferUpdatePointer);
  return { syroBuffer, dataStartPoints };
}

/**
 * @typedef {import('../store').SampleContainer} SampleContainer
 * @param {object} params
 * @param {Uint8Array | Error | null} params.syroBuffer
 * @param {number[]} params.dataStartPoints
 * @param {Map<string, SampleContainer>} params.selectedSamples
 */
export function useSyroTransfer({
  syroBuffer,
  dataStartPoints: _dataStartPoints,
  selectedSamples,
}) {
  const [dataStartPoints, setDataStartPoints] = useState(
    /** @type {number[]} */ ([])
  );
  const [syroAudioBuffer, setSyroAudioBuffer] = useState(
    /** @type {AudioBuffer | Error | null} */ (null)
  );
  useEffect(() => {
    setDataStartPoints(
      syroBuffer && syroBuffer instanceof Uint8Array
        ? _dataStartPoints.map((p) => p / syroBuffer.length)
        : []
    );
    if (syroBuffer) {
      let cancelled = false;
      if (syroBuffer instanceof Uint8Array) {
        (async () => {
          try {
            const audioBuffer = await getAudioBufferForAudioFileData(
              syroBuffer
            );
            if (!cancelled) {
              setSyroAudioBuffer(audioBuffer);
            }
          } catch (err) {
            console.error(err);
            setSyroAudioBuffer(new Error(String(err)));
          }
        })();
        return () => {
          cancelled = true;
        };
      } else {
        setSyroAudioBuffer(syroBuffer);
      }
    }
  }, [syroBuffer, _dataStartPoints]);
  const [transferProgress, setTransferProgress] = useState(0);
  const [syroTransferState, setSyroTransferState] = useState(
    /** @type {'idle' | 'transferring' | 'error'} */ ('idle')
  );
  useLayoutEffect(() => {
    if (syroTransferState === 'transferring') {
      return () => {
        // reset progress for next time
        setTimeout(() => setTransferProgress(0), 100);
      };
    }
  }, [syroTransferState]);
  useEffect(() => {
    setSyroTransferState('idle');
  }, [selectedSamples]);
  const [callbackOnSyroBuffer, setCallbackOnSyroBuffer] = useState(
    /** @type {{ fn: () => void } | null} */ (null)
  );
  useEffect(() => {
    if (syroAudioBuffer instanceof AudioBuffer && callbackOnSyroBuffer) {
      callbackOnSyroBuffer.fn();
    }
    if (callbackOnSyroBuffer) {
      setCallbackOnSyroBuffer(null);
    }
  }, [syroAudioBuffer, callbackOnSyroBuffer]);
  // to be set when transfer is started
  const stop = useRef(() => {
    setSyroTransferState('idle');
  });
  const { playAudioBuffer } = useAudioPlaybackContext();
  /** @type {React.MouseEventHandler} */
  const handleTransfer = useCallback(
    (e) => {
      if (!(syroAudioBuffer instanceof AudioBuffer)) {
        if (!syroAudioBuffer) {
          const { target, nativeEvent } = e;
          // wait until the syro buffer is ready then simulate the event to
          // retry this handler. it's important that we simulate another
          // action because otherwise iOS won't let us play the audio later.
          setCallbackOnSyroBuffer({
            fn: () => target.dispatchEvent(nativeEvent),
          });
        }
        return;
      }
      try {
        setSyroTransferState('transferring');
        const stopPlayback = playAudioBuffer(syroAudioBuffer, {
          onTimeUpdate: (currentTime) =>
            setTransferProgress(currentTime / syroAudioBuffer.duration),
        });
        stop.current = () => {
          stopPlayback();
          setSyroTransferState('idle');
        };
      } catch (err) {
        console.error(err);
        setSyroTransferState('error');
      }
    },
    [playAudioBuffer, syroAudioBuffer]
  );
  const handleCancel = useCallback(() => stop.current(), []);
  const transferInProgress =
    syroTransferState === 'transferring' && transferProgress < 1;

  const {
    currentlyTransferringSample,
    currentSampleProgress,
    timeLeftUntilNextSample,
  } = useMemo(() => {
    const selectedSampleList = [...selectedSamples.values()];
    if (
      syroTransferState !== 'transferring' ||
      !(syroAudioBuffer instanceof AudioBuffer)
    ) {
      return {
        currentlyTransferringSample: selectedSampleList[0],
        currentSampleProgress: 0,
        timeLeftUntilNextSample: 0,
      };
    }
    const foundIndex =
      dataStartPoints.findIndex((p) => p > transferProgress) - 1;
    const currentlyTransferringSampleIndex =
      foundIndex >= 0 ? foundIndex : selectedSampleList.length - 1;
    const currentlyTransferringSample =
      selectedSampleList[currentlyTransferringSampleIndex];
    const currentStartPoint = dataStartPoints[currentlyTransferringSampleIndex];
    const nextStartPoint =
      dataStartPoints[currentlyTransferringSampleIndex + 1] || 1;
    const currentSampleProgress =
      (transferProgress - currentStartPoint) /
      (nextStartPoint - currentStartPoint);
    const timeLeftUntilNextSample =
      (nextStartPoint - transferProgress) * syroAudioBuffer.duration;
    return {
      currentlyTransferringSample,
      currentSampleProgress,
      timeLeftUntilNextSample,
    };
  }, [
    selectedSamples,
    dataStartPoints,
    syroTransferState,
    transferProgress,
    syroAudioBuffer,
  ]);

  return {
    startTransfer: handleTransfer,
    stopTransfer: handleCancel,
    syroTransferState,
    transferInProgress,
    transferProgress,
    currentlyTransferringSample,
    currentSampleProgress,
    timeLeftUntilNextSample,
    syroAudioBuffer,
  };
}
