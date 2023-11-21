import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Accordion,
  Button,
  Form,
  InputGroup,
  ListGroup,
  Modal,
  ProgressBar,
} from 'react-bootstrap';
import { ReactComponent as WarningIcon } from '@material-design-icons/svg/filled/warning.svg';

import SampleList from './SampleList.js';

import VolcaTransferControl from './VolcaTransferControl.js';
import { exportSampleContainersToZip } from './utils/zipExport.js';
import { downloadBlob } from './utils/download.js';

import classes from './SampleMenu.module.scss';
import sampleListClasses from './SampleList.module.scss';

/** @typedef {import('./store').SampleContainer} SampleContainer */
/** @typedef {import('./sampleCacheStore.js').SampleCache} SampleCache */

/**
 * @param {SampleContainer[]} samples
 * @param {string[]} searchWords
 */
function searchSamples(samples, searchWords) {
  if (!searchWords.length) return samples;
  return samples.filter(({ metadata: { name, slotNumber } }) => {
    const nameLowerCase = name.toLowerCase();
    return searchWords.every(
      (word) =>
        slotNumber === Number(word.replace(/^S\./i, '')) ||
        nameLowerCase.includes(word)
    );
  });
}

const SampleMenu = React.memo(
  /**
   * @param {{
   *   loading: boolean;
   *   focusedSampleId: string | null;
   *   userSamples: Map<string, SampleContainer>;
   *   factorySamples: Map<string, SampleContainer>;
   *   userSampleCaches: Map<string, SampleCache>;
   *   factorySampleCaches: Map<string, SampleCache>;
   *   onSampleSelect: (id: string | null) => void;
   *   onSampleDelete: (id: string | string[]) => void;
   * }} props
   */
  function SampleMenu({
    loading,
    focusedSampleId,
    userSamples,
    factorySamples,
    userSampleCaches,
    factorySampleCaches,
    onSampleSelect,
    onSampleDelete,
  }) {
    const [search, setSearch] = useState('');
    const searchTrimmed = search.trim().toLowerCase();
    const [activeKey, setActiveKey] = useState(
      /** @type {'user' | 'factory' | null} */ (null)
    );
    {
      const hasSearch = Boolean(search);
      useLayoutEffect(() => {
        setActiveKey(
          focusedSampleId && factorySamples.has(focusedSampleId)
            ? 'factory'
            : userSamples.size
            ? 'user'
            : 'factory'
        );
      }, [userSamples, factorySamples, focusedSampleId, hasSearch]);
    }
    const [searchActiveKeys, setSearchActiveKeys] = useState([
      'user',
      'factory',
    ]);
    useLayoutEffect(() => {
      if (searchTrimmed) {
        setSearchActiveKeys(['user', 'factory']);
      }
    }, [searchTrimmed]);
    const toggleSearchActiveKey = useCallback(
      /** @param {'user' | 'factory'} key */
      (key) => {
        setSearchActiveKeys((keys) =>
          keys.includes(key) ? keys.filter((k) => k !== key) : keys.concat(key)
        );
      },
      []
    );
    /** @type {React.KeyboardEventHandler} */
    const handleAccordionHeaderArrowDown = useCallback((e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const header = /** @type {HTMLElement} */ (e.target);
        const accordionItem = header.closest(`.${classes.accordionItem}`);
        if (!accordionItem) {
          console.warn('Expected accordionItem class on parent.');
          return;
        }
        const firstListItem = /** @type {HTMLDivElement} */ (
          accordionItem.querySelector('ul > div')
        );
        if (firstListItem) {
          firstListItem.focus();
        }
      }
    }, []);

    const searchWords = useMemo(
      () =>
        searchTrimmed
          ? [...new Set(searchTrimmed.split(/\s+/).filter(Boolean))]
          : [],
      [searchTrimmed]
    );
    const userSamplesFiltered = useMemo(
      () => searchSamples([...userSamples.values()], searchWords),
      [userSamples, searchWords]
    );
    const factorySamplesFiltered = useMemo(
      () => searchSamples([...factorySamples.values()], searchWords),
      [factorySamples, searchWords]
    );

    // Highlight matching text and slot numbers while searching
    /** @type {React.RefObject<HTMLDivElement>} */
    const listGroupRef = useRef(null);
    useEffect(() => {
      const listGroup = listGroupRef.current;
      if (!listGroup) return;
      const sampleNameElements = listGroup.getElementsByClassName(
        sampleListClasses.name
      );
      const sampleSlotElements = listGroup.getElementsByClassName(
        sampleListClasses.slot
      );
      if (!searchWords.length) {
        for (let i = 0; i < sampleNameElements.length; i++) {
          sampleNameElements[i].innerHTML =
            sampleNameElements[i].textContent || '';
          sampleSlotElements[i].innerHTML =
            sampleSlotElements[i].textContent || '';
        }
        return;
      }
      for (let i = 0; i < sampleNameElements.length; i++) {
        let nameHTML = sampleNameElements[i].textContent || '';
        const sampleSlotTextContent = sampleSlotElements[i].textContent || '';
        const slotNumber = Number(sampleSlotTextContent.slice(2));
        let foundSlotNumber = false;
        for (const word of searchWords) {
          const nameIndex = nameHTML.toLowerCase().indexOf(word);
          if (nameIndex !== -1) {
            nameHTML =
              nameHTML.slice(0, nameIndex) +
              '<mark>' +
              nameHTML.slice(nameIndex, nameIndex + word.length) +
              '</mark>' +
              nameHTML.slice(nameIndex + word.length);
          }
          if (
            !foundSlotNumber &&
            Number(word.replace(/^S\./i, '')) === slotNumber
          ) {
            foundSlotNumber = true;
            sampleSlotElements[i].innerHTML =
              '<mark>' + sampleSlotTextContent + '</mark>';
          }
        }
        sampleNameElements[i].innerHTML = nameHTML;
      }
    }, [searchWords]);

    /** @type {React.RefObject<HTMLHeadingElement>} */
    const userSamplesHeader = useRef(null);
    /** @type {React.RefObject<HTMLHeadingElement>} */
    const factorySamplesHeader = useRef(null);
    const userSamplesHeaderMouseDown = useRef(false);
    const factorySamplesHeaderMouseDown = useRef(false);
    useEffect(() => {
      if (!userSamplesHeader.current || !factorySamplesHeader.current) {
        return;
      }
      function onUserSamplesMousedown() {
        userSamplesHeaderMouseDown.current = true;
      }
      function onFactorySamplesMousedown() {
        factorySamplesHeaderMouseDown.current = true;
      }
      function onMouseUp() {
        userSamplesHeaderMouseDown.current = false;
        factorySamplesHeaderMouseDown.current = false;
      }
      const userHeader = userSamplesHeader.current;
      const factoryHeader = factorySamplesHeader.current;
      userHeader.addEventListener('mousedown', onUserSamplesMousedown);
      factoryHeader.addEventListener('mousedown', onFactorySamplesMousedown);
      window.addEventListener('mouseup', onMouseUp);
      return () => {
        userHeader.removeEventListener('mousedown', onUserSamplesMousedown);
        factoryHeader.removeEventListener(
          'mousedown',
          onFactorySamplesMousedown
        );
        window.removeEventListener('mouseup', onMouseUp);
      };
    }, [loading]);

    const [multipleSelection, setMultipleSelection] = useState(
      /** @type {Set<string> | null} */ (null)
    );

    const hasMultiSelection = Boolean(multipleSelection);
    const handleSampleSelect = useCallback(
      /** @param {...string} sampleIds */
      (...sampleIds) => {
        if (hasMultiSelection || sampleIds.length > 1) {
          setMultipleSelection((multipleSelection) => {
            const newSelection = new Set(multipleSelection);
            for (const sampleId of sampleIds) {
              if (multipleSelection && multipleSelection.has(sampleId)) {
                newSelection.delete(sampleId);
              } else {
                newSelection.add(sampleId);
              }
            }
            return newSelection;
          });
        } else {
          onSampleSelect(sampleIds[0]);
        }
      },
      [hasMultiSelection, onSampleSelect]
    );

    const multiSelectedSampleList = useMemo(() => {
      return (
        multipleSelection &&
        /** @type {SampleContainer[]} */ (
          [...multipleSelection]
            .map((id) => userSamples.get(id) || factorySamples.get(id))
            .filter(Boolean)
        ).sort((a, b) => a.metadata.slotNumber - b.metadata.slotNumber)
      );
    }, [userSamples, factorySamples, multipleSelection]);

    const multiSelectedUserSamples = useMemo(() => {
      return (
        multiSelectedSampleList &&
        multiSelectedSampleList.filter((sample) => userSamples.has(sample.id))
      );
    }, [multiSelectedSampleList, userSamples]);

    const cancelExportRef = useRef(() => {});

    const [showExportConfirm, setShowExportConfirm] = useState(false);

    const [exportProgress, setExportProgress] = useState(
      /** @type {number | null} */ (null)
    );

    /** @param {boolean} includeSyro */
    const onBackup = async (includeSyro) => {
      setShowExportConfirm(false);
      if (!multiSelectedUserSamples) return;
      let cancelled = false;
      cancelExportRef.current = () => {
        cancelled = true;
        setExportProgress(null);
        // TODO: find a way to actually abort the stream. for now
        // we let it silently finish in the background.
      };
      const zipFile = await exportSampleContainersToZip(
        multiSelectedUserSamples,
        (progress) => {
          if (!cancelled) setExportProgress(progress);
        },
        includeSyro
      );
      if (cancelled) return;
      downloadBlob(zipFile, 'volcasampler.zip');
      setExportProgress(null);
    };

    const [deleting, setDeleting] = useState(false);

    const allSampleCaches = useMemo(
      () => new Map([...userSampleCaches, ...factorySampleCaches]),
      [userSampleCaches, factorySampleCaches]
    );

    return (
      <>
        <Button
          hidden={hasMultiSelection}
          className={classes.sampleMenuButtonFullWidth}
          type="button"
          variant="primary"
          onClick={() => {
            onSampleSelect(null);
            requestAnimationFrame(() => {
              const recordButton = document.getElementById('record-button');
              if (recordButton) {
                recordButton.focus();
                requestAnimationFrame(() => {
                  // if we tried to focus while closing a transitioning popover
                  // then it might not have worked
                  if (document.activeElement !== recordButton) {
                    setTimeout(() => {
                      recordButton.focus();
                    }, 300);
                  }
                });
              }
            });
          }}
        >
          New sample
        </Button>
        <Button
          hidden={hasMultiSelection}
          className={classes.sampleMenuButtonFullWidth}
          type="button"
          variant="outline-secondary"
          onClick={() => setMultipleSelection(new Set())}
        >
          Select multiple
        </Button>
        <Button
          hidden={!hasMultiSelection}
          className={classes.sampleMenuButtonFullWidth}
          type="button"
          variant="secondary"
          onClick={() =>
            setMultipleSelection((s) => (s && s.size ? new Set() : null))
          }
        >
          {multipleSelection && multipleSelection.size
            ? `Clear selection (${multipleSelection.size})`
            : 'Done'}
        </Button>
        <div
          hidden={!hasMultiSelection}
          className={classes.sampleMenuButtonsContainer}
        >
          {(multiSelectedSampleList && (
            <VolcaTransferControl
              samples={multiSelectedSampleList}
              sampleCaches={allSampleCaches}
              justTheButton
              showInfoBeforeTransfer
              button={
                <Button
                  type="button"
                  disabled={!multipleSelection || !multipleSelection.size}
                  variant="outline-secondary"
                >
                  Transfer
                </Button>
              }
            />
          )) ||
            null}
          <Button
            type="button"
            className={exportProgress === null ? undefined : classes.exporting}
            disabled={
              !multiSelectedUserSamples || !multiSelectedUserSamples.length
            }
            variant={exportProgress === null ? 'outline-secondary' : 'primary'}
            onClick={() => {
              if (exportProgress !== null) {
                cancelExportRef.current();
                return;
              }
              setShowExportConfirm(true);
            }}
          >
            <span>{exportProgress === null ? 'Backup' : 'Cancel'}</span>
            {exportProgress !== null && (
              <ProgressBar
                className={classes.progress}
                striped
                animated
                variant="primary"
                now={100 * exportProgress}
              />
            )}
          </Button>
          <Button
            type="button"
            disabled={
              !multiSelectedUserSamples || !multiSelectedUserSamples.length
            }
            variant="outline-primary"
            onClick={() => setDeleting(true)}
          >
            Delete
          </Button>
        </div>
        <InputGroup className={classes.search}>
          <Form.Control
            placeholder="Search for a sample..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            hidden={!search}
            className={classes.clearSearch}
            type="reset"
            aria-label="Clear search"
            onClick={() => setSearch('')}
          />
        </InputGroup>
        <ListGroup className={classes.listGroup} ref={listGroupRef}>
          {!loading &&
            /**
             * @type {{
             *   eventKey: 'user' | 'factory';
             *   filteredSamples: typeof userSamplesFiltered;
             *   sampleCaches: Map<string, SampleCache>;
             *   headerRef: React.Ref<HTMLHeadingElement>;
             *   headerMouseDownRef: React.RefObject<boolean>;
             * }[]}
             */
            ([
              {
                eventKey: 'user',
                filteredSamples: userSamplesFiltered,
                sampleCaches: userSampleCaches,
                headerRef: userSamplesHeader,
                headerMouseDownRef: userSamplesHeaderMouseDown,
              },
              {
                eventKey: 'factory',
                filteredSamples: factorySamplesFiltered,
                sampleCaches: factorySampleCaches,
                headerRef: factorySamplesHeader,
                headerMouseDownRef: factorySamplesHeaderMouseDown,
              },
            ]).map(
              ({
                eventKey,
                filteredSamples,
                sampleCaches,
                headerRef,
                headerMouseDownRef,
              }) => (
                <Accordion
                  key={eventKey}
                  style={{
                    // @ts-ignore
                    '--results-count': filteredSamples.length,
                    // @ts-ignore
                    '--accordion-open': (
                      searchTrimmed
                        ? searchActiveKeys.includes(eventKey)
                        : activeKey === eventKey
                    )
                      ? '1'
                      : '0',
                  }}
                  activeKey={
                    searchTrimmed
                      ? searchActiveKeys.filter((k) => k === eventKey)[0] ||
                        'nothing'
                      : activeKey === eventKey
                      ? activeKey
                      : 'nothing'
                  }
                  className={classes.accordion}
                >
                  <Accordion.Item
                    eventKey={eventKey}
                    className={classes.accordionItem}
                  >
                    <Accordion.Header
                      ref={headerRef}
                      onClick={() => {
                        setActiveKey((key) =>
                          key === eventKey ? null : eventKey
                        );
                        if (searchTrimmed) {
                          toggleSearchActiveKey(eventKey);
                        }
                      }}
                      onFocus={() =>
                        !headerMouseDownRef.current && setActiveKey(eventKey)
                      }
                      onKeyDown={handleAccordionHeaderArrowDown}
                    >
                      {eventKey === 'user' ? 'Your samples' : 'Factory samples'}
                    </Accordion.Header>
                    <Accordion.Body className={classes.accordionBody}>
                      <SampleList
                        samples={filteredSamples}
                        sampleCaches={sampleCaches}
                        selectedSampleId={focusedSampleId}
                        multipleSelection={multipleSelection}
                        onSampleSelect={handleSampleSelect}
                      />
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>
              )
            )}
        </ListGroup>
        <Modal
          onHide={() => setShowExportConfirm(false)}
          show={showExportConfirm}
          aria-labelledby="export-confirm-modal"
        >
          <Modal.Header>
            <Modal.Title id="export-confirm-modal">Sample backup</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              Your backup will contain your selected samples (with any related
              settings and plugins). You can also choose to include the volca
              transfer audio.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              type="button"
              variant="light"
              onClick={() => onBackup(false)}
            >
              Just the samples
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => onBackup(true)}
            >
              Include transfer audio
            </Button>
          </Modal.Footer>
        </Modal>
        <Modal
          onHide={() => setDeleting(false)}
          show={deleting}
          aria-labelledby="delete-modal"
        >
          <Form
            className={classes.deleteModalForm}
            onSubmit={async (e) => {
              e.preventDefault();
              if (multiSelectedUserSamples) {
                onSampleDelete(multiSelectedUserSamples.map((s) => s.id));
              }
              setMultipleSelection(null);
              setDeleting(false);
            }}
          >
            <Modal.Header className={classes.deleteModalHeader}>
              <WarningIcon />
              <Modal.Title id="delete-modal">Deleting samples</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p>
                Are you sure you want to delete these samples? This can't be
                undone.
              </p>
              <ul>
                {(multiSelectedUserSamples || []).map((sample) => (
                  <li key={sample.id}>
                    <strong>{sample.metadata.name}</strong> (slot{' '}
                    {sample.metadata.slotNumber})
                  </li>
                ))}
              </ul>
            </Modal.Body>
            <Modal.Footer>
              <Button
                type="button"
                variant="light"
                onClick={() => setDeleting(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Delete
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </>
    );
  }
);

export default SampleMenu;
