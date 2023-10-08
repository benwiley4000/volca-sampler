import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button, Modal, ProgressBar, Table } from 'react-bootstrap';

import {
  readSampleMetadataFromZip,
  importSampleContainersFromZip,
} from './utils/zipExport.js';

import classes from './ImportFromZip.module.scss';

/** @typedef {import('./store.js').SampleContainer} SampleContainer */
/** @typedef {import('./store.js').SampleMetadataExport} SampleMetadataExport */

/**
 * @param {{
 *   samples: Map<string, SampleMetadataExport>;
 *   sampleIdsToImport: Set<string>;
 *   setSampleIdsToImport:
 *     (ids: Set<string> | ((prevIds: Set<string>) => Set<string>)) => void;
 * }} props
 */
function ImportConfirmationTable({
  samples,
  sampleIdsToImport,
  setSampleIdsToImport,
}) {
  const allChecked = [...samples.keys()].every((id) =>
    sampleIdsToImport.has(id)
  );
  const noneChecked =
    !allChecked &&
    [...samples.keys()].every((id) => !sampleIdsToImport.has(id));
  const indeterminate = !allChecked && !noneChecked;
  /** @type {React.RefObject<HTMLInputElement>} */
  const checkboxRef = useRef(null);
  if (checkboxRef.current) {
    checkboxRef.current.indeterminate = indeterminate;
  }
  useLayoutEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);
  return (
    <Table className={classes.samplesTable}>
      <thead>
        <tr>
          <th className={classes.check}>
            <input
              ref={checkboxRef}
              type="checkbox"
              checked={!noneChecked}
              onChange={(e) => {
                setSampleIdsToImport((ids) => {
                  const newIds = new Set(ids);
                  if (e.target.checked) {
                    for (const [id] of samples) {
                      newIds.add(id);
                    }
                  } else {
                    for (const [id] of samples) {
                      newIds.delete(id);
                    }
                  }
                  return newIds;
                });
              }}
            />
          </th>
          <th className={classes.name}>Name</th>
          <th className={classes.slotNumber}>Slot</th>
          <th className={classes.updated}>Updated</th>
        </tr>
      </thead>
      <tbody>
        {[...samples].map(([id, metadata]) => (
          <tr key={id}>
            <td>
              <input
                type="checkbox"
                checked={sampleIdsToImport.has(id)}
                onChange={(e) => {
                  setSampleIdsToImport((idsToImport) => {
                    const newIdsToImport = new Set(idsToImport);
                    if (e.target.checked) {
                      newIdsToImport.add(id);
                    } else {
                      newIdsToImport.delete(id);
                    }
                    return newIdsToImport;
                  });
                }}
              />
            </td>
            <td title={metadata.name}>{metadata.name}</td>
            <td>{metadata.slotNumber}</td>
            <td title={new Date(metadata.dateModified).toLocaleString()}>
              {new Date(metadata.dateModified).toLocaleDateString()}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

const ImportFromZip = React.memo(
  /**
   * @param {{
   *   userSamples: Map<string, SampleContainer>;
   *   onImport: (samples: SampleContainer[]) => void;
   * }} props
   */
  function ImportFromZip({ userSamples, onImport }) {
    /** @type {React.RefObject<HTMLInputElement>} */
    const inputRef = useRef(null);
    const fileRef = useRef(/** @type {File | null} */ (null));
    const [uiState, setUiState] = useState(
      /**
       * @type {'error-parsing'
       *   | 'confirm'
       *   | 'import'
       *   | 'unexpected-error'
       *   | 'report'
       *   | null}
       */ (null)
    );
    const [metadataMap, setMetadataMap] = useState(
      /** @type {import('./utils/zipExport.js').MetadataMap | null} */ (null)
    );
    const { unknownSamples, knownSamplesNew, knownSamplesOld } = useMemo(() => {
      /** @type {Map<string, SampleMetadataExport>} */
      const unknownSamples = new Map();
      /** @type {typeof unknownSamples} */
      const knownSamplesNew = new Map();
      /** @type {typeof unknownSamples} */
      const knownSamplesOld = new Map();
      for (const [id, metadata] of Object.entries(metadataMap || {})) {
        const knownSample = userSamples.get(id);
        if (knownSample) {
          if (knownSample.metadata.dateModified > metadata.dateModified) {
            knownSamplesOld.set(id, metadata);
          } else {
            knownSamplesNew.set(id, metadata);
          }
        } else {
          unknownSamples.set(id, metadata);
        }
      }
      return {
        unknownSamples,
        knownSamplesNew,
        knownSamplesOld,
      };
    }, [userSamples, metadataMap]);
    const [sampleIdsToImport, setSampleIdsToImport] = useState(
      /** @type {Set<string>} */ (new Set())
    );
    useEffect(() => {
      setSampleIdsToImport(
        new Set([...unknownSamples.keys(), ...knownSamplesNew.keys()])
      );
    }, [unknownSamples, knownSamplesNew]);
    const [importProgress, setImportProgress] = useState(0);
    const [failedImports, setFailedImports] = useState(
      /** @type {import('./utils/zipExport.js').FailedImports | null} */ (null)
    );
    const [unexpectedError, setUnexpectedError] = useState(
      /** @type {unknown} */ (null)
    );

    const uiDismissed = uiState === null;
    useEffect(() => {
      if (uiDismissed) {
        // release some references we don't need to hold onto
        setMetadataMap(null);
        setFailedImports(null);
        setUnexpectedError(null);
        fileRef.current = null;
        // this removes the file from the input so it can be selected again if
        // needed.
        if (inputRef.current) inputRef.current.value = '';
      }
    }, [uiDismissed]);

    {
      const isImporting = uiState === 'import';
      const sampleIdsToImportRef = useRef(sampleIdsToImport);
      sampleIdsToImportRef.current = sampleIdsToImport;
      useEffect(() => {
        if (!fileRef.current || !isImporting) return;
        let cancelled = false;
        importSampleContainersFromZip(
          fileRef.current,
          [...sampleIdsToImportRef.current],
          (progress) => {
            if (!cancelled) setImportProgress(progress);
          }
        )
          .then(async ({ sampleContainers, failedImports }) => {
            onImport(sampleContainers);
            setFailedImports(failedImports);
            setUiState('report');
          })
          .catch((error) => {
            console.error(error);
            setUnexpectedError(error);
            setUiState('unexpected-error');
          });
        return () => {
          cancelled = true;
        };
      }, [isImporting, onImport]);
    }

    return (
      <>
        <Button
          type="button"
          variant="outline-secondary"
          onClick={(e) => {
            const input = e.currentTarget.querySelector('input');
            if (input && e.target !== input) {
              input.click();
            }
          }}
        >
          Load from Volca Sampler backup
          <input
            hidden
            type="file"
            accept="*.zip"
            ref={inputRef}
            onChange={async (e) => {
              const file = e.target.files && e.target.files[0];
              if (!file) return;
              fileRef.current = file;
              try {
                const metadataMap = await readSampleMetadataFromZip(file);
                setMetadataMap(metadataMap);
                setUiState('confirm');
              } catch (err) {
                console.error(err);
                setUiState('error-parsing');
              }
            }}
          />
        </Button>
        <Modal
          className={classes.importModal}
          onHide={uiState === 'import' ? undefined : () => setUiState(null)}
          show={Boolean(uiState)}
          aria-labelledby="import-modal"
        >
          <Modal.Header>
            <Modal.Title id="import-modal">
              {uiState === 'error-parsing'
                ? 'Error parsing zip archive'
                : uiState === 'confirm'
                ? 'Import samples to Volca Sampler'
                : uiState === 'import'
                ? 'Importing samples'
                : uiState === 'unexpected-error'
                ? 'Unexpected error while importing'
                : uiState === 'report'
                ? 'Sample import finished'
                : null}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {uiState === 'error-parsing' ? (
              <p>Please make sure you attached the correct file.</p>
            ) : uiState === 'confirm' ? (
              <>
                <p>Please confirm the list of samples you wish to import.</p>
                {knownSamplesOld.size ? (
                  <>
                    <h5>
                      More recent versions exist (
                      {
                        [...sampleIdsToImport].filter((id) =>
                          knownSamplesOld.has(id)
                        ).length
                      }{' '}
                      / {knownSamplesOld.size})
                    </h5>
                    <ImportConfirmationTable
                      samples={knownSamplesOld}
                      sampleIdsToImport={sampleIdsToImport}
                      setSampleIdsToImport={setSampleIdsToImport}
                    />
                  </>
                ) : null}
                {knownSamplesNew.size ? (
                  <>
                    <h5>
                      Older versions exist (
                      {
                        [...sampleIdsToImport].filter((id) =>
                          knownSamplesNew.has(id)
                        ).length
                      }{' '}
                      / {knownSamplesNew.size})
                    </h5>
                    <ImportConfirmationTable
                      samples={knownSamplesNew}
                      sampleIdsToImport={sampleIdsToImport}
                      setSampleIdsToImport={setSampleIdsToImport}
                    />
                  </>
                ) : null}
                {unknownSamples.size ? (
                  <>
                    <h5>
                      New samples (
                      {
                        [...sampleIdsToImport].filter((id) =>
                          unknownSamples.has(id)
                        ).length
                      }{' '}
                      / {unknownSamples.size})
                    </h5>
                    <ImportConfirmationTable
                      samples={unknownSamples}
                      sampleIdsToImport={sampleIdsToImport}
                      setSampleIdsToImport={setSampleIdsToImport}
                    />
                  </>
                ) : null}
              </>
            ) : uiState === 'import' ? (
              <ProgressBar
                striped
                animated
                variant="primary"
                now={100 * importProgress}
              />
            ) : uiState === 'unexpected-error' ? (
              <>
                <p>
                  An error occured. Please make sure the zip contains all the
                  correct audio files.
                </p>
                {unexpectedError && (
                  <pre>
                    {/* @ts-ignore */}
                    {unexpectedError.message}{' '}
                    {JSON.stringify(unexpectedError, null, 1)}
                  </pre>
                )}
              </>
            ) : uiState === 'report' ? (
              (() => {
                const failedImportsEntries =
                  failedImports && Object.entries(failedImports);
                if (failedImportsEntries && failedImportsEntries.length) {
                  return (
                    <>
                      <p>
                        <strong>
                          {failedImportsEntries.length} /{' '}
                          {sampleIdsToImport.size} samples
                        </strong>{' '}
                        failed to import:
                      </p>
                      {failedImportsEntries.map(([id, { metadata, error }]) => (
                        <details key={id}>
                          <summary>{metadata.name}</summary>
                          <pre>
                            {/* @ts-ignore */}
                            {error.message} {JSON.stringify(error, null, 1)}
                          </pre>
                        </details>
                      ))}
                    </>
                  );
                } else {
                  return <p>Your samples were imported successfully.</p>;
                }
              })()
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            {uiState === 'confirm' && (
              <>
                <Button
                  type="button"
                  variant="light"
                  onClick={() => setUiState(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={!sampleIdsToImport.size}
                  onClick={() => {
                    setImportProgress(0);
                    setUiState('import');
                  }}
                >
                  Import now
                </Button>
              </>
            )}
            {uiState === 'import' && (
              <Button
                type="button"
                variant="primary"
                onClick={() => setUiState(null)}
              >
                Cancel
              </Button>
            )}
            {(uiState === 'report' ||
              uiState === 'error-parsing' ||
              uiState === 'unexpected-error') && (
              <Button
                type="button"
                variant="primary"
                onClick={() => setUiState(null)}
              >
                OK
              </Button>
            )}
          </Modal.Footer>
        </Modal>
      </>
    );
  }
);

export default ImportFromZip;
