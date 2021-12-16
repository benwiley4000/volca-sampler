import React, { useEffect, useRef, useState } from 'react';
import { Accordion, Button, Form, ListGroup, Offcanvas } from 'react-bootstrap';

import SampleList from './SampleList';

import classes from './SampleMenu.module.scss';

const SampleMenu = React.memo(
  /**
   * @param {{
   *   open: boolean;
   *   loading: boolean;
   *   focusedSampleId: string | null;
   *   userSamples: Map<string, import('./store').SampleContainer>;
   *   factorySamples: Map<string, import('./store').SampleContainer>;
   *   setOpen: (open: boolean) => void;
   *   onSampleSelect: (id: string | null) => void;
   * }} props
   */
  function SampleMenu({
    open,
    loading,
    focusedSampleId,
    userSamples,
    factorySamples,
    setOpen,
    onSampleSelect,
  }) {
    const [search, setSearch] = useState('');
    const searchTerm = search.trim().toLowerCase();
    const getDefaultKey = () =>
      focusedSampleId && factorySamples.has(focusedSampleId)
        ? 'factory'
        : userSamples.size
        ? 'user'
        : 'factory';
    const activeKey = useRef(getDefaultKey());
    if (!open) {
      // set timeout to let transition complete
      setTimeout(() => (activeKey.current = getDefaultKey()), 300);
    }
    useEffect(() => {
      if (!open) {
        // set timeout to let transition complete
        setTimeout(() => setSearch(''), 300);
      }
    }, [open]);
    return (
      <Offcanvas
        className={classes.sidebar}
        show={open}
        onHide={() => setOpen(false)}
      >
        <Offcanvas.Header closeButton />
        <Offcanvas.Body className={classes.offcanvasBody}>
          <Button
            className={classes.newSampleButton}
            type="button"
            variant="primary"
            onClick={() => onSampleSelect(null)}
          >
            New sample
          </Button>
          <Form.Control
            className={classes.search}
            placeholder="Search for a sample..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ListGroup className={classes.listGroup}>
            {!loading && (
              <Accordion
                defaultActiveKey={activeKey.current}
                className={classes.accordion}
              >
                <Accordion.Item
                  eventKey={searchTerm ? activeKey.current : 'user'}
                  className={classes.accordionItem}
                >
                  <Accordion.Header>Your Samples</Accordion.Header>
                  <Accordion.Body className={classes.accordionBody}>
                    <SampleList
                      samples={userSamples}
                      selectedSampleId={focusedSampleId}
                      search={searchTerm}
                      onSampleSelect={onSampleSelect}
                    />
                  </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item
                  eventKey={searchTerm ? activeKey.current : 'factory'}
                  className={classes.accordionItem}
                >
                  <Accordion.Header>Factory Samples</Accordion.Header>
                  <Accordion.Body className={classes.accordionBody}>
                    <SampleList
                      samples={factorySamples}
                      selectedSampleId={focusedSampleId}
                      search={searchTerm}
                      onSampleSelect={onSampleSelect}
                    />
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            )}
          </ListGroup>
        </Offcanvas.Body>
      </Offcanvas>
    );
  }
);

export default SampleMenu;
