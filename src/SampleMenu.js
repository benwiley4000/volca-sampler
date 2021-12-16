import React from 'react';
import { Accordion, Button, ListGroup, Offcanvas } from 'react-bootstrap';

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
    return (
      <Offcanvas
        className={classes.sidebar}
        show={open}
        onHide={() => setOpen(false)}
      >
        <Offcanvas.Header closeButton />
        <Offcanvas.Body>
          <Button
            className={classes.newSampleButton}
            type="button"
            variant="primary"
            onClick={() => onSampleSelect(null)}
          >
            New sample
          </Button>
          <ListGroup>
            {!loading && (
              <Accordion
                defaultActiveKey={
                  focusedSampleId && factorySamples.has(focusedSampleId)
                    ? 'factory'
                    : userSamples.size
                    ? 'user'
                    : 'factory'
                }
              >
                <Accordion.Item eventKey="user">
                  <Accordion.Header>Your Samples</Accordion.Header>
                  <Accordion.Body className={classes.accordionBody}>
                    <SampleList
                      samples={userSamples}
                      selectedSampleId={focusedSampleId}
                      onSampleSelect={onSampleSelect}
                    />
                  </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="factory">
                  <Accordion.Header>Factory Samples</Accordion.Header>
                  <Accordion.Body className={classes.accordionBody}>
                    <SampleList
                      samples={factorySamples}
                      selectedSampleId={focusedSampleId}
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
