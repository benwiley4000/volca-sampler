import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Accordion, Button, Form, ListGroup } from 'react-bootstrap';

import SampleList from './SampleList.js';

import classes from './SampleMenu.module.scss';

const SampleMenu = React.memo(
  /**
   * @param {{
   *   loading: boolean;
   *   focusedSampleId: string | null;
   *   userSamples: Map<string, import('./store').SampleContainer>;
   *   factorySamples: Map<string, import('./store').SampleContainer>;
   *   onSampleSelect: (id: string | null) => void;
   * }} props
   */
  function SampleMenu({
    loading,
    focusedSampleId,
    userSamples,
    factorySamples,
    onSampleSelect,
  }) {
    const [search, setSearch] = useState('');
    const searchTerm = search.trim().toLowerCase();
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
      if (searchTerm) {
        setSearchActiveKeys(['user', 'factory']);
      }
    }, [searchTerm]);
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
    const userSamplesFiltered = useMemo(
      () =>
        [...userSamples.values()]
          .filter(
            (sample) =>
              !searchTerm ||
              sample.metadata.name.toLowerCase().includes(searchTerm)
          )
          .sort((a, b) =>
            a.metadata.dateModified > b.metadata.dateModified ? -1 : 1
          ),
      [userSamples, searchTerm]
    );
    const factorySamplesFiltered = useMemo(
      () =>
        [...factorySamples.values()].filter(
          (sample) =>
            !searchTerm ||
            sample.metadata.name.toLowerCase().includes(searchTerm)
        ),
      [factorySamples, searchTerm]
    );
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
    /** @type {typeof onSampleSelect} */
    const handleSampleSelect = useCallback(
      (sampleId) => {
        if (hasMultiSelection) {
          setMultipleSelection((multipleSelection) => {
            if (!multipleSelection || !sampleId) return multipleSelection;
            const newSelection = new Set(multipleSelection);
            if (multipleSelection.has(sampleId)) {
              newSelection.delete(sampleId);
            } else {
              newSelection.add(sampleId);
            }
            return newSelection;
          });
        } else {
          onSampleSelect(sampleId);
        }
      },
      [hasMultiSelection, onSampleSelect]
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
          hidden={hasMultiSelection || true}
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
          <Button
            type="button"
            disabled={!multipleSelection || !multipleSelection.size}
            variant="outline-secondary"
            onClick={() => {
              // TODO: pop transfer modal with an extra screen
              // confirming the list of samples to transfer
            }}
          >
            Volca transfer
          </Button>
          <Button
            type="button"
            disabled={!multipleSelection || !multipleSelection.size}
            variant="outline-primary"
            onClick={() => {
              // TODO: pop modal confirming sample deletion
            }}
          >
            Delete samples
          </Button>
        </div>
        <Form.Control
          className={classes.search}
          placeholder="Search for a sample..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ListGroup className={classes.listGroup}>
          {!loading &&
            /**
             * @type {{
             *   eventKey: 'user' | 'factory';
             *   filteredSamples: typeof userSamplesFiltered;
             *   headerRef: React.Ref<HTMLHeadingElement>;
             *   headerMouseDownRef: React.RefObject<boolean>;
             * }[]}
             */
            ([
              {
                eventKey: 'user',
                filteredSamples: userSamplesFiltered,
                headerRef: userSamplesHeader,
                headerMouseDownRef: userSamplesHeaderMouseDown,
              },
              {
                eventKey: 'factory',
                filteredSamples: factorySamplesFiltered,
                headerRef: factorySamplesHeader,
                headerMouseDownRef: factorySamplesHeaderMouseDown,
              },
            ]).map(
              ({
                eventKey,
                filteredSamples,
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
                      searchTerm
                        ? searchActiveKeys.includes(eventKey)
                        : activeKey === eventKey
                    )
                      ? '1'
                      : '0',
                  }}
                  activeKey={
                    searchTerm
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
                        if (searchTerm) {
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
      </>
    );
  }
);

export default SampleMenu;
